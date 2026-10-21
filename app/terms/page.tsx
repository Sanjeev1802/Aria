import type { Metadata } from "next";
import Link from "next/link";
import { AriaLegalShell, type LegalTocItem } from "@/components/legal/aria-legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service — ARIA",
  description: "The terms that govern your use of ARIA, the conversational workspace from The Binary Holdings.",
};

const UPDATED = "21 October 2026";

const toc: LegalTocItem[] = [
  { id: "agreement", title: "The agreement" },
  { id: "service", title: "The service" },
  { id: "accounts", title: "Accounts and workspaces" },
  { id: "use", title: "Acceptable use" },
  { id: "content", title: "Your content" },
  { id: "outputs", title: "Model outputs" },
  { id: "credits", title: "Plans and credits" },
  { id: "providers", title: "Third-party providers" },
  { id: "availability", title: "Availability and changes" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Liability" },
  { id: "termination", title: "Suspension and termination" },
  { id: "law", title: "Governing law" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <AriaLegalShell
      document="terms"
      title="The terms for using ARIA."
      lead="These Terms of Service explain how you may use ARIA, what we provide, and what we need from you. They apply when you create an account, join a workspace, or use chat and related features."
      updated={UPDATED}
      toc={toc}
    >
      <p className="aria-legal-callout">
        ARIA is operated by The Binary Holdings. The product is under active development.
        Features shown in marketing, including payments, file analysis, business-data retrieval,
        and a public developer API, may not be live. If a feature is not available in your workspace,
        these terms do not promise it.
      </p>

      <section id="agreement">
        <h2>01 / The agreement</h2>
        <p>
          By accessing or using ARIA you agree to these Terms and to our{" "}
          <Link href="/privacy/">Privacy Policy</Link>. If you use ARIA on behalf of an organization,
          you confirm that you have authority to bind that organization, and “you” includes that organization.
        </p>
        <p>
          If you do not agree, do not create an account or use the service. We may update these Terms.
          Continued use after an update means you accept the revised Terms. Material changes will be
          indicated by a new effective date on this page.
        </p>
      </section>

      <section id="service">
        <h2>02 / The service</h2>
        <p>
          ARIA is a conversational workspace. Depending on configuration and your plan, it may let you
          sign in, manage a personal or Team workspace, send messages to supported language models,
          save chats and projects, invite teammates, and see credit usage.
        </p>
        <p>
          ARIA does not grant you a right to any particular model, region, or capacity. We may choose,
          replace, or limit the Amazon Nova model for quality, safety, cost, or
          availability. Optional public web search, when enabled, looks up short public queries and is
          not access to your organization’s private systems.
        </p>
      </section>

      <section id="accounts">
        <h2>03 / Accounts and workspaces</h2>
        <p>
          You must provide accurate account details and keep your credentials confidential. You are
          responsible for activity under your account. Workspace owners and admins control membership,
          invitations, and, where available, per-member credit limits.
        </p>
        <ul>
          <li>You must be at least 18 years old to use ARIA.</li>
          <li>Do not share sign-in credentials or session cookies.</li>
          <li>Team invitations are meant for people you are authorized to invite.</li>
          <li>Removing a member is intended to cut off further access immediately for new requests.</li>
        </ul>
        <p>
          You must not attempt to access another person’s workspace, chats, credits, or profile.
          We design ARIA so the server—not the browser—decides who may use a workspace and which
          plan rules apply.
        </p>
      </section>

      <section id="use">
        <h2>04 / Acceptable use</h2>
        <p>You may use ARIA only for lawful purposes. You agree not to:</p>
        <ul>
          <li>Break the law, or ask ARIA to help you commit crime, fraud, or abuse.</li>
          <li>Upload or paste malware, or try to probe, scan, or disrupt ARIA or its providers.</li>
          <li>Bypass rate limits, credit holds, authentication, or workspace permissions.</li>
          <li>Misrepresent ARIA’s answers as professional, legal, medical, or financial advice.</li>
          <li>Send secrets, payment card numbers, government ID numbers, or special-category data you are not allowed to process.</li>
          <li>Use public web search for private documents, customer records, or confidential business files.</li>
          <li>Resell access, scrape the service, or use outputs to train competing models except as allowed by law.</li>
        </ul>
      </section>

      <section id="content">
        <h2>05 / Your content</h2>
        <p>
          You retain rights in the prompts, files, names, and other material you submit (“Your Content”).
          You grant The Binary Holdings a limited license to host, process, transmit, and display Your
          Content only as needed to operate ARIA for you and your workspace—including running models,
          saving chats, measuring usage, preventing abuse, and providing support.
        </p>
        <p>
          You represent that you have the rights to submit Your Content and that doing so does not
          infringe others’ rights. Workspace members may see content shared in that workspace according
          to the product’s sharing model. Do not treat ARIA as a system of record for regulated archives
          unless we have a written agreement that says otherwise.
        </p>
      </section>

      <section id="outputs">
        <h2>06 / Model outputs</h2>
        <p>
          ARIA generates text using third-party models. Outputs can be incomplete, outdated, or wrong.
          They are not advice. You must review them before relying on them, publishing them, or using
          them in production systems.
        </p>
        <p>
          Unless a separate agreement says otherwise, we do not claim ownership of model outputs
          generated for you, to the extent the law allows. Provider terms may still apply to how
          those models process prompts. ARIA is instructed not to invent private company data or live
          facts it was not given; you remain responsible for checking sources.
        </p>
      </section>

      <section id="credits">
        <h2>07 / Plans and credits</h2>
        <p>
          Free, Pro, and Team entitlements, included credits, seats, and model access are defined by
          the server. Credits are a usage budget, not cash. Included credits typically reset on a UTC
          calendar month and do not roll over unless we say otherwise.
        </p>
        <p>
          Chat requests reserve credits before a model call and settle using reported token usage.
          Failed or incomplete requests should release an unused hold. Repeating a completed request
          identifier is intended to return the saved answer rather than charge again.
        </p>
        <p>
          Prices and allowances shown on the marketing site are proposed launch terms until checkout
          is enabled. We do not process subscription payments in the current product. If billing
          launches later, charges, taxes, refunds, upgrades, and cancellations will be described at
          purchase time and may update these Terms.
        </p>
      </section>

      <section id="providers">
        <h2>08 / Third-party providers</h2>
        <p>
          ARIA relies on infrastructure and model providers, which may include Amazon Web Services
          (identity, storage, and Bedrock inference), transactional email,
          and optional self-hosted search. Their terms and privacy notices apply to their processing.
          We are not responsible for outages, policy changes, or content filters those providers apply.
        </p>
      </section>

      <section id="availability">
        <h2>09 / Availability and changes</h2>
        <p>
          We aim for a reliable service but do not guarantee uninterrupted or error-free operation.
          We may modify, suspend, or discontinue features, including during development and staging.
          We may impose limits to protect the service, other customers, or providers.
        </p>
      </section>

      <section id="disclaimers">
        <h2>10 / Disclaimers</h2>
        <p>
          ARIA is provided “as is” and “as available.” To the fullest extent permitted by law, we
          disclaim warranties of merchantability, fitness for a particular purpose, title, quiet
          enjoyment, and non-infringement. We do not warrant that outputs will be accurate, that
          content will be preserved without loss, or that the service will meet your compliance needs.
        </p>
      </section>

      <section id="liability">
        <h2>11 / Liability</h2>
        <p>
          To the fullest extent permitted by law, The Binary Holdings and its affiliates, officers,
          and contractors will not be liable for indirect, incidental, special, consequential, or
          punitive damages, or for lost profits, lost data, or business interruption, even if advised
          of the possibility.
        </p>
        <p>
          Our total liability for claims relating to ARIA will not exceed the greater of (a) the
          amounts you paid us for ARIA in the three months before the claim, or (b) fifty US dollars.
          Some places do not allow these limits; in those places our liability is limited to the
          maximum permitted by law.
        </p>
      </section>

      <section id="termination">
        <h2>12 / Suspension and termination</h2>
        <p>
          You may stop using ARIA at any time. We may suspend or end access if you breach these Terms,
          if required by law or a provider, or if we discontinue the product. After termination,
          licenses you granted for operating the service end except for copies we must keep for legal,
          security, or backup purposes as described in the Privacy Policy.
        </p>
      </section>

      <section id="law">
        <h2>13 / Governing law</h2>
        <p>
          These Terms are governed by the laws of Singapore, without regard to conflict-of-law rules.
          Courts in Singapore have exclusive jurisdiction, except that we may seek injunctive relief
          anywhere to protect the service or intellectual property. If a provision is unenforceable,
          the rest remains in effect.
        </p>
      </section>

      <section id="contact">
        <h2>14 / Contact</h2>
        <p>
          Questions about these Terms: The Binary Holdings, via{" "}
          <a href="https://www.thebinaryholdings.com/" target="_blank" rel="noopener noreferrer">
            thebinaryholdings.com
          </a>
          . Related: <Link href="/privacy/">Privacy Policy</Link>.
        </p>
      </section>
    </AriaLegalShell>
  );
}
