# PLAN - Correction ProductForm.tsx

## Problème identifié
Le `<div className="space-y-4">` (ligne 169) est fermé trop tôt à la ligne 217 (`</div>`), ce qui fait que tout le contenu suivant (prix, stock, type, variantes, etc.) se retrouve **en dehors** du conteneur principal, et casse la structure JSX du `DialogContent`.

## Structure actuelle (cassée)
```
<DialogContent>
  <DialogHeader>...</DialogHeader>
  <div className="space-y-4">           // ligne 169
    <div>Nom</div>                       // ligne 170
    <div>Photo</div>                     // ligne 179
    <input...>                           // ligne 208
  </div>                                 // ligne 217 ← FERME space-y-4 TROP TÔT
  <div className="space-y-3">...</div>   // ligne 218-282 ← HORS conteneur
  <div>Type</div>                        // ligne 285-310
  {showVariants && ...}
  {hasSerialNumber && ...}
  {productType === "product" && ...}
  <div>Catégorie</div>                   // ligne 400-402
</DialogContent>                          // ligne 413
```

## Structure attendue (correcte)
```
<DialogContent>
  <DialogHeader>...</DialogHeader>
  <div className="space-y-4">           // ligne 169
    <div>Nom</div>                       // ligne 170
    <div>Photo</div>                     // ligne 179
    <input...>                           // ligne 208
    <div className="space-y-3">...</div> // ligne 218-282 ← DEDANS
    <div>Type</div>                      // ligne 285-310
    {showVariants && ...}
    {hasSerialNumber && ...}
    {productType === "product" && ...}
    <div>Catégorie</div>                 // ligne 400-402
  </div>                                 // AVANT DialogFooter
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

## Corrections à faire (2 edits précis)

### Edit 1 - Ligne 217 : SUPPRIMER le `</div>` qui ferme space-y-4 trop tôt
```diff
-        </div>          {/ ligne 217 - SUPPRIMER /}
- <div className="space-y-3">
+ <div className="space-y-3">
```

### Edit 2 - Ligne 403 : AJOUTER le `</div>` de fermeture de space-y-4 AVANT DialogFooter
```diff
        <div>
          <Label>Catégorie</Label>
          <CategorySelect value={category} onChange={setCategory} />
        </div>
+       </div>          {/ AJOUTER ICI - ferme space-y-4 /}
        <DialogFooter>
```

## Vérification
Après ces 2 edits :
- `space-y-4` s'ouvre ligne 169
- `space-y-4` se ferme ligne ~404 (avant DialogFooter)
- Tout le contenu formulaire est bien DEDANS
- Structure JSX valide