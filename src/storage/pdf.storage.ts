import fs from 'fs';
import path from 'path';
import { BookType } from '@/types/zlibrary';
import { sanitizeFileName } from '@/utils/filename';

export class PdfStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'books', 'pdf');
  }

  /**
   * 保存单页 png 文件
   */
  async saveImage(
    book: BookType,
    image: ArrayBuffer,
    page: number
  ): Promise<void> {
    // 创建路径
    const bookDir = this.makeDir(book);
    const filePath = path.join(bookDir, `${page}.jpg`);
    if (fs.existsSync(filePath)) return;

    // 写入
    fs.writeFileSync(filePath, Buffer.from(image));
  }

  /**
   * 保存单页 html 文件
   */
  async saveHtml(
    book: BookType,
    html: string,
    page: number
  ): Promise<void> {
    // 创建路径
    const bookDir = this.makeDir(book);
    const filePath = path.join(bookDir, `${page}.html`);
    if (fs.existsSync(filePath)) return;

    // 写入
    fs.writeFileSync(filePath, html, {encoding:'utf-8'});
  }

  async saveConfig(book:BookType, data:ArrayBuffer[]){
    const bookDir = this.makeDir(book);
    const config = path.join(bookDir, 'bookmarks.json');
    // 写入config
    fs.writeFileSync(config, JSON.stringify(data, null, 2));
  }

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private makeDir(book: BookType) {
    const bookName = sanitizeFileName(book.title);
    const bookDir = path.join(this.baseDir, bookName);
    this.ensureDir(bookDir);
    return bookDir;
  }

  public checkFileExist(book: BookType, page: number, type:string): boolean {
    const bookDir = this.makeDir(book);
    const filePath = path.join(bookDir, `${page}.${type}`);
    if (fs.existsSync(filePath)) return true;
    return false;
  }
}