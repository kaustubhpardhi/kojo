/**
 * Wger.de API client (https://wger.de/api/v2/).
 *
 * Quirks (important for callers):
 *
 * 1. The public API **ignores** `search=` on `/exercise/` and `/exerciseinfo/` — every query returns
 *    the same first page (see issue wger#642 class of problems). **Search is implemented client-side**
 *    by loading English rows from `/exercise-translation/?language=2` once, then substring-matching
 *    on `name`, then hydrating details from `/exerciseinfo/{id}/`.
 *
 * 2. `/exercise/` list rows have no names — only IDs. Category and muscle **filters** on `/exercise/`
 *    do work (`category=`, `muscles=`). Always pass `language=2` for English exercise lists.
 *
 * 3. When following `next` pagination URLs, merge `language=2` if missing (`ensureEnglishLanguageOnUrl`).
 *
 * 4. Hydration uses small concurrent batches (5) to reduce failed `/exerciseinfo/` fetches from
 *    thundering herds on the public instance.
 */

const WGER_BASE = "https://wger.de/api/v2";

/** English — must match list + translation filters. */
export const WGER_LANGUAGE_EN = 2;

const HYDRATE_CONCURRENCY = 5;

export interface WgerExercise {
  id: number;
  name: string;
  category: { id: number; name: string };
  muscles: { id: number; name: string }[];
}

export interface WgerMuscle {
  id: number;
  name: string;
  name_en: string | null;
}

export interface WgerExerciseCategory {
  id: number;
  name: string;
}

interface WgerPaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Minimal shape returned by GET /exercise/ */
interface WgerExerciseListRow {
  id: number;
  category: number;
  muscles: number[];
  muscles_secondary: number[];
}

interface WgerExerciseTranslationRow {
  id: number;
  name: string;
  exercise: number;
  language: number;
}

interface WgerExerciseInfoResponse {
  id: number;
  category: { id: number; name: string };
  muscles: Array<{ id: number; name: string; name_en?: string }>;
  muscles_secondary: Array<{ id: number; name: string; name_en?: string }>;
  translations: Array<{ language: number; name: string }>;
}

const cache = new Map<string, unknown>();
const inflightExerciseInfo = new Map<number, Promise<WgerExercise | null>>();

function cacheGet<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

function cacheSet(key: string, value: unknown): void {
  cache.set(key, value);
}

function ensureEnglishLanguageOnUrl(url: string): string {
  try {
    const u = new URL(url, WGER_BASE);
    if (!u.searchParams.has("language")) {
      u.searchParams.set("language", String(WGER_LANGUAGE_EN));
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Wger request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function pickEnglishName(info: WgerExerciseInfoResponse): string {
  const en = info.translations?.find((t) => t.language === WGER_LANGUAGE_EN);
  if (en?.name) return en.name.trim();
  const first = info.translations?.[0];
  if (first?.name) return first.name.trim();
  return `Exercise ${info.id}`;
}

function muscleDisplayName(m: { name: string; name_en?: string }): string {
  const en = m.name_en?.trim();
  if (en) return en;
  return m.name;
}

function normalizeExerciseInfo(info: WgerExerciseInfoResponse): WgerExercise {
  const primary = info.muscles ?? [];
  const secondary = info.muscles_secondary ?? [];
  const muscles: { id: number; name: string }[] = [];
  const seen = new Set<number>();
  for (const m of [...primary, ...secondary]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    muscles.push({ id: m.id, name: muscleDisplayName(m) });
  }

  return {
    id: info.id,
    name: pickEnglishName(info),
    category: info.category
      ? { id: info.category.id, name: info.category.name }
      : { id: 0, name: "—" },
    muscles,
  };
}

async function fetchExerciseInfoNormalized(id: number): Promise<WgerExercise | null> {
  const cacheKey = `exinfo:${id}`;
  const hit = cacheGet<WgerExercise>(cacheKey);
  if (hit) return hit;

  let p = inflightExerciseInfo.get(id);
  if (!p) {
    p = (async () => {
      try {
        const url = `${WGER_BASE}/exerciseinfo/${id}/?format=json`;
        const raw = await fetchJson<WgerExerciseInfoResponse>(url);
        const normalized = normalizeExerciseInfo(raw);
        cacheSet(cacheKey, normalized);
        return normalized;
      } catch {
        return null;
      } finally {
        inflightExerciseInfo.delete(id);
      }
    })();
    inflightExerciseInfo.set(id, p);
  }
  return p;
}

/** Lower rank = better match for sorting. */
function rankMatch(name: string, q: string): number {
  const n = name.toLowerCase();
  const term = q.toLowerCase().trim();
  if (!term) return 9999;
  if (n === term) return 0;
  if (n.startsWith(term)) return 1;
  const words = n.split(/\s+/);
  const wordIdx = words.findIndex((w) => w.startsWith(term));
  if (wordIdx >= 0) return 2 + wordIdx;
  const idx = n.indexOf(term);
  if (idx >= 0) return 20 + idx;
  return 9999;
}

async function fetchAllEnglishTranslations(): Promise<WgerExerciseTranslationRow[]> {
  const key = "translations:en:all";
  const hit = cacheGet<WgerExerciseTranslationRow[]>(key);
  if (hit) return hit;

  const pageSize = 200;
  const first = await fetchJson<WgerPaginated<WgerExerciseTranslationRow>>(
    `${WGER_BASE}/exercise-translation/?format=json&language=${WGER_LANGUAGE_EN}&limit=${pageSize}`,
  );
  const out = [...first.results];
  const totalPages = Math.ceil(first.count / pageSize);
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => {
        const offset = pageSize * (i + 1);
        return fetchJson<WgerPaginated<WgerExerciseTranslationRow>>(
          `${WGER_BASE}/exercise-translation/?format=json&language=${WGER_LANGUAGE_EN}&limit=${pageSize}&offset=${offset}`,
        );
      }),
    );
    for (const p of rest) out.push(...p.results);
  }
  cacheSet(key, out);
  return out;
}

