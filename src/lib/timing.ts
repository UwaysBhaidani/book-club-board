export async function withMinDuration<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  const start = Date.now();
  const result = await promise;
  const remaining = ms - (Date.now() - start);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  return result;
}
