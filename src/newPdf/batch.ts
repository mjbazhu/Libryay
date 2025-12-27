export async function runInBatches<T>(
  items: T[],
  batchSize: number,
  handler: (batch: T[], batchIndex: number) => Promise<void>
) {
  const total = items.length;
  let index = 0;
  let batchIndex = 0;

  while (index < total) {
    const batch = items.slice(index, index + batchSize);
    console.log(
      `\n[Batch ${batchIndex}] start (${batch.length} items)`
    );

    await handler(batch, batchIndex);

    index += batchSize;
    batchIndex++;

    // 给系统一次喘息机会
    await new Promise(res => setTimeout(res, 1000));
  }
}
