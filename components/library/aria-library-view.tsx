"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  loadAriaLibraryItems,
  type AriaLibraryItem,
  type AriaLibraryItemKind,
} from "@/lib/aria-library-items";
import {
  ChevronDown,
  FileText,
  Globe,
  LayoutGrid,
  List,
  Mail,
  MessageSquare,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LibraryTab = "suggested" | "favorites" | "folders" | "images" | "all";

const TABS: { id: LibraryTab; label: string }[] = [
  { id: "suggested", label: "Suggested" },
  { id: "favorites", label: "Favorites" },
  { id: "folders", label: "Folders" },
  { id: "images", label: "Images" },
  { id: "all", label: "All" },
];

function KindIcon({ kind, className }: { kind: AriaLibraryItemKind; className?: string }) {
  const props = { className, size: 20, strokeWidth: 1.75, "aria-hidden": true as const };
  switch (kind) {
    case "pdf":
    case "document":
      return <FileText {...props} />;
    case "link":
      return <Globe {...props} />;
    case "invite":
      return <Mail {...props} />;
    case "chat":
      return <MessageSquare {...props} />;
    default:
      return <FileText {...props} />;
  }
}

function LibraryCard({ item }: { item: AriaLibraryItem }) {
  return (
    <button
      type="button"
      className="aria-library-card group text-left"
      aria-label={`Open ${item.title}`}
    >
      <div className="aria-library-card__meta">
        <KindIcon kind={item.kind} className="text-muted-foreground" />
        <span className="truncate">{item.subtitle ?? item.kind}</span>
      </div>
      <div className="aria-library-card__body">
        {item.kind === "invite" ? (
          <div className="aria-library-card__invite-preview">
            <p className="aria-library-card__invite-brand">ARIA</p>
            <p className="aria-library-card__invite-title">You&apos;re Invited</p>
            <p className="aria-library-card__invite-sub">Join your workspace</p>
          </div>
        ) : item.kind === "pdf" ? (
          <div className="aria-library-card__pdf-preview">
            <FileText className="size-10 text-red-400/90" strokeWidth={1.25} aria-hidden />
          </div>
        ) : item.kind === "link" ? (
          <div className="aria-library-card__link-preview">
            <Globe className="size-9 text-sky-400/90" strokeWidth={1.5} aria-hidden />
          </div>
        ) : item.kind === "chat" ? (
          <div className="aria-library-card__chat-preview">
            <p className="line-clamp-4 text-[11px] leading-relaxed text-muted-foreground">
              {item.preview}
            </p>
          </div>
        ) : (
          <div className="aria-library-card__doc-preview">
            <pre className="line-clamp-5 whitespace-pre-wrap font-sans text-[10px] leading-relaxed text-muted-foreground">
              {item.preview}
            </pre>
          </div>
        )}
      </div>
      <p className="aria-library-card__title">{item.title}</p>
    </button>
  );
}

function LibraryEmptyState() {
  return (
    <div className="aria-library__empty-state" role="status">
      <p className="aria-library__empty">No data</p>
    </div>
  );
}

export function AriaLibraryView() {
  const [tab, setTab] = useState<LibraryTab>("suggested");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [libraryItems, setLibraryItems] = useState<AriaLibraryItem[]>([]);

  useEffect(() => {
    setLibraryItems(loadAriaLibraryItems());
  }, []);

  const items = useMemo(() => {
    let list = libraryItems;
    if (tab === "favorites") list = list.filter((i) => i.favorite);
    if (tab === "images") list = list.filter((i) => i.kind === "invite");
    if (tab === "folders") list = [];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((i) => i.title.toLowerCase().includes(q));
    return list;
  }, [libraryItems, query, tab]);

  return (
    <div className="aria-library">
      <header className="aria-library__header">
        <h1 className="aria-library__title">Library</h1>
        <div className="aria-library__toolbar">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Filter">
            <SlidersHorizontal className="size-4" />
          </Button>
          <div className="aria-library__view-toggle" role="group" aria-label="View mode">
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              <List className="size-4" />
            </Button>
          </div>
          <div className="aria-library__search">
            <Search className="aria-library__search-icon size-4" aria-hidden />
            <Input
              type="search"
              placeholder="Search library"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="aria-library__search-input h-9 border-border/60 bg-muted/30 pl-9"
              aria-label="Search library"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" className="aria-library__new-btn gap-1 rounded-full px-4">
                New
                <ChevronDown className="size-4 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuItem>Upload file</DropdownMenuItem>
              <DropdownMenuItem>Import from chat</DropdownMenuItem>
              <DropdownMenuItem>Create folder</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <nav className="aria-library__tabs" aria-label="Library categories">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={cn("aria-library__tab", tab === id && "aria-library__tab--active")}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="aria-library__scroll">
        {items.length === 0 ? (
          <LibraryEmptyState />
        ) : (
          <div
            className={cn(
              "aria-library__grid",
              viewMode === "list" && "aria-library__grid--list",
            )}
          >
            {items.map((item) => (
              <LibraryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
