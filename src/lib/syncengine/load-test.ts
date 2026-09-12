// Test de charge concurrente — simulate concurrent requests
import { exchangeOps } from "./transport";
import { relayTransport } from "./transport";

const CONCURRENT_USERS = 10;

export async function loadTest() {
  const results = await Promise.all(
    Array.from({ length: CONCURRENT_USERS }, (_, i) =>
      exchangeOps(relayTransport("http://localhost:3001"))
        .then((r) => ({ ok: true, user: i, pushed: r.pushed }))
        .catch((e) => ({ ok: false, user: i, error: e.message })),
    ),
  );

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log(`Load test complete: ${ok}/${CONCURRENT_USERS} OK, ${failed} failed`);
  return results;
}
