export type Feature = {
  slug: string;
  title: string;
  internalName?: string;
  description: string;
};

export const featureDropdownItems: Feature[] = [
  {
    slug: "enterprise-analytics",
    title: "Enterprise Analytics",
    internalName: "SQL Agent",
    description:
      "Connect Atlas and your business data to monitor performance and uncover insights.",
  },
  {
    slug: "ai-knowledge-search",
    title: "AI Knowledge Search",
    internalName: "Knowledge Agent",
    description:
      "Search documentation, reports, policies, and product knowledge instantly.",
  },
  {
    slug: "business-memory",
    title: "Business Memory",
    internalName: "Memory",
    description:
      "Remember conversations, projects, and organizational context over time.",
  },
];

export const overviewFeatures: Feature[] = [
  {
    slug: "enterprise-analytics",
    title: "Enterprise Analytics",
    internalName: "Analytics Engine",
    description:
      "Connect directly to Atlas and your business data to monitor performance, analyze user behavior, and uncover meaningful insights through natural language.",
  },
  {
    slug: "ai-knowledge-search",
    title: "AI Knowledge Search",
    internalName: "Knowledge Agent",
    description:
      "Search across internal documentation, reports, policies, SOPs, and product knowledge instantly with AI-powered semantic search.",
  },
  {
    slug: "bring-your-own-data",
    title: "Bring Your Own Data",
    internalName: "Tool Calling",
    description:
      "Upload documents or connect databases, APIs, spreadsheets, and cloud storage to combine your organization's data with ARIA's intelligence.",
  },
  {
    slug: "executive-reports",
    title: "Executive Reports",
    internalName: "Report Agent",
    description:
      "Generate business summaries, performance reports, and executive-ready insights automatically with clear recommendations and supporting evidence.",
  },
  {
    slug: "intelligence-apis",
    title: "Intelligence APIs",
    description:
      "Integrate ARIA directly into your products, dashboards, or internal tools using secure APIs built for enterprise applications.",
  },
  {
    slug: "trusted-ai-responses",
    title: "Trusted AI Responses",
    internalName: "Validation Agent",
    description:
      "Every answer is backed by connected data, analytics, and knowledge sources, giving teams confidence in every decision they make.",
  },
  {
    slug: "enterprise-security",
    title: "Enterprise Security",
    description:
      "Built with multi-tenant architecture, role-based permissions, audit logging, and secure workspaces to protect organizational data.",
  },
  {
    slug: "scalable-ai-workspace",
    title: "Scalable AI Workspace",
    description:
      "From startups to large enterprises, ARIA scales with your organization—supporting teams, departments, and enterprise-wide intelligence from a single platform.",
  },
];

export const enterpriseFeatures: Feature[] = [
  {
    slug: "enterprise-analytics",
    title: "Enterprise Analytics",
    internalName: "Analytics Engine",
    description:
      "Connect Atlas and your business data to monitor performance, analyze user behavior, and uncover actionable insights through natural language.",
  },
  {
    slug: "business-memory",
    title: "Business Memory",
    internalName: "Memory",
    description:
      "ARIA remembers conversations, projects, reports, and organizational context within your workspace, enabling more relevant and consistent responses over time.",
  },
  {
    slug: "ai-knowledge-search",
    title: "AI Knowledge Search",
    internalName: "Knowledge Agent",
    description:
      "Search across internal documentation, reports, policies, SOPs, and product knowledge using intelligent semantic search.",
  },
  {
    slug: "bring-your-own-data",
    title: "Bring Your Own Data",
    internalName: "Connected Data Sources",
    description:
      "Connect databases, APIs, spreadsheets, cloud storage, and business documents to combine your enterprise data with ARIA's intelligence.",
  },
  {
    slug: "validation-engine",
    title: "Validation Engine",
    internalName: "Validation Agent",
    description:
      "Every response is verified against trusted data sources, helping reduce inaccurate answers and providing confidence through source-backed intelligence.",
  },
  {
    slug: "executive-reports",
    title: "Executive Reports",
    internalName: "Report Agent",
    description:
      "Generate business summaries, executive reports, and actionable recommendations from analytics and enterprise knowledge in seconds.",
  },
  {
    slug: "intelligence-apis",
    title: "Intelligence APIs",
    description:
      "Embed ARIA into your own applications, dashboards, or workflows through secure enterprise APIs.",
  },
  {
    slug: "enterprise-security",
    title: "Enterprise Security",
    description:
      "Built with multi-tenant workspaces, role-based access control, audit logging, and enterprise-grade security to protect organizational data.",
  },
];
