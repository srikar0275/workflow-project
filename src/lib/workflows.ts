export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  stages: { name: string; description: string }[];
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "full-stack-saas",
    name: "Full-stack SaaS",
    description: "End-to-end SaaS delivery from discovery to deployment.",
    stages: [
      { name: "Discovery & Requirements", description: "Scope, stakeholders, and success criteria" },
      { name: "UI/UX Design", description: "Wireframes, design system, and prototypes" },
      { name: "Backend & APIs", description: "Services, database, and integrations" },
      { name: "Frontend Web", description: "Web application and admin panels" },
      { name: "Mobile App", description: "iOS/Android cross-platform development" },
      { name: "QA & UAT", description: "Testing, bug fixes, and client sign-off" },
      { name: "DevOps & Deployment", description: "CI/CD, hosting, and monitoring" },
      { name: "Handoff & Documentation", description: "Knowledge transfer and support setup" },
    ],
  },
  {
    id: "mobile-app",
    name: "Mobile App",
    description: "React Native / Flutter mobile product delivery.",
    stages: [
      { name: "Discovery", description: "User flows and technical requirements" },
      { name: "Design", description: "Mobile UI/UX and component library" },
      { name: "Backend APIs", description: "APIs and authentication" },
      { name: "Mobile Development", description: "Feature implementation" },
      { name: "Testing", description: "Device testing and performance" },
      { name: "App Store Release", description: "Store submission and launch" },
    ],
  },
  {
    id: "ai-rag",
    name: "AI / RAG Project",
    description: "AI-powered applications with document intelligence.",
    stages: [
      { name: "Use Case Definition", description: "AI goals, data sources, and constraints" },
      { name: "Data Pipeline", description: "Ingestion, chunking, and embeddings" },
      { name: "RAG / Model Setup", description: "LLM integration and retrieval" },
      { name: "Application Layer", description: "API and user interface" },
      { name: "Evaluation & Tuning", description: "Accuracy testing and optimization" },
      { name: "Deployment", description: "Production rollout and monitoring" },
    ],
  },
  {
    id: "blank",
    name: "Blank Project",
    description: "Start with no predefined stages.",
    stages: [],
  },
];

export function getWorkflowTemplate(id: string): WorkflowTemplate {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id) ?? WORKFLOW_TEMPLATES[3];
}
