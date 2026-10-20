/** transitions.dev error-state-shake — replay shake + auto-revert on a `.t-input-wrap`. */
type WrapWithTimer = HTMLElement & { _revertTimer?: number | null };

export function showInputError(wrap: HTMLElement | null) {
  if (!wrap) return;
  const input = wrap.querySelector(".t-input") as HTMLElement | null;
  if (!input) return;

  const cs = getComputedStyle(document.documentElement);
  // CSS minification may rewrite "3000ms" as "3s".
  const ms = (name: string, fb: number) => {
    const raw = cs.getPropertyValue(name).trim();
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return fb;
    return raw.endsWith("ms") ? v : raw.endsWith("s") ? v * 1000 : v;
  };

  wrap.classList.add("is-error");
  input.classList.add("is-error");

  input.classList.remove("is-shaking");
  void input.offsetWidth;
  input.classList.add("is-shaking");

  const shakeMs = ms("--shake-dur-a", 80) * 2 + ms("--shake-dur-b", 60) * 2;
  window.setTimeout(() => input.classList.remove("is-shaking"), shakeMs + 20);

  const w = wrap as WrapWithTimer;
  if (w._revertTimer) clearTimeout(w._revertTimer);
  const hold = ms("--revert-hold", 3000);
  w._revertTimer = window.setTimeout(() => {
    w._revertTimer = null;
    wrap.classList.remove("is-error");
    input.classList.remove("is-error");
  }, shakeMs + hold);
}

export function clearInputError(wrap: HTMLElement | null) {
  if (!wrap) return;
  const w = wrap as WrapWithTimer;
  if (w._revertTimer) {
    clearTimeout(w._revertTimer);
    w._revertTimer = null;
  }
  wrap.classList.remove("is-error");
  wrap.querySelector(".t-input")?.classList.remove("is-error");
}
