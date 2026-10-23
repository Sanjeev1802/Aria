"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AriaMark } from "@/components/aria-mark";
import { Check, Copy, FileText, Plus } from "lucide-react";

const API_SNIPPET = `const response = await aria.responses.create({
  mode: "intelligence",
  messages: [{
    role: "user",
    content: "What should we explore next?"
  }],
  stream: true
});`;

function ProductRail({
  recents,
  footer,
}: {
  recents: { title: string; active?: boolean }[];
  footer?: ReactNode;
}) {
  return (
    <aside className="pa-rail" aria-hidden>
      <div className="pa-rail-brand">
        <AriaMark />
        <span>ARIA</span>
      </div>
      <p className="pa-rail-label">New chat</p>
      <p className="pa-rail-kicker">Recents</p>
      <ul className="pa-rail-list">
        {recents.map((item) => (
          <li key={item.title} className={item.active ? "is-active" : undefined}>{item.title}</li>
        ))}
      </ul>
      {footer}
    </aside>
  );
}

function ProductCredits({
  used,
  included,
  left,
  plan,
}: {
  used: string;
  included: string;
  left: string;
  plan: string;
}) {
  return (
    <div className="pa-credits">
      <div>
        <span>Credits</span>
        <b><em>{used}</em> / {included}</b>
      </div>
      <div className="pa-credits-track"><i /></div>
      <p>{left} left · {plan}</p>
    </div>
  );
}

