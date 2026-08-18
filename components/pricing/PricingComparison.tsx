import { comparisonFeatures } from "@/lib/data/pricing";

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="text-background" aria-label="Included">
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="text-background/30" aria-label="Not included">
        —
      </span>
    );
  }
  return <span className="text-background/80">{value}</span>;
}

export default function PricingComparison() {
  return (
    <section className="rounded-t-2xl bg-dark text-background sm:rounded-t-[2rem] md:rounded-t-[2.5rem] lg:rounded-t-[3rem]">
      <div className="page-container py-16 sm:py-20 md:py-24 lg:py-28">
        <div className="max-w-2xl min-w-0">
          <h2 className="text-section-title font-serif">Compare plans</h2>
          <p className="mt-4 font-serif text-base leading-relaxed text-background/70 sm:mt-5 sm:text-lg">
            A side-by-side look at what each plan includes.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto sm:mt-12 md:mt-16">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-background/15">
                <th className="pb-4 pr-6 font-medium text-background/50">
                  Feature
                </th>
                <th className="pb-4 pr-6 font-medium">Starter</th>
                <th className="pb-4 pr-6 font-medium">Business</th>
                <th className="pb-4 font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-background/10 last:border-0"
                >
                  <td className="py-4 pr-6 font-serif text-background/80">
                    {row.name}
                  </td>
                  <td className="py-4 pr-6">
                    <CellValue value={row.starter} />
                  </td>
                  <td className="py-4 pr-6">
                    <CellValue value={row.business} />
                  </td>
                  <td className="py-4">
                    <CellValue value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
