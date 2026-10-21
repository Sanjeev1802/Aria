import type { Metadata } from "next";
import Link from "next/link";
import { AriaLegalShell, type LegalTocItem } from "@/components/legal/aria-legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — ARIA",
  description: "How ARIA collects, uses, and shares personal data when you use the workspace.",
};

const UPDATED = "21 October 2026";

const toc: LegalTocItem[] = [
  { id: "who", title: "Who we are" },
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use data" },
  { id: "share", title: "How we share data" },
  { id: "search", title: "Public web search" },
  { id: "transfers", title: "Storage and transfers" },
  { id: "retention", title: "Retention" },
  { id: "security", title: "Security" },
  { id: "rights", title: "Your choices" },
  { id: "cookies", title: "Cookies" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes" },
  { id: "contact", title: "Contact" },
];

export default function PrivacyPage() {
  return (
    <AriaLegalShell
      document="privacy"
      title="How ARIA handles your data."
      lead="This Privacy Policy describes the personal data ARIA processes when you create an account, join a workspace, or chat. It is written for the product as it exists today, including local development and configured cloud services."
      updated={UPDATED}
      toc={toc}
    >
      <p className="aria-legal-callout">
        ARIA is not a consumer social network. We process account, workspace, chat, and usage data
        to run the product. We do not sell your personal data. Model providers receive the prompts
        needed to generate a reply. Read this together with our{" "}
        <Link href="/terms/">Terms of Service</Link>.
      </p>

      <section id="who">
        <h2>01 / Who we are</h2>
        <p>
          ARIA is provided by The Binary Holdings (“we”, “us”). If you use a Team workspace, your
          organization may also act as an independent controller for member accounts and content it
          asks you to put into ARIA.
        </p>
      </section>

      <section id="collect">
        <h2>02 / What we collect</h2>
        <p>Depending on how you use ARIA, we may process:</p>
        <ul>
          <li>
            <strong>Account data</strong> — email address, password (handled by the identity provider,
            not stored in ARIA’s ledger), display name, profile photo, and email verification status.
          </li>
          <li>
            <strong>Workspace data</strong> — workspace name, plan, membership, roles, invitations,
            and optional per-member credit limits.
          </li>
          <li>
            <strong>Chat data</strong> — messages you send, model replies, project assignment,
            optional public-search source links saved with an answer, and identifiers used to
            prevent duplicate charges.
          </li>
          <li>
            <strong>Usage data</strong> — token counts reported by the model, credit reservations
            and settlements, timestamps, and coarse request diagnostics (for example request IDs
            and error codes). We aim not to put secrets into ordinary logs.
          </li>
          <li>
            <strong>Device data</strong> — IP address and user agent as seen by the server, and
            session cookies needed to keep you signed in.
          </li>
        </ul>
        <p>
          File processing is not connected in the current product. Do not rely on ARIA to ingest
          attachments until that feature is enabled and described here.
        </p>
      </section>

      <section id="use">
        <h2>03 / How we use data</h2>
        <p>We use personal data to:</p>
        <ul>
          <li>Create and authenticate accounts, and keep sessions in HttpOnly cookies.</li>
          <li>Operate workspaces, invitations, and access control.</li>
          <li>Generate, stream, and save chats, and enforce plan, rate, and credit rules.</li>
          <li>Send transactional email such as Team invitations when email is configured.</li>
          <li>Secure the service, debug failures, and improve reliability.</li>
          <li>Comply with law and respond to valid legal requests.</li>
        </ul>
        <p>
          We do not use your chats to advertise to you. Product settings may describe “training on
          my content” as off; we do not train our own foundation models on customer chats in this
          product. Model providers process prompts to produce replies under their terms.
        </p>
      </section>

      <section id="share">
        <h2>04 / How we share data</h2>
        <p>We share data with processors who help us run ARIA, including:</p>
        <ul>
          <li>Amazon Cognito for sign-up, sign-in, confirmation, and password reset.</li>
          <li>Amazon Bedrock and, when configured, Anthropic for model inference.</li>
          <li>Amazon DynamoDB in production (or a local store in development) for accounts, chats, and the credit ledger.</li>
          <li>Transactional email (OneWave when configured) for Team invitation messages.</li>
        </ul>
        <p>
          Workspace admins and members can see content visible in that workspace. We may disclose
          information if required by law, to protect users or the service, or in connection with a
          corporate transaction, with appropriate safeguards.
        </p>
      </section>

      <section id="search">
        <h2>05 / Public web search</h2>
        <p>
          If your deployment enables public web search, ARIA sends a short query you explicitly
          choose to search to a configured SearXNG instance, then may pass bounded snippets to the
          model and save result links with the answer. That query is public-web search, not retrieval
          of private company systems. Do not put secrets or customer records in a search query.
          Upstream search engines may receive the query according to that instance’s configuration.
        </p>
      </section>

      <section id="transfers">
        <h2>06 / Storage and transfers</h2>
        <p>
          Production identity and infrastructure for this project are commonly hosted in AWS
          Asia Pacific (Singapore) and related regions used by inference profiles. Local development
          may keep data on the machine running ARIA. If you access ARIA from another country, your
          data may be processed in the regions where we and our providers operate.
        </p>
      </section>

      <section id="retention">
        <h2>07 / Retention</h2>
        <p>
          We keep account and workspace records while the account or workspace exists. Saved chats
          and credit events remain until you or an admin delete them, or until we delete a workspace
          or close the service. Session cookies last for the signed-in session and refresh cycle.
          We may keep a limited subset of records as required for security, dispute, or legal reasons.
        </p>
        <p>
          Account deletion and export controls in Settings describe intended product behavior;
          some of those actions are still being completed. Contact us if you need help deleting
          personal data we hold.
        </p>
      </section>

      <section id="security">
        <h2>08 / Security</h2>
        <p>
          We use HTTPS in production, server-side session cookies, server verification of identity
          tokens, and server-enforced workspace permissions. No method of transmission or storage
          is perfectly secure. You are responsible for the devices and networks you use to access ARIA.
        </p>
      </section>

      <section id="rights">
        <h2>09 / Your choices</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or export
          personal data, or to object to or restrict certain processing. You can update your
          display name and photo in Account settings, leave or be removed from a Team workspace,
          and sign out to end the current session.
        </p>
        <p>
          To make a privacy request, contact The Binary Holdings through{" "}
          <a href="https://www.thebinaryholdings.com/" target="_blank" rel="noopener noreferrer">
            thebinaryholdings.com
          </a>
          . We may need to verify the request. If an organization administers your workspace, we
          may redirect you to that organization.
        </p>
      </section>

      <section id="cookies">
        <h2>10 / Cookies</h2>
        <p>
          ARIA uses necessary cookies and similar storage to keep you signed in and to apply
          security checks on form submissions. These are not advertising cookies. If you block
          them, sign-in and chat will not work correctly.
        </p>
      </section>

      <section id="children">
        <h2>11 / Children</h2>
        <p>
          ARIA is not directed at children under 18, and we do not knowingly collect their personal
          data. If you believe a child has created an account, contact us and we will take steps
          to delete it.
        </p>
      </section>

      <section id="changes">
        <h2>12 / Changes</h2>
        <p>
          We may update this Policy as ARIA changes. The effective date at the top of this page
          will change when we do. Continued use after an update means you accept the revised Policy.
        </p>
      </section>

      <section id="contact">
        <h2>13 / Contact</h2>
        <p>
          Privacy questions: The Binary Holdings,{" "}
          <a href="https://www.thebinaryholdings.com/" target="_blank" rel="noopener noreferrer">
            thebinaryholdings.com
          </a>
          . Related: <Link href="/terms/">Terms of Service</Link>.
        </p>
      </section>
    </AriaLegalShell>
  );
}
