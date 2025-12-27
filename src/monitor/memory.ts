export function logMemory(prefix = '') {
  const m = process.memoryUsage();

  const toMB = (n: number) =>
    (n / 1024 / 1024).toFixed(1);

  console.log(
    `[MEM${prefix}] rss=${toMB(m.rss)}MB ` +
    `heapUsed=${toMB(m.heapUsed)}MB ` +
    `heapTotal=${toMB(m.heapTotal)}MB`
  );
}
