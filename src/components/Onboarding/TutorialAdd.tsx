import type { ClusterTutorialApi } from "./useClusterTutorial";
import { TutorialProductForm } from "./TutorialProductForm";

export function TutorialAdd({ t }: { t: ClusterTutorialApi }) {
  const addedLabel = t.addedCount === 1 ? "élément ajouté" : "éléments ajoutés";

  return (
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h1 className="sr-only">{t.tutorialConfig.addTitle}</h1>
      <div className="space-y-4 py-2">
        <TutorialProductForm t={t} />

        {t.addedCount > 0 && (
          <p className="text-center text-sm text-primary font-medium">
            ✓ {t.addedCount} {addedLabel}
          </p>
        )}
      </div>
    </div>
  );
}
