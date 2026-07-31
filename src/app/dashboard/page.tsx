"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  FolderIcon,
  FileTextIcon,
  UploadIcon,
  LinkIcon,
  ShieldIcon,
  LogOutIcon,
  BellIcon,
  SearchIcon,
  SendIcon,
  DownloadIcon,
  PlusIcon,
  ChevronRightIcon,
  SparklesIcon,
  ClockIcon,
  BookOpenIcon,
  SettingsIcon,
} from "lucide-react"

const navItems = [
  { icon: LayoutDashboardIcon, label: "Dashboard", id: "dashboard" },
  { icon: SparklesIcon, label: "New Brief", id: "new-brief" },
  { icon: MessageSquareIcon, label: "Chat History", id: "history" },
  { icon: FolderIcon, label: "Projects", id: "projects" },
  { icon: FileTextIcon, label: "Notes", id: "notes" },
  { icon: UploadIcon, label: "File Uploads", id: "uploads" },
  { icon: LinkIcon, label: "Connectors", id: "connectors" },
  { icon: ShieldIcon, label: "Admin", id: "admin" },
  { icon: SettingsIcon, label: "Settings", id: "settings" },
]

const recentBriefs = [
  {
    id: 1,
    title: "Market Entry Strategy for Southeast Asia",
    date: "2 hours ago",
    citations: 12,
    status: "complete",
  },
  {
    id: 2,
    title: "Competitive Landscape: B2B SaaS 2025",
    date: "Yesterday",
    citations: 8,
    status: "complete",
  },
  {
    id: 3,
    title: "Supply Chain Resilience Post-2024",
    date: "3 days ago",
    citations: 15,
    status: "complete",
  },
]

const projects = [
  { id: 1, name: "Q3 Strategy Review", briefs: 4, color: "bg-blue-500" },
  { id: 2, name: "APAC Expansion", briefs: 7, color: "bg-violet-500" },
  { id: 3, name: "Product Roadmap 2026", briefs: 2, color: "bg-emerald-500" },
]

const suggestedQuestions = [
  "What are the key risks in entering the Indian EV market in 2025?",
  "How should we position against low-cost competitors in APAC?",
  "What M&A opportunities exist in the climate-tech sector?",
]

export default function DashboardPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [activeNav, setActiveNav] = useState("dashboard")

  async function handleLogout() {
    await signOut(auth)
    router.push("/login")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    // TODO: wire up to pipeline
    setQuery("")
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <SparklesIcon className="size-3.5 text-primary-foreground" />
          </div>
          <span className="font-heading text-base font-bold tracking-tight">ARIA</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                activeNav === id
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              U
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium">User</p>
              <p className="truncate text-xs text-muted-foreground">user@aria.ai</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOutIcon className="size-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-3.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <SearchIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <BellIcon className="size-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {/* Query Interface */}
          <section className="mb-8">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <SparklesIcon className="size-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold">Ask ARIA</h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Submit a natural-language strategy question and receive a cited, board-ready editorial brief.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. What are the key risks in entering the Indian EV market in 2025?"
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <Button type="submit" className="gap-2 px-4">
                  <SendIcon className="size-4" />
                  Generate Brief
                </Button>
              </form>

              {/* Suggested questions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-3 gap-6">
            {/* Recent Briefs */}
            <section className="col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading font-semibold">Recent Briefs</h2>
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                  View all <ChevronRightIcon className="size-3" />
                </Button>
              </div>
              <div className="space-y-3">
                {recentBriefs.map((brief) => (
                  <div
                    key={brief.id}
                    className="group flex cursor-pointer items-start justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpenIcon className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-snug">{brief.title}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="size-3" /> {brief.date}
                          </span>
                          <span>{brief.citations} citations</span>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                            {brief.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <DownloadIcon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {/* Right column */}
            <div className="flex flex-col gap-6">
              {/* Projects */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading font-semibold">Projects</h2>
                  <Button variant="ghost" size="icon-sm">
                    <PlusIcon className="size-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className={`size-2.5 rounded-full ${project.color}`} />
                      <span className="flex-1 text-sm font-medium">{project.name}</span>
                      <span className="text-xs text-muted-foreground">{project.briefs} briefs</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Actions */}
              <section>
                <h2 className="mb-3 font-heading font-semibold">Quick Actions</h2>
                <div className="space-y-2">
                  {[
                    { icon: UploadIcon, label: "Upload a file", desc: "PDF, DOCX, CSV" },
                    { icon: LinkIcon, label: "Add connector", desc: "Drive, Notion, Slack" },
                    { icon: FileTextIcon, label: "New note", desc: "Capture ideas" },
                  ].map(({ icon: Icon, label, desc }) => (
                    <button
                      key={label}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
