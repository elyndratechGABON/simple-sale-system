// Semaphore simple pour limiter les échanges P2P simultanés
// Empêche la surcharge du relais quand plusieurs employés synchronisent
export class SyncSemaphore {
  private count = 0;
  private max: number;
  private queue: (() => void)[] = [];

  constructor(max = 3) {
    this.max = max;
  }

  async acquire(): Promise<() => void> {
    if (this.count < this.max) {
      this.count++;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.count++;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.count--;
    if (this.queue.length > 0 && this.count < this.max) {
      const next = this.queue.shift();
      next?.();
    }
  }
}

export const syncSemaphore = new SyncSemaphore(3);
