import { ProjectsAnalysisSummary } from "@/components/dashboard/projects-analysis-summary";
import { loadProjectAnalysisItems } from "@/lib/project-analysis";

export async function DashboardProjectsSection() {
  const projectAnalysis = await loadProjectAnalysisItems();

  return <ProjectsAnalysisSummary projects={projectAnalysis} compact />;
}
