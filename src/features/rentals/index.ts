// API publique de la feature « location d'actifs ».
//
// Règle : un import depuis une AUTRE feature passe par ici — jamais par
// `@/features/rentals/components/RentalView`. Un import direct dans un sous-dossier
// permet ensuite de déplacer un fichier sans voir que trois autres en dépendaient.

export { RentalView } from "./components/RentalView";
export { RentalBookingDialog } from "./components/RentalBookingDialog";
export { RentalReturnDialog } from "./components/RentalReturnDialog";
export { RentalReminderBanner } from "./components/RentalReminderBanner";
export {
  useActiveRentals,
  useAllRentals,
  useAssetAvailability,
  useCreateRental,
  useMarkOverdueRentals,
  useOverdueRentals,
  useRental,
  useUpdateRental,
} from "./hooks/use-rentals";
export {
  unitsBetween,
  rentalTotal,
  overdueDays,
  lateFee,
  RENTAL_HOUR_MS,
  RENTAL_DAY_MS,
  RENTAL_YEAR_MS,
} from "./lib/rentals";
export { fetchReminders, type Reminder } from "./lib/fetch-reminders";
