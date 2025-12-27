import fs from 'fs';


export function readHtmlFile(htmlDir: string): string[] {
    const files = fs
        .readdirSync(htmlDir)
        .filter(f => f.endsWith(".html"))
        // 数字顺序
        .sort((a, b) => {
            const na = Number(a.match(/\d+/)?.[0] ?? 0);
            const nb = Number(b.match(/\d+/)?.[0] ?? 0);
            return na - nb;
        });
    return files ?? [];
}

