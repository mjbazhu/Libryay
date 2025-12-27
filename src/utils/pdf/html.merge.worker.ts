import fs from 'fs';
import path from 'path';
import { runInBatches } from '@/newPdf/batch';
import { runWithRetry } from '@/newPdf//retry';
import { mergePdfsSegmented } from '@/newPdf/merge';
import { logMemory } from '@/monitor/memory';
import { PdfTask } from '@/newPdf/types';
import { TEMP_PATH } from '@/config/local-path';
import { readHtmlFile } from '../readfile';

export async function htmlMergeToPDF(htmlDir: string, outputPath: string) {
  // HTML / URL 混合
  const tasks: PdfTask[] = readHtml(htmlDir);
  const allPdfs: string[] = [];

  // 开始启动worker任务
  console.log('开始workers')
  await runInBatches(tasks, 100, async (batch, index) => {
    logMemory(` before-batch-${index}`);
    const pdfs = await runWithRetry(batch);
    allPdfs.push(...pdfs);
    logMemory(` after-batch-${index}`);
  });

  // 开始合并
  console.log('开始合并pdf')
  await mergePdfsSegmented(allPdfs, outputPath);

  console.log('pdf已合成')
}

function readHtml(htmlDir: string): PdfTask[] {

  const files = readHtmlFile(htmlDir);

  let htmlList: PdfTask[] = [];

  // 创建缓存文件
  if (!fs.existsSync(TEMP_PATH)) fs.mkdirSync(TEMP_PATH, { recursive: true });

  for (const [key, file] of Object.entries(files)) {

    let output = path.join(TEMP_PATH, `retry-${key}.pdf`);
    let filePath = path.join(htmlDir, file);
    let read = fs.readFileSync(filePath, 'utf-8');
    htmlList.push({
      type: 'html',
      content: read,
      output: output
    });
  }

  return htmlList;
}

if (require.main === module) {

  // import fs from 'fs';
  // import { generatePdfs } from './pdf';
  // import { mergePdfs } from './pdf/merge';

  // async function main(htmlDir: string) {

  // let htmlList: string[] = readHtml(htmlDir);

  // const pdfs = await generatePdfs(htmlList, './temp');

  // await mergePdfs(pdfs, './final.pdf');

  // console.log('PDF done');
  // }
  // main(bookPath);

}