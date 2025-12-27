import { PdfTask } from './types';
import { pdfPool } from './pool';

export async function runWithRetry(
  tasks: PdfTask[],
  maxRetry = 2
): Promise<string[]> {
  let pending = tasks;
  let attempt = 0;
  const results: string[] = [];

  while (pending.length && attempt <= maxRetry) {
    const failed: PdfTask[] = [];

    const res = await Promise.allSettled(
      pending.map(t => pdfPool.run(t))
    );

    res.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        failed.push(pending[i]);
      }
    });

    pending = failed;
    attempt++;

    if (pending.length) {
      console.warn(
        `[Retry] attempt ${attempt}, remaining=${pending.length}`
      );
    }
  }

  if (pending.length) {
    throw new Error(
      `Failed after retry: ${pending.length}`
    );
  }

  return results;
}
