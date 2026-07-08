/**
 * Shared Wikipedia / Wikimedia image lookup for official headshots.
 */
const WIKI_UA =
  "RefWatchBot/1.0 (https://refwatch.app; nfl-ref-photos) Mozilla/5.0 compatible";

const WIKI_HEADERS = {
  "User-Agent": WIKI_UA,
  Accept: "application/json",
} as const;

export type WikiPhotoEntry = {
  thumbUrl: string;
  headshotUrl?: string;
  source: string;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pageBaseName(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
}

/** Reject Wikipedia titles that clearly aren't the named official. */
export function titleMatchesOfficial(name: string, title: string): boolean {
  const t = title.toLowerCase();
  const n = name.toLowerCase().trim();
  if (t.includes("disambiguation")) return false;
  if (pageBaseName(title) === n) return true;
  if (t.startsWith(`${n} (`)) {
    return (
      t.includes("american football") ||
      t.includes("football official") ||
      t.includes("gridiron") ||
      t.includes("nfl") ||
      t.includes("referee")
    );
  }
  return false;
}

export async function isNflOfficialPage(title: string): Promise<boolean> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "categories");
  url.searchParams.set("cllimit", "max");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) return false;

  const body = (await res.json()) as {
    query?: {
      pages?: Record<string, { missing?: string; categories?: { title: string }[] }>;
    };
  };
  const page = Object.values(body.query?.pages ?? {})[0];
  if (!page || page.missing) return false;

  return (page.categories ?? []).some((c) => {
    const cat = c.title.toLowerCase();
    return (
      cat.includes("nfl officials") ||
      cat.includes("american football officials") ||
      cat.includes("college football officials")
    );
  });
}

export async function wikiPageImages(title: string): Promise<{
  thumbUrl: string;
  headshotUrl?: string;
} | null> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("pithumbsize", "250");
  url.searchParams.set("format", "json");
  const requestUrl = `${url.toString()}&piprop=thumbnail%7Coriginal`;

  const res = await fetch(requestUrl, { headers: WIKI_HEADERS });
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return null;

  const body = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          missing?: string;
          thumbnail?: { source: string };
          original?: { source: string };
        }
      >;
    };
  };
  const page = Object.values(body.query?.pages ?? {})[0];
  if (!page || page.missing || !page.thumbnail?.source) return null;
  return {
    thumbUrl: page.thumbnail.source,
    headshotUrl: page.original?.source ?? page.thumbnail.source,
  };
}

export async function wikiSearchTitles(query: string): Promise<string[]> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("srlimit", "8");

  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) return [];

  const body = (await res.json()) as {
    query?: { search?: { title: string }[] };
  };
  return body.query?.search?.map((s) => s.title) ?? [];
}

/** @deprecated Use wikiSearchTitles */
export async function wikiSearchTitle(query: string): Promise<string | null> {
  const hits = await wikiSearchTitles(query);
  return hits[0] ?? null;
}

export async function loadNflOfficialTitleIndex(): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  let continueToken: string | undefined;

  do {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", "Category:NFL officials");
    url.searchParams.set("cmlimit", "500");
    url.searchParams.set("format", "json");
    if (continueToken) url.searchParams.set("cmcontinue", continueToken);

    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) break;

    const body = (await res.json()) as {
      query?: { categorymembers?: { title: string }[] };
      continue?: { cmcontinue?: string };
    };

    for (const member of body.query?.categorymembers ?? []) {
      index.set(pageBaseName(member.title), member.title);
    }
    continueToken = body.continue?.cmcontinue;
  } while (continueToken);

  return index;
}

function commonsFileLooksOfficial(file: string, name: string): boolean {
  const f = file.toLowerCase();
  const parts = name.toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.every((p) => f.includes(p))) return false;
  return /nfl|referee|official|football|super.?bowl|coin.?flip|lambeau|commanders|chargers|patriots|seahawks|falcons|bucs|eagles|raiders|broncos|cowboys|packers|field|stadium|cropped/i.test(
    f,
  );
}

function nameInFile(file: string, name: string): boolean {
  const f = file.toLowerCase();
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => f.includes(part));
}

function commonsFileIsVerifiedOfficial(
  file: string,
  name: string,
  categories: string[],
): boolean {
  const cats = new Set(categories);
  if (cats.has(`Category:${name} (American football official)`)) return true;
  if (name === "Ronald Torbert" && cats.has("Category:Ronald Torbert (American football official)")) {
    return true;
  }

  if (!cats.has(`Category:${name}`)) return false;
  if (cats.has("Category:Photographs by All-Pro Reels")) return true;
  if (cats.has("Category:National Football League officials")) return true;
  if (/super.?bowl|coin.?toss|referee|official|nfl/i.test(file)) return true;

  if (!nameInFile(file, name)) return false;
  return /referee|official|coin|lambeau|commanders|super.?bowl|football|nfl/i.test(file);
}

