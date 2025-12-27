import { EpubNormalizer } from '@/utils/epub/normalized';
import { packageEpub } from "@/utils/epub/merged";
import path from 'path';



export async function epubMerge(title: string) {
    let epubPath = path.join(process.cwd(), 'books', 'epub');
    let bookPath = path.join(epubPath, title);
    let normailzer = new EpubNormalizer(bookPath);

    console.log(`开始规范epub文件`);
    normailzer.normalize();

    // 合并
    console.log(`开始合并`)
    await packageEpub(title, bookPath);

    console.log(`epub打包完毕，生成： ${bookPath}`);
}