/**
 * The page list for a dynamic route, without letting the database decide
 * whether a deploy happens.
 *
 * `next build` asks each route which pages to prerender. If the database drops
 * the connection at that moment, the whole build used to fail and nothing
 * shipped. Now the route prerenders nothing instead: its pages are rendered on
 * their first visit and cached from then on, which is how a page added after
 * the deploy is served anyway.
 */
export async function staticParams<T>(route: string, list: () => Promise<T[]>): Promise<T[]> {
  try {
    return await list();
  } catch (error) {
    console.warn(`[build] ${route}: could not list pages, rendering them on demand instead`, error instanceof Error ? error.message : error);
    return [];
  }
}
