import puppeteer, { Browser, Page } from 'puppeteer';
import { PdfTask } from './types';


let browser: Browser | null = null;
let usedCount = 0;
const MAX_BROWSER_TASKS =
    process.platform === 'win32' ? 20 : 50;


// 每 20 个 PDF 重启 browser
async function getBrowser(): Promise<Browser> {
    if (!browser || usedCount >= MAX_BROWSER_TASKS) {
        if (browser) {
            try {
                await browser.close();
            } catch { }
        }

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                // '--no-zygote',
                // '--single-process',
            ],
        });

        usedCount = 0;
    }

    usedCount++;

    if (usedCount % 10 === 0) {
        console.log(
            `[Worker ${process.pid}] browser tasks=${usedCount}`
        );
    }

    return browser;
}

export default async function generatePdf(
    task: PdfTask
): Promise<string> {
    const browser = await getBrowser();
    let page: Page | null = null;

    try {
        page = await browser.newPage();

        const { width, height } = parsePageSize(task.content);

        await page.setViewport({
            width,
            height,
            deviceScaleFactor: 1,
        });

        await page.setContent(task.content, {
            waitUntil: "networkidle0",
        });

        await page.addStyleTag({
            content: `
                @media print {
                    html, body {
                        margin: 0;
                        padding: 0;
                    }

                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;

                        font-weight: normal !important;
                        font-synthesis: none !important;

                        text-shadow: none !important;
                        box-shadow: none !important;

                        letter-spacing: 0 !important;
                        word-spacing: 0 !important;
                    }
                }`,
        });

        await page.evaluateHandle('document.fonts.ready');

        await page.emulateMediaType('print');

        await page.pdf({
            path: task.output,
            width: `${width}px`,
            height: `${height}px`,
            printBackground: true,
            margin: {
                top: "0px",
                right: "0px",
                bottom: "0px",
                left: "0px",
            },
            pageRanges: "1",
            preferCSSPageSize: true,
            scale: 1
        });

        return task.output;
    } finally {
        if (page) {
            try {
                await page.evaluate(() => {
                    document.body.innerHTML = '';
                });
            } catch { }

            await page.close();
        }
    }
}



/**
 * 从 HTML 中解析页面尺寸（pdf2html / pdf.js 结构）
 * 例如：<div id="p2" style="width:909px; height:1286px;">
 */
function parsePageSize(html: string): { width: number; height: number } {
    const match = html.match(
        /<div id="p\d+"[^>]*width\s*:\s*(\d+)px;\s*height\s*:\s*(\d+)px/
    );

    if (!match) {
        throw new Error("无法解析 HTML 页面尺寸（未找到 pX 容器）");
    }

    return {
        width: Number(match[1]),
        height: Number(match[2]),
    };
}