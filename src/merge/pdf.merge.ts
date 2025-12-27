import path from 'path';
import fs from 'fs';
import { htmlMergeToPDF } from '@/utils/pdf/html.merge.worker';
import { addBookmarks, BookmarkNode } from '@/utils/pdf/make.label';
import { TEMP_PATH } from '@/config/local-path';
import { readHtmlFile } from '@/utils/readfile';


export async function pdfMergeAndClean(title: string) {


    let pdfPath = path.join(process.cwd(), 'books', 'pdf');
    let bookPath = path.join(pdfPath, title);
    let outputPath = path.join(bookPath, `${title}.pdf`);
    await htmlMergeToPDF(bookPath, outputPath);


    console.log('开始加入标签');
    let marksPath = path.join(bookPath, 'bookmarks.json');
    let marks = fs.readFileSync(marksPath, { encoding: 'utf-8' });
    const bookmarks: BookmarkNode[] = JSON.parse(marks);
    let marksPdfPath = path.join(bookPath, `${title}-label.pdf`);
    await addBookmarks(
        outputPath,
        marksPdfPath,
        bookmarks,
    );

    console.log(`书签加入完毕，正在删除缓存文件`);
    await rmFilesCache(bookPath);
}

async function rmFilesCache(htmlDir: string) {
    fs.rmSync(TEMP_PATH, { recursive: true, force: true });
    let htmlfiles = readHtmlFile(htmlDir);
    for (const file of htmlfiles) {
        let rmFile = path.join(htmlDir, file);
        fs.rmSync(rmFile, { recursive: true, force: true });
    }
}