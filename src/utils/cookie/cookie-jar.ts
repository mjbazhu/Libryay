export class CookieJar {
  private jar = new Map<string, string>();

  constructor(initialCookie?: string) {
    if (initialCookie) {
      this.parse(initialCookie);
    }
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
}
