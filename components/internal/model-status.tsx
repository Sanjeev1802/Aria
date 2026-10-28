"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Cloud, FlaskConical, Globe, Sparkles, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Provider = "claude" | "bedrock" | "local";
type State = "not_configured" | "idle" | "active" | "fallback" | "failing";
type ModelsResponse = {
  state: State;
  serving: { provider: Provider; modelId: string } | null;
  config: {
    primary: { provider: Provider; modelId: string } | null;
    fallback: { configured: boolean; modelId?: string };
    webSearch: { enabled: boolean; maxUses: number };
    liveChat: boolean;
    environment: "development" | "production";
  };
  usage: {
    totals: { claude: number; bedrock: number; local: number; fallback: number; failed: number };
    last?: { provider: Provider; modelId: string; at: number; ok: boolean; fallback: boolean };
  };
};

const REFRESH_MS = 30_000;
const num = new Intl.NumberFormat("en-US");

const PROVIDER: Record<Provider, { name: string; maker: string; icon: LucideIcon; tone: "orange" | "blue" | "violet" }> = {
  claude: { name: "Claude", maker: "Anthropic", icon: Sparkles, tone: "orange" },
  bedrock: { name: "Amazon Bedrock", maker: "Nova", icon: Cloud, tone: "blue" },
  local: { name: "Local test model", maker: "Development only", icon: FlaskConical, tone: "violet" },
};

const STATE: Record<State, { label: string; tone: "ok" | "warn" | "bad" | "muted" }> = {
  active: { label: "Serving requests", tone: "ok" },
  fallback: { label: "Fallback active", tone: "warn" },
  failing: { label: "Last request failed", tone: "bad" },
  idle: { label: "Ready", tone: "muted" },
  not_configured: { label: "Not configured", tone: "bad" },
};

/** "claude-haiku-5-5" -> "Haiku 5.5", "us.amazon.nova-lite-v1:0" -> "Nova Lite". */
export function shortModel(id: string) {
  const claude = /^claude-([a-z]+)-(\d+)-(\d+)/i.exec(id);
  if (claude) return `${claude[1]![0]!.toUpperCase()}${claude[1]!.slice(1)} ${claude[2]}.${claude[3]}`;
  const nova = /nova-([a-z]+)/i.exec(id);
  if (nova) return `Nova ${nova[1]![0]!.toUpperCase()}${nova[1]!.slice(1)}`;
  return id.startsWith("aria/local") ? "Test model" : id;
}

function timeAgo(at: number, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** Shared by the top-bar chip and the overview card so both always agree. */
export function useModelStatus() {
  const [data, setData] = useState<ModelsResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const load = () => fetch("/api/admin/models/", { credentials: "same-origin", cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<ModelsResponse>; })
      .then(next => { setData(next); setError(false); })
      .catch(() => setError(true));
    void load();
    const id = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);
  return { data, error };
}

