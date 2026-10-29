"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AriaMark } from "@/components/aria-mark";
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { AriaPricingGrid } from "@/components/landing/aria-pricing-grid";
import { AriaSiteFooter } from "@/components/landing/aria-site-footer";
import { TdevHeroComposer } from "@/components/landing/tdev-hero-composer";
import { signInHref } from "@/lib/auth/safe-next-path";
import { stashLandingDraft } from "@/lib/landing-draft";
import { refreshAriaSession, useAriaSession } from "@/lib/aria-session";
import { workspaceAuthIntentFromDialog, type WorkspaceAuthIntent } from "@/lib/workspace-auth-dialog";

const ArtPlaceholder = () => <div className="feature-art aria-product-art" aria-hidden />;

const ModelsIllustration = dynamic(
  () => import("@/components/landing/aria-product-illustrations").then((m) => ({ default: m.ModelsIllustration })),
  { ssr: false, loading: ArtPlaceholder },
);
const IntelligenceIllustration = dynamic(
  () => import("@/components/landing/aria-product-illustrations").then((m) => ({ default: m.IntelligenceIllustration })),
  { ssr: false, loading: ArtPlaceholder },
);
const TeamIllustration = dynamic(
  () => import("@/components/landing/aria-product-illustrations").then((m) => ({ default: m.TeamIllustration })),
  { ssr: false, loading: ArtPlaceholder },
);
const ApiIllustration = dynamic(
  () => import("@/components/landing/aria-product-illustrations").then((m) => ({ default: m.ApiIllustration })),
  { ssr: false, loading: ArtPlaceholder },
);
const LandingPreviewDialog = dynamic(
  () => import("@/components/landing/landing-preview-dialog").then((m) => ({ default: m.LandingPreviewDialog })),
  { ssr: false },
);
const WorkspaceBootstrapOverlay = dynamic(
  () => import("@/components/auth/workspace-bootstrap-overlay").then((m) => ({ default: m.WorkspaceBootstrapOverlay })),
  { ssr: false },
);

const faqs = [
  ["What is ARIA?", "ARIA is a conversational workspace that brings AI, your documents, and approved business intelligence together. Ask a question, explore the evidence, and turn what you learn into your next step."],
  ["Which AI model does ARIA use?", "ARIA uses Amazon Nova through Amazon Bedrock on every plan. Your plan controls credits, seats, and workspace features; it does not change the model."],
  ["What makes ARIA Intelligence different?", "On Pro and Team, ARIA Intelligence connects your questions to business data your organization is authorized to use. Answers should show their sources, time period, and limitations. A subscription does not automatically grant access to every dataset."],
  ["How do credits work?", "Credits are your usage budget. Each request uses credits based on the model, tokens processed, and any paid data operations. Chat and API requests share the same balance. Included credits renew monthly and do not roll over. The prices and allowances shown here are proposed launch terms."],
  ["Can I use ARIA in my own application?", "Yes—the Pro and Team plans include developer API access in the product plan. You'll be able to create scoped keys, set spending limits, and monitor usage. Keep those keys on your server. The API is not live in this design preview."],
  ["How does Team work?", "The proposed Team plan includes five seats and a shared credit pool. An admin invites teammates, connects approved knowledge, and controls access. Sharing a workspace does not automatically share everyone's private conversations."],
  ["Can I try it for free?", "Free is designed to include 200 monthly credits for general chat, without developer API access. This site is an interactive product preview: account creation, payments, file processing, and live AI responses are not enabled yet."],
];

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add("is-shown"); observer.unobserve(el); }
    }, { threshold: 0.12, rootMargin: "80px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`t-stagger ${className}`}><div className="t-stagger-line">{children}</div></div>;
}

