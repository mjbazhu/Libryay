import * as cheerio from 'cheerio';
import { BookInfo } from '@/types/zlibrary';

/**
 * 解析 Z-Library 搜索结果页
 */
export function parseSearch(html: string): BookInfo[] {
  const $ = cheerio.load(html);
  const books: BookInfo[] = [];

  $('#searchResultBox .book-item').each((_, item) => {
    const card = $(item).find('z-bookcard');
    if (!card.length) return;

    const title = card.find('div').first().text().trim();
    const author = card.find('div').eq(1).text().trim();
    const bookId = Number(card.attr('id'));
    const href = card.attr('href');

    if (!title || Number.isNaN(bookId) || !href) return;

    books.push({
      bookId,
      title,
      author,
      href
    });
  });

  return books;
}
