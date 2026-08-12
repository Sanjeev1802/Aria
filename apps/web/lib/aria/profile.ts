export type ProfileData = {
  displayName: string;
  jobTitle: string;
  company: string;
  bio: string;
  preferredTone: "concise" | "balanced" | "detailed";
};

const PROFILE_KEY = "aria.workspace.profile.v1";

export const defaultProfile = (): ProfileData => ({
  displayName: "",
  jobTitle: "",
  company: "",
  bio: "",
  preferredTone: "balanced",
});

export function loadProfile(): ProfileData {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<ProfileData>;
    return {
      ...defaultProfile(),
      ...parsed,
      preferredTone:
        parsed.preferredTone === "concise" ||
        parsed.preferredTone === "detailed" ||
        parsed.preferredTone === "balanced"
          ? parsed.preferredTone
          : "balanced",
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: ProfileData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
