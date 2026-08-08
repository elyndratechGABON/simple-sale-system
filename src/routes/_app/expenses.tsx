// Saisie des dépenses — les sorties d'argent qui ne sont PAS un achat de marchandise.
//
// Le coût des marchandises est déjà figé dans `cost_at_sale` sur chaque ligne de vente ;
// le ressaisir ici le compterait deux fois. Cet écran est pour le loyer, le carburant,
// les salaires : ce qui creuse l'écart entre bénéfice brut et bénéfice net.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Wallet } from "lucide-react";
import {
  addExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  listExpenses,
  startOfToday,
  type ExpenseCategory,
} from "@/lib/db";
import { formatDay, formatFCFA } from "@/lib/format";
import { lastDaysRange } from "@/lib/analytics";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/expenses")({
  head: () => ({
    meta: [
      { title: "Dépenses — Caisse POS" },
      {
        name: "description",
        content:
          "Enregistrez loyer, transport, salaires et autres sorties d'argent pour suivre votre bénéfice net.",
      },
    ],
  }),
  component: ExpensesPage,
});

// Zod porte la validation ET la conversion : le champ HTML renvoie une chaîne, le
// schéma en fait un entier FCFA. Sans ça chaque appelant referait le `Number(...)`.
const expenseSchema = z.object({
  label: z.string().trim().min(1, "Libellé requis"),
  amount: z
    .string()
    .min(1, "Montant requis")
    .transform((v) => Number(v.replace(/\D/g, "")))
    .refine((n) => n > 0, "Montant invalide"),
  category: z.enum(["Achat", "Transport", "Salaire", "Loyer", "Autre"]),
  // `date` est un `<input type="date">`, donc "AAAA-MM-JJ". Voir `dateToTimestamp`.
  date: z.string().min(1, "Date requise"),
});

type ExpenseFormInput = z.input<typeof expenseSchema>;
type ExpenseFormOutput = z.output<typeof expenseSchema>;

/** "AAAA-MM-JJ" → minuit LOCAL. `new Date("2026-08-01")` donnerait minuit UTC, ce qui
 *  décale la dépense d'un jour dans les fuseaux à l'ouest de Greenwich. */
function dateToTimestamp(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ExpensesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const month = useMemo(() => lastDaysRange(30), []);

  const { data: expenses = [] } = useQuery({
    // Préfixe ["sales"] volontaire : c'est celui qu'invalident déjà toutes les mutations
    // métier, et les rapports lisent dépenses et ventes ensemble.
    queryKey: ["sales", "expenses", month.from, month.to],
    queryFn: () => listExpenses(month.from, month.to),
  });

  const todayStart = startOfToday();
  const todayTotal = expenses
    .filter((e) => e.timestamp >= todayStart)
    .reduce((s, e) => s + e.amount, 0);
  const monthTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const deleteMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Dépense supprimée");
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Dépenses
          </h1>
          <p className="text-sm text-muted-foreground">
            Loyer, transport, salaires — tout ce qui n'est pas un achat de marchandise.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle dépense
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Dépenses du jour" value={formatFCFA(todayTotal)} highlight />
        <StatCard label="Dépenses sur 30 jours" value={formatFCFA(monthTotal)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Aucune dépense sur les 30 derniers jours.
            </p>
          ) : (
            <ul className="divide-y">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{e.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.category} · {formatDay(e.timestamp)}
                    </div>
                  </div>
                  <span className="font-semibold shrink-0">{formatFCFA(e.amount)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Supprimer ${e.label}`}
                    onClick={() => deleteMut.mutate(e.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ExpenseDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { label: "", amount: "", category: "Autre", date: todayInputValue() },
  });

  const category = watch("category");

  const addMut = useMutation({
    mutationFn: (values: ExpenseFormOutput) =>
      addExpense({
        label: values.label,
        amount: values.amount,
        category: values.category,
        timestamp: dateToTimestamp(values.date),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Dépense enregistrée");
      reset({ label: "", amount: "", category: "Autre", date: todayInputValue() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle dépense</DialogTitle>
        </DialogHeader>
        <form
          id="expense-form"
          onSubmit={handleSubmit((values) => addMut.mutate(values))}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="exp-label">Libellé</Label>
            <Input id="exp-label" placeholder="Ex : Loyer août" autoFocus {...register("label")} />
            <FieldError message={errors.label?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="exp-amount">Montant (FCFA)</Label>
              <Input
                id="exp-amount"
                inputMode="numeric"
                placeholder="50000"
                {...register("amount")}
              />
              <FieldError message={errors.amount?.message} />
            </div>
            <div>
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" type="date" {...register("date")} />
              <FieldError message={errors.date?.message} />
            </div>
          </div>
          <div>
            <Label>Catégorie</Label>
            {/* Radix Select n'expose pas d'input natif : `register` ne peut pas s'y
                brancher, d'où le pilotage manuel par `watch` / `setValue`. */}
            <Select
              value={category}
              onValueChange={(v) => setValue("category", v as ExpenseCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="expense-form" disabled={isSubmitting || addMut.isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}
