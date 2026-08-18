export type ResourceLink = {
  slug: string;
  title: string;
  description: string;
  href: string;
};

export const resourceDropdownItems: ResourceLink[] = [
  {
    slug: "blog",
    title: "Blog",
    description: "Product updates, guides, and insights from the ARIA team.",
    href: "/blog",
  },
  {
    slug: "changelog",
    title: "Changelog",
    description: "See what's new — releases, fixes, and improvements.",
    href: "/changelog",
  },
  {
    slug: "docs",
    title: "Docs",
    description: "Documentation to help you get started and build with ARIA.",
    href: "/docs",
  },
];

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "introducing-business-memory",
    title: "Introducing Business Memory: Context That Grows With Your Team",
    excerpt:
      "ARIA now remembers conversations, projects, and organizational context within your workspace — enabling more relevant responses over time.",
    date: "Jul 28, 2026",
    category: "Product",
    readTime: "5 min read",
  },
  {
    slug: "enterprise-analytics-atlas",
    title: "Connecting Atlas to Enterprise Analytics",
    excerpt:
      "Learn how teams use natural language to query Atlas and business data for performance monitoring and user behavior analysis.",
    date: "Jul 15, 2026",
    category: "Guide",
    readTime: "8 min read",
  },
  {
    slug: "validation-engine-trust",
    title: "Building Trust with the Validation Engine",
    excerpt:
      "Every ARIA response can be verified against trusted data sources. Here's how the Validation Engine reduces inaccurate answers.",
    date: "Jun 30, 2026",
    category: "Engineering",
    readTime: "6 min read",
  },
  {
    slug: "executive-reports-ai",
    title: "From Data to Board-Ready Reports in Seconds",
    excerpt:
      "Executive Reports turn analytics and enterprise knowledge into summaries and recommendations your leadership team can act on.",
    date: "Jun 12, 2026",
    category: "Product",
    readTime: "4 min read",
  },
];

export type ChangelogEntry = {
  version: string;
  date: string;
  changes: {
    type: "feature" | "improvement" | "fix";
    text: string;
  }[];
};

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "2.4.0",
    date: "Aug 1, 2026",
    changes: [
      { type: "feature", text: "Business Memory — workspace context persists across sessions" },
      { type: "feature", text: "Validation Engine with source citations on every response" },
      { type: "improvement", text: "Faster semantic search across large document libraries" },
    ],
  },
  {
    version: "2.3.0",
    date: "Jul 10, 2026",
    changes: [
      { type: "feature", text: "Executive Reports — auto-generated summaries and recommendations" },
      { type: "feature", text: "Atlas integration for Enterprise Analytics" },
      { type: "fix", text: "Resolved timeout issues on large spreadsheet uploads" },
    ],
  },
  {
    version: "2.2.0",
    date: "Jun 5, 2026",
    changes: [
      { type: "feature", text: "Intelligence APIs for embedding ARIA in custom applications" },
      { type: "improvement", text: "Redesigned workspace navigation and search UX" },
      { type: "fix", text: "Fixed role-based permissions edge case in multi-tenant workspaces" },
    ],
  },
  {
    version: "2.1.0",
    date: "May 12, 2026",
    changes: [
      { type: "feature", text: "Bring Your Own Data — connect databases, APIs, and cloud storage" },
      { type: "feature", text: "AI Knowledge Search across docs, SOPs, and policies" },
      { type: "improvement", text: "Audit logging for enterprise compliance requirements" },
    ],
  },
];

export type DocSection = {
  slug: string;
  title: string;
  items: { slug: string; title: string }[];
};

