# 1.整体结构
src/
├─ index.ts
│
├─ clients/
│  └─ zlibrary.client.ts
│
├─ services/
│  ├─ zlibrary.service.ts
│  ├─ epub.service.ts
│  └─ pdf.service.ts
│
├─ parsers/
│  ├─ search.parser.ts
│  ├─ book-key.parser.ts
│  └─ epub-opf.parser.ts
│
├─ storage/
│  ├─ epub.storage.ts
│  └─ pdf.storage.ts
|  |_ worker.storage.ts
│
├─ types/
│  └─ zlibrary.ts
|  |_ worker.ts
│
└─ utils/
   ├─ cookie.ts
   └─ filename.ts
...


# 2.安装依赖
dependencies:
   "axios": "^1.6.8",
   "cheerio": "^1.0.0-rc.12", 
   <!-- 根目录.env设置属性(process.env.....) -->
   "dotenv": "^17.2.3",
   "p-queue": "^8.0.1",
   <!-- ts-node 直接运行ts -->
   "tsconfig-paths": "^4.2.0"
   <!-- 并行库 -->
   "piscina": "^5.1.4",
   <!-- 合成pdf -->
   "pdf-lib": "^1.17.1",
...

devDependencies:
    "@types/node": "^20.11.30",
    <!-- 给图片上背景色 -->
    "sharp": "^0.34.5",
   "puppeteer": "^24.34.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5"
      <!-- 打包epub文件 -->
   "@types/archiver": "^7.0.0",
...

# 3.pdf(html)合并
## 整体结构
src/
 ├─ pdf/
 │   ├─ pdf.pool.ts        # Piscina 线程池
 │   ├─ pdf.worker.ts      # Worker：Puppeteer 生成 PDF
 │   ├─ pdf.merge.ts       # pdf-lib 合并
 │   └─ index.ts           # 统一入口

## 依赖
npm i piscina puppeteer pdf-lib

## 压缩
采用qpdf分包，qs进行分包压缩， qpdf最后合并

## 书签
pdf-lib --- 加入bookmarks书签


# 4.epub合并
archiver

# 5.整体功能
## 1.获取cookie
## 2.搜索内容
## 3.获取内容
## 4.下载
## 5.合并