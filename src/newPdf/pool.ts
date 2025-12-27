import Piscina from 'piscina';
import path from 'path';

export const pdfPool = new Piscina({
    filename: path.resolve(__dirname, './worker.js'),
    maxThreads: process.platform === 'win32' ? 8 : 16,              //8 核 Windows 安全值
    idleTimeout: 60_000,
});
