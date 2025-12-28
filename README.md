# Library

图书内容获取与打包工具（PDF / EPUB）

---

## 项目简介

**Library** 是一个基于 **Node.js + TypeScript** 的图书内容自动化处理工具，用于完成从内容搜索、抓取、下载，到 **PDF / EPUB 合并、压缩与打包** 的完整流程。项目面向工程化与批量处理场景，强调 **并发能力、稳定性与可扩展性**。

适用场景包括但不限于：

* 图书内容离线化处理
* HTML 内容批量转 PDF
* EPUB 资源合并与标准化输出
* 高并发文档生成与打包

---

## 核心功能

* Cookie 获取与持久化管理
* 图书搜索与结果解析
* 内容页面抓取与下载
* HTML → PDF（Puppeteer）
* PDF 合并、压缩与书签生成
* EPUB 合并与打包
* 多线程并发处理（Piscina）

---

## 项目结构

```text
src
├─ index.ts                     # 程序入口
│
├─ clients
│  └─ zlibrary.client.ts        # Z-Library HTTP 客户端
│
├─ services
│  ├─ zlibrary.service.ts       # 核心业务流程
│  ├─ epub.service.ts           # EPUB 处理服务
│  └─ pdf.service.ts            # PDF 处理服务
│
├─ parsers
│  ├─ search.parser.ts          # 搜索结果解析
│  ├─ book-key.parser.ts        # 图书关键参数解析
│  └─ epub-opf.parser.ts        # EPUB OPF 解析
│
├─ storage
│  ├─ epub.storage.ts           # EPUB 文件存储
│  ├─ pdf.storage.ts            # PDF 文件存储
│  └─ worker.storage.ts         # Worker 中间态存储
│
├─ types
│  ├─ zlibrary.ts               # 业务类型定义
│  └─ worker.ts                 # Worker 类型定义
│
├─ utils
│  ├─ cookie.ts                 # Cookie 解析与管理
│  └─ filename.ts               # 文件名规范化
│
└─ newPdf
   ├─ pdf.pool.ts               # Piscina 线程池
   ├─ pdf.worker.ts             # Puppeteer Worker
   ├─ pdf.merge.ts              # pdf-lib 合并与书签
   └─ index.ts                  # PDF 模块入口
...
```

---

## 技术栈

* **TypeScript**
* **Node.js**
* **Axios**：HTTP 请求
* **Cheerio**：HTML 解析
* **Puppeteer**：HTML → PDF
* **Piscina**：多线程 Worker 池
* **p-queue**：并发任务调度
* **pdf-lib**：PDF 合并与书签
* **archiver**：EPUB 打包
* **qpdf / Ghostscript**：PDF 压缩

---

## 依赖安装

```bash
npm install
```

---

## 用户变量配置

在src/config/user保存信息：

```env
USER_NAME,
USER_PASSWORD
```

说明：

* 输入后自动获取Cookie，并会在运行过程中自动校验
* 若缺失或失效，将触发重新获取流程

---

## PDF 处理说明

### 处理流程

1. Puppeteer 渲染 HTML 生成单页 PDF
2. Piscina Worker 并行执行渲染任务
3. pdf-lib 合并所有 PDF
4. 自动生成 PDF 书签（Bookmarks）
5. 使用 qpdf 拆分
6. 使用 Ghostscript 分包压缩
7. qpdf 重新合并输出

### 模块位置

```text
src/newPdf/
```

---

## EPUB 处理说明

* 基于 OPF 文件解析章节结构
* 合并所有资源文件
* 使用 `archiver` 生成标准 EPUB

---

## 整体执行流程

```text
1. 获取并校验 Cookie
2. 搜索图书
3. 解析图书信息
4. 下载内容资源
5. PDF / EPUB 合并与打包
```

---

## 构建与运行

### 1. 启动 TypeScript 编译监听

```bash
tsc -w
```

### 2. Worker 文件处理说明

编译完成后：

```text
dist/newpdf/worker.js
```

需要手动移动至：

```text
src/newpdf/worker.js
```

> 该步骤用于确保 Piscina Worker 能在运行时被正确加载。

---

### 3. 运行程序

```bash
ts-node -P tsconfig.json -r tsconfig-paths/register src/index.ts
```

---

## 设计特点

* 高并发、稳定的 Worker 架构
* 模块化设计，易于扩展
* PDF / EPUB 双格式支持
* 适合批量、大规模内容处理

---

## License
This project is licensed for personal learning and non-commercial use only.

## 免责声明

本项目仅用于技术研究与学习，请遵守相关法律法规及目标网站的使用条款。
