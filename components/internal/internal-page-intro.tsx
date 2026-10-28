export function InternalPageIntro({
  eyebrow = "Platform operations",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="internal-page-intro">
      <span className="internal-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
