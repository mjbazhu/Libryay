import fs from 'fs';
import { COOKIE_PATH } from '@/config/cookies';

export class CookieJar {
  private jar = new Map<string, string>();
  private filePath = COOKIE_PATH;

  constructor( ) {
    this.init();
  }

  init(){
    this.loadFromFile();
  }

  /** 从字符串解析 cookie */
  parse(cookie: string) {
    cookie
      .split(';')
      .map(v => v.trim())
      .filter(Boolean)
      .forEach(pair => {
        const [k, ...rest] = pair.split('=');
        this.jar.set(k, rest.join('='));
      });
  }

  /** 设置 / 覆盖 单条 cookie */
  set(key: string, value: string) {
    this.jar.set(key, value);
  }

  /** 批量设置 */
  setMany(cookies: Record<string, string>) {
    Object.entries(cookies).forEach(([k, v]) => this.set(k, v));
  }

  /** 删除 cookie */
  delete(key: string) {
    this.jar.delete(key);
  }

  /** 序列化为 header 可用格式 */
  toString(): string {
    return Array.from(this.jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  /** 调试用 */
  toJSON() {
    return Object.fromEntries(this.jar);
  }

  /** 保存 cookies 到文件 */
  saveToFile() {
    const cookiesData = JSON.stringify(this.toJSON(), null, 2);
    fs.writeFileSync(this.filePath, cookiesData);
  }

  /** 从文件中加载 */
  loadFromFile() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        if(!data) return;
        const cookies = JSON.parse(data);
        Object.entries(cookies).forEach(([key, value]) => {
          this.set(key, value as string);
        });
      }
    } catch (error) {
      console.error('Error loading cookies from file:', error);
    }
  }

    /** 检查是否存在指定的 cookie */
  hasCookie(cookieName: string): boolean {
    return this.jar.has(cookieName);
  }

  get(key:string){
    return this.jar.get(key)
  }

}
