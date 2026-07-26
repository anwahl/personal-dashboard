/**
 * app/api/media-search/route.ts
 *
 * Server-side proxy for external media APIs — keeps API keys out of the browser.
 *
 * Add to .env.local:
 *   TMDB_API_KEY=your_key    (from themoviedb.org/settings/api)
 *   RAWG_API_KEY=your_key    (from rawg.io/apidocs)
 *   # Open Library (books) needs no key
 *
 * Usage: GET /api/media-search?type=movie&q=inception
 *        GET /api/media-search?type=series&q=arcane
 *        GET /api/media-search?type=book&q=dune
 *        GET /api/media-search?type=game&q=hades
 */

import { NextRequest, NextResponse } from "next/server";

export interface MediaSearchResult {
  external_id: string;
  title: string;
  creator?: string;
  year?: number;
  overview?: string;
  poster_url?: string;
  platform?: string;
}

// ── TMDB (movies + series) ────────────────────────────────────────────────────

async function searchTmdb(
  query: string,
  type: "movie" | "series",
): Promise<MediaSearchResult[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];

  const endpoint = type === "movie" ? "search/movie" : "search/tv";
  const res = await fetch(
    `https://api.themoviedb.org/3/${endpoint}?query=${encodeURIComponent(query)}&api_key=${key}&page=1`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) return [];
  const data = await res.json();

  return (data.results ?? []).slice(0, 8).map((r: Record<string, unknown>) => ({
    external_id: String(r.id),
    title: (r.title ?? r.name ?? "") as string,
    year:
      typeof r.release_date === "string"
        ? Number.parseInt(r.release_date.slice(0, 4))
        : typeof r.first_air_date === "string"
          ? Number.parseInt(r.first_air_date.slice(0, 4))
          : undefined,
    overview: (r.overview as string | undefined) ?? undefined,
    poster_url:
      typeof r.poster_path === "string" && r.poster_path
        ? `https://image.tmdb.org/t/p/w92${r.poster_path}`
        : undefined,
  }));
}

// ── Open Library (books) ──────────────────────────────────────────────────────

async function searchOpenLibrary(query: string): Promise<MediaSearchResult[]> {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,first_publish_year,cover_i`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) return [];
  const data = await res.json();

  return (data.docs ?? []).slice(0, 8).map((r: Record<string, unknown>) => ({
    external_id: String(r.key),
    title: (r.title as string) ?? "",
    creator: (r.author_name as string[] | undefined)?.[0],
    year: r.first_publish_year as number | undefined,
    poster_url:
      typeof r.cover_i === "number"
        ? `https://covers.openlibrary.org/b/id/${r.cover_i}-S.jpg`
        : undefined,
  }));
}

// ── RAWG (games) ─────────────────────────────────────────────────────────────

async function searchRawg(query: string): Promise<MediaSearchResult[]> {
  const key = process.env.RAWG_API_KEY;
  if (!key) return [];

  const res = await fetch(
    `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&key=${key}&page_size=8`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) return [];
  const data = await res.json();

  return (data.results ?? []).slice(0, 8).map((r: Record<string, unknown>) => ({
    external_id: String(r.id),
    title: (r.name as string) ?? "",
    year:
      typeof r.released === "string"
        ? Number.parseInt(r.released.slice(0, 4))
        : undefined,
    poster_url: (r.background_image as string | undefined) ?? undefined,
    platform: (r.platforms as { platform: { name: string } }[] | undefined)
      ?.slice(0, 3)
      .map((p) => p.platform.name)
      .join(", "),
  }));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  let results: MediaSearchResult[] = [];

  switch (type) {
    case "movie":
      results = await searchTmdb(query, "movie");
      break;
    case "series":
      results = await searchTmdb(query, "series");
      break;
    case "book":
      results = await searchOpenLibrary(query);
      break;
    case "game":
      results = await searchRawg(query);
      break;
    default:
      return NextResponse.json(
        { error: "Unknown media type" },
        { status: 400 },
      );
  }

  return NextResponse.json({ results });
}
