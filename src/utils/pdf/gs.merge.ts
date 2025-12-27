import { execFile } from "child_process";
import { spawn } from "child_process";
import { cpus } from 'os';
import { readdirSync } from 'fs';

// 绝对路径：C:\\Program Files\\gs\\gs10.xx.x\\bin\\gswin64c.exe
const gsPath = "gswin64c"; // 或写

export async function execStart(input: string, output: string) {
  execFile(
    gsPath,
    [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/screen",
      "-dColorImageDownsampleType=/Bicubic",
      "-dColorImageResolution=150",
      "-dNOPAUSE",
      "-dBATCH",
      "-sOutputFile=" + output,
      input,
    ],
    (error, stdout, stderr) => {
      if (error) {
        console.error("Ghostscript failed:", error);
        return;
      }
      if (stderr) {
        console.error("Ghostscript stderr:", stderr);
      }
      console.log("PDF compressed successfully");
    }
  );
}

export async function spawnStart(input: string, output: string) {
  const gs = spawn(gsPath, [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    "-dPDFSETTINGS=/screen",
    "-dColorImageDownsampleType=/Bicubic",
    "-dColorImageResolution=150",
    "-dNOPAUSE",
    "-dBATCH",
    "-sOutputFile=" + output,
    input,
  ], { stdio: "inherit" }); // 关键

  gs.on("exit", (code) => {
    console.log("Ghostscript exited with code", code);
  });
}

const INPUT = 'final.pdf';
const OUT = 'out_final.pdf';
const FILE_PATH = './temp/';

// 每块页数（30~100）
const SPLIT_PAGES = 50;
// 并行数 = CPU 核数 - 1
const WORKERS = Math.max(cpus().length - 1, 1);
// 120 / 150 / 200
const DPI = 120;

function exec(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function splitPdf() {
  await exec('qpdf', [
    INPUT,
    `--split-pages=${SPLIT_PAGES}`,
    '--',
    FILE_PATH + 'part.pdf'
  ]);
}

async function compressOne(file: string) {
  const out = file.replace('part-', 'c_');
  await exec('gswin64c', [
    '-sDEVICE=pdfwrite',
    '-dPDFSETTINGS=/screen',
    `-dColorImageResolution=${DPI}`,
    `-dGrayImageResolution=${DPI}`,
    '-dMonoImageResolution=300',
    '-dDetectDuplicateImages=true',
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    `-sOutputFile=./temp/${out}`,
    FILE_PATH + file
  ]);
}

async function pool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number
) {
  const queue = [...items];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function mergePdf() {
  const files = readdirSync(FILE_PATH)
    .filter(f => f.startsWith('c_'))
    .sort();

  const newFiles = files.map(v => FILE_PATH + v);

  console.log(newFiles);

  await exec('qpdf', [
    '--empty',
    '--pages',
    ...newFiles,
    '--',
    OUT
  ]);

}


export async function splitMerge() {
  console.log('1. split pdf');
  await splitPdf();

  console.log('2. parallel gs compress');
  const parts = readdirSync(FILE_PATH).filter(f => f.startsWith('part-'));
  console.log(parts)
  await pool(parts, compressOne, WORKERS);

  console.log('3. merge pdf');
  await mergePdf();

  console.log('done:', OUT);
}