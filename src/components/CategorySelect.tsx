// Sélecteur de catégorie produit, partagé par le formulaire produit et le dialogue
// « Article manuel ». Affiche les catégories fixes plus toute catégorie créée par le
// commerce (« Chips », « Sucreries »…), et une entrée « + Nouvelle catégorie » qui en
// crée une à la volée — enregistrée dans les préférences, elle est réutilisable partout.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CATEGORIES, addCategory, listCategories, type Category } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Valeur sentinelle du « + Nouvelle catégorie » dans la liste. Préfixée `__` pour ne
// jamais pouvoir entrer en collision avec un vrai libellé — rien n'empêche un commerce
// de nommer une catégorie « Boisson » ou autre, mais pas « __new_category ».
const NEW_CATEGORY = "__new_category";

export function CategorySelect({
  value,
  onChange,
  id,
}: {
  value: Category;
  onChange: (c: Category) => void;
  id?: string;
}) {
  const qc = useQueryClient();
  const { data: categories = CATEGORIES } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const createMut = useMutation({
    mutationFn: addCategory,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      onChange(created);
      setNewOpen(false);
      setNewName("");
      toast.success(`Catégorie « ${created} » créée`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function create() {
    const name = newName.trim();
    if (!name) {
      toast.error("Nom de catégorie requis");
      return;
    }
    createMut.mutate(name);
  }

  return (
    <div>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === NEW_CATEGORY) {
            setNewOpen(true);
            return;
          }
          setNewOpen(false);
          onChange(v as Category);
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
          <SelectItem value={NEW_CATEGORY}>+ Nouvelle catégorie…</SelectItem>
        </SelectContent>
      </Select>
      {newOpen && (
        // `flex-wrap` : à 320px, champ + deux boutons ne tiennent pas sur une
        // ligne — les boutons passent dessous au lieu de compresser le champ.
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
            placeholder="Ex : Chips"
            autoFocus
            className="min-w-0 flex-1"
          />
          <Button size="sm" onClick={create} disabled={createMut.isPending}>
            Créer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNewOpen(false)}>
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}
