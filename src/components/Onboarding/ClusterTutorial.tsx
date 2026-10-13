import { useClusterTutorial } from "./useClusterTutorial";
import { TutorialConfirm } from "./TutorialConfirm";
import { TutorialAdd } from "./TutorialAdd";
import { TutorialDone } from "./TutorialDone";

export function ClusterTutorial({ onComplete }: { onComplete: () => void }) {
  const t = useClusterTutorial(onComplete);
  if (t.subStep === "confirm") return <TutorialConfirm t={t} />;
  if (t.subStep === "add") return <TutorialAdd t={t} />;
  return <TutorialDone t={t} />;
}
