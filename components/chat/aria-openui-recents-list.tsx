"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNav } from "@openuidev/react-ui";
import { useThreadList, type Thread } from "@openuidev/react-headless";
import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAriaSession } from "@/lib/aria-session";
import { ariaFetch } from "@/lib/aria-session";
import { useAriaProjects } from "@/lib/aria-project-context";
import type { AriaProject } from "@/lib/aria-projects-storage";

type ProjectThread = Thread & { projectId?: string | null };

function RecentRow({
  title,
  selected,
  renaming,
  renameValue,
  onSelect,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
  onDelete,
  onExport,
  projects,
  currentProjectId,
  onMove,
}: {
  title: string;
  selected: boolean;
  renaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onDelete: () => void;
  onExport?: () => void;
  projects?: AriaProject[];
  currentProjectId?: string | null;
  onMove?: (projectId: string | null) => void;
}) {
  const renameRef = useRef<HTMLInputElement>(null);
  const renameStartedAt = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!renaming) return;
    renameStartedAt.current = Date.now();
    const frame = window.requestAnimationFrame(() => {
      renameRef.current?.focus();
      renameRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [renaming]);

  const beginRename = () => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => onStartRename());
  };

  return (
    <div
      className={cn(
        "aria-openui-recent-row",
        selected && "aria-openui-recent-row--selected",
      )}
    >
      {renaming ? (
        <input
          ref={renameRef}
          type="text"
          className="aria-openui-recent-row__rename-input"
          value={renameValue}
          maxLength={120}
          aria-label={`Rename ${title}`}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onRenameCommit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onRenameCancel();
            }
          }}
          onBlur={() => {
            if (Date.now() - renameStartedAt.current < 250) return;
            onRenameCommit();
          }}
        />
      ) : (
        <button type="button" className="aria-openui-recent-row__main" onClick={onSelect}>
          <span className="aria-openui-recent-row__label">{title}</span>
        </button>
      )}

      {!renaming ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="aria-openui-recent-row__menu"
              aria-label={`Actions for ${title}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} strokeWidth={2} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            className="aria-openui-recent-menu min-w-[9rem] border-border/60 bg-popover z-[1100]"
          >
            <DropdownMenuItem onSelect={beginRename}>Rename</DropdownMenuItem>
            {onMove ? <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to project</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="z-[1101]">
                <DropdownMenuItem onSelect={() => onMove(null)} disabled={currentProjectId === null}>No project</DropdownMenuItem>
                {projects?.map(project => <DropdownMenuItem key={project.id}
                  disabled={project.id === currentProjectId}
                  onSelect={() => onMove(project.id)}>{project.name}</DropdownMenuItem>)}
              </DropdownMenuSubContent>
            </DropdownMenuSub> : null}
            {onExport ? <DropdownMenuItem onSelect={onExport}>Export JSON</DropdownMenuItem> : null}
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export type AriaOpenUIRecentsListProps = {
  className?: string;
};

export function AriaOpenUIRecentsList({ className }: AriaOpenUIRecentsListProps) {
  const session = useAriaSession();
  const { projects, activeProjectId } = useAriaProjects();
  const threads = useThreadList((s) => s.threads);
  const isLoadingThreads = useThreadList((s) => s.isLoadingThreads);
  const loadThreads = useThreadList((s) => s.loadThreads);
  const selectThread = useThreadList((s) => s.selectThread);
  const deleteThread = useThreadList((s) => s.deleteThread);
  const updateThread = useThreadList((s) => s.updateThread);
  const selectedThreadId = useThreadList((s) => s.selectedThreadId);
  const nav = useNav();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [exportError, setExportError] = useState("");
  const [moveError, setMoveError] = useState("");

  useEffect(() => {
    if (session.status === "authenticated" || session.status === "preview") loadThreads();
  }, [loadThreads, session.status, session.workspace?.id]);

  const selectRecent = useCallback(
    (id: string) => {
      selectThread(id);
      if (nav?.path !== undefined) {
        nav.navigate(undefined);
      }
    },
    [nav, selectThread],
  );

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameDraft(currentTitle);
  };

  const commitRename = (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    const trimmed = renameDraft.trim();
    if (!thread || !trimmed) {
      setRenamingId(null);
      return;
    }
    if (trimmed !== thread.title) {
      updateThread({ ...thread, title: trimmed });
    }
    setRenamingId(null);
  };

  const removeRecent = (threadId: string) => {
    deleteThread(threadId);
    setRenamingId((id) => (id === threadId ? null : id));
  };

  const exportRecent = async (threadId: string) => {
    if (session.status !== "authenticated") return;
    try {
      setExportError("");
      const response = await ariaFetch(`/api/threads/${threadId}/?export=1`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aria-chat-${threadId}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { setExportError("Could not export this chat. Try again."); }
  };

  const moveRecent = async (threadId: string, projectId: string | null) => {
    setMoveError("");
    try {
      const response = await ariaFetch(`/api/threads/${threadId}/`, {
        method: "PATCH", body: JSON.stringify({ projectId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not move this chat.");
      }
      loadThreads();
    } catch (error) { setMoveError((error as Error).message); }
  };

  const visibleThreads = (threads as ProjectThread[]).filter(thread =>
    session.status !== "authenticated" || activeProjectId === null || thread.projectId === activeProjectId);

  return (
    <div className={cn("aria-openui-recents__list", className)} role="list">
      {exportError ? <p className="aria-openui-recents__empty" role="alert">{exportError}</p> : null}
      {moveError ? <p className="aria-openui-recents__empty" role="alert">{moveError}</p> : null}
      {isLoadingThreads && threads.length === 0 ? (
        <p className="aria-openui-recents__empty" role="status">
          Loading…
        </p>
      ) : null}
      {!isLoadingThreads && visibleThreads.length === 0 ? (
        <p className="aria-openui-recents__empty">{activeProjectId ? "No chats in this project" : "No chats yet"}</p>
      ) : null}
      {visibleThreads.map((thread) => (
        <RecentRow
          key={thread.id}
          title={thread.title}
          selected={selectedThreadId === thread.id}
          renaming={renamingId === thread.id}
          renameValue={renameDraft}
          onSelect={() => selectRecent(thread.id)}
          onRenameChange={setRenameDraft}
          onRenameCommit={() => commitRename(thread.id)}
          onRenameCancel={() => setRenamingId(null)}
          onStartRename={() => startRename(thread.id, thread.title)}
          onDelete={() => removeRecent(thread.id)}
          onExport={session.status === "authenticated" ? () => void exportRecent(thread.id) : undefined}
          projects={session.status === "authenticated" ? projects : undefined}
          currentProjectId={projects.some(project => project.id === thread.projectId) ? thread.projectId : null}
          onMove={session.status === "authenticated" ? projectId => void moveRecent(thread.id, projectId) : undefined}
        />
      ))}
    </div>
  );
}
