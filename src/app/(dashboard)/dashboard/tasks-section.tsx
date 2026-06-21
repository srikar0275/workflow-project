import { TasksAnalysisSummary } from "@/components/tasks/tasks-analysis-summary";
import { loadTaskAnalysisItems } from "@/lib/task-analysis";

export async function DashboardTasksSection() {
  const tasks = await loadTaskAnalysisItems();

  return <TasksAnalysisSummary tasks={tasks} compact />;
}
