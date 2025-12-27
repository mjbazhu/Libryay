import path from 'path';
import { parseEpub, parseTextEupb } from '@/parsers/epub.parser';
import { ZLibraryClient } from '@/clients/zlibrary.client';
import { EpubStorage } from '@/storage/epub.storage';
import { AsyncPool } from '@/pool/axios-pool';
import { WorkerPool } from '@/pool/worker-pool';
import type { WorkerResponse } from '@/types/worker';
import { AxiosParams, BookType, EpubManifest, EupbContent } from '@/types/zlibrary';
import { CONTENT_URL } from '@/config/url'


export class EpubService {
  private readonly api = CONTENT_URL;

  constructor(
    private client: ZLibraryClient,
    private storage = new EpubStorage()
  ) { }

  /**
   * 主下载进程
   * @param book 
   * @param token 
   * @param sectionUrl 
   */
  async download(
    book: BookType,
    params: AxiosParams,
    type: 'threads' | 'workers' | 'single',
    threads: number = 3
  ): Promise<void> {

    const manifest = await this.fetchManifest(params);
    await this.storage.saveManifest(book, manifest);

    // text 
    let text = manifest.text;
    text.push(...manifest.css.map(value => value));
    text.push(...manifest.ncx.map(value => value));

    // images
    let images = manifest.images;

    console.log(`文件总数:${text.length + images.length},下载方式${type}`);

    if (type === 'single') {
      await this.downloadSingle(text, images, book, params);
    } else if (type === 'threads') {
      await this.downloadAsync(text, images, book, params, threads);
    } else {
      await this.downloadWorker(text, images, book, params, threads);
    }
  }

  /**
   * 单线程
   * @param text 文本文件
   * @param images 图片文件
   * @param book 书籍信息
   * @param params 参数
   */
  private async downloadSingle(
    text: string[],
    images: string[],
    book: BookType,
    params: AxiosParams
  ) {
    // text
    for (const page of text) {
      const content = await this.getTextContent(params, page);
      await this.storage.saveText(book, page, content);
    }

    // image 
    for (const image of images) {
      const buffer = await this.getImage(params, image);
      await this.storage.saveImage(book, image, buffer);
    }
  }

  /**
   * 多线程下载
   * @param text 文本文件
   * @param images 图片文件
   * @param book 书籍信息
   * @param params 参数
   * @param [threads=3] 线程数
   */
  private async downloadAsync(
    text: string[],
    images: string[],
    book: BookType,
    params: AxiosParams,
    threads: number = 3
  ): Promise<void> {

    // 创建线程池---最大并发数(建议 3~10)
    const pool = new AsyncPool(threads);
    const tasks: (() => Promise<void>)[] = [];

    // text 任务
    for (const page of text) {
      tasks.push(this.createTextTask(book, params, page));
    }

    // image 任务
    for (const image of images) {
      tasks.push(this.createImageTask(book, params, image));
    }

    // 并发执行
    await pool.all(tasks);
  }

  /**
 * 创建text任务
 * @param book 
 * @param sectionUrl 
 * @param page 
 * @param token 
 * @returns 
 */
  private createTextTask(
    book: BookType,
    params: AxiosParams,
    page: string
  ): () => Promise<void> {
    return async () => {
      const content = await this.getTextContent(params, page);
      await this.storage.saveText(book, page, content);
    };
  }

  /**
   * 创建图片任务
   * @param book 
   * @param sectionUrl 
   * @param image 
   * @param token 
   * @returns 
   */
  private createImageTask(
    book: BookType,
    params: AxiosParams,
    image: string
  ): () => Promise<void> {
    return async () => {
      const buffer = await this.getImage(params, image);
      await this.storage.saveImage(book, image, buffer);
    };
  }

  /**
   * workers下载
   * @param text 文本文件
   * @param images 图片文件
   * @param book 书籍信息
   * @param params 参数
   * @param [threads=3] 线程数
   */
  private async downloadWorker(
    text: string[],
    images: string[],
    book: BookType,
    params: AxiosParams,
    threads: number = 3
  ): Promise<void> {

    // workers池---Worker 数量 = CPU 核心数 or 核心数 - 1
    // 'D:/MyProgress/Lisryay/dist/workers/download.worker.js'
    const pool = new WorkerPool(
      threads,
      path.resolve(__dirname, '../workers/download.worker.ts')
    );

    const tasks = [];
    let textType: Extract<WorkerResponse, { type: 'text' }>;
    let imageType: Extract<WorkerResponse, { type: 'image' }>;
    let newParams: AxiosParams;

    for (const page of text) {

      newParams = {
        ...params,
        section_source: this.getSource(params.section_source, page)
      }

      tasks.push(
        pool.run<typeof textType>({
          type: 'text',
          api: this.api,
          params: newParams
        }).then(res => {
          console.log(page);
          return this.storage.saveText(book, page, res.content);

        })
      );
    }

    for (const image of images) {

      newParams = {
        ...params,
        section_source: this.getSource(params.section_source, image)
      }

      tasks.push(
        pool.run<typeof imageType>({
          type: 'image',
          api: this.api,
          params: newParams
        }).then(res => {
          console.log(image);
          return this.storage.saveImage(book, image, res.buffer);
        })
      );
    }

    await Promise.all(tasks);
    await pool.destroy();
  }

  /**
   * 获取epub文件名
   * @param params 书籍参数
   * @returns [EpubManifest]各种文件.css/.html/.xhtml/.jepg/.jpg/.gif等
   */
  private async fetchManifest(params: AxiosParams): Promise<EpubManifest> {
    const res = await this.client.http.get(this.api, { params: params });
    return parseEpub(res.data);
  }

  // 获取文本数据
  private async getTextContent(
    params: AxiosParams,
    page: string
  ): Promise<EupbContent> {
    // 获取网页内容
    let newParams = {
      ...params,
      section_source: this.getSource(params.section_source, page)
    };
    let res = await this.client.http.get(this.api, { params: newParams });
    let content = parseTextEupb(res.data);
    return content;
  }

  // 获取图片数据
  private async getImage(
    params: AxiosParams,
    image: string
  ): Promise<Buffer> {
    let newParams = {
      ...params,
      section_source: this.getSource(params.section_source, image)
    };
    let res = await this.client.http.get(this.api, {
      params: newParams,
      responseType: 'arraybuffer'
    });
    return res.data
  }

  // 获取文件url
  private getSource(source: string, page: string): string {
    return source.slice(0, source.lastIndexOf('/') + 1) + page;
  }

}