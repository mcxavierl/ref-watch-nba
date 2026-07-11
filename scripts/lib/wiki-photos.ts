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
  return titleMatchesSportOfficial(name, title, "nfl");
}

export type OfficialSport = "nfl" | "nhl" | "epl" | "nba";

/** Dataset display name → Wikipedia / Commons search name. */
export const OFFICIAL_DISPLAY_ALIASES: Record<OfficialSport, Record<string, string>> = {
  nfl: {
    "Mike Jones": "Michael Jones",
  },
  nhl: {},
  epl: {
    "Andy Madley": "Andrew Madley",
    "Tom Bramall": "Thomas Bramall",
    "Michael Jones": "Mike Jones",
  },
  nba: {},
};

/** Collapse punctuation and initials for category-index lookup. */
export function officialNameLookupKeys(name: string): string[] {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[-']/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const keys = new Set<string>([n]);
  const parts = n.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    keys.add(`${parts[0]} ${parts[parts.length - 1]}`);
    if (parts.length >= 3) {
      const initials = parts
        .slice(0, -1)
        .map((p) => p[0])
        .join("");
      keys.add(`${initials} ${parts[parts.length - 1]}`);
    }
  }
  return [...keys];
}

export function resolveOfficialDisplayName(
  name: string,
  sport: OfficialSport,
): string {
  return OFFICIAL_DISPLAY_ALIASES[sport][name] ?? name;
}

export function lookupCategoryTitle(
  name: string,
  categoryIndex: Map<string, string>,
  sport: OfficialSport,
): string | null {
  const resolved = resolveOfficialDisplayName(name, sport);
  for (const key of officialNameLookupKeys(resolved)) {
    const hit = categoryIndex.get(key);
    if (hit) return hit;
  }
  for (const key of officialNameLookupKeys(name)) {
    const hit = categoryIndex.get(key);
    if (hit) return hit;
  }
  return null;
}

/** Sport-aware Wikipedia title match for officials. */
export function titleMatchesSportOfficial(
  name: string,
  title: string,
  sport: OfficialSport,
): boolean {
  const t = title.toLowerCase();
  const n = name.toLowerCase().trim();
  if (t.includes("disambiguation")) return false;
  if (pageBaseName(title) === n) return true;
  if (!t.startsWith(`${n} (`)) return false;

  if (sport === "nfl") {
    return (
      t.includes("american football") ||
      t.includes("football official") ||
      t.includes("gridiron") ||
      t.includes("nfl") ||
      t.includes("referee")
    );
  }
  if (sport === "nhl") {
    return (
      t.includes("ice hockey") ||
      t.includes("hockey") ||
      t.includes("nhl") ||
      t.includes("referee") ||
      t.includes("official")
    );
  }
  if (sport === "epl") {
    return (
      t.includes("referee") ||
      t.includes("football") ||
      t.includes("soccer") ||
      t.includes("premier league") ||
      t.includes("fifa") ||
      t.includes("uefa")
    );
  }
  // nba
  return (
    t.includes("basketball") ||
    t.includes("nba") ||
    t.includes("referee") ||
    t.includes("official")
  );
}

export async function isSportOfficialPage(
  title: string,
  sport: OfficialSport,
): Promise<boolean> {
  if (sport === "nfl") return isNflOfficialPage(title);

  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "categories|extracts");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("cllimit", "max");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) return false;

  const body = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          missing?: string;
          categories?: { title: string }[];
          extract?: string;
        }
      >;
    };
  };
  const page = Object.values(body.query?.pages ?? {})[0];
  if (!page || page.missing) return false;

  const blob = [
    ...(page.categories ?? []).map((c) => c.title),
    page.extract ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (sport === "nhl") {
    return /nhl|ice hockey|hockey referee|hockey official/.test(blob);
  }
  if (sport === "epl") {
    return /premier league|football referee|fifa|uefa|english football|soccer referee/.test(
      blob,
    );
  }
  return /nba|basketball referee|basketball official/.test(blob);
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
  return loadCategoryTitleIndex("Category:NFL officials");
}

/** Build name → Wikipedia title index from a category (and optional continue pages). */
export async function loadCategoryTitleIndex(
  categoryTitle: string,
): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  let continueToken: string | undefined;

  do {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", categoryTitle);
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
      if (member.title.startsWith("List of") || member.title.startsWith("Category:")) {
        continue;
      }
      index.set(pageBaseName(member.title), member.title);
    }
    continueToken = body.continue?.cmcontinue;
  } while (continueToken);

  return index;
}

function commonsFileLooksOfficial(file: string, name: string): boolean {
  const f = file.toLowerCase();
  const parts = name.toLowerCase().split(/\s+/).filter((p) => p.length >= 2);
  if (parts.length === 0) return false;

  if (/\b_hc_|\bhead.?coach\b|secdef|troops|border.?official/i.test(f)) {
    return false;
  }
  if (/eagles_washingtonfootball\d{4}/i.test(f) && !parts.every((p) => f.includes(p))) {
    return false;
  }
  if (!parts.every((p) => f.includes(p))) return false;

  if (
    !/(referee|official|nfl|super.?bowl|coin.?flip|cropped)/i.test(f) &&
    /eagles|washington|stadium|field|patriots|seahawks|falcons|bucs|chargers|commanders|raiders|broncos|cowboys|packers|lambeau/i.test(
      f,
    )
  ) {
    return false;
  }

  return /nfl|referee|official|football|super.?bowl|coin.?flip|lambeau|cropped/i.test(
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
    if (!commonsFileLooksOfficial(file, name)) continue;
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

function commonsFileLooksEplOfficial(file: string, name: string): boolean {
  const f = file.toLowerCase();
  const parts = name
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 2);
  if (parts.length === 0) return false;
  const nameMatch = parts.every((part) => {
    if (f.includes(part)) return true;
    if (part === "kavanagh" && f.includes("kavanaugh")) return true;
    return false;
  });
  if (!nameMatch) return false;

  const base = f.replace(/^file:/, "").replace(/\.(jpe?g|png|webp)$/i, "");
  const normalizedName = parts.join(" ");
  if (base === normalizedName || base === `${normalizedName} (cropped)`) {
    return true;
  }

  // Two-token names are ambiguous on Commons — require officiating context.
  const needsContext = parts.length <= 2;
  const hasContext = /referee|\bref\b|football|premier|fa cup|match|cropped|soccer|referee\)|v_|_v_/i.test(
    f,
  );
  if (needsContext && !hasContext) return false;

  return hasContext;
}

/** Commons file search for Premier League referees (pages often lack infobox images). */
export async function commonsPhotoForEplOfficial(
  name: string,
): Promise<WikiPhotoEntry | null> {
  const resolved = resolveOfficialDisplayName(name, "epl");
  for (const query of [
    `"${resolved}" referee`,
    `"${name}" referee`,
    `${resolved} Premier League referee`,
    `${resolved} football referee`,
    `intitle:"${resolved}"`,
    `${resolved}.jpg`,
  ]) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("srsearch", query);
    url.searchParams.set("srnamespace", "6");
    url.searchParams.set("srlimit", "12");
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
      if (
        !commonsFileLooksEplOfficial(file, resolved) &&
        !commonsFileLooksEplOfficial(file, name)
      ) {
        continue;
      }
      const details = await commonsFileDetails(file);
      if (!details) continue;
      return {
        thumbUrl: details.thumbUrl,
        headshotUrl: details.headshotUrl,
        source: `commons:${file}`,
      };
    }
    await sleep(80);
  }
  return null;
}
