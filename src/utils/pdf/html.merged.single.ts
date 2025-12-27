import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";


// const localChromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

/**
 * 从 HTML 中解析页面尺寸（pdf2html / pdf.js 结构）
 * 例如：<div id="p2" style="width:909px; height:1286px;">
 */
function parsePageSize(html: string): { width: number; height: number } {
  const match = html.match(
    /<div id="p\d+"[^>]*width\s*:\s*(\d+)px;\s*height\s*:\s*(\d+)px/
  );

  if (!match) {
    throw new Error("无法解析 HTML 页面尺寸（未找到 pX 容器）");
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

/**
 * HTML → 单页 PDF（严格一页，不分页）
 */
async function htmlToSinglePagePdf(
  html: string,
  width: number,
  height: number
): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
  });

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  const pdfBuffer = await page.pdf({
    width: `${width}px`,
    height: `${height}px`,
    printBackground: true,
    margin: {
      top: "0px",
      right: "0px",
      bottom: "0px",
      left: "0px",
    },
    pageRanges: "1",
  });

  await browser.close();
  return pdfBuffer;
}

/**
 * 合并 PDF，并统一缩放为 A4（PDF 层完成）
 */
async function mergePdfBuffersToA4Centered(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {

  // 创建pdf
  const mergedPdf = await PDFDocument.create();

  // A4 尺寸（pt）
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  // 合并pdf
  for (const buffer of pdfBuffers) {
    const srcPdf = await PDFDocument.load(buffer);
    const [srcPage] = await mergedPdf.copyPages(srcPdf, [0]);
    const page = mergedPdf.addPage(srcPage);
    const { width: srcW, height: srcH } = page.getSize();
    // 1️⃣ 等比缩放（以高度为准，防止分页）
    const scale = Math.min(
      A4_WIDTH / srcW,
      A4_HEIGHT / srcH
    );
    // 2️⃣ 计算居中偏移
    const offsetX = (A4_WIDTH - srcW * scale) / 2;
    const offsetY = (A4_HEIGHT - srcH * scale) / 2;
    // 3️⃣ 先缩放内容
    page.scaleContent(scale, scale);
    // 4️⃣ 再平移内容（居中）
    page.translateContent(offsetX / scale, offsetY / scale);
    // 5️⃣ 最后设置页面尺寸
    page.setSize(A4_WIDTH, A4_HEIGHT);
  }

  return await mergedPdf.save({
    useObjectStreams: true
  });
}

/**
 * 主流程
 */
async function newMergedMain() {
  const htmlDir = path.join(__dirname, "..", "htmls");
  const outputPath = path.join(__dirname, "merged.pdf");

  const files = fs
    .readdirSync(htmlDir)
    .filter(f => f.endsWith(".html"))
    // 数字顺序
    .sort((a, b) => {
      const na = Number(a.match(/\d+/)?.[0] ?? 0);
      const nb = Number(b.match(/\d+/)?.[0] ?? 0);
      return na - nb;
    });

  const pdfBuffers: Uint8Array[] = [];

  // 生成pdf
  for (const file of files) {
    const htmlPath = path.join(htmlDir, file);
    const html = fs.readFileSync(htmlPath, "utf-8");

    const { width, height } = parsePageSize(html);

    const pdf = await htmlToSinglePagePdf(html, width, height);
    pdfBuffers.push(pdf);

    console.log(`已生成单页 PDF: ${file}`);
  }

  // 合并pdf
  const mergedPdf = await mergePdfBuffersToA4Centered(pdfBuffers);

  // 写入文件
  fs.writeFileSync(outputPath, mergedPdf);
  console.log(`最终 PDF 已生成: ${outputPath}`);
}


export async function mergedPDF(htmlDir: string, fileName: string) {

  const files = fs
    .readdirSync(htmlDir)
    .filter(f => f.endsWith(".html"))
    // 数字顺序
    .sort((a, b) => {
      const na = Number(a.match(/\d+/)?.[0] ?? 0);
      const nb = Number(b.match(/\d+/)?.[0] ?? 0);
      return na - nb;
    });

  const pdfBuffers: Uint8Array[] = [];

  // 生成pdf
  for (const file of files) {
    const htmlPath = path.join(htmlDir, file);
    const html = fs.readFileSync(htmlPath, "utf-8");

    const { width, height } = parsePageSize(html);

    const pdf = await htmlToSinglePagePdf(html, width, height);
    pdfBuffers.push(pdf);

    console.log(`已生成单页 PDF: ${file}`);
  }

  // 合并pdf
  const mergedPdf = await mergePdfBuffersToA4Centered(pdfBuffers);

  // 写入文件
  let outputPath =  path.join(htmlDir, fileName + '.pdf');
  fs.writeFileSync(outputPath, mergedPdf);
  console.log(`最终 PDF 已生成: ${outputPath}`);

}

// qpdf output.pdf 123.pdf --stream-data=compress

if (require.main === module) {
  newMergedMain().catch(err => {
    console.error("生成 PDF 失败：", err);
  });
}