import { domainHue, type WebSourceLink } from "@/lib/aria-web-sources";

/**
 * Cited web pages under an answer: a round letter avatar and the site name.
 * Avatars are drawn locally, so showing a source sends nothing to a third party.
 */
export function AriaWebSources({ sources }: { sources: readonly WebSourceLink[] }) {
  if (!sources.length) return null;
  return (
    <div className="aria-web-sources" role="group" aria-label="Sources used in this answer">
      <span className="aria-web-sources__label">Sources</span>
      {sources.map(source => (
        <a key={source.url} className="aria-web-source" href={source.url} target="_blank" rel="noopener noreferrer"
          title={`${source.title} — ${source.domain}`}>
          <span className="aria-web-source__avatar" aria-hidden
            style={{ backgroundColor: `hsl(${domainHue(source.domain)} 42% 34%)` }}>
            {source.domain.charAt(0)}
          </span>
          <span className="aria-web-source__name">{source.domain}</span>
          <span className="sr-only">: {source.title}</span>
        </a>
      ))}
    </div>
  );
}
