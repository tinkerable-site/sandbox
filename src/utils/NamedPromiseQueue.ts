import PromiseQueue from 'p-queue';

export class NamedPromiseQueue<T> {
  promises: Map<string, Promise<T>>;
  queue: PromiseQueue;

  constructor(autoStart: boolean, concurrency: number = 50) {
    this.promises = new Map();
    this.queue = new PromiseQueue({
      autoStart,
      concurrency,
    });
  }

  addEntry(id: string, run: () => Promise<T>): Promise<T> {
    let foundPromise = this.promises.get(id);
    if (!foundPromise) {
      foundPromise = this.queue.add<T>(run).finally(() => {
        this.promises.delete(id);
      });
    }
    this.promises.set(id, foundPromise);
    return foundPromise;
  }

  getItem(id: string) {
    return this.promises.get(id);
  }

  clear() {
    this.promises = new Map();
    this.queue.clear();
  }

  onIdle(): Promise<void> {
    return this.queue.onIdle();
  }

  pending(): number {
    return this.queue.pending;
  }
}
