import ResourcePageHero from "@/components/resources/ResourcePageHero";

export const metadata = {
  title: "Contact — Bnii ARIA",
  description:
    "Get in touch with the Bnii ARIA team — request a demo, start a trial, or talk to sales about enterprise deployments.",
};

export default function ContactPage() {
  return (
    <>
      <ResourcePageHero
        label="Contact"
        title={
          <>
            Let&apos;s bring{" "}
            <span className="hero-underline font-medium">ARIA</span> to your
            team
          </>
        }
        description="Tell us about your organization and we'll help you get started with a trial, demo, or enterprise deployment."
      />

      <section className="page-container pb-16 sm:pb-20 md:pb-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16 xl:gap-20">
          <div className="min-w-0">
            <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              Talk to our team
            </h2>
            <p className="mt-4 font-serif text-base leading-relaxed text-foreground/70 sm:text-lg">
              Whether you are exploring a pilot program or planning an
              enterprise rollout, we are here to help you connect your data and
              start making better decisions with ARIA.
            </p>

            <dl className="mt-10 space-y-6 border-t border-foreground/10 pt-10">
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-foreground/50">
                  Email
                </dt>
                <dd className="mt-2 break-all font-serif text-foreground/80">
                  hello@bniiaria.com
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-foreground/50">
                  Sales
                </dt>
                <dd className="mt-2 break-all font-serif text-foreground/80">
                  sales@bniiaria.com
                </dd>
              </div>
            </dl>
          </div>

          <form className="min-w-0 rounded-[1.25rem] bg-card p-5 sm:rounded-[1.5rem] sm:p-8">
            <div className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/30"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/30"
                />
              </div>
              <div>
                <label
                  htmlFor="company"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  className="w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/30"
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  How can we help?
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="w-full min-w-0 resize-y rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/30"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:w-auto"
            >
              Send message
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
