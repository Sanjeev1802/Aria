"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AriaMark } from "@/components/aria-mark";
import { ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronDown, Code2, Copy, FileText, Layers3, LockKeyhole, Menu, ShieldCheck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AriaPricingGrid } from "@/components/landing/aria-pricing-grid";
import { AriaSiteFooter } from "@/components/landing/aria-site-footer";
import { TdevHeroComposer } from "@/components/landing/tdev-hero-composer";
import { WorkspaceBootstrapOverlay } from "@/components/auth/workspace-bootstrap-overlay";
import { workspaceAuthIntentFromDialog, type WorkspaceAuthIntent } from "@/lib/workspace-auth-dialog";

const marketPartners = [
  { name: "Telkomsel", logo: "/partners/telkomsel.svg", logoHeight: "26px" },
  { name: "Indosat Ooredoo", logo: "/partners/indosat.svg", logoHeight: "24px" },
  { name: "Globe Telecom", logo: "/partners/globe.svg", logoHeight: "22px" },
  { name: "Dialog Axiata", logo: "/partners/dialog.svg", logoHeight: "24px" },
  { name: "Banglalink", logo: "/partners/banglalink.svg", logoHeight: "28px" },
  { name: "Robi", logo: "/partners/robi.svg", logoHeight: "26px" },
  { name: "MTN", logo: "/partners/mtn.svg", logoHeight: "28px" },
  { name: "Ethio telecom", logo: "/partners/ethiotelecom.jpg", logoHeight: "32px" },
] as const;
const faqs = [
  ["What is ARIA?", "ARIA is a conversational workspace that brings AI models, your documents, and approved business intelligence together. Ask a question, explore the evidence, and turn what you learn into your next step."],
  ["Which AI models can I use?", "ARIA is designed to support Anthropic Claude and Amazon Nova through Amazon Bedrock. Model availability will depend on your plan, region, and workspace permissions. This preview lets you explore the model selector; it does not call a live model."],
  ["What makes ARIA Intelligence different?", "On Pro and Team, ARIA Intelligence connects your questions to business data your organization is authorized to use. Answers should show their sources, time period, and limitations. A subscription does not automatically grant access to every dataset."],
  ["How do credits work?", "Credits are your usage budget. Each request uses credits based on the model, tokens processed, and any paid data operations. Chat and API requests share the same balance. Included credits renew monthly and do not roll over. The prices and allowances shown here are proposed launch terms."],
  ["Can I use ARIA in my own application?", "Yes—the Pro and Team plans include developer API access in the product plan. You'll be able to create scoped keys, set spending limits, and monitor usage. Keep those keys on your server. The API is not live in this design preview."],
  ["How does Team work?", "The proposed Team plan includes five seats and a shared credit pool. An admin invites teammates, connects approved ARIA sources, and controls access. Sharing a workspace does not automatically share everyone's private conversations."],
  ["Can I try it for free?", "Free is designed to include 200 monthly credits for general chat, without developer API access. This site is an interactive product preview: account creation, payments, file processing, and live AI responses are not enabled yet."],
];

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add("is-shown"); observer.unobserve(el); }
    }, { threshold: 0.12 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`t-stagger ${className}`}><div className="t-stagger-line">{children}</div></div>;
}

function ModelsIllustration() {
  const [selected, setSelected] = useState("Claude");
  return <div className="feature-art model-art">
    <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
    <div className="model-panel mini-panel">
      <div className="mini-heading"><span>One conversation. Your choice.</span><Layers3 size={15}/></div>
      {[{name:"Claude",desc:"Thoughtful writing & deep analysis",icon:"✳"},{name:"Amazon Nova",desc:"Fast thinking for everyday work",icon:"✦"}].map(m=><button className={`model-option ${selected===m.name?"chosen":""}`} key={m.name} onClick={()=>setSelected(m.name)} aria-pressed={selected===m.name}><span className={`model-icon ${m.name==="Claude"?"claude-icon":"nova-icon"}`}>{m.icon}</span><span><b>{m.name}</b><small>{m.desc}</small></span><span className="choice-circle">{selected===m.name && <Check size={12}/>}</span></button>)}
      <div className="mini-foot"><ShieldCheck size={12}/> Your context stays in the conversation</div>
    </div>
    <div className="floating-note"><span className="small-mark"><AriaMark/></span> Many models. One ARIA.</div>
    <span className="art-caption">INTERACTIVE MODEL PREVIEW</span>
  </div>;
}

