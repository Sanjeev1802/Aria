"use client";

import {
  SettingsBlock,
  SettingsBlockInset,
  SettingsPanel,
} from "@/components/account/aria-settings-panel-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ARIA_TEAM_INCLUDED_SEATS, inviteAriaTeamMember, removeAriaTeamMember } from "@/lib/aria-team-storage";
import { previewTeamWorkspace } from "@/lib/aria-team-preview";
import {
  fetchAriaTeam,
  inviteAriaTeamMemberApi,
  removeAriaTeamMemberApi,
  setAriaTeamMemberLimitApi,
  type AriaTeamApiMember,
  type AriaTeamApiWorkspace,
} from "@/lib/aria-team-api";
import { ARIA_IS_PREVIEW } from "@/lib/aria-session";
import { cn } from "@/lib/utils";
import { Copy, Mail, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function initialsFromMember(member: AriaTeamApiMember) {
  if (member.name.trim()) {
    return member.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return (member.email[0] ?? "?").toUpperCase();
}

function TeamMemberRow({
  member,
  selfId,
  canManage,
  actorRole,
  onRemove,
  onLimit,
  savingLimit,
  limitError,
}: {
  member: AriaTeamApiMember;
  selfId: string;
  canManage: boolean;
  actorRole: "owner" | "admin" | "member";
  onRemove: (id: string) => void;
  onLimit: (id: string, limit: number | null) => void;
  savingLimit: boolean;
  limitError: string | null;
}) {
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState("");
  const isSelf = member.id === selfId;
  const canRemove = canManage && !isSelf && member.role !== "owner" && member.status === "active";
  const isInvite = member.status !== "active";
  const canSetLimit = canManage && !ARIA_IS_PREVIEW && !isInvite && member.role !== "owner" &&
    (actorRole === "owner" || member.role === "member");

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar className="size-9 shrink-0 text-xs">
        <AvatarFallback className="bg-muted font-medium">{initialsFromMember(member)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.name}</p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        {!isInvite && member.budget ? <p className="mt-1 text-xs text-muted-foreground">
          {member.budget.used.toLocaleString()} used · {member.budget.limit === null
            ? "No individual limit" : `${member.budget.limit.toLocaleString()} credit monthly limit`}
          {member.budget.reserved > 0 ? ` · ${member.budget.reserved.toLocaleString()} reserved` : ""}
        </p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isInvite ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {member.status === "expired" ? "Invite expired" : "Invite sent"}
          </span>
        ) : (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-medium capitalize",
              member.role !== "member"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {member.role}
          </span>
        )}
        {isInvite && canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={`Cancel invite for ${member.email}`}
            onClick={() => onRemove(member.id)}
          >
            <X className="size-3.5" />
          </Button>
        ) : canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={`Remove ${member.name}`}
            onClick={() => onRemove(member.id)}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
        {canSetLimit ? <Button type="button" variant="outline" size="sm" onClick={() => {
          setLimitDraft(member.budget?.limit?.toString() ?? ""); setEditingLimit(value => !value);
        }}>Set limit</Button> : null}
      </div>
      {editingLimit && canSetLimit ? <div className="flex w-full flex-wrap items-center gap-2 pl-12">
        <label className="sr-only" htmlFor={`limit-${member.id}`}>Monthly credit limit for {member.name}</label>
        <Input id={`limit-${member.id}`} inputMode="numeric" type="number" min={0} max={20000} step={1}
          placeholder="No individual limit" value={limitDraft} onChange={event => setLimitDraft(event.target.value)}
          className="h-8 w-44" />
        <Button type="button" size="sm" disabled={savingLimit || (limitDraft !== "" &&
          (!/^\d+$/.test(limitDraft) || Number(limitDraft) > 20000))} onClick={() => {
          onLimit(member.id, limitDraft === "" ? null : Number(limitDraft)); setEditingLimit(false);
        }}>Save</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingLimit(false)}>Cancel</Button>
        <span className="text-xs text-muted-foreground">Blank removes the individual limit.</span>
      </div> : null}
      {limitError ? <p className="w-full pl-12 text-xs text-destructive" role="alert">{limitError}</p> : null}
    </div>
  );
}

