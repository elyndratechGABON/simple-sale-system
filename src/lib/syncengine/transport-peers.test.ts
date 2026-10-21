// La preuve de VIE des écrans : quand chaque appareil du groupe a-t-il tiré ses
// opérations. C'est la seule mesure honnête de « cet écran est-il là » — le
// registre local ne dit que « quand cet écran nous a-t-il envoyé quelque chose »,
// ce qui reste « Jamais » pour un employé discret et « Jamais » en permanence pour
// l'écran du patron.
import { describe, it, expect } from "vitest";
import { relayTransport } from "./transport";

describe("preuve de vie des pairs (relais)", () => {
  it("le transport lit les tirages du groupe", async () => {
    const appels: { url: string }[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      appels.push({ url });
      if (url.includes("/api/v1/ops/peers")) {
        return new Response(
          JSON.stringify({
            peers: [
              { device_id: "ecran-a", last_pulled_at: 1792545590834 },
              { device_id: "ecran-b", last_pulled_at: 1792545388169 },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(null, { status: 404 });
    };
    const client = relayTransport("https://relay.test", fetchImpl);
    const peers = await client.peers!("s_groupe");
    expect(peers).toHaveLength(2);
    expect(peers[0]?.device_id).toBe("ecran-a");
    expect(peers[0]?.last_pulled_at).toBe(1792545590834);
    expect(appels[0]?.url).toContain("/api/v1/ops/peers?shop_id=s_groupe");
  });

  it("un relais muet ne casse rien : la liste est vide", async () => {
    const fetchImpl: typeof fetch = async () => new Response(null, { status: 500 });
    const client = relayTransport("https://relay.test", fetchImpl);
    expect(await client.peers!("s_groupe")).toEqual([]);
  });
});
