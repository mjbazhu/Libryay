import fs from 'fs';
import path from 'path';
import { BookType, EpubManifest, EupbContent } from '@/types/zlibrary';
import { sanitizeFileName } from '@/utils/filename';

export class EpubStorage {
  private baseDir = path.join(process.cwd(), 'books', 'epub');

  /**
   * 保存 OPF 清单结构（不做打包，只落盘）
   */
  async saveManifest(book: BookType, manifest: EpubManifest): Promise<void> {
    const bookName = sanitizeFileName(book.title);
    const bookDir = path.join(this.baseDir, bookName);
    const oebpsDir = path.join(bookDir, 'OEBPS');

    this.ensureDir(oebpsDir);

    const opfPath = path.join(oebpsDir, 'content.opf');
    const manifestPath = path.join(oebpsDir, 'manifest.json');

    fs.writeFileSync(opfPath, manifest.opf!);
    delete (manifest.opf);

    fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  /**
 * 保存 TXT 文本资源
 */
  async saveTxt(
    book: BookType,
    content: string
  ): Promise<void> {
    const bookName = sanitizeFileName(book.title);
    const txtDir = path.join(this.baseDir, bookName);
    this.ensureDir(txtDir);

    const filePath = path.join(txtDir, book.title + '.txt');
    fs.writeFileSync(filePath, content, { encoding: 'utf-8', flag: 'a' });
  }
  
  /**
   * 保存 XHTML / CSS / NCX 等文本资源
   */
  async saveText(
    book: BookType,
    filename: string,
    content: EupbContent
  ): Promise<void> {
    const bookName = sanitizeFileName(book.title);
    const textDir = path.join(this.baseDir, bookName, 'OEBPS', 'Text');
    this.ensureDir(textDir);

    const finalName = path.basename(filename);
    const filePath = path.join(textDir, finalName);
    await this.saveTxt(book, content.txt);
    fs.writeFileSync(filePath, content.epub, 'utf-8');
  }

  /**
   * 保存图片资源
   */
  async saveImage(
    book: BookType,
    filename: string,
    buffer: Buffer
  ): Promise<void> {
    const bookName = sanitizeFileName(book.title);
    const imageDir = path.join(this.baseDir, bookName, 'OEBPS', 'Images');
    this.ensureDir(imageDir);

    const finalName = path.basename(filename);
    const filePath = path.join(imageDir, finalName);
    fs.writeFileSync(filePath, buffer);
  }

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
