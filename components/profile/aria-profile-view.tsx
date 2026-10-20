"use client";

import { AriaTokenActivityHeatmap } from "@/components/profile/aria-token-activity-heatmap";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAriaProfile } from "@/lib/aria-session";
import { Lock, Pencil, Share2 } from "lucide-react";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AriaProfileView() {
  const { name, handle, avatar } = useAriaProfile();
  const initials = initialsFromName(name);

  return (
    <div className="aria-account-panel aria-account-panel--profile aria-profile">
      <div className="aria-profile__scroll">
        <div className="aria-profile__actions" aria-label="Profile actions">
          <button type="button" className="aria-profile__action-btn">
            <Pencil size={16} strokeWidth={1.75} aria-hidden />
            Edit
          </button>
          <button type="button" className="aria-profile__action-btn">
            <Lock size={16} strokeWidth={1.75} aria-hidden />
            Private
          </button>
          <button type="button" className="aria-profile__action-btn">
            <Share2 size={16} strokeWidth={1.75} aria-hidden />
            Share
          </button>
        </div>

        <header className="aria-profile__hero">
          <Avatar className="aria-profile__avatar size-24 text-2xl" data-size="lg">
            {avatar ? <AvatarImage src={avatar} alt="" /> : null}
            <AvatarFallback className="bg-muted text-xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <h1 className="aria-profile__name">{name}</h1>
          <p className="aria-profile__handle">@{handle}</p>
        </header>

        <section className="aria-profile__section" aria-labelledby="aria-token-heatmap-title">
          <AriaTokenActivityHeatmap />
        </section>
      </div>
    </div>
  );
}
