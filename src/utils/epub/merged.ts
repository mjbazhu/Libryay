import fs from 'fs';
import path from 'path';
import archiver from 'archiver';



/**
 * 合成epubpackage
 * @param name      文件名  
 * @param obepsPath obeps文件夹
 * @param container META-INF/container.xml文件
 */
export async function packageEpub(name: string, filePath:string) {

    let oebpsPath = path.join(filePath, 'OEBPS');
    let container = path.join(process.cwd(), 'src', 'package', 'META-INF', 'container.xml');
    let bookName = path.join(filePath, name + '.epub');

    const output = fs.createWriteStream(bookName);
    const archive = archiver('zip');

    archive.pipe(output);

    /**
     * 1️⃣ mimetype：必须第一个，且 store:true
     */
    archive.append('application/epub+zip', {
        name: 'mimetype',
        store: true
    });

    /**
     * 2️⃣ META-INF/container.xml
     */
    archive.file(container, {
        name: 'META-INF/container.xml'
    });

    /**
     * 3️⃣ OEBPS 整个目录（包括 opf / xhtml / images / css）
     */
    archive.directory(oebpsPath, 'OEBPS');

    /**
     * 4️⃣ finalize
     */
    archive.finalize();
}


if (require.main === module) {
    let bookName = '《水浒传》彩图版';
    packageEpub(bookName, './');
}