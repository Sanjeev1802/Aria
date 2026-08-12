import { RequireAuth } from "@/components/chat/RequireAuth";
import { AccountShell } from "@/components/account/AccountShell";
import { UsagePageClient } from "@/components/account/UsagePageClient";

export default function UsagePage() {
  return (
    <RequireAuth>
      <AccountShell
        title="Usage"
        description="Track tokens against your monthly plan limit, similar to ChatGPT’s usage dashboard."
      >
        <UsagePageClient />
      </AccountShell>
    </RequireAuth>
  );
}
