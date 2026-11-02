// cardPhotoOf : la carte produit montre la PREMIÈRE variante illustrée avant tout —
// fall back sur la photo du produit, puis sur l'absence. Empêche le retour au
// comportement « les variantes n'ont pas d'image propre ».
import { describe, expect, it } from "vitest";
import { cardPhotoOf } from "./card-display";

describe("cardPhotoOf", () => {
  it("sans variante : la photo du produit", () => {
    expect(cardPhotoOf({ photo: "produit.jpg" })).toBe("produit.jpg");
  });

  it("une variante illustrée gagne sur la photo du produit", () => {
    expect(
      cardPhotoOf({
        photo: "produit.jpg",
        variants: [{}, { photo: "rouge.jpg" }],
      }),
    ).toBe("rouge.jpg");
  });

  it("variantes sans photo : retombée sur l'image du produit", () => {
    expect(cardPhotoOf({ photo: "produit.jpg", variants: [{}] })).toBe("produit.jpg");
  });

  it("ni l'un ni l'autre : undefined (la carte affiche le placeholder)", () => {
    expect(cardPhotoOf({})).toBeUndefined();
  });
});
