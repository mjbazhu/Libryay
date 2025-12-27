import type { EupbContent, BookType, AxiosParams } from '@/types/zlibrary';

export type WorkerResponse =
  | {
    type: 'text';
    content: EupbContent;
  }
  | {
    type: 'image';
    buffer: Buffer;
  }
  | {
    type: 'error';
    error: string;
  };


interface BaseWorkerTask {
  api: string,
  params:AxiosParams
}

export type WorkerTask =
  | BaseWorkerTask & { type: 'text' }
  | BaseWorkerTask & { type: 'image' };
