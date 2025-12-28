import * as cheerio from 'cheerio';
import { BookKeys } from '@/types/zlibrary';

export function parseBookKeys(html: string): BookKeys {
  const $ = cheerio.load(html);
  const href = $('.book-details-button .btn-group .btn').attr('href');
  if (!href) {
    throw new Error('无法解析书籍密钥');
  }
  return {
    clientKey: href.match(/\?client_key=(.*?)&/)?.[1]!,
    signature: href.match(/&signature=(.*?)&/)?.[1]!,
    source: href.match(/\/read\/(.*?)\//)?.[1]!
  };
}


