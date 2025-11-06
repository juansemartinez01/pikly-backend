export type PageQuery = { page?: number; limit?: number };

export function normalizePageQuery(q: PageQuery) {
  const page = Math.max(1, Number(q.page || 1));
  const limit = Math.min(100, Math.max(1, Number(q.limit || 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
