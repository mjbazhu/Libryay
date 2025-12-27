import { ZLibraryClient } from '@/clients/zlibrary.client';
import { BookType, AxiosParams } from '@/types/zlibrary';
import { PdfStorage } from '@/storage/pdf.storage';
import { AsyncPool } from '@/pool/axios-pool';
import { CONTENT_URL } from '@/config/url';

export class PdfService {

  private readonly api = CONTENT_URL;

  constructor(
    private client: ZLibraryClient,
    private storage = new PdfStorage()
  ) { }

  /**
   * 下载
   * @param params 请求参数
   * @param book 信息
   * @param type 下载类型
   * @param threads 线程数
   * @returns 
   */
  async download(
    params: AxiosParams,
    book: BookType,
    type: 'single' | 'threads',
    threads: number = 3
  ): Promise<void> {

    // 获取页码信息
    let source = `${params.section_source}/config.js`;
    const config = await this.getData(params, book, 1, 'config', source);
    const content = config.match(/.*?IDRViewer.config.*?=.*?({.*?);/);
    if (!content) return;
    const page = JSON.parse(content[1]);

    // 书签
    const bookmarks = page.bookmarks;
    if (bookmarks) {
      await this.storage.saveConfig(book, bookmarks);
    }

    // 下载类型
    if (type === 'single') {
      return this.downloadSingle(page, params, book);
    } else {
      return this.downloadAsync(page, params, threads, book);
    }

  }

  /**
   * 单线程
   * @param page 页面信息
   * @param params 请求参数
   * @param book 信息
   */
  private async downloadSingle(
    page: any,
    params: AxiosParams,
    book: BookType
  ) {
    // 类型判断
    if (page.creator.includes('Pdg2Pic')) {
      for (let i = 1; i <= page.pagecount; i++)
        this.getImageFormat(params, i, book);
    } else if (page.creator.includes('"Microsoft')) {
      for (let i = 1; i <= page.pagecount; i++)
        this.getHtmlFormat(params, i, book);
    } else {
      console.log('未知格式！！！');
      for (let i = 1; i <= page.pagecount; i++)
        this.getHtmlFormat(params, i, book);
    }
  }

  /**
 * 多线程下载
 * @param book 
 * @param token 
 * @param sectionUrl 
 * @param threads  线程数
 */
  private async downloadAsync(
    page: any,
    params: AxiosParams,
    threads: number,
    book: BookType
  ): Promise<void> {

    // 最大并发数（建议 3~10）
    const pool = new AsyncPool(threads);
    const tasks: (() => Promise<void>)[] = [];

    // 任务
    if (page.producer.includes('Pdf')) {
      for (let i = 1; i <= page.pagecount; i++)
        tasks.push(this.createImageTask(book, i, params));
    } else {
      for (let i = 1; i <= page.pagecount; i++)
        tasks.push(this.createHtmlTask(book, i, params));
    }
    // 并发执行
    await pool.all(tasks);
  }

  /**
* 创建图片任务
* @param book 
* @param params 
* @param params
* @returns 
*/
  private createImageTask(
    book: BookType,
    page: number,
    params: AxiosParams
  ): () => Promise<void> {
    return async () => {
      await this.getImageFormat(params, page, book);
    };
  }

  /**
   * 创建html任务
   * @param book 
   * @param page 
   * @param params 
   * @returns 
   */
  private createHtmlTask(
    book: BookType,
    page: number,
    params: AxiosParams
  ): () => Promise<void> {
    return async () => {
      await this.getHtmlFormat(params, page, book);
    }
  }

  private async getImageFormat(
    params: AxiosParams,
    page: number,
    book: BookType
  ) {

    let source = `${params.section_source}/${page}.html`;
    const data = await this.getData(params, book, page, 'jpg', source);
    if (!data) return;
    const image = data.match(/.*?xlink:href="(.*?)"\/>/);
    if (image) {
      const imageBuffer = await this.client.http.get(image[1], { responseType: 'arraybuffer' });
      await this.storage.saveImage(book, imageBuffer.data, page);
    }

  }

  private async getHtmlFormat(
    params: AxiosParams,
    page: number,
    book: BookType
  ) {
    let source = `${params.section_source}/${page}.html`;
    const data = await this.getData(params, book, page, 'html', source);
    if (!data) return;
    await this.storage.saveHtml(book, data, page);
  }

  private async getData(
    params: AxiosParams,
    book: BookType,
    page: number,
    type: string,
    source: string
  ): Promise<string> {

    let newParams = {
      ...params,
      section_source: source
    }
    const isExists = this.storage.checkFileExist(book, page, type);
    if (isExists) return '';
    const data = await this.client.http.get(this.api, { params: newParams });

    return data.data
  }
}
