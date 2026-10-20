"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, Folder, MoreHorizontal, Plus } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AriaCreateProjectDialog } from "@/components/chat/aria-create-project-dialog";
import {
  createAriaProjectName,
  deleteAriaProject,
  loadAriaProjects,
  saveAriaProjects,
  type AriaProject,
} from "@/lib/aria-projects-storage";
import { ARIA_IS_PREVIEW, ariaFetch, useAriaSession } from "@/lib/aria-session";
import { cn } from "@/lib/utils";

function ProjectRow({
  project,
  selected,
  renaming,
  renameValue,
  onSelect,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
  onDelete,
}: {
  project: AriaProject;
  selected: boolean;
  renaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onDelete: () => void;
}) {
  const renameRef = useRef<HTMLInputElement>(null);
  const renameStartedAt = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!renaming) return;
    renameStartedAt.current = Date.now();
    const id = window.requestAnimationFrame(() => {
      renameRef.current?.focus();
      renameRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [renaming]);

  const beginRename = () => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => onStartRename());
  };

  return (
    <div
      className={cn(
        "aria-openui-project-row",
        selected && "aria-openui-project-row--selected",
      )}
    >
      {renaming ? (
        <input
          ref={renameRef}
          type="text"
          className="aria-openui-project-row__rename-input"
          value={renameValue}
          maxLength={80}
          aria-label={`Rename ${project.name}`}
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
        <button type="button" className="aria-openui-project-row__main" onClick={onSelect}>
          <span className="aria-openui-project-row__icon" aria-hidden>
            <Folder size="1em" strokeWidth={1.75} />
          </span>
          <span className="aria-openui-project-row__label">{project.name}</span>
        </button>
      )}

      {!renaming ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="aria-openui-project-row__menu"
              aria-label={`Actions for ${project.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} strokeWidth={2} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            className="aria-openui-project-menu min-w-[9rem] z-[1100] border-border/60 bg-popover"
          >
            <DropdownMenuItem onSelect={beginRename}>Rename</DropdownMenuItem>
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

export function AriaOpenUISidebarProjects() {
  const session = useAriaSession();
  const listId = useId();
  const [expanded, setExpanded] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [projects, setProjects] = useState<AriaProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ARIA_IS_PREVIEW) { setProjects(loadAriaProjects()); return; }
    setProjects([]);
    setActiveId(null);
    if (session.status !== "authenticated" || !session.workspace) return;
    let cancelled = false;
    ariaFetch("/api/projects/").then(async response => {
      const result = await response.json();
      if (!cancelled) {
        if (response.ok) { setProjects(result.projects); setError(""); }
        else setError(result.message ?? "Could not load projects.");
      }
    }).catch(() => { if (!cancelled) setError("Could not load projects."); });
    return () => { cancelled = true; };
  }, [session.status, session.workspace?.id]);

  const persist = useCallback((next: AriaProject[] | ((prev: AriaProject[]) => AriaProject[])) => {
    setProjects((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (ARIA_IS_PREVIEW) saveAriaProjects(resolved);
      return resolved;
    });
  }, []);

  const closeCreate = () => {
    setCreateOpen(false);
    setDraftName("");
  };

  const submitCreate = async () => {
    if (busy) return;
    setError("");
    if (!ARIA_IS_PREVIEW) {
      setBusy(true);
      try {
        const response = await ariaFetch("/api/projects/", { method: "POST", body: JSON.stringify({ name: createAriaProjectName(projects, draftName) }) });
        const result = await response.json();
        if (!response.ok) { setError(result.message ?? "Could not create project."); return; }
        setProjects(prev => [result.project, ...prev]);
        setActiveId(result.project.id);
        setExpanded(true);
        closeCreate();
      } catch { setError("Could not create project."); }
      finally { setBusy(false); }
      return;
    }
    let createdId = "";
    persist((prev) => {
      const name = createAriaProjectName(prev, draftName);
      const project: AriaProject = { id: crypto.randomUUID(), name };
      createdId = project.id;
      return [project, ...prev];
    });
    setActiveId(createdId);
    setExpanded(true);
    closeCreate();
  };

  const openCreate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(true);
    setCreateOpen(true);
  };

  const startRename = (project: AriaProject) => {
    setRenamingId(project.id);
    setRenameDraft(project.name);
  };

  const commitRename = async (projectId: string) => {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    if (!ARIA_IS_PREVIEW) {
      if (busy) return;
      setBusy(true);
      try {
        const response = await ariaFetch(`/api/projects/${projectId}/`, { method: "PATCH", body: JSON.stringify({ name: trimmed }) });
        const result = await response.json();
        if (!response.ok) { setError(result.message ?? "Could not rename project."); return; }
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: trimmed } : p));
        setError("");
      } catch { setError("Could not rename project."); }
      finally { setBusy(false); setRenamingId(null); }
      return;
    }
    persist((prev) => prev.map((p) => (p.id === projectId ? { ...p, name: trimmed } : p)));
    setRenamingId(null);
  };

  const deleteProject = async (projectId: string) => {
    if (!ARIA_IS_PREVIEW) {
      if (busy) return;
      setBusy(true);
      try {
        const response = await ariaFetch(`/api/projects/${projectId}/`, { method: "DELETE" });
        if (!response.ok) { setError((await response.json()).message ?? "Could not delete project."); return; }
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setError("");
      } catch { setError("Could not delete project."); }
      finally { setBusy(false); }
    } else persist((prev) => deleteAriaProject(prev, projectId));
    setActiveId((id) => (id === projectId ? null : id));
    setRenamingId((id) => (id === projectId ? null : id));
  };

  return (
    <section
      className="aria-openui-sidebar-section aria-openui-projects"
      aria-labelledby={`${listId}-heading`}
    >
      <div className="aria-openui-projects__header">
        <button
          type="button"
          id={`${listId}-heading`}
          className="aria-openui-projects__heading"
          aria-expanded={expanded}
          aria-controls={`${listId}-list`}
          onClick={() => setExpanded((v) => !v)}
        >
          <span>Projects</span>
          <ChevronRight
            size={16}
            strokeWidth={2}
            aria-hidden
            className={cn(
              "aria-openui-projects__chevron",
              expanded && "aria-openui-projects__chevron--open",
            )}
          />
        </button>
        <button
          type="button"
          className="aria-openui-projects__add"
          aria-label="Create project"
          onClick={openCreate}
        >
          <Plus size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <AriaCreateProjectDialog
        open={createOpen}
        name={draftName}
        onNameChange={setDraftName}
        onOpenChange={(open) => {
          if (!open) closeCreate();
          else setCreateOpen(true);
        }}
        onCreate={submitCreate}
      />

      {expanded ? (
        <ul id={`${listId}-list`} className="aria-openui-projects__list">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectRow
                project={project}
                selected={activeId === project.id}
                renaming={renamingId === project.id}
                renameValue={renameDraft}
                onSelect={() => setActiveId(project.id)}
                onRenameChange={setRenameDraft}
                onRenameCommit={() => commitRename(project.id)}
                onRenameCancel={() => setRenamingId(null)}
                onStartRename={() => startRename(project)}
                onDelete={() => deleteProject(project.id)}
              />
            </li>
          ))}
          {!projects.length && !createOpen ? (
            <li className="aria-openui-projects__empty">No projects</li>
          ) : null}
          {error ? <li className="aria-openui-projects__empty" role="alert">{error}</li> : null}
        </ul>
      ) : null}
    </section>
  );
}
