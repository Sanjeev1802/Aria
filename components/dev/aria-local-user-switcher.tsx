"use client";

import { refreshAriaSession, useAriaSession } from "@/lib/aria-session";
import { selectLocalUser, type LocalUserSlot } from "@/lib/aria-local-dev";

export function AriaLocalUserSwitcher() {
  const session = useAriaSession();
  if (!session.localDev || !session.localUsers?.length) return null;
  const active = session.localUser ?? "alex";

  const onChange = async (slot: LocalUserSlot) => {
    if (slot === active) return;
    await selectLocalUser(slot);
    await refreshAriaSession();
  };

  return (
    <div className="aria-local-user-switcher" role="group" aria-label="Local development user">
      <span className="aria-local-user-switcher__label">Local user</span>
      <div className="aria-local-user-switcher__buttons">
        {session.localUsers.map(user => (
          <button
            key={user.slot}
            type="button"
            className={user.slot === active ? "aria-local-user-switcher__btn is-active" : "aria-local-user-switcher__btn"}
            aria-pressed={user.slot === active}
            onClick={() => void onChange(user.slot)}
          >
            {user.label}
          </button>
        ))}
      </div>
    </div>
  );
}