async function commonsFileDetails(file: string): Promise<{
  thumbUrl: string;
  headshotUrl: string;
  categories: string[];
} | null> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", file);
  url.searchParams.set("prop", "imageinfo|categories");
  url.searchParams.set("iiprop", "url|thumburl");
  url.searchParams.set("iiurlwidth", "250");
  url.searchParams.set("cllimit", "max");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) return null;

  const page = Object.values(
    (
      (await res.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              imageinfo?: { url?: string; thumburl?: string }[];
              categories?: { title: string }[];
            }
          >;
        };
      }
    ).query?.pages ?? {},
  )[0];

  const info = page?.imageinfo?.[0];
  if (!info?.thumburl) return null;

  return {
    thumbUrl: info.thumburl,
    headshotUrl: info.url ?? info.thumburl,
    categories: (page?.categories ?? []).map((c) => c.title),
  };
}

async function commonsCategoryFiles(category: string): Promise<string[]> {
  const files: string[] = [];
  let continueToken: string | undefined;

  do {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", category);
    url.searchParams.set("cmlimit", "500");
    url.searchParams.set("format", "json");
    if (continueToken) url.searchParams.set("cmcontinue", continueToken);

    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) break;

    const body = (await res.json()) as {
      query?: { categorymembers?: { title: string }[] };
      continue?: { cmcontinue?: string };
    };

    for (const member of body.query?.categorymembers ?? []) {
      if (/^File:/.test(member.title) && /\.(jpg|jpeg|png|webp)$/i.test(member.title)) {
        files.push(member.title);
      }
    }
    continueToken = body.continue?.cmcontinue;
  } while (continueToken);

  return files;
}

/** Match files in Category:National Football League officials by filename. */
export async function commonsPhotoFromNflOfficialsFiles(
  name: string,
): Promise<WikiPhotoEntry | null> {
  const files = await commonsCategoryFiles("Category:National Football League officials");
  const matches = files
    .filter((file) => nameInFile(file, name))
    .sort((a, b) => (a.toLowerCase().includes("cropped") ? 0 : 1) - (b.toLowerCase().includes("cropped") ? 0 : 1));

  for (const file of matches) {
    const details = await commonsFileDetails(file);
    if (!details) continue;
    return {
      thumbUrl: details.thumbUrl,
      headshotUrl: details.headshotUrl,
      source: `commons:${file}`,
    };
  }
  return null;
}

/** Resolve via Commons categories named after the official (All-Pro Reels tags, etc.). */
export async function commonsPhotoFromOfficialCategory(
  name: string,
): Promise<WikiPhotoEntry | null> {
  const categories = [
    `Category:${name} (American football official)`,
    `Category:${name}`,
  ];

  for (const category of categories) {
    const files = await commonsCategoryFiles(category);
    files.sort((a, b) => {
      const aNamed = nameInFile(a, name) ? 0 : 1;
      const bNamed = nameInFile(b, name) ? 0 : 1;
      if (aNamed !== bNamed) return aNamed - bNamed;
      const aCrop = a.toLowerCase().includes("cropped") ? 0 : 1;
      const bCrop = b.toLowerCase().includes("cropped") ? 0 : 1;
      return aCrop - bCrop;
    });

    for (const file of files) {
      const details = await commonsFileDetails(file);
      if (!details) continue;
      if (!commonsFileIsVerifiedOfficial(file, name, details.categories)) continue;
      return {
        thumbUrl: details.thumbUrl,
        headshotUrl: details.headshotUrl,
        source: `commons:${file}`,
      };
    }
    await sleep(40);
  }

  return null;
}

export async function commonsPhotoForName(
  name: string,
): Promise<WikiPhotoEntry | null> {
  for (const query of [
    `"${name}" NFL referee`,
    `"${name}" NFL official`,
    `${name} referee NFL`,
  ]) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("srsearch", query);
    url.searchParams.set("srnamespace", "6");
    url.searchParams.set("srlimit", "10");
    url.searchParams.set("format", "json");

    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) continue;

    const body = (await res.json()) as {
      query?: { search?: { title: string }[] };
    };
    const files =
      body.query?.search
        ?.map((s) => s.title)
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)) ?? [];

    for (const file of files) {
      if (!commonsFileLooksOfficial(file, name)) continue;

      const infoUrl = new URL("https://commons.wikimedia.org/w/api.php");
      infoUrl.searchParams.set("action", "query");
      infoUrl.searchParams.set("titles", file);
      infoUrl.searchParams.set("prop", "imageinfo");
      infoUrl.searchParams.set("iiprop", "url|thumburl");
      infoUrl.searchParams.set("iiurlwidth", "250");
      infoUrl.searchParams.set("format", "json");

      const infoRes = await fetch(infoUrl, { headers: WIKI_HEADERS });
      if (!infoRes.ok) continue;

      const infoBody = (await infoRes.json()) as {
        query?: {
          pages?: Record<string, { imageinfo?: { url?: string; thumburl?: string }[] }>;
        };
      };
      const info = Object.values(infoBody.query?.pages ?? {})[0]?.imageinfo?.[0];
      if (info?.thumburl) {
        return {
          thumbUrl: info.thumburl,
          headshotUrl: info.url ?? info.thumburl,
          source: `commons:${file}`,
        };
      }
      await sleep(50);
    }
    await sleep(80);
  }
  return null;
}
