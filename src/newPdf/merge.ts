import fs from 'fs';
import { PDFDocument } from 'pdf-lib';


export async function mergePdfsSegmented(
  pdfs: string[],
  output: string,
  segmentSize = 50
) {
  const finalPdf = await PDFDocument.create();

  for (let i = 0; i < pdfs.length; i += segmentSize) {
    const segment = pdfs.slice(i, i + segmentSize);

    for (const file of segment) {
      const bytes = fs.readFileSync(file);
      const doc = await PDFDocument.load(bytes);
      const pages = await finalPdf.copyPages(
        doc,
        doc.getPageIndices()
      );
      pages.forEach(p => finalPdf.addPage(p));
    }
  }

  fs.writeFileSync(output, await finalPdf.save());
}