function IntelligenceIllustration() {
  return <div className="feature-art intelligence-art">
    <div className="source-pill pill-back"><FileText size={14}/><span>Market overview.pdf</span><Check size={13}/></div>
    <div className="insight-panel mini-panel"><div className="mini-heading"><span><AriaMark/> ARIA Intelligence</span><span className="tiny-status">Example</span></div><h4>Clarity, with the context.</h4><p>Compare your markets using a consistent view of engagement and growth.</p><div className="chart" aria-label="Illustrative chart, not real market data">{[38,54,44,64,58,78,70,90,82,100].map((h,i)=><span style={{height:`${h}%`,animationDelay:`${i*40}ms`}} key={i}/>)}</div><div className="chart-labels"><span>Engagement over time</span><span>Illustrative</span></div><div className="source-reference"><FileText size={12}/> Source-linked insights <ArrowUp size={12}/></div></div>
    <div className="floating-note evidence-note"><ShieldCheck size={15}/> Your data. Your permissions.</div><span className="art-caption">ILLUSTRATIVE INTELLIGENCE</span>
  </div>;
}

function TeamIllustration() {
  return <div className="feature-art team-art"><div className="team-panel mini-panel"><div className="mini-heading"><span><span className="workspace-icon">S</span> Studio workspace <ChevronDown size={12}/></span><span className="team-badge">TEAM</span></div><h4>Great minds, together.</h4><p>A shared space for your next big idea.</p><div className="team-people">{[{initial:"JL",name:"Jamie Lee",role:"Admin",color:"peach"},{initial:"SK",name:"Sam Kim",role:"Member",color:"blue"},{initial:"AP",name:"Alex Park",role:"Member",color:"purple"}].map(p=><div className="person" key={p.initial}><span className={`avatar ${p.color}`}>{p.initial}</span><span>{p.name}</span><small>{p.role}</small></div>)}</div><div className="credit-label"><span>Shared monthly credits</span><b>20,000</b></div><div className="credit-track"><span/></div></div><div className="floating-note team-note"><Users size={15}/><span>A little more connected.</span></div><span className="art-caption">EXAMPLE TEAM WORKSPACE</span></div>;
}

const apiSnippet = `const response = await aria.responses.create({\n  mode: "intelligence",\n  messages: [{\n    role: "user",\n    content: "What should we explore next?"\n  }],\n  stream: true\n});`;

