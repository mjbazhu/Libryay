import axios, { AxiosInstance } from 'axios';
import { CookieJar } from '@/utils/cookie/cookie-jar';

export class ZLibraryClient {
  readonly http: AxiosInstance;
  readonly cookieJar: CookieJar;

  constructor(cookie: string) {
    this.cookieJar = new CookieJar(cookie);
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
  }
}
