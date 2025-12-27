import * as cheerio from 'cheerio';
import { EpubManifest, EupbContent } from '@/types/zlibrary';

export function parseEpub(data: string): EpubManifest {
    const $ = cheerio.load(data);
    let images = $('item[media-type="image/jpeg"]')
            .map((_, el) => $(el).attr('href'))
            .get();
    if ($('item[media-type="image/gif"]')) {
        images = [...images, ...$('item[media-type="image/gif"]')
            .map((_, el) => $(el).attr('href'))
            .get()]
    }
    return {
        text: $('item[media-type="application/xhtml+xml"]')
            .map((_, el) => $(el).attr('href'))
            .get(),
        images: images,
        css: $('item[media-type="text/css"]')
            .map((_, el) => $(el).attr('href'))
            .get(),
        ncx: $('item[media-type="application/x-dtbncx+xml"]')
            .map((_, el) => $(el).attr('href'))
            .get(),
        opf: data
    };
}

export function parseTextEupb(data: string): EupbContent {
    // 获取txt
    let $ = cheerio.load(data);
    let content = $('title').text();
    let text: string;
    $('.kindle-cn-toc-level').each((_, el) => {
        text = $(el).text();
        content += '\n' + text;
    })
    $('p').each((_, el) => {
        text = $(el).text();
        content += '\n' + text;
    })
    $('li').each((_, el) => {
        text = $(el).text();
        content += '\n' + text;
    })
    content += '\n\n';
    return {
        txt: content,
        epub: data
    }
}