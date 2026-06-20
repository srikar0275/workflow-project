"use client";

import type { StageStatus } from "@prisma/client";
import { StageStatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { calculateProgress } from "@/lib/status";
import { cn } from "@/lib/utils";

type Stage = {
  id: string;
  name: string;
  status: StageStatus;
  tasks: { status: string }[];
};

export function StagePipeline({
  stages,
  activeStageId,
  onSelect,
}: {
  stages: Stage[];
  activeStageId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-2">
        {stages.map((stage, index) => {
          const progress = calculateProgress(
            stage.tasks as { status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "DONE" }[],
          );
          const isActive = stage.id === activeStageId;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelect(stage.id)}
              className={cn(
                "flex w-44 flex-col rounded-lg border p-3 text-left transition-colors",
                isActive
                  ? "border-cyan-600 bg-cyan-950/50"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700",
              )}
            >
              <span className="text-xs text-slate-500">Stage {index + 1}</span>
              <span className="mt-0.5 truncate text-sm font-medium text-white">
                {stage.name}
              </span>
              <div className="mt-2">
                <StageStatusBadge status={stage.status} />
              </div>
              <div className="mt-2">
                <Progress value={progress} size="sm" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