/** Compact "who is answering" indicator for the top bar. */
export function ModelStatusChip() {
  const { data } = useModelStatus();
  if (!data) return null;
  const serving = data.serving;
  const state = STATE[data.state];
  const providerName = serving ? (serving.provider === "bedrock" ? "Bedrock" : PROVIDER[serving.provider].name) : "";
  const label = serving ? `${providerName} · ${shortModel(serving.modelId)}` : "No model";
  return (
    <span className="internal-model-chip" data-tone={state.tone} role="status"
      title={`${serving ? PROVIDER[serving.provider].name : "No model"}${serving ? ` (${serving.modelId})` : ""} — ${state.label}`}>
      <span className="internal-model-chip__dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

/** Overview card: what answers chat right now, what backs it up, and how the last week split. */
export function ModelStatusSection() {
  const { data, error } = useModelStatus();
  const serving = data?.serving ?? null;
  const meta = serving ? PROVIDER[serving.provider] : null;
  const state = data ? STATE[data.state] : null;
  const last = data?.usage.last;
  const t = data?.usage.totals;
  const total = t ? t.claude + t.bedrock + t.local : 0;
  const config = data?.config;
  const primaryIsClaude = config?.primary?.provider === "claude";

  return (
    <section className="internal-section" aria-labelledby="internal-model-heading">
      <header className="internal-section__head">
        <div>
          <h2 id="internal-model-heading" className="internal-section__title">AI model</h2>
          <p className="internal-section__sub"><span className="internal-live" aria-hidden="true" /> Which model is answering chat right now</p>
        </div>
      </header>

      {error && !data ? (
        <p className="internal-state internal-error" role="alert">Model status is unavailable right now.</p>
      ) : !data ? (
        <div className="internal-model-grid">{[0, 1, 2].map(i => <Skeleton key={i} className="internal-model-skeleton" />)}</div>
      ) : (
        <>
          <div className="internal-model-grid">
            <article className="internal-model-card internal-model-card--hero" data-tone={state!.tone} style={{ "--i": 0 } as CSSProperties}>
              <header>
                <span className="internal-model-card__label">Serving now</span>
                <span className="internal-state-pill" data-tone={state!.tone}>{state!.label}</span>
              </header>
              {serving && meta ? (
                <div className="internal-model-card__main">
                  <span className={`internal-model-icon internal-model-icon--${meta.tone}`} aria-hidden="true"><meta.icon size={20} /></span>
                  <div>
                    <p className="internal-model-card__name">{meta.name}</p>
                    <p className="internal-model-card__id"><code>{serving.modelId}</code></p>
                  </div>
                </div>
              ) : (
                <p className="internal-model-card__empty">No chat model is configured on this server.</p>
              )}
              <p className="internal-model-card__note">
                {data.state === "fallback" ? "Claude failed before streaming, so Amazon Bedrock answered the last request."
                  : data.state === "failing" ? "The last request failed and the customer was not charged."
                    : data.state === "not_configured" ? "Set ANTHROPIC_API_KEY, or the Bedrock Nova variables, to enable chat."
                      : last ? `Last request ${timeAgo(last.at)}` : "No requests in the last 7 days."}
              </p>
            </article>

            <article className="internal-model-card" style={{ "--i": 1 } as CSSProperties}>
              <header>
                <span className="internal-model-card__label">Fallback</span>
                <span className="internal-state-pill" data-tone={config!.fallback.configured ? "ok" : "muted"}>
                  {config!.fallback.configured ? "Ready" : primaryIsClaude ? "Not configured" : "None"}
                </span>
              </header>
              <div className="internal-model-card__main">
                <span className="internal-model-icon internal-model-icon--blue" aria-hidden="true"><Cloud size={20} /></span>
                <div>
                  <p className="internal-model-card__name">Amazon Bedrock · Nova</p>
                  <p className="internal-model-card__id">{config!.fallback.modelId ? <code>{config!.fallback.modelId}</code> : <span>No model ID set</span>}</p>
                </div>
              </div>
              <p className="internal-model-card__note">
                {config!.primary?.provider === "bedrock" ? "Bedrock is the primary model, so there is no separate fallback."
                  : config!.primary?.provider === "local" ? "Not used in local development."
                    : config!.fallback.configured ? "Takes over if Claude fails before it starts streaming."
                      : "Without it, a Claude outage means chat errors instead of a backup answer."}
              </p>
            </article>

            <article className="internal-model-card" style={{ "--i": 2 } as CSSProperties}>
              <header>
                <span className="internal-model-card__label">Live web search</span>
                <span className="internal-state-pill" data-tone={config!.webSearch.enabled ? "ok" : "muted"}>{config!.webSearch.enabled ? "On" : "Off"}</span>
              </header>
              <div className="internal-model-card__main">
                <span className="internal-model-icon internal-model-icon--teal" aria-hidden="true"><Globe size={20} /></span>
                <div>
                  <p className="internal-model-card__name">{config!.webSearch.enabled ? `Up to ${config!.webSearch.maxUses} per message` : "Not searching"}</p>
                  <p className="internal-model-card__id"><span>{config!.environment === "production" ? "Production" : "Development"} · chat {config!.liveChat ? "enabled" : "disabled"}</span></p>
                </div>
              </div>
              <p className="internal-model-card__note">
                {config!.webSearch.enabled ? "Claude searches only when a question needs current facts. Each search is metered."
                  : "Search needs a Claude key and ANTHROPIC_WEB_SEARCH_MAX_USES above 0."}
              </p>
            </article>
          </div>

          <Card className="internal-model-split">
            <CardHeader>
              <CardTitle>Who answered, last 7 days</CardTitle>
              <CardDescription>
                {total === 0 ? "No answered requests yet." : `${num.format(total)} answered ${total === 1 ? "request" : "requests"}`}
                {t && t.failed > 0 ? ` · ${num.format(t.failed)} failed` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="internal-split-bar" role="img" aria-label={t ? `Claude ${t.claude}, Bedrock ${t.bedrock}, local ${t.local}` : undefined}>
                {t && total > 0 ? (
                  <>
                    <span className="internal-split-bar__seg internal-split-bar__seg--claude" style={{ flexGrow: t.claude }} />
                    <span className="internal-split-bar__seg internal-split-bar__seg--bedrock" style={{ flexGrow: t.bedrock }} />
                    <span className="internal-split-bar__seg internal-split-bar__seg--local" style={{ flexGrow: t.local }} />
                  </>
                ) : null}
              </div>
              <ul className="internal-split-legend">
                <li><span className="internal-split-legend__dot internal-split-bar__seg--claude" />Claude <b>{num.format(t?.claude ?? 0)}</b></li>
                <li><span className="internal-split-legend__dot internal-split-bar__seg--bedrock" />Amazon Bedrock <b>{num.format(t?.bedrock ?? 0)}</b></li>
                {t && t.local > 0 ? <li><span className="internal-split-legend__dot internal-split-bar__seg--local" />Local test <b>{num.format(t.local)}</b></li> : null}
                <li className="internal-split-legend__sep">Served by fallback <b>{num.format(t?.fallback ?? 0)}</b></li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
