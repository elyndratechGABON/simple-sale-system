import { useState } from "react";
import { getPreferences } from "@/lib/settings";
import { loadDemoData } from "@/lib/demo-data";
import { toast } from "sonner";
import { getTutorialConfig } from "./tutorialConfig";

export type TutorialStep = "confirm" | "add" | "done";

export function useClusterTutorial(onComplete: () => void) {
  const prefs = getPreferences();
  const cluster = prefs.cluster;
  const [subStep, setSubStep] = useState<TutorialStep>("confirm");
  const [addedCount, setAddedCount] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const isServiceCluster = cluster === "service";

  const tutorialConfig = getTutorialConfig(cluster);

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      const count = await loadDemoData(cluster);
      setAddedCount((c) => c + count);
      toast.success(`${count} produits de démo chargés`);
      setSubStep("done");
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoadingDemo(false);
    }
  }

  return {
    prefs,
    cluster,
    subStep,
    setSubStep,
    addedCount,
    setAddedCount,
    loadingDemo,
    isServiceCluster,
    tutorialConfig,
    handleLoadDemo,
    onComplete,
  };
}

export type ClusterTutorialApi = ReturnType<typeof useClusterTutorial>;
