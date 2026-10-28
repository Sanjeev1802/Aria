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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Check, Eye, EyeOff, Info, Loader2, Lock } from "lucide-react";
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";

type Catalog = Record<AriaSubscriptionPlanId, AriaSubscriptionPlan>;
type Texts = Record<AriaSubscriptionPlanId, string>;
type CatalogResponse = { plans: AriaSubscriptionPlan[]; updatedAt?: number; updatedBy?: string; message?: string };

const credits = new Intl.NumberFormat("en-US");

function cloneCatalog(plans: AriaSubscriptionPlan[]): Catalog {
  const out = { ...DEFAULT_ARIA_SUBSCRIPTION_PLANS };
  for (const plan of plans) out[plan.id] = { ...plan, features: plan.features.map(f => ({ ...f })) };
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

function textsFor(catalog: Catalog): Texts {
  return { free: featuresToText(catalog.free.features), pro: featuresToText(catalog.pro.features), team: featuresToText(catalog.team.features) };
}

/** Everything that can change on a plan, as one comparable string. Feature text is compared as typed. */
const fingerprint = (plan: AriaSubscriptionPlan, text: string) => JSON.stringify({ ...plan, features: undefined, text });

async function fetchCatalog(): Promise<CatalogResponse> {
  const response = await fetch("/api/admin/subscription-plans/", { credentials: "same-origin", cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as CatalogResponse;
  if (!response.ok) throw new Error(body.message || "Unable to load subscription catalog.");
  return body;
}

export function InternalSubscriptionPlansView({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [loaded, setLoaded] = useState<{ catalog: Catalog; texts: Texts } | null>(null);
  const [catalog, setCatalog] = useState<Catalog>(() => ({ ...DEFAULT_ARIA_SUBSCRIPTION_PLANS }));
  const [texts, setTexts] = useState<Texts>(() => textsFor(DEFAULT_ARIA_SUBSCRIPTION_PLANS));
  const [activeId, setActiveId] = useState<AriaSubscriptionPlanId>("pro");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const apply = (body: CatalogResponse) => {
    const next = cloneCatalog(body.plans);
    const nextTexts = textsFor(next);
    setCatalog(next);
    setTexts(nextTexts);
    setLoaded({ catalog: next, texts: nextTexts });
    setSavedAt(body.updatedAt ?? null);
  };

  useEffect(() => {
    let cancelled = false;
    fetchCatalog().then(body => { if (!cancelled) apply(body); }, (cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load subscription catalog.");
    });
    return () => { cancelled = true; };
  }, []);

  const baseline = loaded ?? { catalog: DEFAULT_ARIA_SUBSCRIPTION_PLANS, texts: textsFor(DEFAULT_ARIA_SUBSCRIPTION_PLANS) };
  const editedIds = ARIA_SUBSCRIPTION_PLAN_IDS.filter(
    id => fingerprint(catalog[id], texts[id]) !== fingerprint(baseline.catalog[id], baseline.texts[id]),
  );
  const dirty = editedIds.length > 0;
  const active = catalog[activeId];
  const editable = isSuperAdmin;
  const previewFeatures = textToFeatures(texts[activeId]);

  const patchActive = (patch: Partial<AriaSubscriptionPlan>) => {
    setCatalog(prev => ({ ...prev, [activeId]: { ...prev[activeId], ...patch } }));
    setJustSaved(false);
  };

  const reset = () => {
    setError("");
    fetchCatalog().then(apply, (cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load subscription catalog."));
  };

  const save = async () => {
    if (!isSuperAdmin || saving || !dirty) return;
    setSaving(true);
    setError("");
    try {
      const plans: Partial<Record<AriaSubscriptionPlanId, Partial<AriaSubscriptionPlan>>> = {};
      for (const id of ARIA_SUBSCRIPTION_PLAN_IDS) {
        const plan = { ...catalog[id], features: textToFeatures(texts[id]) };
        plans[id] = id === "free"
          ? { name: plan.name, headline: plan.headline, highlights: plan.highlights, features: plan.features, published: plan.published, monthlyCredits: plan.monthlyCredits }
          : plan;
      }
      const response = await fetch("/api/admin/subscription-plans/", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans }),
      });
      const body = (await response.json().catch(() => ({}))) as CatalogResponse;
      if (!response.ok) throw new Error(body.message || "Save failed.");
      apply({ ...body, updatedAt: body.updatedAt ?? Date.now() });
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 3200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const at = ARIA_SUBSCRIPTION_PLAN_IDS.indexOf(activeId);
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = ARIA_SUBSCRIPTION_PLAN_IDS[(at + step + ARIA_SUBSCRIPTION_PLAN_IDS.length) % ARIA_SUBSCRIPTION_PLAN_IDS.length]!;
    setActiveId(next);
    document.getElementById(`plan-tab-${next}`)?.focus();
  };

  if (!loaded && !error) {
    return (
      <div className="internal-plans" aria-busy="true">
        <Skeleton className="h-[60px]" />
        <div className="internal-plan-tabs">{[0, 1, 2].map(i => <Skeleton key={i} className="h-[104px]" />)}</div>
        <div className="internal-plans__grid">
          <Skeleton className="h-[420px]" />
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="internal-plans">
      <div className="internal-callout" role="note">
        <Info size={16} aria-hidden="true" />
        <p>
          These plans power the ARIA upgrade experience (<code>/pricing</code> and in-app upgrade). Credits and seats apply to
          new monthly grants after you save.
        </p>
        {savedAt ? (
          <span className="internal-callout__meta">
            Last saved {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(savedAt)}
          </span>
        ) : null}
      </div>

      {!editable ? (
        <div className="internal-callout internal-callout--warn" role="status">
          <Lock size={16} aria-hidden="true" />
          <p>Only super admins can edit subscription content. You can review the live catalog below.</p>
        </div>
      ) : null}
      {error ? <div className="internal-alert" role="alert">{error}</div> : null}

      <div className="internal-plan-tabs" role="tablist" aria-label="Subscription tiers">
        {ARIA_SUBSCRIPTION_PLAN_IDS.map(id => {
          const plan = catalog[id];
          const selected = id === activeId;
          return (
            <button key={id} id={`plan-tab-${id}`} type="button" role="tab" aria-selected={selected} aria-controls="plan-panel"
              tabIndex={selected ? 0 : -1} className="internal-plan-tab" onClick={() => setActiveId(id)} onKeyDown={onTabKeyDown}>
              <span className="internal-plan-tab__top">
                <span className="internal-plan-tab__name">{plan.name}</span>
                <span className="internal-plan-tab__badges">
                  {editedIds.includes(id) ? <span className="internal-plan-tab__edited" title="Unsaved changes" aria-label="Unsaved changes" /> : null}
                  <span className={`internal-pill ${plan.published ? "internal-pill--ok" : "internal-pill--muted"}`}>
                    {plan.published ? "Published" : "Hidden"}
                  </span>
                </span>
              </span>
              <span className="internal-plan-tab__price">
                <span className="internal-plan-tab__amount">${plan.price}</span>
                <span className="internal-plan-tab__suffix">{plan.priceSuffix}</span>
              </span>
              <span className="internal-plan-tab__meta">
                {credits.format(plan.monthlyCredits)} credits · {plan.seats} {plan.seats === 1 ? "seat" : "seats"}
              </span>
              <Check className="internal-plan-tab__check" size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div className="internal-plans__grid" id="plan-panel" role="tabpanel" aria-labelledby={`plan-tab-${activeId}`} key={activeId}>
        <div className="internal-plans__form">
          <FormCard title="Pricing and credits" description={editCopy(activeId, editable)}>
            <div className="internal-form-grid">
              <Field label="Price (USD)" prefix="$" value={active.price} disabled={!editable} onChange={v => patchActive({ price: v })} />
              <Field label="Price suffix" value={active.priceSuffix} disabled={!editable} onChange={v => patchActive({ priceSuffix: v })} />
              <Field label="Monthly credits" hint="Granted at the start of each UTC month" value={String(active.monthlyCredits)}
                inputMode="numeric" disabled={!editable} onChange={v => patchActive({ monthlyCredits: Number(v.replace(/\D/g, "")) || 0 })} />
              <Field label="Included seats" hint={activeId === "free" ? "The Free plan is always one seat" : undefined}
                value={String(active.seats)} inputMode="numeric" disabled={!editable || activeId === "free"}
                onChange={v => patchActive({ seats: Number(v.replace(/\D/g, "")) || 0 })} />
            </div>
          </FormCard>

          <FormCard title="Customer-facing copy" description="What customers read on the pricing page and in the upgrade dialog.">
            <div className="internal-form-grid">
              <Field label="Display name" value={active.name} disabled={!editable} onChange={v => patchActive({ name: v })} />
              <Field label="Button label" value={active.cta} disabled={!editable} onChange={v => patchActive({ cta: v })} />
            </div>
            <Field label="Headline" value={active.headline} disabled={!editable} onChange={v => patchActive({ headline: v })} />
            <TextField label="Highlights line" hint="A one-line summary of what the plan includes" rows={3} value={active.highlights}
              disabled={!editable} onChange={v => patchActive({ highlights: v })} />
          </FormCard>

          <FormCard title="Feature list" description="One bullet per line. Add a hover hint after a | character.">
            <TextField label="Feature bullets" mono rows={8} value={texts[activeId]} disabled={!editable}
              onChange={v => { setTexts(prev => ({ ...prev, [activeId]: v })); setJustSaved(false); }} />
          </FormCard>

          <FormCard title="Visibility and access" description="Control where this plan appears and what it unlocks.">
            <div className="internal-switch-list">
              <SwitchRow label="Published on ARIA pricing" description="Hidden plans stay in the catalog but customers do not see them."
                checked={active.published} disabled={!editable} onChange={v => patchActive({ published: v })} />
              {activeId === "team" ? (
                <SwitchRow label="Show “New” badge" description="Adds a New badge beside the plan name."
                  checked={Boolean(active.isNew)} disabled={!editable} onChange={v => patchActive({ isNew: v })} />
              ) : null}
              {activeId !== "free" ? (
                <SwitchRow label="API access" description="Grants the API-access entitlement. Keys are not issued yet."
                  checked={active.apiAccess} disabled={!editable} onChange={v => patchActive({ apiAccess: v })} />
              ) : null}
              {activeId === "team" ? (
                <SwitchRow label="Team management" description="Invitations, seats and per-member credit limits."
                  checked={active.teamManagement} disabled={!editable} onChange={v => patchActive({ teamManagement: v })} />
              ) : null}
            </div>
          </FormCard>
        </div>

        <aside className="internal-plans__preview" aria-label="Customer preview">
          <div className="internal-plans__preview-head">
            <span>Customer preview</span>
            <small>Updates as you type</small>
          </div>
          <PricingPreview plan={active} features={previewFeatures} />
        </aside>
      </div>

      {editable ? (
        <div className="internal-savebar" data-dirty={dirty} role="region" aria-label="Save changes">
          <p className="internal-savebar__status" role="status" aria-live="polite">
            {saving ? (<><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Saving…</>)
              : dirty ? (<><span className="internal-savebar__dot" aria-hidden="true" />Unsaved changes in {editedIds.map(id => catalog[id].name).join(", ")}</>)
                : justSaved ? (<><Check className="internal-savebar__check" size={16} aria-hidden="true" /> All changes saved</>)
                  : "No unsaved changes"}
          </p>
          <div className="internal-savebar__actions">
            <Button type="button" variant="outline" className="shadow-none" disabled={!dirty || saving} onClick={reset}>Discard</Button>
            <Button type="button" className="shadow-none" disabled={!dirty || saving} onClick={() => void save()}>Save plans</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function editCopy(id: AriaSubscriptionPlanId, editable: boolean) {
  if (!editable) return "Read-only for your role.";
  if (id === "free") return "Free copy and its credit allowance can change; seats stay at one.";
  return "Pro and Team are the paid tiers customers upgrade into.";
}

function FormCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="internal-form-card">
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="internal-form-card__body">{children}</div>
    </section>
  );
}

function Field({ label, hint, prefix, value, onChange, disabled, inputMode }: {
  label: string; hint?: string; prefix?: string; value: string; onChange: (value: string) => void;
  disabled?: boolean; inputMode?: "numeric" | "text";
}) {
  const id = useId();
  return (
    <div className="internal-field">
      <Label htmlFor={id}>{label}</Label>
      <div className={`internal-field__control${prefix ? " has-prefix" : ""}`}>
        {prefix ? <span className="internal-field__prefix" aria-hidden="true">{prefix}</span> : null}
        <Input id={id} value={value} disabled={disabled} inputMode={inputMode} onChange={e => onChange(e.target.value)} />
      </div>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function TextField({ label, hint, rows, mono, value, onChange, disabled }: {
  label: string; hint?: string; rows: number; mono?: boolean; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="internal-field">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
        className={mono ? "font-mono text-xs leading-6" : "text-sm"} />
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function SwitchRow({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="internal-switch-row">
      <label htmlFor={id}>
        <span>{label}</span>
        <small>{description}</small>
      </label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

/** The customer-facing plan card, rendered from the unsaved edits. */
function PricingPreview({ plan, features }: { plan: AriaSubscriptionPlan; features: AriaSubscriptionPlan["features"] }) {
  return (
    <article className={`internal-pricing-card${plan.published ? "" : " is-hidden"}`}>
      <header className="internal-pricing-card__top">
        <span className="internal-pricing-card__name">{plan.name}</span>
        {plan.isNew ? <span className="internal-pill internal-pill--accent">New</span> : null}
        <span className={`internal-pricing-card__visibility ${plan.published ? "" : "is-off"}`}>
          {plan.published ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
          {plan.published ? "Visible" : "Hidden"}
        </span>
      </header>
      <p className="internal-pricing-card__headline">{plan.headline}</p>
      <p className="internal-pricing-card__price">
        <span className="internal-pricing-card__amount"><span>$</span>{plan.price || "0"}</span>
        <span className="internal-pricing-card__suffix">{plan.priceSuffix}</span>
      </p>
      <p className="internal-pricing-card__highlights">{plan.highlights}</p>
      <span className="internal-pricing-card__cta" aria-hidden="true">{plan.cta || "Choose plan"}</span>
      <ul className="internal-pricing-card__features">
        {features.map(feature => (
          <li key={feature.text}>
            <Check size={15} aria-hidden="true" />
            <span>
              {feature.text}
              {feature.hint ? <small>{feature.hint}</small> : null}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
