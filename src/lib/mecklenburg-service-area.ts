/** Friends of Feral Felines currently serves colonies in Mecklenburg County, NC only. */

export const MECKLENBURG_RESOURCES_URL =
  "https://www.friendsofferalfelines.org/community-cat-resources-by-county";

/**
 * ZIP codes associated with Mecklenburg County, NC
 * (Charlotte, Cornelius, Davidson, Huntersville, Matthews, Newell, Paw Creek, Pineville).
 * @see https://www.zipwise.com/county/Mecklenburg-NC
 */
export const MECKLENBURG_ZIP_CODES = new Set([
  "28031",
  "28035",
  "28036",
  "28070",
  "28078",
  "28105",
  "28106",
  "28126",
  "28130",
  "28134",
  "28201",
  "28202",
  "28203",
  "28204",
  "28205",
  "28206",
  "28207",
  "28208",
  "28209",
  "28210",
  "28211",
  "28212",
  "28213",
  "28214",
  "28215",
  "28216",
  "28217",
  "28218",
  "28219",
  "28220",
  "28221",
  "28222",
  "28223",
  "28224",
  "28226",
  "28227",
  "28228",
  "28229",
  "28230",
  "28231",
  "28232",
  "28233",
  "28234",
  "28235",
  "28236",
  "28237",
  "28241",
  "28242",
  "28243",
  "28244",
  "28246",
  "28247",
  "28253",
  "28254",
  "28255",
  "28256",
  "28258",
  "28260",
  "28262",
  "28263",
  "28265",
  "28266",
  "28269",
  "28270",
  "28271",
  "28272",
  "28273",
  "28274",
  "28275",
  "28277",
  "28278",
  "28280",
  "28281",
  "28282",
  "28284",
  "28285",
  "28287",
  "28288",
  "28289",
  "28290",
  "28296",
  "28297",
  "28299",
]);

function lettersOnly(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j] ?? 0;
  }

  return prev[b.length] ?? b.length;
}

const MECKLENBURG_CANONICAL = "mecklenburg";
const MECKLENBURG_ALIASES = new Set([
  "mecklenburg",
  "mecklenberg",
  "mechlenburg",
  "mechlenberg",
  "meckenburg",
  "meckenberg",
  "mecklenburge",
  "mecklenburgh",
  "mecklenburgnc",
  "mecklenbergnc",
]);

/**
 * True when the entered county is Mecklenburg (including common misspellings
 * like "Mecklenberg" and close phonetic variants).
 */
export function isMecklenburgCountyName(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;

  const withoutCounty = raw.replace(/\s+county$/i, "").trim();
  const compact = lettersOnly(withoutCounty);
  if (!compact) return false;

  if (MECKLENBURG_ALIASES.has(compact)) return true;
  if (compact.startsWith("mecklen") || compact.startsWith("mechlen")) {
    return levenshtein(compact, MECKLENBURG_CANONICAL) <= 3;
  }
  return levenshtein(compact, MECKLENBURG_CANONICAL) <= 2;
}

export function normalizeZip5(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(0, 5);
}

export function isMecklenburgZip(value: string | null | undefined): boolean {
  const zip = normalizeZip5(value);
  if (zip.length !== 5) return false;
  return MECKLENBURG_ZIP_CODES.has(zip);
}

export type MecklenburgServiceAreaBlockReason = "county" | "zip";

export function getMecklenburgServiceAreaBlock(options: {
  county: string | null | undefined;
  zip: string | null | undefined;
}): MecklenburgServiceAreaBlockReason | null {
  const county = (options.county ?? "").trim();
  if (!county) return null;
  if (!isMecklenburgCountyName(county)) return "county";

  const zip = normalizeZip5(options.zip);
  if (zip.length === 5 && !isMecklenburgZip(zip)) return "zip";

  return null;
}
