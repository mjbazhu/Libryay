// .env 配置文件
import 'dotenv/config';
import { ZLibraryClient } from '@/clients/zlibrary.client';
import { ZLibraryService } from '@/services/zlibrary.service';
import { EpubService } from '@/services/epub.service';
import { PdfService } from '@/services/pdf.service';
import { AxiosParams } from '@/types/zlibrary';
import { epubMerge } from '@/merge/epub.merge';
import { pdfMergeAndClean } from '@/merge/pdf.merge';
import { getLine } from '@/utils/readline';
import { AUTHOR_COOKIE } from './config/cookies';


(async () => {

  const client = await ZLibraryClient.create();

  // 在初始化时检查是否有某个固定的 cookie，如果没有则重新获取
  client.ensureCookie('remix_userkey', 'https://example.com')
    .then(() => {
      console.log('Current cookies:', client.cookies);
    });


  const zlib = await ZLibraryService.create(client);
  const epub = new EpubService(client);
  const pdf = new PdfService(client);


  // 选择下载内容
  const selectContent = await getLine('请输入你要搜索的内容，页数(以，分割）：');
  let split = selectContent.split(',');
  if(split.length < 2) split = selectContent.split('，');
  const page = split[1];
  const content = split[0];

  // // 开始书的内容
  const books = await zlib.search(content, Number(page));
  for (const [key, value] of Object.entries(books)) {
    console.log(`${Number(key) + 1}. name:${value.title}, author:${value.author}`);
  }
  const select = await getLine('请输入你要选择的书籍：');
  const book = books[Number(select) - 1];

  // // 开始获取书籍url
  const keys = await zlib.initContext(book);
  const token = await zlib.getAccessToken(keys);
  const infos = await zlib.getBookInfos(token, keys);
  const source = await zlib.getUrlBook(infos, token);
  let params: AxiosParams = {
    book_id: infos.bookId,
    file_identifier: infos.fileIdentifier,
    section_source: source,
    access_token: token
  }
  let type = (infos.type === 'FLOW') ? 'epub' : 'pdf';
  console.log(`name:${infos.title}, type:${type}`);

  // 开始下载
  if (infos.type === 'FLOW') {

    // 下载
    await epub.download(infos, params, 'workers', 5);
    // 合并
    await epubMerge(infos.title);

  } else {

    // 下载
    await pdf.download(params, infos, 'threads', 5);
    // 合并并清理缓存

    await pdfMergeAndClean(infos.title);

  }


  // console.log('下载完成');

})();