export const docSections: DocSection[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    items: [
      { slug: "introduction", title: "Introduction to ARIA" },
      { slug: "quickstart", title: "Quickstart guide" },
      { slug: "workspace-setup", title: "Workspace setup" },
    ],
  },
  {
    slug: "core-features",
    title: "Core features",
    items: [
      { slug: "knowledge-search", title: "AI Knowledge Search" },
      { slug: "enterprise-analytics", title: "Enterprise Analytics" },
      { slug: "business-memory", title: "Business Memory" },
      { slug: "bring-your-own-data", title: "Bring Your Own Data" },
    ],
  },
  {
    slug: "enterprise",
    title: "Enterprise",
    items: [
      { slug: "security", title: "Security & compliance" },
      { slug: "api-reference", title: "API reference" },
      { slug: "roles-permissions", title: "Roles & permissions" },
    ],
  },
];

export const docContent: Record<string, { title: string; body: string[] }> = {
  introduction: {
    title: "Introduction to ARIA",
    body: [
      "Bnii ARIA is an intelligent AI workspace that transforms enterprise data into trusted intelligence. Connect analytics, reports, internal knowledge, APIs, and your own business data into a single platform where every answer is grounded in real business context.",
      "ARIA is designed for teams that need faster decisions without sacrificing accuracy — from analysts querying Atlas to executives reviewing auto-generated reports.",
    ],
  },
  quickstart: {
    title: "Quickstart guide",
    body: [
      "Create a workspace, invite your team, and connect your first data source. ARIA supports document uploads, database connections, API integrations, and cloud storage providers.",
      "Start by asking a question in natural language. ARIA will search connected sources, validate responses, and cite the data behind every answer.",
    ],
  },
  "workspace-setup": {
    title: "Workspace setup",
    body: [
      "Each workspace is an isolated environment for your team's data, conversations, and configurations. Enterprise plans support multiple workspaces with role-based access control.",
      "Configure data connectors from the workspace settings panel. Uploaded documents and connected sources are indexed automatically for AI Knowledge Search.",
    ],
  },
  "knowledge-search": {
    title: "AI Knowledge Search",
    body: [
      "AI Knowledge Search uses semantic search to find relevant information across internal documentation, reports, policies, SOPs, and product knowledge.",
      "Unlike keyword search, ARIA understands intent and context — returning the most relevant passages even when exact terms don't match.",
    ],
  },
  "enterprise-analytics": {
    title: "Enterprise Analytics",
    body: [
      "Connect directly to Atlas and your business data to monitor performance, analyze user behavior, and uncover insights through natural language queries.",
      "Ask questions like \"What were our top conversion drivers last quarter?\" and receive answers backed by live analytics data.",
    ],
  },
  "business-memory": {
    title: "Business Memory",
    body: [
      "Business Memory allows ARIA to remember conversations, projects, reports, and organizational context within your workspace.",
      "This enables more relevant and consistent responses over time — especially for ongoing initiatives and recurring analysis.",
    ],
  },
  "bring-your-own-data": {
    title: "Bring Your Own Data",
    body: [
      "Upload documents or connect databases, APIs, spreadsheets, and cloud storage to combine your organization's data with ARIA's intelligence.",
      "Supported formats include PDF, DOCX, CSV, and direct connections to PostgreSQL, Snowflake, Google Drive, and REST APIs.",
    ],
  },
  security: {
    title: "Security & compliance",
    body: [
      "ARIA is built with multi-tenant architecture, role-based permissions, audit logging, and secure workspaces to protect organizational data.",
      "Enterprise deployments include SOC 2 compliance, data encryption at rest and in transit, and configurable data retention policies.",
    ],
  },
  "api-reference": {
    title: "API reference",
    body: [
      "Intelligence APIs allow you to embed ARIA into your products, dashboards, or internal tools using secure REST endpoints.",
      "Authenticate with workspace API keys, send queries programmatically, and receive structured responses with source citations.",
    ],
  },
  "roles-permissions": {
    title: "Roles & permissions",
    body: [
      "Assign roles at the workspace level: Admin, Editor, Viewer, and custom enterprise roles with granular permissions.",
      "Control access to data connectors, report generation, API keys, and administrative settings per role.",
    ],
  },
};
