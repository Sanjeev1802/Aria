"use client";

import {
  ARIA_SUBSCRIPTION_PLAN_IDS,
  DEFAULT_ARIA_SUBSCRIPTION_PLANS,
  type AriaSubscriptionPlan,
  type AriaSubscriptionPlanId,
} from "@/lib/aria-subscription-plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type CatalogResponse = {
  plans: AriaSubscriptionPlan[];
  updatedAt?: number;
  updatedBy?: string;
};

function cloneCatalog(plans: AriaSubscriptionPlan[]): Record<AriaSubscriptionPlanId, AriaSubscriptionPlan> {
  const out = { ...DEFAULT_ARIA_SUBSCRIPTION_PLANS };
  for (const plan of plans) {
    out[plan.id] = { ...plan, features: plan.features.map(f => ({ ...f })) };
  }
  return out;
}

function featuresToText(features: AriaSubscriptionPlan["features"]) {
  return features.map(f => (f.hint ? `${f.text} | ${f.hint}` : f.text)).join("\n");
}

function textToFeatures(raw: string): AriaSubscriptionPlan["features"] {
  return raw
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [text, hint] = line.split("|").map(part => part.trim());
      return hint ? { text, hint } : { text };
    });
}

export function InternalSubscriptionPlansView({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [catalog, setCatalog] = useState<Record<AriaSubscriptionPlanId, AriaSubscriptionPlan>>(
    () => ({ ...DEFAULT_ARIA_SUBSCRIPTION_PLANS }),
  );
  const [activeId, setActiveId] = useState<AriaSubscriptionPlanId>("pro");
  const [featureText, setFeatureText] = useState(() => featuresToText(DEFAULT_ARIA_SUBSCRIPTION_PLANS.pro.features));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/subscription-plans/", { credentials: "same-origin", cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as CatalogResponse & { message?: string };
      if (!response.ok) throw new Error(body.message || "Unable to load subscription catalog.");
      setCatalog(cloneCatalog(body.plans));
      setSavedAt(body.updatedAt ?? null);
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load subscription catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = catalog[activeId];

  useEffect(() => {
    setFeatureText(featuresToText(active.features));
  }, [activeId, active.features]);

  const previewHighlights = useMemo(() => active.highlights, [active.highlights]);

  const patchActive = (patch: Partial<AriaSubscriptionPlan>) => {
    setCatalog(prev => ({ ...prev, [activeId]: { ...prev[activeId], ...patch } }));
    setDirty(true);
  };

  const save = async () => {
    if (!isSuperAdmin || saving) return;
    setSaving(true);
    setError("");
    try {
      const working: Record<AriaSubscriptionPlanId, AriaSubscriptionPlan> = {
        ...catalog,
        [activeId]: { ...catalog[activeId], features: textToFeatures(featureText) },
      };
      const plans: Partial<Record<AriaSubscriptionPlanId, Partial<AriaSubscriptionPlan>>> = {};
      for (const id of ARIA_SUBSCRIPTION_PLAN_IDS) {
        if (id === "free") {
          plans[id] = {
            name: working[id].name,
            headline: working[id].headline,
            highlights: working[id].highlights,
            features: working[id].features,
            published: working[id].published,
            monthlyCredits: working[id].monthlyCredits,
          };
          continue;
        }
        plans[id] = working[id];
      }

      const response = await fetch("/api/admin/subscription-plans/", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans }),
      });
      const body = (await response.json().catch(() => ({}))) as CatalogResponse & { message?: string };
      if (!response.ok) throw new Error(body.message || "Save failed.");
      setCatalog(cloneCatalog(body.plans));
      setSavedAt(body.updatedAt ?? Date.now());
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="internal-state">Loading subscription catalog…</div>;
  }

  return (
    <div className="internal-subscription">
      <div className="internal-subscription__intro">
        <p className="internal-subscription__lede">
          These plans power the ARIA upgrade experience (<code className="text-xs">/pricing</code> and in-app upgrade).
          Entitlement credits and seats apply to new monthly grants after you save.
        </p>
        {!isSuperAdmin ? (
          <div className="internal-settings-prototype" role="status">
            <p>Only super admins can edit Pro and Team subscription content. You can review the live catalog below.</p>
          </div>
        ) : null}
        {savedAt ? (
          <p className="internal-subscription__meta text-xs text-muted-foreground">
            Last saved {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(savedAt)}
          </p>
        ) : null}
        {error ? (
          <div className="internal-alert" role="alert">
            {error}
          </div>
        ) : null}
      </div>

      <div className="internal-subscription__layout">
        <nav className="internal-subscription__nav" aria-label="Subscription tiers">
          {ARIA_SUBSCRIPTION_PLAN_IDS.map(id => {
            const plan = catalog[id];
            const current = id === activeId;
            return (
              <button
                key={id}
                type="button"
                className={`internal-subscription__nav-item${current ? " internal-subscription__nav-item--active" : ""}`}
                aria-current={current ? "true" : undefined}
                onClick={() => setActiveId(id)}
              >
                <span className="internal-subscription__nav-name">{plan.name}</span>
                <span className="internal-subscription__nav-price">
                  ${plan.price}
                  {plan.priceSuffix}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="internal-subscription__editor">
          <div className="internal-subscription__preview">
            <p className="internal-subscription__preview-eyebrow">Customer preview</p>
            <h3 className="internal-subscription__preview-title">{active.headline}</h3>
            <p className="internal-subscription__preview-highlights">{previewHighlights}</p>
            <ul className="internal-subscription__preview-features">
              {active.features.slice(0, 4).map(f => (
                <li key={f.text}>
                  <Check className="size-3.5 shrink-0" aria-hidden />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="internal-settings-form-card internal-subscription__form">
            <div className="internal-settings-form-card__header">
              <h3 className="internal-settings-form-card__title">Edit {active.name}</h3>
              <p className="internal-settings-form-card__description">
                {idEditableCopy(activeId, isSuperAdmin)}
              </p>
            </div>
            <div className="internal-settings-form-card__body">
              <div className="internal-subscription__grid-2">
                <Field label="Display name" value={active.name} disabled={!canEdit(activeId, isSuperAdmin)} onChange={v => patchActive({ name: v })} />
                <Field label="Headline" value={active.headline} disabled={!canEdit(activeId, isSuperAdmin)} onChange={v => patchActive({ headline: v })} />
                <Field label="Price (USD)" value={active.price} disabled={!canEdit(activeId, isSuperAdmin)} onChange={v => patchActive({ price: v })} />
                <Field label="Price suffix" value={active.priceSuffix} disabled={!canEdit(activeId, isSuperAdmin)} onChange={v => patchActive({ priceSuffix: v })} />
                <Field
                  label="Monthly credits"
                  value={String(active.monthlyCredits)}
                  disabled={!canEdit(activeId, isSuperAdmin)}
                  onChange={v => patchActive({ monthlyCredits: Number(v) || 0 })}
                  inputMode="numeric"
                />
                <Field
                  label="Included seats"
                  value={String(active.seats)}
                  disabled={!canEdit(activeId, isSuperAdmin) || activeId === "free"}
                  onChange={v => patchActive({ seats: Number(v) || 0 })}
                  inputMode="numeric"
                />
              </div>
              <div className="internal-settings-field">
                <Label className="internal-settings-field__label block">Highlights line</Label>
                <Textarea
                  className="min-h-[72px] text-sm"
                  value={active.highlights}
                  disabled={!canEdit(activeId, isSuperAdmin)}
                  onChange={e => patchActive({ highlights: e.target.value })}
                />
              </div>
              <div className="internal-settings-field">
                <Label className="internal-settings-field__label block">Feature bullets (one per line, optional hint after |)</Label>
                <Textarea
                  className="min-h-[160px] font-mono text-xs"
                  value={featureText}
                  disabled={!canEdit(activeId, isSuperAdmin)}
                  onChange={e => {
                    setFeatureText(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="internal-subscription__toggles">
                <Toggle
                  label="Published on ARIA pricing"
                  checked={active.published}
                  disabled={!canEdit(activeId, isSuperAdmin)}
                  onChange={v => patchActive({ published: v })}
                />
                {activeId === "team" ? (
                  <Toggle
                    label="Show “New” badge"
                    checked={Boolean(active.isNew)}
                    disabled={!canEdit(activeId, isSuperAdmin)}
                    onChange={v => patchActive({ isNew: v })}
                  />
                ) : null}
                {activeId !== "free" ? (
                  <>
                    <Toggle
                      label="API access"
                      checked={active.apiAccess}
                      disabled={!canEdit(activeId, isSuperAdmin)}
                      onChange={v => patchActive({ apiAccess: v })}
                    />
                    {activeId === "team" ? (
                      <Toggle
                        label="Team management"
                        checked={active.teamManagement}
                        disabled={!canEdit(activeId, isSuperAdmin)}
                        onChange={v => patchActive({ teamManagement: v })}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
              <Field label="Primary CTA label" value={active.cta} disabled={!canEdit(activeId, isSuperAdmin)} onChange={v => patchActive({ cta: v })} />
            </div>
          </div>
        </div>
      </div>

      {isSuperAdmin ? (
        <div className="internal-settings-form-footer">
          <div className="internal-operator-profile__footer">
            <p className="internal-operator-profile__footer-hint">
              Checkout is not enabled in preview. Changes update customer-facing copy and monthly credit grants for new billing periods.
            </p>
            <div className="internal-operator-profile__footer-actions">
              <Button type="button" variant="outline" className="shadow-none" disabled={!dirty || saving} onClick={() => void load()}>
                Reset
              </Button>
              <Button type="button" className="shadow-none" disabled={!dirty || saving} onClick={() => void save()}>
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Save subscription plans
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function canEdit(id: AriaSubscriptionPlanId, isSuperAdmin: boolean) {
  if (!isSuperAdmin) return false;
  return id === "pro" || id === "team" || id === "free";
}

function idEditableCopy(id: AriaSubscriptionPlanId, isSuperAdmin: boolean) {
  if (!isSuperAdmin) return "Read-only for your role.";
  if (id === "pro" || id === "team") return "Pro and Team are the paid tiers customers upgrade into.";
  return "Free tier copy and credit allowance can be adjusted; seats stay at one.";
}

function Field({
  label,
  value,
  onChange,
  disabled,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div className="internal-settings-field">
      <Label className="internal-settings-field__label block">{label}</Label>
      <Input
        className="internal-settings-field__input w-full"
        value={value}
        disabled={disabled}
        inputMode={inputMode}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="internal-subscription__toggle">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
