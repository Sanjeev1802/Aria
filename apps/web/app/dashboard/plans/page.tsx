import { RequireAuth } from "@/components/chat/RequireAuth";
import { AccountShell } from "@/components/account/AccountShell";
import { PlansPageClient } from "@/components/account/PlansPageClient";

export default function PlansPage() {
  return (
    <RequireAuth>
      <AccountShell
        title="Upgrade your plan"
        description="Choose a plan that matches your team’s volume — Free, Plus, Business, or Enterprise."
      >
        <PlansPageClient />
      </AccountShell>
    </RequireAuth>
  );
}
