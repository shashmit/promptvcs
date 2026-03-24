import type { Context, Next } from "hono";

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  await next();
  const elapsed = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${c.res.status} (${elapsed}ms)`);
}
