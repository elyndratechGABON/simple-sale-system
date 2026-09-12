// Retry avec backoff exponentiel pour résister au load
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastErr: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
      }
    }
  }
  throw lastErr ?? new Error("Retry failed");
}
