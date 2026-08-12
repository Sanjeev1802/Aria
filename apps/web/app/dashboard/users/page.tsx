import { RequireAuth } from "@/components/chat/RequireAuth";
import { RequireAdmin } from "@/components/account/RequireAdmin";
import { AccountShell } from "@/components/account/AccountShell";
import { UsersPageClient } from "@/components/account/UsersPageClient";

export default function UsersPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AccountShell
          title="Users"
          description="Invite people to this workspace and assign Admin or User roles. Admins can see and manage everyone."
        >
          <UsersPageClient />
        </AccountShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
