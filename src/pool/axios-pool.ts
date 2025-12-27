export class AsyncPool {
  private concurrency: number;
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  async run(task: () => Promise<void>): Promise<void> {
    if (this.running >= this.concurrency) {
      await new Promise<void>(resolve => {
        this.queue.push(resolve);
      });
    }

    this.running++;

    try {
      await task();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }

  async all(tasks: (() => Promise<void>)[]): Promise<void> {
    await Promise.all(tasks.map(task => this.run(task)));
  }
}
