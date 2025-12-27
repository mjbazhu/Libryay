import fs from "fs";
import path from "path";
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from "pdf-lib";

// PDF 和 config JSON 都在当前目录
const pdfPath = path.join(__dirname, "../merged.pdf");
const configString = path.join(__dirname, "../outline.json");;
interface Bookmark {
  title: string;
  page: number;
  zoom: string;
}
interface PDFConfig {
  pagecount: number;
  fileName: string;
  bookmarks: Bookmark[];
}
async function addTocToPdf() {
  // 解析 config
  const read = fs.readFileSync(configString, { encoding: "utf-8" });
  const config: PDFConfig = JSON.parse(read);
  const bookmarks = config.bookmarks;

  // 读取 PDF
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  // 嵌入中文字体
  const fontBytes = fs.readFileSync(path.join(__dirname, "..", "fonts", "SourceHanSerifSC-Regular.otf"));
  const font = await pdfDoc.embedFont(fontBytes);
  // const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 新增目录页作为第一页
  const tocPage = pdfDoc.insertPage(0);
  const { width, height } = tocPage.getSize();

  tocPage.drawText("目录", { x: 50, y: height - 50, size: 24, font, color: rgb(0, 0, 0) });

  bookmarks.forEach((bm, idx) => {
    tocPage.drawText(`${bm.title} .................. 第${bm.page}页`, {
      x: 50,
      y: height - 80 - idx * 20,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
  });

  // 保存 PDF
  const outputPath = path.join(__dirname, "pdf_with_toc.pdf");
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`生成 PDF 成功：${outputPath}`);
}
// addTocToPdf().catch(console.error);