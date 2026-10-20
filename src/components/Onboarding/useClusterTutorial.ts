import { useState } from "react";
import { getPreferences } from "@/lib/settings";
import { getTutorialConfig } from "./tutorialConfig";

export type TutorialStep = "confirm" | "add" | "done";

export function useClusterTutorial(onComplete: () => void) {
  const prefs = getPreferences();
  const cluster = prefs.cluster;
  const [subStep, setSubStep] = useState<TutorialStep>("confirm");
  const [addedCount, setAddedCount] = useState(0);
  const isServiceCluster = cluster === "service";

  const tutorialConfig = getTutorialConfig(cluster);

  return {
    prefs,
    cluster,
    subStep,
    setSubStep,
    addedCount,
    setAddedCount,
    isServiceCluster,
    tutorialConfig,
    onComplete,
  };
}

export type ClusterTutorialApi = ReturnType<typeof useClusterTutorial>;
