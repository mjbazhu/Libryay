import fs from 'fs';
import * as path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';


const RESOURCE_DIR = {
    text: 'Text',
    image: 'Images',
    css: 'Styles',
} as const;

type ResourceType = keyof typeof RESOURCE_DIR;

const MEDIA_DIR_MAP: Record<string, string | undefined> = {
    'application/xhtml+xml': 'Text',
    'image/jpeg': 'Images',
    'image/png': 'Images',
    'image/gif': 'Images',
    'text/css': 'Styles',
    'application/x-dtbncx+xml': undefined
};

const COVER_TITLE: Record<string, string | undefined> = {
    "cover": "Images",
    "other.titlepage": 'Text',
    "toc": "Text"
};


export class EpubNormalizer {
    private readonly rootDir: string;
    private readonly oebpsDir: string;
    private readonly opfPath: string;

    /** newHerf */
    private readonly pathMap = new Map<string, string>();

    private readonly parser = new XMLParser({
        ignoreAttributes: false,
        preserveOrder: true,
    });
    private readonly builder = new XMLBuilder({
        ignoreAttributes: false,
        preserveOrder: true,
        format: true
    });

    /**
     * epub路径重写
     * @param rootDir 书籍路径
     */
    constructor(rootDir: string) {
        this.rootDir = rootDir;
        this.oebpsDir = path.join(rootDir, 'OEBPS');
        this.opfPath = path.join(this.oebpsDir, 'content.opf');

        if (!fs.existsSync(this.opfPath)) {
            throw new Error('content.opf not found in OEBPS');
        }
    }

    // ---------------------------------------------------------------------------
    // Step 1: 扫描真实文件
    // ---------------------------------------------------------------------------
    private indexFiles(): Map<string, string> {
        const files = this.walk(this.oebpsDir);
        const map = new Map<string, string>();

        for (const file of files) {
            map.set(path.basename(file), file);
        }
        return map;
    }

