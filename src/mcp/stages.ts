export async function processStage(
  params: {
    sessionId: string;
    stage: string;
    stageNumber: number;
    totalStages: number;
    analysis?: string;
    stageData?: any;
    nextStageNeeded: boolean;
    isRevision?: boolean;
    revisesStage?: number;
  },
  previousStages: any[]
): Promise<any> {
  switch (params.stage) {
    case "summary":
      return {
        stage: "summary",
        stageNumber: params.stageNumber,
        analysis: params.analysis || "",
        stageData: params.stageData || {
          summary: "",
          duration: "",
          project: ""
        },
        completed: !params.nextStageNeeded
      };

    case "achievements":
      return {
        stage: "achievements",
        stageNumber: params.stageNumber,
        analysis: params.analysis || "",
        stageData: params.stageData || { achievements: [] },
        completed: !params.nextStageNeeded
      };

    case "taskUpdates":
      return {
        stage: "taskUpdates",
        stageNumber: params.stageNumber,
        analysis: params.analysis || "",
        stageData: params.stageData || { updates: [] },
        completed: !params.nextStageNeeded
      };

    case "newTasks":
      return {
        stage: "newTasks",
        stageNumber: params.stageNumber,
        analysis: params.analysis || "",
        stageData: params.stageData || { tasks: [] },
        completed: !params.nextStageNeeded
      };

    case "projectStatus":
      return {
        stage: "projectStatus",
        stageNumber: params.stageNumber,
        analysis: params.analysis || "",
        stageData: params.stageData || {
          projectStatus: "",
          projectObservation: ""
        },
        completed: !params.nextStageNeeded
      };

    case "riskUpdates":
      return {
        stage: "riskUpdates",
        stageNumber: params.stageNumber,
        analysis: params.analysis || "",
        stageData: params.stageData || { risks: [] },
        completed: !params.nextStageNeeded
      };

    case "assembly":
      return {
        stage: "assembly",
        stageNumber: params.stageNumber,
        analysis: "Final assembly of end-session arguments",
        stageData: assembleEndSessionArgs(previousStages),
        completed: true
      };

    default:
      throw new Error(`Unknown stage: ${params.stage}`);
  }
}

export function assembleEndSessionArgs(stages: any[]): any {
  const summaryStage = stages.find((s) => s.stage === "summary");
  const achievementsStage = stages.find((s) => s.stage === "achievements");
  const taskUpdatesStage = stages.find((s) => s.stage === "taskUpdates");
  const newTasksStage = stages.find((s) => s.stage === "newTasks");
  const projectStatusStage = stages.find((s) => s.stage === "projectStatus");
  const riskUpdatesStage = stages.find((s) => s.stage === "riskUpdates");

  return {
    summary: summaryStage?.stageData?.summary || "",
    duration: summaryStage?.stageData?.duration || "unknown",
    project: summaryStage?.stageData?.project || "",
    achievements: JSON.stringify(achievementsStage?.stageData?.achievements || []),
    taskUpdates: JSON.stringify(taskUpdatesStage?.stageData?.updates || []),
    projectStatus: projectStatusStage?.stageData?.projectStatus || "",
    projectObservation: projectStatusStage?.stageData?.projectObservation || "",
    newTasks: JSON.stringify(newTasksStage?.stageData?.tasks || []),
    riskUpdates: JSON.stringify(riskUpdatesStage?.stageData?.risks || [])
  };
}