function ApiIllustration() {
  const [copied,setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(()=>()=>{if(timer.current) clearTimeout(timer.current);},[]);
  async function copy() {
    try {await navigator.clipboard.writeText(apiSnippet);setCopied(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setCopied(false),2000);} catch {setCopied(false);}
  }
  return <div className="feature-art api-art"><div className="code-panel"><div className="code-top"><span className="window-dots"><i/><i/><i/></span><span>your-next-idea.ts</span><button onClick={copy} aria-label={copied?"Copied example":"Copy API example"}>{copied?<Check size={14}/>:<Copy size={14}/>}</button></div><pre aria-label="Illustrative TypeScript SDK example"><code><span className="code-purple">const</span> response = <span className="code-purple">await</span> aria.responses.<span className="code-yellow">create</span>({"{"}{"\n"}  mode: <span className="code-green">"intelligence"</span>,{"\n"}  messages: [{"{"}{"\n"}    role: <span className="code-green">"user"</span>,{"\n"}    content: <span className="code-green">"What should we explore next?"</span>{"\n"}  {"}"}],{"\n"}  stream: <span className="code-purple">true</span>{"\n"}{"}"});</code></pre><div className="code-footer"><span><span className="live-dot"/>Built for your workflow</span><span>SDK concept</span></div></div><div className="floating-note api-note"><Code2 size={15}/> Your app. ARIA inside.</div><span className="art-caption">PROPOSED API EXPERIENCE</span></div>;
}

export default function Home() {
  const router = useRouter();
  const [prompt,setPrompt]=useState("");
  const [model,setModel]=useState("Auto");
  const [file,setFile]=useState<File|null>(null);
  const [fileError,setFileError]=useState("");
  const [dialog,setDialog]=useState<string|null>(null);
  const [menu,setMenu]=useState(false);
  const [openFaq,setOpenFaq]=useState<number|null>(0);
  const inputRef=useRef<HTMLTextAreaElement>(null);
  const uploadRef=useRef<HTMLInputElement>(null);
  const draftRef=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
  const [bootstrapIntent,setBootstrapIntent]=useState<WorkspaceAuthIntent|null>(null);
  const authIntent=workspaceAuthIntentFromDialog(dialog);
  useEffect(()=>{const id=requestAnimationFrame(()=>setReady(true));return ()=>cancelAnimationFrame(id);},[]);
  function goCompose(){document.getElementById("start")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});inputRef.current?.focus({preventScroll:true});}
  function goToChat(){if(!prompt.trim())return;const params=new URLSearchParams({q:prompt.trim(),model});router.push(`/chat/?${params.toString()}`);}
  function beginWorkspaceLoad(intent:WorkspaceAuthIntent){setDialog(null);setBootstrapIntent(intent);}
  return <div className="aria-tdev-page">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><a href="#" className="brand" aria-label="ARIA home"><AriaMark/><span>ARIA</span></a><nav aria-label="Main navigation" className="desktop-nav"><a href="#features">Features</a><a href="/pricing/">Pricing</a><a href="#faq">FAQ</a></nav><div className="nav-actions"><Button className="sign-in" variant="ghost" asChild>
            <Link href="/sign-in/">
              Sign in
              <ArrowUpRight className="signin-arrow" size={14} strokeWidth={2} aria-hidden />
            </Link>
          </Button><Button variant="ghost" size="icon" className="mobile-menu" aria-label={menu?"Close navigation":"Open navigation"} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</Button></div>{menu&&<nav className="mobile-nav" aria-label="Mobile navigation">{["Features","Pricing","FAQ"].map(x=><a key={x} href={`#${x.toLowerCase()}`} onClick={()=>setMenu(false)}>{x}</a>)}</nav>}</header>
    <main id="main">
      <section className="hero aria-tdev-hero" id="start">
        <header className={`header cm-hero home-hero t-stagger ${ready ? "is-shown" : ""}`}>
          <h1 className="title t-stagger-line">
            Think once.
            <br />
            <span>Know more.</span>
          </h1>
          <p className="subtitle t-stagger-line t-stagger-line--2">
            The models you trust. The context you own. One conversation that never loses the thread —{" "}
            <strong>ARIA</strong>.
          </p>
          <div ref={draftRef} className="t-stagger-line t-stagger-line--3">
            <TdevHeroComposer
              prompt={prompt}
              onPromptChange={setPrompt}
              onSubmit={goToChat}
              inputRef={inputRef}
              model={model}
              onModelChange={setModel}
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
        <section className="home-customers" aria-label="Inside the apps of national operators across 10 countries">
          <p className="pro-customers-label">Inside the apps of national operators across 10 countries</p>
          <div className="pro-customers-carousel">
            <div className="pro-customers-track" aria-hidden="true">
              {[...marketPartners, ...marketPartners].map((partner, index) => (
                <img
                  key={`${partner.name}-${index}`}
                  className="pro-customer-logo"
                  src={partner.logo}
                  alt=""
                  style={{ ["--logo-h" as string]: partner.logoHeight }}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
            <ul className="sr-only">
              {marketPartners.map((partner) => (
                <li key={partner.name}>{partner.name}</li>
              ))}
            </ul>
          </div>
        </section>
      </section>

      <section className="features section-container" id="features"><Reveal><div className="section-heading"><span className="section-kicker">THINK BIGGER. WORK SIMPLER.</span><h2>A little less friction.<br/>A lot more possibility.</h2><p>From the first question to your next move.<br/>Intelligence that fits the way you work.</p></div></Reveal>
        <div className="feature-list">
          <Reveal><article className="feature-row"><ModelsIllustration/><div className="feature-copy"><span className="feature-number">01 / YOUR MODELS</span><h3>The right mind.<br/>For every moment.</h3><p>Write with Claude. Explore with Nova. Switch between powerful models without switching your workspace—or losing the thread.</p><button className="text-link" onClick={goCompose}>Find your flow <ArrowRight size={15}/></button></div></article></Reveal>
          <Reveal><article className="feature-row reverse"><IntelligenceIllustration/><div className="feature-copy"><span className="feature-number">02 / YOUR INTELLIGENCE</span><h3>Answers that know<br/>where you’re coming from.</h3><p>Bring your documents and approved business data into the conversation. Get a clearer picture, with sources you can follow and context you can trust.</p><a className="text-link" href="#pricing">Explore ARIA Intelligence <ArrowRight size={15}/></a></div></article></Reveal>
          <Reveal><article className="feature-row"><TeamIllustration/><div className="feature-copy"><span className="feature-number">03 / YOUR PEOPLE</span><h3>Good thinking.<br/>Better together.</h3><p>Give your team a shared place to move forward. Invite your people, connect approved knowledge, and keep access and credits in your control.</p><button className="text-link" onClick={()=>setDialog("Meet ARIA Team")}>Make room for your team <ArrowRight size={15}/></button></div></article></Reveal>
          <Reveal><article className="feature-row reverse"><ApiIllustration/><div className="feature-copy"><span className="feature-number">04 / YOUR NEXT BUILD</span><h3>Your application.<br/>A little more intelligent.</h3><p>Take ARIA beyond the chat. Bring intelligence into your own product with scoped API keys, clear usage limits, and the same credits you already use.</p><button className="text-link" onClick={()=>setDialog("Build with the ARIA API")}>Built for builders <ArrowRight size={15}/></button></div></article></Reveal>
        </div><p className="feature-preview-note">A look at what’s coming. Product illustrations use example content.</p>
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

      <section className="faq section-container" id="faq"><div className="faq-intro"><span className="section-kicker">A LITTLE MORE CLARITY</span><h2>Good questions.<br/>Straight answers.</h2><p>The things you might be wondering.</p><span className="faq-spark"><AriaMark/></span></div><div className="faq-list">{faqs.map(([q,a],i)=><div key={q} className="t-acc faq-item" data-open={openFaq===i}><h3><button id={`question-${i}`} className="t-acc-head" aria-expanded={openFaq===i} aria-controls={`answer-${i}`} onClick={()=>setOpenFaq(openFaq===i?null:i)}>{q}<span className="t-acc-chevron"><ChevronDown size={17}/></span></button></h3><div id={`answer-${i}`} role="region" aria-labelledby={`question-${i}`} aria-hidden={openFaq!==i} className="t-acc-panel"><div className="t-acc-panel-inner"><p>{a}</p></div></div></div>)}</div></section>

    </main>
    <AriaSiteFooter onBriefing={() => setDialog("Arrange a briefing")} />

    <Dialog open={dialog!==null} onOpenChange={open=>{if(!open)setDialog(null);}}>
      <DialogContent className="aria-dialog">
        <DialogHeader>
          <div className="dialog-brand"><AriaMark/></div>
          <DialogTitle>{dialog}</DialogTitle>
          <DialogDescription>
            {authIntent
              ? "Preview only — no real account is created. You’ll see a short workspace load, then enter ARIA."
              : "This is an interactive design preview. Accounts, payments, and live AI responses aren’t connected yet."}
          </DialogDescription>
        </DialogHeader>
        {authIntent && (
          <label className="auth-dialog-field">
            <span>Email</span>
            <input type="email" autoComplete="email" placeholder="you@company.com" defaultValue="" />
          </label>
        )}
        {prompt.trim() && !authIntent && (
          <div className="draft-preview">
            <span>YOUR DRAFT · {model.toUpperCase()}</span>
            <p>{prompt}</p>
            {file && <small>Attachment selected: {file.name}</small>}
          </div>
        )}
        {dialog?.includes("API") && (
          <div className="api-preview-info">
            <Code2 size={20}/>
            <p>Planned for Pro and Team: scoped keys, streaming responses, project spending caps, and one shared credit balance.</p>
          </div>
        )}
        <p className="dialog-note"><LockKeyhole size={14}/> Nothing has been sent or charged.</p>
        {authIntent ? (
          <Button
            className="dialog-button"
            onClick={() => beginWorkspaceLoad(authIntent)}
          >
            {authIntent === "sign-in" ? "Sign in" : "Create account"}
            <ArrowRight size={16}/>
          </Button>
        ) : (
          <Button
            className="dialog-button"
            onClick={() => { setDialog(null); setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50); }}
          >
            Keep exploring <ArrowRight size={16}/>
          </Button>
        )}
      </DialogContent>
    </Dialog>

    {bootstrapIntent && (
      <WorkspaceBootstrapOverlay intent={bootstrapIntent} onFinished={() => setBootstrapIntent(null)} />
    )}
  </div>;
}
