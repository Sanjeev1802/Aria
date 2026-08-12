import { RequireAuth } from "@/components/chat/RequireAuth";
import { AccountShell } from "@/components/account/AccountShell";
import { ProfilePageClient } from "@/components/account/ProfilePageClient";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <AccountShell
        title="Profile"
        description="Manage how you appear in ARIA and personalize responses for your role."
      >
        <ProfilePageClient />
      </AccountShell>
    </RequireAuth>
  );
}
