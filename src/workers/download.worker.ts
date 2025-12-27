import axios from 'axios';
import http from 'http';
import https from 'https';
import { parentPort } from 'worker_threads';
import type { WorkerTask, WorkerResponse } from '@/types/worker';
import { getTextContent, getImage } from '@/storage/worker.storage';

// cookie
const cookie = process.env.ZLIB_COOKIE!;
if (!cookie) throw new Error('请设置 ZLIB_COOKIE');

const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({ keepAlive: false });

const client = axios.create({
  headers: {
    'accept': 'application/json',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'content-type': 'application/json',
    'origin': 'https://reader.per101.ru',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    cookie
  },
  httpAgent,
  httpsAgent,
  validateStatus: status => status >= 200 && status < 600
});

if (!parentPort) {
  throw new Error('Worker must have parentPort');
}

parentPort?.on('message', async (task: WorkerTask) => {
  try {
    let result: WorkerResponse;

    if (task.type === 'text') {
      result = await getTextContent(task, client);
      parentPort!.postMessage(result);
    }

    if (task.type === 'image') {
      result = await getImage(task, client);
      parentPort!.postMessage(result);
    }

  } catch (err) {
    parentPort!.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : err
    });
  }
});
