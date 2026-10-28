import { internalRoleLabel, type InternalRole } from "./internal-operator-role";

/** Who is signed in: a large initial, the name, the email and the role, at the top of an account page. */
export function InternalProfileHero({ name, email, role }: { name: string; email: string; role: InternalRole }) {
  const initial = (name || email || "?").slice(0, 1).toUpperCase();
  const showName = name && name.trim().toLowerCase() !== email.trim().toLowerCase();
  return (
    <div className="internal-pref-hero">
      <span className="internal-pref-hero__avatar" aria-hidden="true">{initial}</span>
      <div className="internal-pref-hero__text">
        <p className="internal-pref-hero__name">{showName ? name : email}</p>
        {showName ? <p className="internal-pref-hero__email">{email}</p> : null}
      </div>
      <span className={`internal-role-pill internal-role-pill--${role === "support" ? "member" : role}`}>{internalRoleLabel(role)}</span>
    </div>
  );
}
