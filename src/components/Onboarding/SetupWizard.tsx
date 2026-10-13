import { useSetupWizard } from "./useSetupWizard";
import { SetupWizardCard } from "./SetupWizardCard";

export function SetupWizard(props: Parameters<typeof useSetupWizard>[0]) {
  const w = useSetupWizard(props);
  return <SetupWizardCard w={w} />;
}