function runWhenIdle(task: () => void) {
  const idle = window.requestIdleCallback;
  if (typeof idle === "function") {
    const id = idle(task, { timeout: 1200 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 200);
  return () => window.clearTimeout(id);
}

export default function Home() {
  const router = useRouter();
  const session = useAriaSession();
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dialog, setDialog] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [bootstrapIntent, setBootstrapIntent] = useState<WorkspaceAuthIntent | null>(null);
  const authIntent = workspaceAuthIntentFromDialog(dialog);

  useEffect(() => runWhenIdle(() => { void refreshAriaSession(); }), []);

  function goCompose() {
    document.getElementById("start")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    inputRef.current?.focus({ preventScroll: true });
  }
  function goToChat() {
    if (!prompt.trim()) return;
    stashLandingDraft(prompt.trim());
    if (session.status === "authenticated" || session.status === "preview") {
      router.push("/chat/");
      return;
    }
    router.push(signInHref("/chat/"));
  }
  function beginWorkspaceLoad(intent: WorkspaceAuthIntent) {
    setDialog(null);
    setBootstrapIntent(intent);
  }

  return (
    <div className="aria-tdev-page">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a href="#" className="brand" aria-label="ARIA home"><AriaMark /><span>ARIA</span></a>
        <nav aria-label="Main navigation" className="desktop-nav">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-actions">
          <Link href="/sign-in/" className="sign-in">
            Sign in
            <ArrowUpRight className="signin-arrow" size={14} strokeWidth={2} aria-hidden />
          </Link>
          <button
            type="button"
            className="mobile-menu"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        {menu ? (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {["Features", "Pricing", "FAQ"].map((x) => (
              <a key={x} href={`#${x.toLowerCase()}`} onClick={() => setMenu(false)}>{x}</a>
            ))}
          </nav>
        ) : null}
      </header>
      <main id="main">
        <section className="hero aria-tdev-hero" id="start">
          <header className="header cm-hero home-hero">
            <h1 className="title">
              Think once.
              <br />
              <span>Know more.</span>
            </h1>
            <p className="subtitle">
              The intelligence you trust. The context you own. One conversation that never loses the thread —{" "}
              <strong>ARIA</strong>.
            </p>
            <div>
              <TdevHeroComposer
                prompt={prompt}
                onPromptChange={setPrompt}
                onSubmit={goToChat}
                inputRef={inputRef}
                file={file}
                onClearFile={() => setFile(null)}
                fileError={fileError}
                uploadRef={uploadRef}
                onFileChosen={(chosen) => {
                  if (!chosen) return;
                  if (chosen.size > 10 * 1024 * 1024) {
                    setFileError("Please choose a file smaller than 10 MB.");
                    return;
                  }
                  if (!/\.(pdf|txt|csv)$/i.test(chosen.name)) {
                    setFileError("Please choose a PDF, TXT, or CSV file.");
                    return;
                  }
                  setFileError("");
                  setFile(chosen);
                }}
              />
            </div>
          </header>
        </section>

        <section className="features section-container" id="features">
          <Reveal>
            <div className="section-heading">
              <span className="section-kicker">THINK BIGGER. WORK SIMPLER.</span>
              <h2>A little less friction.<br />A lot more possibility.</h2>
              <p>From the first question to your next move.<br />Intelligence that fits the way you work.</p>
            </div>
          </Reveal>
          <div className="feature-list">
            <Reveal>
              <article className="feature-row">
                <ModelsIllustration />
                <div className="feature-copy">
                  <span className="feature-number">01 / YOUR THREAD</span>
                  <h3>The right mind.<br />For every moment.</h3>
                  <p>Ask, refine, and keep going. ARIA holds the context in one conversation—so you never switch workspaces or lose the thread.</p>
                  <button type="button" className="text-link" onClick={goCompose}>Find your flow <ArrowRight size={15} /></button>
                </div>
              </article>
            </Reveal>
            <Reveal>
              <article className="feature-row reverse">
                <IntelligenceIllustration />
                <div className="feature-copy">
                  <span className="feature-number">02 / YOUR INTELLIGENCE</span>
                  <h3>Answers that know<br />where you’re coming from.</h3>
                  <p>Bring your documents and approved business data into the conversation. Get a clearer picture, with sources you can follow and context you can trust.</p>
                  <a className="text-link" href="#pricing">Explore ARIA Intelligence <ArrowRight size={15} /></a>
                </div>
              </article>
            </Reveal>
            <Reveal>
              <article className="feature-row">
                <TeamIllustration />
                <div className="feature-copy">
                  <span className="feature-number">03 / YOUR PEOPLE</span>
                  <h3>Good thinking.<br />Better together.</h3>
                  <p>Give your team a shared place to move forward. Invite your people, connect approved knowledge, and keep access and credits in your control.</p>
                  <button type="button" className="text-link" onClick={() => setDialog("Meet ARIA Team")}>Make room for your team <ArrowRight size={15} /></button>
                </div>
              </article>
            </Reveal>
            <Reveal>
              <article className="feature-row reverse">
                <ApiIllustration />
                <div className="feature-copy">
                  <span className="feature-number">04 / YOUR NEXT BUILD</span>
                  <h3>Your application.<br />A little more intelligent.</h3>
                  <p>Take ARIA beyond the chat. Bring intelligence into your own product with scoped API keys, clear usage limits, and the same credits you already use.</p>
                  <button type="button" className="text-link" onClick={() => setDialog("Build with the ARIA API")}>Built for builders <ArrowRight size={15} /></button>
                </div>
              </article>
            </Reveal>
          </div>
          <p className="feature-preview-note">A look at what’s coming. Product illustrations use example content.</p>
        </section>

        <section className="aria-pricing section-container" id="pricing">
          <Reveal>
            <div className="section-heading">
              <span className="section-kicker">ROOM FOR EVERY KIND OF CURIOUS</span>
              <h2>Start small. Think limitless.</h2>
              <p>Pick your space. Use your credits your way.</p>
            </div>
          </Reveal>
          <Reveal>
            <AriaPricingGrid
              onSelectPlan={(_id, cta) => {
                const label = cta.replace(/^Get /, "");
                setDialog(`${label} — your next step`);
              }}
            />
          </Reveal>
          <p className="aria-pricing-note">
            Proposed launch pricing in USD. No checkout is enabled in this preview.
            <br />
            Model usage varies. Business data requires separate authorization and may carry additional charges.
          </p>
        </section>

        <section className="faq section-container" id="faq">
          <div className="faq-intro">
            <span className="section-kicker">A LITTLE MORE CLARITY</span>
            <h2>Good questions.<br />Straight answers.</h2>
            <p>The things you might be wondering.</p>
            <span className="faq-spark"><AriaMark /></span>
          </div>
          <div className="faq-list">
            {faqs.map(([q, a], i) => (
              <div key={q} className="t-acc faq-item" data-open={openFaq === i}>
                <h3>
                  <button
                    id={`question-${i}`}
                    type="button"
                    className="t-acc-head"
                    aria-expanded={openFaq === i}
                    aria-controls={`answer-${i}`}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {q}
                    <span className="t-acc-chevron"><ChevronDown size={17} /></span>
                  </button>
                </h3>
                <div id={`answer-${i}`} role="region" aria-labelledby={`question-${i}`} aria-hidden={openFaq !== i} className="t-acc-panel">
                  <div className="t-acc-panel-inner"><p>{a}</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <AriaSiteFooter onBriefing={() => setDialog("Arrange a briefing")} />

      {dialog !== null ? (
        <LandingPreviewDialog
          dialog={dialog}
          authIntent={authIntent}
          prompt={prompt}
          fileName={file?.name}
          inputRef={inputRef}
          onClose={() => setDialog(null)}
          onBeginWorkspace={beginWorkspaceLoad}
        />
      ) : null}

      {bootstrapIntent ? (
        <WorkspaceBootstrapOverlay intent={bootstrapIntent} onFinished={() => setBootstrapIntent(null)} />
      ) : null}
    </div>
  );
}
