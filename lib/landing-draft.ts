const LANDING_DRAFT_KEY = "aria-landing-draft";

export function stashLandingDraft(text: string) {
  try {
    const value = text.trim();
    if (value) sessionStorage.setItem(LANDING_DRAFT_KEY, value);
    else sessionStorage.removeItem(LANDING_DRAFT_KEY);
  } catch {
    /* private mode */
  }
}

export function takeLandingDraft(): string {
  try {
    const value = sessionStorage.getItem(LANDING_DRAFT_KEY) ?? "";
    sessionStorage.removeItem(LANDING_DRAFT_KEY);
    return value.trim();
  } catch {
    return "";
  }
}