export function SettingsModalTeamPanel() {
  const [workspace, setWorkspace] = useState<AriaTeamApiWorkspace | null>(() => (ARIA_IS_PREVIEW ? previewTeamWorkspace() : null));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingLimitId, setSavingLimitId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<{ id: string; message: string } | null>(null);

  const refresh = useCallback(async () => {
    if (ARIA_IS_PREVIEW) { setWorkspace(previewTeamWorkspace()); setLoadError(null); return; }
    try {
      setWorkspace(await fetchAriaTeam());
      setLoadError(null);
    } catch (error) {
      setWorkspace(null);
      setLoadError((error as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener("aria:team-updated", onUpdate);
    return () => window.removeEventListener("aria:team-updated", onUpdate);
  }, [refresh]);

  const seatLimit = workspace?.seatLimit ?? ARIA_TEAM_INCLUDED_SEATS;
  const seatsUsed = workspace?.seatsUsed ?? 0;
  const seatsLeft = Math.max(0, seatLimit - seatsUsed);
  const canManage = workspace?.role === "owner" || workspace?.role === "admin";

  const handleInvite = async () => {
    setInviteError(null);
    setInviteUrl(null);
    setInviteSentTo(null);
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setInviteError("Enter a valid email address.");
      return;
    }
    if (workspace?.members.some((m) => m.email.toLowerCase() === trimmed.toLowerCase())) {
      setInviteError("This person is already on the team or has a pending invite.");
      return;
    }
    if (seatsUsed >= seatLimit) {
      setInviteError(`All ${seatLimit} seats are in use. Remove a member or upgrade.`);
      return;
    }
    if (ARIA_IS_PREVIEW) {
      inviteAriaTeamMember(trimmed);
      setEmail("");
      void refresh();
      return;
    }
    setBusy(true);
    try {
      const result = await inviteAriaTeamMemberApi(trimmed);
      if (result.delivery === "email") setInviteSentTo(trimmed);
      else setInviteUrl(result.inviteUrl ?? null);
      setEmail("");
      await refresh();
    } catch (error) {
      setInviteError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    setInviteError(null);
    if (ARIA_IS_PREVIEW) {
      removeAriaTeamMember(memberId);
      void refresh();
      return;
    }
    try {
      await removeAriaTeamMemberApi(memberId);
      await refresh();
    } catch (error) {
      setInviteError((error as Error).message);
    }
  };

  const handleLimit = async (memberId: string, limit: number | null) => {
    setLimitError(null);
    setSavingLimitId(memberId);
    try {
      await setAriaTeamMemberLimitApi(memberId, limit);
      await refresh();
    } catch (error) {
      setLimitError({ id: memberId, message: (error as Error).message });
    } finally { setSavingLimitId(null); }
  };

  return (
    <SettingsPanel>
      <SettingsBlock
        title="Workspace"
        description="Shared Team workspace — members use the same credit pool. Owners and admins can set monthly limits for individual members."
      >
        <SettingsBlockInset>
          <p className="text-sm font-medium">{workspace?.name ?? "Loading…"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {seatsUsed} of {seatLimit} seats used
            {seatsLeft > 0 ? ` · ${seatsLeft} available` : " · No seats left"}
          </p>
        </SettingsBlockInset>
      </SettingsBlock>

      {canManage ? (
        <SettingsBlock title="Invite teammate">
          <SettingsBlockInset>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-1">
                <label htmlFor="aria-team-invite-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="aria-team-invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setInviteError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleInvite();
                    }
                  }}
                  autoComplete="email"
                />
                {inviteError ? (
                  <p className="text-xs text-destructive" role="alert">
                    {inviteError}
                  </p>
                ) : inviteSentTo ? (
                  <p className="text-xs text-emerald-500" role="status">
                    Invitation emailed to {inviteSentTo}. It expires in 7 days.
                  </p>
                ) : inviteUrl ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="min-w-0 flex-1 truncate" title={inviteUrl}>
                      Share this link with your teammate. It is shown once and expires in 7 days.
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Copy invite link"
                      onClick={() => void navigator.clipboard?.writeText(inviteUrl)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {ARIA_IS_PREVIEW
                      ? "Invites are preview-only — no email is sent yet."
                      : "ARIA will email the invitation when delivery is configured. Otherwise, you will get a one-time link to share."}
                  </p>
                )}
              </div>
              <Button
                type="button"
                className="shrink-0 sm:mt-0"
                disabled={!email.trim() || seatsLeft === 0 || busy}
                onClick={() => void handleInvite()}
              >
                <UserPlus className="size-4" aria-hidden />
                Invite
              </Button>
            </div>
          </SettingsBlockInset>
        </SettingsBlock>
      ) : null}

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">{loadError}</p>
      ) : null}

      <SettingsBlock title="Members">
        {!workspace?.members?.length && !loadError ? (
          <SettingsBlockInset>
            <p className="text-sm text-muted-foreground">No members yet.</p>
          </SettingsBlockInset>
        ) : null}
        {(workspace?.members ?? []).map((member) => (
          <TeamMemberRow
            key={member.id}
            member={member}
            selfId={workspace?.selfId ?? ""}
            canManage={canManage}
            actorRole={workspace?.role ?? "member"}
            onRemove={(id) => void handleRemove(id)}
            onLimit={(id, limit) => void handleLimit(id, limit)}
            savingLimit={savingLimitId === member.id}
            limitError={limitError?.id === member.id ? limitError.message : null}
          />
        ))}
      </SettingsBlock>

      {!canManage && inviteError ? (
        <p className="text-xs text-destructive" role="alert">
          {inviteError}
        </p>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Mail className="size-3.5 shrink-0 opacity-70" aria-hidden />
        {canManage
          ? "Removing a member revokes their access to this workspace immediately."
          : "Only workspace owners and admins can invite or remove members."}
      </p>
    </SettingsPanel>
  );
}
