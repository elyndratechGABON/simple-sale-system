// Alerte in-app : dates de retour d'actifs de location.
// S'affiche quand un produit actif a return_date = aujourd'hui.
import { useEffect, useState } from "react";
import { fetchReminders } from "../lib/reminders";

export function RentalReminderBanner() {
  const [reminders, setReminders] = useState<{ id: string; returnDate: number }[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchReminders().then((r) => {
      if (!cancelled) setReminders(r);
    });
    const timer = setInterval(
      () =>
        fetchReminders().then((r) => {
          if (!cancelled) setReminders(r);
        }),
      60000,
    );
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  const dueToday = reminders.filter((r: { returnDate: number }) => {
    const d = new Date(r.returnDate);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });
  if (!dueToday.length) return null;
  return (
    <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/30 p-3 text-sm font-medium text-amber-900 dark:text-amber-100">
      Rappel location : {dueToday.length} actif{dueToday.length > 1 ? "s" : ""} à retourner
      aujourd'hui.
    </div>
  );
}
