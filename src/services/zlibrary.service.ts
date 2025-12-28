import { AxiosInstance } from 'axios';
import { ZLibraryClient } from '@/clients/zlibrary.client';
import { parseSearch } from '@/parsers/search.parser';
import { parseBookKeys } from '@/parsers/book-key.parser';
import { BookInfo, BookType, BookKeys } from '@/types/zlibrary';
import { CTokenGenerator } from '@/utils/cookie/cookies';
import { CookieJar } from '@/utils/cookie/cookie-jar';
import { ACCESS_URL, BOOK_INFOS_URL, KEY_URL, SEARCH_URL, SOURCE_URL } from '@/config/url';

export class ZLibraryService {
  private baseUrl = SEARCH_URL;
  private keyUrl = KEY_URL;
  private bookUrl = BOOK_INFOS_URL;
  private configUrl = SOURCE_URL;
  private accessUrl = ACCESS_URL;
  private http!: AxiosInstance;
  private cookieJar!: CookieJar;
  constructor() { }

  static async create(client: ZLibraryClient): Promise<ZLibraryService> {
    let instance = new ZLibraryService();
    await instance.init(client);
    return instance;
  }

  /** 一条龙初始化接口 */
  public async init(client: ZLibraryClient): Promise<void> {
    // 初始化 axios 实例
    this.http = client.http;
    // cookie Jar
    this.cookieJar = client.cookieJar;

    await this.getCToken();
    await this.checkCookie();
    console.log('ZLibrary 初始化完成');
  }

  /** 搜索书籍 */
  public async search(keyword: string, page: number): Promise<BookInfo[]> {
    if (!this.http) throw new Error('请先调用 init() 初始化');
    let params = {
      q: keyword,
      page: page
    };
    const res = await this.http.get(this.baseUrl, { params: params });
    return parseSearch(res.data);
  }

  /** 获取书籍密钥 */
  public async initContext(book: BookInfo): Promise<BookKeys> {
    if (!this.http) throw new Error('请先调用 init() 初始化');
    const res = await this.http.get(this.keyUrl + book.href);
    return parseBookKeys(res.data);
  }

  /** 获取 access token */
  public async getAccessToken(ctx: BookKeys): Promise<string> {
    if (!this.http) throw new Error('请先调用 init() 初始化');
    const res = await this.http.post(this.accessUrl, {
      client_key: ctx.clientKey,
      signature: ctx.signature,
      source: ctx.source,
      user_id: this.cookieJar.get('remix_userid'),
      user_key: this.cookieJar.get('remix_userkey'),
      user_flush: 0
    }
    );
    return res.data.access_token;
  }

  /** 获取 bookInfos */
  async getBookInfos(access_token: string, key: BookKeys): Promise<BookType> {
    let params = {
      client_key: key.clientKey,
      extension: 'pdf',
      signature: key.signature,
      access_token: access_token,
      request_source: 'null',
      source: key.source,
      constants: '%5Bobject+Object%5D',
      detectors: '%5Bobject+Object%5D'
    }
    let res = await this.http.get(this.bookUrl, { params: params });
    let data = res.data;
    return {
      bookId: data.bookId,
      fileIdentifier: data.fileIdentifier,
      title: data.title,
      type: data.type
    }
  }

  /** 获取 booUrl */
  async getUrlBook(bookData: BookType, access_token: string): Promise<string> {
    let params = {
      book_id: bookData.bookId,
      file_identifier: bookData.fileIdentifier,
      access_token: access_token
    };
    let res = await this.http.get(this.configUrl, { params: params });
    return res.data.result.configURL
  }

  /** ---------------- 内部私有方法 ---------------- */

  /** 获取 c_token 并更新 headers */
  private async getCToken(): Promise<void> {
    const res = await this.http.get(this.baseUrl);

    const match = res.data.match(/.*?a0_0x2a54.*?=.*?\['(.*?)',/);
    if (!match) throw new Error('c_token 解析失败');

    const rawToken = match[1];
    const tokenGen = new CTokenGenerator();
    const cToken = tokenGen.generateCookie(rawToken);
    this.cookieJar.set('c_token', cToken);
    console.log(`cookie 更新完毕 -> ${cToken}`);
  }

  /** 检查 cookie 是否有效 */
  private async checkCookie(): Promise<void> {
    const testUrl = this.baseUrl + '/水浒传';
    const res = await this.http.get(testUrl);
    if (res.status >= 400) {
      throw new Error(`访问异常，HTTP 状态码: ${res.status}`);
    }
    console.log(`网页访问正常，状态码: ${res.status}`);
  }
}
