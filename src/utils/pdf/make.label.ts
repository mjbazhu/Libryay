import fs from "fs";
import { PDFName, PDFNumber, PDFHexString, PDFRef, PDFDocument, PDFDict } from 'pdf-lib';

export interface BookmarkNode {
  title: string;
  page: number;       // 1-based
  zoom?: string;      // 例如: "XYZ 114 1136 0"
  children?: BookmarkNode[];
}

export async function addBookmarks(
  pdfPath: string,
  outPath: string,
  bookmarks: BookmarkNode[],
) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const context = pdfDoc.context;

  // 创建 Outlines 根
  const outlinesDict = context.obj({
    Type: PDFName.of('Outlines'),
  });
  const outlinesRef = context.register(outlinesDict);

  // 递归创建书签
  const topLevelRefs = createLevel(
    pdfDoc,
    context,
    outlinesRef,
    bookmarks,
  );

  // 连接根节点
  outlinesDict.set(PDFName.of('First'), topLevelRefs[0]);
  outlinesDict.set(PDFName.of('Last'), topLevelRefs[topLevelRefs.length - 1]);
  outlinesDict.set(PDFName.of('Count'), PDFNumber.of(topLevelRefs.length));

  // 挂到 Catalog
  pdfDoc.catalog.set(PDFName.of('Outlines'), outlinesRef);

  const outBytes = await pdfDoc.save({
    useObjectStreams: true
  });

  fs.writeFileSync(outPath, outBytes);
}

function buildDest(context: any, pageRef: PDFRef, zoom?: string) {
  if (!zoom || zoom.includes('Fit')) {
    return context.obj([pageRef, PDFName.of('Fit')]);
  }

  const parts = zoom.split(/\s+/);
  if (parts[0] !== 'XYZ' || parts.length !== 4) {
    return context.obj([pageRef, PDFName.of('Fit')]);
  }

  const left = Number(parts[1]);
  const top = Number(parts[2]);
  const scale = Number(parts[3]);

  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(scale)) {
    return context.obj([pageRef, PDFName.of('Fit')]);
  }

  return context.obj([
    pageRef,
    PDFName.of('XYZ'),
    PDFNumber.of(left),
    PDFNumber.of(top),
    PDFNumber.of(scale),
  ]);
}

/**
 * 安全创建同一层级书签
 * - 不在创建阶段互相 lookup
 * - Prev / Next 统一在创建完成后连接
 * - 所有 First / Last / Count 均带保护
 */
function createLevel(
  pdfDoc: PDFDocument,
  context: any,
  parentRef: PDFRef,
  nodes: BookmarkNode[],
): PDFRef[] {
  const refs: PDFRef[] = [];

  // -------- 第一遍：只创建节点 --------
  for (const node of nodes) {
    const pageIndex = node.page - 1;

    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
      console.warn(`非法页码，已跳过: ${node.page}`);
      continue;
    }

    const pageRef = pdfDoc.getPage(pageIndex).ref;

    const dict = context.obj({
      Title: PDFHexString.fromText(node.title),
      Parent: parentRef,
      Dest: buildDest(context, pageRef, node.zoom),
    });

    const ref = context.register(dict);
    refs.push(ref);
  }

  // -------- 第二遍：连接 Prev / Next --------
  for (let i = 0; i < refs.length; i++) {
    const dict = context.lookup(refs[i], PDFDict);
    if (!dict) continue;

    if (i > 0) {
      dict.set(PDFName.of('Prev'), refs[i - 1]);
    }
    if (i < refs.length - 1) {
      dict.set(PDFName.of('Next'), refs[i + 1]);
    }
  }

  // -------- 第三遍：递归处理子节点 --------
  for (let i = 0; i < refs.length; i++) {
    const node = nodes[i];
    const dict = context.lookup(refs[i], PDFDict);
    if (!dict) continue;

    if (node.children && node.children.length > 0) {
      const childRefs = createLevel(
        pdfDoc,
        context,
        refs[i],
        node.children,
      );

      if (childRefs.length > 0) {
        dict.set(PDFName.of('First'), childRefs[0]);
        dict.set(PDFName.of('Last'), childRefs[childRefs.length - 1]);
        dict.set(PDFName.of('Count'), PDFNumber.of(childRefs.length));
      }
    }
  }

  return refs;
}


if (require.main === module) {

  let marks = fs.readFileSync('./bookmarks.json', { encoding: 'utf-8' });
  const bookmarks: BookmarkNode[] = JSON.parse(marks);

  addBookmarks(
    './merged.pdf',
    'output.pdf',
    bookmarks,
  );
}