    // 递归查找文件
    private walk(dir: string, acc: string[] = []): string[] {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            e.isDirectory() ? this.walk(full, acc) : acc.push(full);
        }
        return acc;
    }

    // ---------------------------------------------------------------------------
    // Step 2: 整理文件
    // ---------------------------------------------------------------------------
    private moveFile(fileIndex: Map<string, string>): void {
        const extMap: Record<string, ResourceType> = {
            '.css': 'css',
            '.html': 'text',
            '.xhtml': 'text',
            '.jpg': 'image',
            '.jpeg': 'image',
            '.png': 'image',
            '.gif': 'image',
        };

        for (const [name, oldPath] of fileIndex) {
            const ext = path.extname(name).toLowerCase();
            const type = extMap[ext];
            const targetBase = type
                ? this.mkdirBest(RESOURCE_DIR[type])
                : this.oebpsDir;

            const newPath = path.join(targetBase, name);
            if (!fs.existsSync(newPath)) {
                fs.renameSync(oldPath, newPath);
            }
            this.pathMap.set(name, newPath);
        }
    }

    // 构建基础文件
    private mkdirBest(file: string): string {
        const mkPath = path.join(this.oebpsDir, file);
        if (!fs.existsSync(mkPath)) fs.mkdirSync(mkPath, { recursive: true });
        return mkPath;
    }

    // ---------------------------------------------------------------------------
    // Step 3: 修复opf文件
    // ---------------------------------------------------------------------------
    private fixOpf() {
        const parsed = this.parser.parse(
            fs.readFileSync(this.opfPath, 'utf-8')
        );

        for (const pack of this.asArray(parsed?.[1]?.package)) {
            // 修改mainfest中路径
            for (const m of this.asArray(pack.manifest)) {
                this.fixMethod(m, MEDIA_DIR_MAP, '@_media-type');
            }
            // 修复guide路径
            for (const g of this.asArray(pack.guide)) {
                this.fixMethod(g, COVER_TITLE, '@_type');
            }
        }

        return parsed;
    }

    // 重写path，保留最后一个'/'后内容
    private rewritePath(
        raw: string,
        targetDir: string,
        prefix = ''
    ): string {
        const clean = raw.replace(/\\/g, '/');
        const name = path.basename(clean);
        return `${prefix}${targetDir}/${name}`;
    }

    // 构建数组
    private asArray<T>(v?: T | T[]): T[] {
        if (!v) return [];
        return Array.isArray(v) ? v : [v];
    }

    // 查找文件名
    private splitHref = (href: string) => {
        const normalized = this.normalizePath(href);
        let fileName = path.basename(normalized);

        if (fileName.includes('#')) {
            fileName = fileName.split('#')[0];
        }

        return fileName;
    };

    // 修复method
    private fixMethod(item: any, list: Record<string, string | undefined>, type: string) {
        const attr = item[':@'];
        if (!attr['@_href']) return;
        const fileName = this.splitHref(attr['@_href']);
        if (!this.pathMap.has(fileName)) return;

        const dir = list[attr[type]];
        if (!dir) return;

        attr['@_href'] = this.rewritePath(attr['@_href'], dir);
    }

    // ---------------------------------------------------------------------------
    // Step 4: 修复ncx文件
    // ---------------------------------------------------------------------------
    private fixNcx(): void {
        const ncxPath = path.join(this.oebpsDir, 'toc.ncx');
        if (!fs.existsSync(ncxPath)) return;

        const parsed = this.parser.parse(
            fs.readFileSync(ncxPath, 'utf-8')
        );

        const navMap = parsed?.[1]?.ncx?.[2]?.navMap;
        for (const map of this.asArray(navMap)) {
            for (const p of this.asArray(map.navPoint)) {
                const src = p[':@']?.['@_src'];
                if (!src) continue;

                p[':@']['@_src'] = this.rewritePath(src, RESOURCE_DIR.text);
            }
        }

        fs.writeFileSync(ncxPath, this.builder.build(parsed), 'utf-8');
    }



    // ---------------------------------------------------------------------------
    // Step 5: 修复x-html文件
    // ---------------------------------------------------------------------------
    private fixXhtml(): void {
        const files = this.walk(this.oebpsDir)
            .filter(f => /\.(xhtml|html)$/.test(f));

        for (const file of files) {
            const parsed = this.parser.parse(
                fs.readFileSync(file, 'utf-8')
            );
            this.rewriteXhtmlNode(parsed);
            fs.writeFileSync(file, this.builder.build(parsed), 'utf-8');
        }
    }

    private walkXml(
        node: any,
        visitor: (attr: Record<string, any>, node: any) => void
    ): void {
        if (!node || typeof node !== 'object') return;

        // 命中属性节点
        if (node[':@'] && typeof node[':@'] === 'object') {
            visitor(node[':@'], node);
        }

        // 继续递归子节点
        for (const key of Object.keys(node)) {
            const child = node[key];
            if (Array.isArray(child)) {
                for (const c of child) this.walkXml(c, visitor);
            } else if (typeof child === 'object') {
                this.walkXml(child, visitor);
            }
        }
    }

    private rewriteXhtmlNode(parsed: any): void {
        const SRC_ATTRS = ['@_src', '@_href', '@_xlink:href'];

        this.walkXml(parsed, (attr) => {
            for (const key of SRC_ATTRS) {
                if (!attr[key]) continue;

                if (attr[key].endsWith('.css')) {
                    attr[key] = this.rewritePath(attr[key], RESOURCE_DIR.css, '../');
                } else {
                    if(key === '@_href') continue;
                    attr[key] = this.rewritePath(attr[key], RESOURCE_DIR.image, '../');
                }
            }
        });
    }



    // ---------------------------------------------------------------------------
    // Step 5: 写回 OPF
    // ---------------------------------------------------------------------------
    private writeOpf(opf: any): void {
        fs.writeFileSync(this.opfPath, this.builder.build(opf), 'utf-8');
    }

    // ---------------------------------------------------------------------------
    // Utils
    // ---------------------------------------------------------------------------
    private normalizePath(p: string): string {
        return p.replace(/\\/g, '/');
    }

    /** 对外唯一入口 */
    public normalize(): void {
        const fileIndex = this.indexFiles();
        this.moveFile(fileIndex);
        const opf = this.fixOpf();
        this.fixNcx();
        this.fixXhtml();
        this.writeOpf(opf);
    }
}