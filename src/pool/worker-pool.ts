import { Worker } from 'worker_threads';
import type { WorkerTask, WorkerResponse } from '@/types/worker';

export class WorkerPool {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private queue: any[] = [];

  constructor(size: number, workerFile: string) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerFile,
        {
          execArgv: [
            '-r', 'ts-node/register',
            '-r', 'tsconfig-paths/register'
          ]
        }
      );
      this.workers.push(worker);
      this.idleWorkers.push(worker);
    }
  }

  run<T extends WorkerResponse>(task: WorkerTask): Promise<T> {
    return new Promise((resolve, reject) => {
      const job = { task, resolve, reject };
      const worker = this.idleWorkers.pop();
      if (worker) {
        this.execute(worker, job);
      } else {
        this.queue.push(job);
      }
    });
  }

  // private execute(worker: Worker, job: any) {
  //   const cleanup = () => {
  //     worker.removeListener('message', onMessage);
  //     worker.removeListener('error', onError);
  //   };

  //   const finish = () => {
  //     this.idleWorkers.push(worker);
  //     const next = this.queue.shift();
  //     if (next) this.execute(worker, next);
  //   };

  //   const onMessage = (result: any) => {
  //     cleanup();
  //     finish();

  //     if (result.type === 'error') {
  //       job.reject(result.error);
  //     } else {
  //       job.resolve(result);
  //     }
  //   };

  //   const onError = (err: Error) => {
  //     cleanup();
  //     finish();
  //     job.reject(err);
  //   };

  //   worker.once('message', onMessage);
  //   worker.once('error', onError);
  //   worker.postMessage(job.task);
  // }


  private execute(worker: Worker, job: any) {
    const onMessage = (result: any) => {
      cleanup();
      this.idleWorkers.push(worker);

      const next = this.queue.shift();
      if (next) this.execute(worker, next);

      if (result.type === 'error') {
        job.reject(result.error);
      } else {
        job.resolve(result);
      }
    };

    const onError = (err: Error) => {
      cleanup();

      // 核心修复点
      this.idleWorkers.push(worker);

      const next = this.queue.shift();
      if (next) this.execute(worker, next);

      job.reject(err);
    };

    const cleanup = () => {
      worker.removeListener('message', onMessage);
      worker.removeListener('error', onError);
    };

    worker.once('message', onMessage);
    worker.once('error', onError);
    worker.postMessage(job.task);
  }

  async destroy() {
    await Promise.all(this.workers.map(w => w.terminate()));
  }
}