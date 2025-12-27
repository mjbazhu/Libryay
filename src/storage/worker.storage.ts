
import { parseTextEupb } from '../parsers/epub.parser';
import type { WorkerResponse } from '@/types/worker';
import type { WorkerTask } from '@/types/worker';
import { AxiosInstance } from 'axios';


export async function getTextContent(
  task: WorkerTask,
  client: AxiosInstance
): Promise<WorkerResponse> {

  if (task.type !== 'text') {
    throw new Error('getTextContent only accepts text task');
  }

  // 获取网页内容
  let params = task.params;
  let res = await client.get(task.api, { params: params });
  let content = parseTextEupb(res.data);

  return {
    type: task.type,
    content
  }
}

type ImageTask = Extract<WorkerTask, { type: 'image' }>;

export async function getImage(
  task: ImageTask, 
  client: AxiosInstance
): Promise<WorkerResponse> {
  let params = task.params;
  let res = await client.get(task.api, {
    params: params,
    responseType: 'arraybuffer'
  });
  return {
    type: task.type,
    buffer: res.data
  }
}