/**
 * Warm the English translation index (used for search). Safe to call on sheet open.
 */
export async function preloadEnglishTranslationIndex(): Promise<void> {
  await fetchAllEnglishTranslations();
}

async function hydrateExerciseIdsPooled(
  orderedIds: number[],
  nameOverride?: Map<number, string>,
): Promise<WgerExercise[]> {
  const result: WgerExercise[] = [];
  for (let i = 0; i < orderedIds.length; i += HYDRATE_CONCURRENCY) {
    const chunk = orderedIds.slice(i, i + HYDRATE_CONCURRENCY);
    const settled = await Promise.all(chunk.map((id) => fetchExerciseInfoNormalized(id)));
    for (let j = 0; j < chunk.length; j++) {
      const id = chunk[j]!;
      const info = settled[j];
      if (!info) continue;
      const override = nameOverride?.get(id);
      result.push(override ? { ...info, name: override } : info);
    }
  }
  return result;
}

async function hydrateExerciseListRows(rows: WgerExerciseListRow[]): Promise<WgerExercise[]> {
  const uniqueIds = [...new Set(rows.map((r) => r.id))];
  return hydrateExerciseIdsPooled(uniqueIds);
}

async function fetchAllExerciseListPages(initialUrl: string): Promise<WgerExerciseListRow[]> {
  const out: WgerExerciseListRow[] = [];
  let next: string | null = initialUrl;
  let guard = 0;
  const maxPages = 40;

  while (next && guard < maxPages) {
    const pageUrl = ensureEnglishLanguageOnUrl(next);
    const page = await fetchJson<WgerPaginated<WgerExerciseListRow>>(pageUrl);
    out.push(...page.results);
    next = page.next;
    guard += 1;
  }

  return out;
}

/**
 * Search exercises (English) via local filter on `/exercise-translation/` names, then `/exerciseinfo/`.
 * Cached per query for the module lifetime.
 */
export async function searchExercises(query: string): Promise<WgerExercise[]> {
  const q = query.trim();
  if (!q) return [];

  const key = `search:${q.toLowerCase()}`;
  const cached = cacheGet<WgerExercise[]>(key);
  if (cached) return cached;

  const translations = await fetchAllEnglishTranslations();
  const seen = new Set<number>();
  const matches = translations
    .map((t) => ({ t, r: rankMatch(t.name, q) }))
    .filter((x) => x.r < 9999)
    .sort(
      (a, b) =>
        a.r - b.r || a.t.name.localeCompare(b.t.name, undefined, { sensitivity: "base" }),
    )
    .filter((x) => {
      if (seen.has(x.t.exercise)) return false;
      seen.add(x.t.exercise);
      return true;
    })
    .slice(0, 40);

  const nameOverride = new Map(matches.map((m) => [m.t.exercise, m.t.name.trim()] as const));
  const orderedIds = matches.map((m) => m.t.exercise);
  const hydrated = await hydrateExerciseIdsPooled(orderedIds, nameOverride);
  cacheSet(key, hydrated);
  return hydrated;
}

/**
 * Exercises in a category (filters work on `/exercise/`). Paginates, then hydrates in batches.
 */
export async function fetchExercisesByCategory(categoryId: number): Promise<WgerExercise[]> {
  const key = `category:${categoryId}`;
  const cached = cacheGet<WgerExercise[]>(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    format: "json",
    language: String(WGER_LANGUAGE_EN),
    limit: "100",
    category: String(categoryId),
  });
  const initialUrl = `${WGER_BASE}/exercise/?${params.toString()}`;
  const rows = await fetchAllExerciseListPages(initialUrl);
  const hydrated = await hydrateExerciseListRows(rows);
  cacheSet(key, hydrated);
  return hydrated;
}

/**
 * Exercises targeting a muscle (English list filter). Paginates until no `next` (bounded).
 */
export async function fetchExercisesByMuscle(muscleId: number): Promise<WgerExercise[]> {
  const key = `muscle:${muscleId}`;
  const cached = cacheGet<WgerExercise[]>(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    format: "json",
    language: String(WGER_LANGUAGE_EN),
    limit: "100",
    muscles: String(muscleId),
  });
  const initialUrl = `${WGER_BASE}/exercise/?${params.toString()}`;
  const rows = await fetchAllExerciseListPages(initialUrl);
  const hydrated = await hydrateExerciseListRows(rows);
  cacheSet(key, hydrated);
  return hydrated;
}

/** Muscle list for filters (cached). */
export async function fetchMuscles(): Promise<WgerMuscle[]> {
  const key = "muscles:all";
  const cached = cacheGet<WgerMuscle[]>(key);
  if (cached) return cached;

  const url = `${WGER_BASE}/muscle/?format=json`;
  const page = await fetchJson<WgerPaginated<WgerMuscle>>(url);
  cacheSet(key, page.results);
  return page.results;
}

/** Exercise categories for initial browse (cached). */
export async function fetchExerciseCategories(): Promise<WgerExerciseCategory[]> {
  const key = "categories:all";
  const cached = cacheGet<WgerExerciseCategory[]>(key);
  if (cached) return cached;

  const url = `${WGER_BASE}/exercisecategory/?format=json`;
  const page = await fetchJson<WgerPaginated<WgerExerciseCategory>>(url);
  cacheSet(key, page.results);
  return page.results;
}

export async function fetchExerciseInfo(id: number): Promise<WgerExercise | null> {
  return fetchExerciseInfoNormalized(id);
}
