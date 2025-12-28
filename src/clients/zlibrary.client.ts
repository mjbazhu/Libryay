import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { CookieJar } from '@/utils/cookie/cookie-jar';
import { USER_NAME, USER_PASSWORD } from '@/config/user';
import { HEADERS } from '@/config/cookies';
import { URLSearchParams } from 'node:url';

export class ZLibraryClient {
  readonly http!: AxiosInstance;
  readonly cookieJar!: CookieJar;
  readonly url: string = 'https://z-library.mn/rpc.php';
  readonly data: URLSearchParams;
  private headers = HEADERS;

  constructor() {
    this.cookieJar = new CookieJar();
    this.http = axios.create({
      headers: {
        'accept': 'application/json',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'content-type': 'application/json',
        'origin': 'https://reader.per101.ru',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
      },
      validateStatus: status => status >= 200 && status < 600
    });
    this.http.interceptors.request.use(config => {
      config.headers = config.headers ?? {};
      config.headers.cookie = this.cookieJar.toString();
      return config;
    });
    this.data = new URLSearchParams({
      isModal: 'true',
      email: USER_NAME,
      password: USER_PASSWORD,
      site_mode: 'books',
      action: 'login',
      redirectUrl: '',
      gg_json_mode: '1',
    });
  }

  async init() {
    
    let url = 'https://z-library.mn/rpc.php';
    await this.ensureCookie('remix_userid', url);

  }

  static async create() {
    let instance = new ZLibraryClient();
    await instance.init();
    return instance;
  }

  /** 检查指定的 cookie 是否存在 */
  hasRequiredCookie(cookieName: string): boolean {
    return this.cookieJar.hasCookie(cookieName);
  }

  /** 检查并决定是否重新获取 cookies */
  async ensureCookie(cookieName: string, url: string) {
    if (!this.hasRequiredCookie(cookieName)) {
      console.log(`Cookie "${cookieName}" not found, initiating cookie retrieval...`);
      await this.request(url, this.data);  // 获取 cookies
    } else {
      console.log(`Cookie "${cookieName}" is already present.`);
    }
  }

  /** 获取当前 cookies */
  get cookies() {
    return this.cookieJar.toString();
  }

  /** 发送请求并获取 cookies */
  async request(url: string, data: URLSearchParams, headers?: AxiosHeaders) {

    try {
      const response = await axios.post(url, data, { headers: headers ?? this.headers });

      // 获取响应中的 Set-Cookie 头部
      const cookies = response.headers['set-cookie'];

      // 如果存在 Set-Cookie 头部，将其解析并保存到 cookieJar 中
      if (cookies) {
        cookies.forEach(cookie => {
          this.cookieJar.parse(cookie);
        });
      }

      // 保存 cookies 到文件
      this.cookieJar.saveToFile();

      console.log('Cookies after request:', this.cookieJar.toJSON());
    } catch (error) {
      console.error('Error during request:', error);
    }
  }


}
