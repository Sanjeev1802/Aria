"use client";

import {
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
import { Check, Copy, Mail, ShieldCheck, UserPlus, Users, X } from "lucide-react";
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
  const limit = member.budget?.limit ?? null;
  const used = member.budget?.used ?? 0;
  const reserved = member.budget?.reserved ?? 0;
  const percentage = limit === null || limit === 0 ? 0 : Math.min(100, ((used + reserved) / limit) * 100);

  return (
    <div className="aria-team__person">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="size-10 shrink-0 border border-[#2a2a2a] text-xs">
          <AvatarFallback className="bg-[#222] font-semibold text-[#f5f5f3]">{initialsFromMember(member)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-[#f5f5f3]">{member.name}</p>
            {isSelf ? <span className="text-[11px] text-[#9b9b9b]">You</span> : null}
            <span className={cn("aria-team__badge",
              isInvite ? "aria-team__badge--invite" :
                member.role === "owner" ? "aria-team__badge--owner" : undefined)}>{isInvite
                ? member.status === "expired" ? "Expired" : "Invited" : member.role}</span>
          </div>
          <p className="mt-0.5 break-all text-xs text-[#9b9b9b]" title={member.email}>{member.email}</p>
        </div>
      </div>

      {!isInvite && member.budget ? <div className="aria-team__budget">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
          <span className="font-medium text-[#f5f5f3]">Monthly credits</span>
          <span className="tabular-nums text-[#9b9b9b]">{used.toLocaleString()} used
            {limit === null ? " · No individual limit" : ` / ${limit.toLocaleString()} limit`}</span>
        </div>
        {limit !== null ? <div role="progressbar" aria-label={`${member.name} monthly credit usage`}
          aria-valuemin={0} aria-valuemax={Math.max(limit, 1)} aria-valuenow={Math.min(used + reserved, Math.max(limit, 1))}
          className="aria-team__track">
          <div className={cn("aria-team__bar", percentage >= 100 && "bg-[#e07a6a]")}
            style={{ width: `${percentage}%` }} />
        </div> : null}
        {reserved > 0 ? <p className="mt-1.5 text-[11px] text-[#9b9b9b]">{reserved.toLocaleString()} credits reserved for an active request</p> : null}
      </div> : null}

      {canSetLimit || canRemove || (isInvite && canManage) ? <div className="mt-3 flex flex-wrap items-center gap-2">
        {canSetLimit ? <Button type="button" variant="outline" size="sm" className="min-h-10 sm:min-h-7" aria-expanded={editingLimit}
          onClick={() => { setLimitDraft(limit?.toString() ?? ""); setEditingLimit(value => !value); }}>
          {limit === null ? "Set credit limit" : "Edit credit limit"}</Button> : null}
        {isInvite && canManage ? <Button type="button" variant="ghost" size="sm" className="min-h-10 text-muted-foreground sm:min-h-7"
          onClick={() => onRemove(member.id)}><X className="size-3.5" />Cancel invite</Button> : null}
        {canRemove ? <Button type="button" variant="ghost" size="sm" className="min-h-10 text-muted-foreground sm:min-h-7"
          onClick={() => onRemove(member.id)}><X className="size-3.5" />Remove member</Button> : null}
      </div> : null}

      {editingLimit && canSetLimit ? <div className="aria-team__budget mt-3">
        <label className="mb-1.5 block text-xs font-medium" htmlFor={`limit-${member.id}`}>Monthly credit limit</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input id={`limit-${member.id}`} inputMode="numeric" type="text" pattern="[0-9]*"
            placeholder="No individual limit" value={limitDraft} onChange={event => setLimitDraft(event.target.value)}
            className="h-10 w-full min-w-0 sm:h-9 sm:max-w-56" />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" className="min-h-10 sm:min-h-7" disabled={savingLimit || (limitDraft !== "" &&
              (!/^\d+$/.test(limitDraft) || Number(limitDraft) > 20000))} onClick={() => {
                onLimit(member.id, limitDraft === "" ? null : Number(limitDraft)); setEditingLimit(false);
              }}>{savingLimit ? "Saving…" : "Save limit"}</Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-10 sm:min-h-7" onClick={() => setEditingLimit(false)}>Cancel</Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">0 blocks new usage. Leave blank to use only the shared Team pool.</p>
      </div> : null}
      {limitError ? <p className="mt-2 text-xs text-destructive" role="alert">{limitError}</p> : null}
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
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingLimitId, setSavingLimitId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<{ id: string; message: string } | null>(null);

  const refresh = useCallback(() => (ARIA_IS_PREVIEW ? Promise.resolve(previewTeamWorkspace()) : fetchAriaTeam()).then(
    next => { setWorkspace(next); setLoadError(null); },
    (error: Error) => { setWorkspace(null); setLoadError(error.message); },
  ), []);

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
  const activeCount = workspace?.members.filter(member => member.status === "active").length ?? 0;
  const pendingCount = workspace?.members.filter(member => member.status === "pending").length ?? 0;

  const handleInvite = async () => {
    setInviteError(null);
    setInviteUrl(null);
    setInviteSentTo(null);
    setCopied(false);
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
    <SettingsPanel className="aria-team">
      <section aria-label="Team workspace overview" className="aria-team__hero">
        <div className="flex items-start gap-3">
          <div className="aria-team__hero-icon">
            <Users className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="aria-team__title truncate">{workspace?.name ?? "Team workspace"}</h3>
              <span className="aria-team__kicker">TEAM</span>
            </div>
            <p className="aria-team__lede">One shared credit pool, with individual monthly limits when you need them.</p>
          </div>
        </div>
        <div className="aria-team__stats">
          <div className="aria-team__stat">
            <p className="aria-team__stat-label">Seats used</p>
            <p className="aria-team__stat-value">{seatsUsed}<span>/ {seatLimit}</span></p>
          </div>
          <div className="aria-team__stat">
            <p className="aria-team__stat-label">Active members</p>
            <p className="aria-team__stat-value">{activeCount}</p>
          </div>
          <div className="aria-team__stat col-span-2 sm:col-span-1">
            <p className="aria-team__stat-label">Pending invites</p>
            <p className="aria-team__stat-value">{pendingCount}</p>
          </div>
        </div>
        <div className="aria-team__capacity">
          <span>Team capacity</span>
          <span className="tabular-nums">{seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} available</span>
        </div>
        <div role="progressbar" aria-label="Team seats used" aria-valuemin={0} aria-valuemax={seatLimit}
          aria-valuenow={seatsUsed} className="aria-team__track">
          <div className="aria-team__bar"
            style={{ width: `${Math.min(100, seatLimit ? seatsUsed / seatLimit * 100 : 0)}%` }} />
        </div>
      </section>

      {canManage ? <section className="aria-team__invite" aria-labelledby="team-invite-title">
        <div className="flex items-start gap-3">
          <div className="aria-team__invite-icon"><UserPlus className="size-4" aria-hidden /></div>
          <div>
            <h3 id="team-invite-title" className="aria-team__title text-sm">Invite a teammate</h3>
            <p className="aria-team__lede">Add someone to this workspace. Invites reserve a seat for seven days.</p>
          </div>
        </div>
        <div className="aria-team__invite-row">
          <label htmlFor="aria-team-invite-email" className="sr-only">Teammate email address</label>
          <Input id="aria-team-invite-email" type="email" placeholder="teammate@company.com" value={email}
            onChange={event => { setEmail(event.target.value); setInviteError(null); }}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void handleInvite(); } }} autoComplete="email" />
          <Button type="button" className="aria-team__send min-h-9 sm:shrink-0" disabled={!email.trim() || seatsLeft === 0 || busy}
            onClick={() => void handleInvite()}><UserPlus className="size-4" aria-hidden />{busy ? "Sending…" : "Send invite"}</Button>
        </div>
        {inviteError ? <p className="mt-2 text-xs text-[#e07a6a]" role="alert">{inviteError}</p> :
          inviteSentTo ? <p className="mt-2 flex items-center gap-1.5 text-xs text-[#8fbf8a]" role="status"><Check className="size-3.5" />Invitation sent to {inviteSentTo}.</p> :
            inviteUrl ? <div className="aria-team__budget mt-3">
              <p className="text-xs font-medium text-[#f5f5f3]">One-time invitation link</p>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-[11px] text-[#9b9b9b]" title={inviteUrl}>{inviteUrl}</code>
                <Button type="button" variant="outline" size="sm" onClick={async () => {
                  try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); }
                  catch { setInviteError("Could not copy the link. Select and copy it manually."); }
                }}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}</Button>
              </div>
              <p className="mt-2 text-[11px] text-[#9b9b9b]">Shown once · expires in 7 days</p>
            </div> : <p className="aria-team__meta">{ARIA_IS_PREVIEW
              ? "Preview invitation only — no email will be sent."
              : "ARIA emails the invite when delivery is configured; otherwise you receive a one-time link."}</p>}
      </section> : null}

      {loadError ? <div className="aria-team__empty text-[#e07a6a]" role="alert">
        <p>{loadError}</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>Try again</Button>
      </div> : null}

      <section aria-labelledby="team-members-title" className="space-y-3">
        <div className="aria-team__people-head">
          <div>
            <h3 id="team-members-title" className="aria-team__title text-sm">People</h3>
            <p className="aria-team__lede">Manage access and credit limits for your workspace.</p>
          </div>
          <span className="text-xs tabular-nums text-[#9b9b9b]">{workspace?.members.length ?? 0} total</span>
        </div>
        {!workspace && !loadError ? <div className="aria-team__empty">Loading members…</div> : null}
        {workspace && workspace.members.length === 0 ? <div className="aria-team__empty">No members yet. Invite your first teammate above.</div> : null}
        <div className="space-y-2.5">
          {(workspace?.members ?? []).map(member => <TeamMemberRow key={member.id} member={member}
            selfId={workspace?.selfId ?? ""} canManage={canManage} actorRole={workspace?.role ?? "member"}
            onRemove={id => void handleRemove(id)} onLimit={(id, limit) => void handleLimit(id, limit)}
            savingLimit={savingLimitId === member.id} limitError={limitError?.id === member.id ? limitError.message : null} />)}
        </div>
      </section>

      <p className="aria-team__note">
        {canManage ? <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
        {canManage ? "Removing a member revokes their workspace access immediately. Credit limits reset their usage each UTC month."
          : "Workspace owners and admins manage invitations and credit limits. Contact them if you need more credits."}
      </p>
    </SettingsPanel>
  );
}