function ProductComposer({
  placeholder,
  file,
}: {
  placeholder: string;
  file?: string;
}) {
  return (
    <div className="pa-composer-wrap" aria-hidden>
      {file ? (
        <div className="pa-composer-files">
          <span className="pa-file"><FileText size={10} strokeWidth={1.75} /> {file}</span>
        </div>
      ) : null}
      <div className="pa-composer">
        <span className="pa-composer-plus"><Plus size={13} strokeWidth={1.75} /></span>
        <span className="pa-composer-placeholder">{placeholder}</span>
        <span className="pa-composer-send">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 12.7V3.3M12.7 8 8 3.3 3.3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function ModelsIllustration() {
  return (
    <div
      className="feature-art model-art aria-product-art"
      aria-label="ARIA workspace with one conversation that keeps its context."
    >
      <div className="pa-window">
        <ProductRail recents={[
          { title: "Board update draft", active: true },
          { title: "Market comparison" },
          { title: "Team briefing" },
        ]} />
        <div className="pa-stage">
          <div className="pa-thread">
            <div className="pa-user">Rewrite this for a board update.</div>
            <div className="pa-assistant">
              <div className="pa-assistant-meta">
                <AriaMark />
                <span>ARIA</span>
              </div>
              <p>A board-ready read: engagement held in three of five markets. Lead with Indonesia, then the lag in Dialog — one thread, no lost context.</p>
            </div>
          </div>
          <ProductComposer placeholder="Keep going in the same thread…" />
        </div>
      </div>
    </div>
  );
}

export function IntelligenceIllustration() {
  return (
    <div
      className="feature-art intelligence-art aria-product-art"
      aria-label="ARIA Intelligence answering with source-linked market context. Example content."
    >
      <div className="pa-window">
        <ProductRail recents={[
          { title: "Q3 engagement", active: true },
          { title: "Market overview.pdf" },
          { title: "Ops brief" },
        ]} />
        <div className="pa-stage">
          <div className="pa-thread">
            <div className="pa-user">How did engagement move this quarter?</div>
            <div className="pa-assistant">
              <div className="pa-assistant-meta">
                <AriaMark />
                <span>ARIA Intelligence</span>
                <span className="pa-example">Example</span>
              </div>
              <p>Engagement rose in four of five markets. Indonesia led the quarter; Dialog was the only decline.</p>
              <div className="pa-metrics">
                <div><b>+12%</b><small>Indonesia</small></div>
                <div><b>+6%</b><small>Globe</small></div>
                <div className="is-down"><b>−3%</b><small>Dialog</small></div>
              </div>
              <div className="pa-chart" aria-hidden>
                {[36, 48, 44, 58, 62, 70, 66, 78, 84, 80].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="pa-chart-labels"><span>Engagement over time</span><span>Illustrative</span></div>
              <div className="pa-sources">
                <span>Sources</span>
                <span className="pa-source"><FileText size={10} /> 1 Market overview.pdf</span>
                <span className="pa-source">2 Q3 ops brief</span>
              </div>
            </div>
          </div>
          <ProductComposer placeholder="Ask about markets, metrics, or documents…" file="Market overview.pdf" />
        </div>
      </div>
    </div>
  );
}

export function TeamIllustration() {
  return (
    <div
      className="feature-art team-art aria-product-art"
      aria-label="Example Team workspace with shared credits and members."
    >
      <div className="pa-window">
        <ProductRail
          recents={[
            { title: "Team narrative", active: true },
            { title: "Board update draft" },
            { title: "Q3 engagement" },
          ]}
          footer={<ProductCredits used="7,640" included="20,000" left="12,360" plan="Team" />}
        />
        <div className="pa-stage">
          <div className="pa-context">
            <span className="pa-workspace-chip"><span>S</span> Studio workspace</span>
            <span className="pa-faces" aria-hidden>
              <span className="pa-avatar pa-avatar--gold">JL</span>
              <span className="pa-avatar pa-avatar--slate">SK</span>
              <span className="pa-avatar pa-avatar--rose">AP</span>
            </span>
            <span className="pa-context-meta">Jamie Lee · Admin</span>
            <span className="pa-context-credits">7,640 / 20,000</span>
          </div>
          <div className="pa-thread">
            <div className="pa-user">Share a one-page narrative for the team.</div>
            <div className="pa-assistant">
              <div className="pa-assistant-meta">
                <AriaMark />
                <span>Visible to Studio</span>
              </div>
              <p>Three moves this week: lock Indonesia’s story, review Dialog, and keep the credit pool in one place.</p>
            </div>
          </div>
          <ProductComposer placeholder="Write with your team…" />
        </div>
      </div>
    </div>
  );
}

export function ApiIllustration() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(API_SNIPPET);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="feature-art api-art aria-product-art"
      aria-label="Proposed ARIA API experience with a scoped key and streaming example."
    >
      <div className="pa-window">
        <ProductRail
          recents={[
            { title: "Developer API", active: true },
            { title: "Usage limits" },
            { title: "Project keys" },
          ]}
          footer={<ProductCredits used="1,280" included="5,000" left="3,720" plan="Pro" />}
        />
        <div className="pa-stage pa-stage--code">
          <div className="pa-code">
            <div className="pa-code-top">
              <span>your-next-idea.ts</span>
              <code className="pa-key-chip">aria_live_••••k3m</code>
              <button type="button" onClick={copy} aria-label={copied ? "Copied example" : "Copy API example"}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <pre aria-label="Illustrative TypeScript SDK example"><code>
              <span className="pa-k">const</span> response = <span className="pa-k">await</span> aria.responses.<span className="pa-fn">create</span>{"({\n"}
              {"  "}mode: <span className="pa-s">{"\"intelligence\""}</span>,{"\n"}
              {"  "}messages: [{"{\n"}
              {"    "}role: <span className="pa-s">{"\"user\""}</span>,{"\n"}
              {"    "}content: <span className="pa-s">{"\"What should we explore next?\""}</span>{"\n"}
              {"  }"}],{"\n"}
              {"  "}stream: <span className="pa-k">true</span>{"\n"}
              {"});"}
            </code></pre>
            <div className="pa-code-foot">Same credits. Scoped keys. Server-side only.</div>
          </div>
          <ProductComposer placeholder="Ship it with the same credits…" />
        </div>
      </div>
    </div>
  );
}
