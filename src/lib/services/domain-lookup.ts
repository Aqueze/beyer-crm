/**
 * Domain Lookup Service
 * 
 * Email domain → company resolver with layered approach:
 * 1. Internal lookup table (manually maintained, highest priority)
 * 2. Website title scraping (fetch domain → parse)
 * 3. TLD country code (.co.jp → Japan, .nl → Netherlands, .se → Sweden)
 * 4. Manual override in settings UI
 */

import { db } from "../db";
import { domainLookups } from "../db/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface DomainLookupResult {
  domain: string;
  companyName: string | null;
  website: string | null;
  country: string | null;
  manuallyOverridden: boolean;
  source: "cache" | "tld" | "scrape";
}

export interface DomainLookupOptions {
  email: string;
  forceRefresh?: boolean; // Skip cache
}

// ============================================================================
// TLD Country Code Mapping
// ============================================================================

const TLD_COUNTRY_MAP: Record<string, string> = {
  // Country-code TLDs (ccTLDs)
  ".ac": "Ascension Island",
  ".ad": "Andorra",
  ".ae": "United Arab Emirates",
  ".af": "Afghanistan",
  ".ag": "Antigua and Barbuda",
  ".ai": "Anguilla",
  ".al": "Albania",
  ".am": "Armenia",
  ".an": "Netherlands Antilles",
  ".ao": "Angola",
  ".aq": "Antarctica",
  ".ar": "Argentina",
  ".as": "American Samoa",
  ".at": "Austria",
  ".au": "Australia",
  ".aw": "Aruba",
  ".ax": "Åland Islands",
  ".az": "Azerbaijan",
  ".ba": "Bosnia and Herzegovina",
  ".bb": "Barbados",
  ".bd": "Bangladesh",
  ".be": "Belgium",
  ".bf": "Burkina Faso",
  ".bg": "Bulgaria",
  ".bh": "Bahrain",
  ".bi": "Burundi",
  ".bj": "Benin",
  ".bm": "Bermuda",
  ".bn": "Brunei Darussalam",
  ".bo": "Bolivia",
  ".br": "Brazil",
  ".bs": "Bahamas",
  ".bt": "Bhutan",
  ".bv": "Bouvet Island",
  ".bw": "Botswana",
  ".by": "Belarus",
  ".bz": "Belize",
  ".ca": "Canada",
  ".cc": "Cocos (Keeling) Islands",
  ".cd": "Congo (DRC)",
  ".cf": "Central African Republic",
  ".cg": "Congo (Republic)",
  ".ch": "Switzerland",
  ".ci": "Côte d'Ivoire",
  ".ck": "Cook Islands",
  ".cl": "Chile",
  ".cm": "Cameroon",
  ".cn": "China",
  ".co": "Colombia",
  ".cr": "Costa Rica",
  ".cu": "Cuba",
  ".cv": "Cape Verde",
  ".cx": "Christmas Island",
  ".cy": "Cyprus",
  ".cz": "Czech Republic",
  ".de": "Germany",
  ".dj": "Djibouti",
  ".dk": "Denmark",
  ".dm": "Dominica",
  ".do": "Dominican Republic",
  ".dz": "Algeria",
  ".ec": "Ecuador",
  ".ee": "Estonia",
  ".eg": "Egypt",
  ".eh": "Western Sahara",
  ".er": "Eritrea",
  ".es": "Spain",
  ".et": "Ethiopia",
  ".fi": "Finland",
  ".fj": "Fiji",
  ".fk": "Falkland Islands",
  ".fm": "Micronesia",
  ".fo": "Faroe Islands",
  ".fr": "France",
  ".ga": "Gabon",
  ".gb": "United Kingdom",
  ".gd": "Grenada",
  ".ge": "Georgia",
  ".gf": "French Guiana",
  ".gg": "Guernsey",
  ".gh": "Ghana",
  ".gi": "Gibraltar",
  ".gl": "Greenland",
  ".gm": "Gambia",
  ".gn": "Guinea",
  ".gp": "Guadeloupe",
  ".gq": "Equatorial Guinea",
  ".gr": "Greece",
  ".gs": "South Georgia and the South Sandwich Islands",
  ".gt": "Guatemala",
  ".gu": "Guam",
  ".gw": "Guinea-Bissau",
  ".gy": "Guyana",
  ".hk": "Hong Kong",
  ".hm": "Heard Island and McDonald Islands",
  ".hn": "Honduras",
  ".hr": "Croatia",
  ".ht": "Haiti",
  ".hu": "Hungary",
  ".id": "Indonesia",
  ".ie": "Ireland",
  ".il": "Israel",
  ".im": "Isle of Man",
  ".in": "India",
  ".io": "British Indian Ocean Territory",
  ".iq": "Iraq",
  ".ir": "Iran",
  ".is": "Iceland",
  ".it": "Italy",
  ".je": "Jersey",
  ".jm": "Jamaica",
  ".jo": "Jordan",
  ".jp": "Japan",
  ".ke": "Kenya",
  ".kg": "Kyrgyzstan",
  ".kh": "Cambodia",
  ".ki": "Kiribati",
  ".km": "Comoros",
  ".kn": "Saint Kitts and Nevis",
  ".kp": "North Korea",
  ".kr": "South Korea",
  ".kw": "Kuwait",
  ".ky": "Cayman Islands",
  ".kz": "Kazakhstan",
  ".la": "Laos",
  ".lb": "Lebanon",
  ".lc": "Saint Lucia",
  ".li": "Liechtenstein",
  ".lk": "Sri Lanka",
  ".lr": "Liberia",
  ".ls": "Lesotho",
  ".lt": "Lithuania",
  ".lu": "Luxembourg",
  ".lv": "Latvia",
  ".ly": "Libya",
  ".ma": "Morocco",
  ".mc": "Monaco",
  ".md": "Moldova",
  ".me": "Montenegro",
  ".mg": "Madagascar",
  ".mh": "Marshall Islands",
  ".mk": "North Macedonia",
  ".ml": "Mali",
  ".mm": "Myanmar",
  ".mn": "Mongolia",
  ".mo": "Macau",
  ".mp": "Northern Mariana Islands",
  ".mq": "Martinique",
  ".mr": "Mauritania",
  ".ms": "Montserrat",
  ".mt": "Malta",
  ".mu": "Mauritius",
  ".mv": "Maldives",
  ".mw": "Malawi",
  ".mx": "Mexico",
  ".my": "Malaysia",
  ".mz": "Mozambique",
  ".na": "Namibia",
  ".nc": "New Caledonia",
  ".ne": "Niger",
  ".nf": "Norfolk Island",
  ".ng": "Nigeria",
  ".ni": "Nicaragua",
  ".nl": "Netherlands",
  ".no": "Norway",
  ".np": "Nepal",
  ".nr": "Nauru",
  ".nu": "Niue",
  ".nz": "New Zealand",
  ".om": "Oman",
  ".pa": "Panama",
  ".pe": "Peru",
  ".pf": "French Polynesia",
  ".pg": "Papua New Guinea",
  ".ph": "Philippines",
  ".pk": "Pakistan",
  ".pl": "Poland",
  ".pm": "Saint Pierre and Miquelon",
  ".pn": "Pitcairn Islands",
  ".pr": "Puerto Rico",
  ".ps": "Palestine",
  ".pt": "Portugal",
  ".pw": "Palau",
  ".py": "Paraguay",
  ".qa": "Qatar",
  ".re": "Réunion",
  ".ro": "Romania",
  ".rs": "Serbia",
  ".ru": "Russia",
  ".rw": "Rwanda",
  ".sa": "Saudi Arabia",
  ".sb": "Solomon Islands",
  ".sc": "Seychelles",
  ".sd": "Sudan",
  ".se": "Sweden",
  ".sg": "Singapore",
  ".sh": "Saint Helena",
  ".si": "Slovenia",
  ".sj": "Svalbard and Jan Mayen",
  ".sk": "Slovakia",
  ".sl": "Sierra Leone",
  ".sm": "San Marino",
  ".sn": "Senegal",
  ".so": "Somalia",
  ".sr": "Suriname",
  ".ss": "South Sudan",
  ".st": "São Tomé and Príncipe",
  ".sv": "El Salvador",
  ".sx": "Sint Maarten",
  ".sy": "Syria",
  ".sz": "Swaziland",
  ".tc": "Turks and Caicos Islands",
  ".td": "Chad",
  ".tf": "French Southern Territories",
  ".tg": "Togo",
  ".th": "Thailand",
  ".tj": "Tajikistan",
  ".tk": "Tokelau",
  ".tl": "Timor-Leste",
  ".tm": "Turkmenistan",
  ".tn": "Tunisia",
  ".to": "Tonga",
  ".tr": "Turkey",
  ".tt": "Trinidad and Tobago",
  ".tv": "Tuvalu",
  ".tw": "Taiwan",
  ".tz": "Tanzania",
  ".ua": "Ukraine",
  ".ug": "Uganda",
  ".uk": "United Kingdom",
  ".us": "United States",
  ".uy": "Uruguay",
  ".uz": "Uzbekistan",
  ".va": "Vatican City",
  ".vc": "Saint Vincent and the Grenadines",
  ".ve": "Venezuela",
  ".vg": "British Virgin Islands",
  ".vi": "U.S. Virgin Islands",
  ".vn": "Vietnam",
  ".vu": "Vanuatu",
  ".wf": "Wallis and Futuna",
  ".ws": "Samoa",
  ".ye": "Yemen",
  ".yt": "Mayotte",
  ".za": "South Africa",
  ".zm": "Zambia",
  ".zw": "Zimbabwe",

  // Generic TLDs that indicate country (some are geographic)
  ".co.jp": "Japan",
  ".co.uk": "United Kingdom",
  ".co.nz": "New Zealand",
  ".co.za": "South Africa",
  ".co.kr": "South Korea",
  ".co.in": "India",
  ".com.au": "Australia",
  ".com.br": "Brazil",
  ".com.cn": "China",
  ".com.hk": "Hong Kong",
  ".com.mx": "Mexico",
  ".com.sg": "Singapore",
  ".com.tw": "Taiwan",
  ".com.vn": "Vietnam",
  ".coop": "International",
  ".edu.cn": "China",
  ".gov.uk": "United Kingdom",
  ".gov.cn": "China",
  ".or.jp": "Japan",
  ".ac.uk": "United Kingdom",
};

// ============================================================================
// Extract Domain from Email
// ============================================================================

export function extractDomain(email: string): string | null {
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  
  const domain = parts[1].toLowerCase().trim();
  if (!domain || domain.includes(".") === false) return null;
  
  return domain;
}

// ============================================================================
// TLD Country Detection
// ============================================================================

function getCountryFromTld(domain: string): string | null {
  // Check for multi-part TLDs first (e.g., .co.jp)
  const dotIndex = domain.indexOf(".");
  if (dotIndex === -1) return null;
  
  // Check .com., .org., .net, etc. - most are US but we skip these
  const tldsWithoutCountry = [".com", ".net", ".org", ".edu", ".gov", ".info", ".biz"];
  for (const tld of tldsWithoutCountry) {
    if (domain.endsWith(tld)) {
      // These TLDs don't indicate country, default to common business locations
      // but actually we should return null to indicate unknown
      return null;
    }
  }
  
  // Try to find matching TLD from our map
  for (const [tld, country] of Object.entries(TLD_COUNTRY_MAP)) {
    if (domain.endsWith(tld)) {
      return country;
    }
  }
  
  // Fallback: check if domain ends with a known 2-letter TLD
  const lastPart = domain.substring(domain.lastIndexOf(".") + 1);
  if (lastPart.length === 2 && lastPart.length === 2) {
    // Could be a country code, but not in our map
    return null;
  }
  
  return null;
}

// ============================================================================
// Website Title Scraping
// ============================================================================

async function scrapeWebsiteTitle(website: string): Promise<string | null> {
  // Normalize website URL
  let url: string;
  if (!website.startsWith("http://") && !website.startsWith("https://")) {
    url = `https://${website}`;
  } else {
    url = website;
  }
  
  // Limit scraping timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BeyCRM/1.0; +https://beyer-maschinenbau.de)",
        Accept: "text/html",
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    
    // Extract title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      // Clean up title
      let title = titleMatch[1].trim();
      // Remove extra whitespace
      title = title.replace(/\s+/g, " ");
      // Remove common suffixes
      title = title.replace(/\s*[|]\s*[^|]+$/, "");
      title = title.replace(/\s*[-]\s*[^-]+$/, "");
      title = title.replace(/\s*:[^:]+$/, "");
      
      return title || null;
    }
    
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }
    return null;
  }
}

// ============================================================================
// Cache Operations
// ============================================================================

async function getCachedDomainLookup(
  domain: string
): Promise<DomainLookupResult | null> {
  const cached = await db.query.domainLookups.findFirst({
    where: eq(domainLookups.domain, domain),
  });
  
  if (!cached) return null;
  
  return {
    domain: cached.domain,
    companyName: cached.companyName,
    website: cached.website,
    country: cached.country,
    manuallyOverridden: cached.manuallyOverridden,
    source: "cache",
  };
}

async function cacheDomainLookup(
  domain: string,
  data: Partial<DomainLookupResult>
): Promise<void> {
  await db.insert(domainLookups).values({
    domain,
    companyName: data.companyName,
    website: data.website,
    country: data.country,
    manuallyOverridden: false,
  });
}

async function updateDomainLookupCache(
  domain: string,
  data: Partial<DomainLookupResult>
): Promise<void> {
  await db
    .update(domainLookups)
    .set({
      companyName: data.companyName,
      website: data.website,
      country: data.country,
      updatedAt: new Date(),
    })
    .where(eq(domainLookups.domain, domain));
}

// ============================================================================
// Main Domain Lookup Function
// ============================================================================

/**
 * Lookup company information from an email domain.
 * Uses layered approach: cache → TLD country → web scrape.
 * 
 * @param options - Email address to lookup
 * @returns Domain lookup result
 */
export async function lookupDomain(
  options: DomainLookupOptions
): Promise<DomainLookupResult | null> {
  const domain = extractDomain(options.email);
  
  if (!domain) {
    return null;
  }
  
  // 1. Check cache first (unless force refresh)
  if (!options.forceRefresh) {
    const cached = await getCachedDomainLookup(domain);
    if (cached) {
      return cached;
    }
  }
  
  // 2. TLD country detection (always available)
  const country = getCountryFromTld(domain);
  
  // 3. Website scraping for company name
  let companyName: string | null = null;
  let website: string | null = null;
  
  // Construct website URL from domain
  const potentialWebsite = domain.startsWith("www.")
    ? domain
    : `www.${domain}`;
  
  const title = await scrapeWebsiteTitle(potentialWebsite);
  if (title) {
    companyName = title;
    website = potentialWebsite;
  }
  
  // If we found anything useful, cache it
  if (companyName || country) {
    try {
      // Check if exists first
      const existing = await getCachedDomainLookup(domain);
      if (existing) {
        // Update existing (only if not manually overridden)
        if (!existing.manuallyOverridden) {
          await updateDomainLookupCache(domain, { companyName, website, country });
        }
      } else {
        // Insert new
        await cacheDomainLookup(domain, { companyName, website, country });
      }
    } catch (error) {
      console.error("Failed to cache domain lookup:", error);
    }
  }
  
  return {
    domain,
    companyName,
    website,
    country,
    manuallyOverridden: false,
    source: country ? "tld" : "scrape",
  };
}

// ============================================================================
// Batch Domain Lookup
// ============================================================================

export interface BatchDomainLookupItem {
  id: string;
  email: string;
}

export interface BatchDomainLookupProgress {
  total: number;
  processed: number;
  results: Array<{
    id: string;
    email: string;
    result: DomainLookupResult | null;
  }>;
}

export type DomainProgressCallback = (progress: BatchDomainLookupProgress) => void;

/**
 * Batch lookup domain information for multiple emails.
 * 
 * @param items - Array of items to lookup
 * @param onProgress - Optional callback for progress updates
 * @returns Final progress state
 */
export async function lookupDomainBatch(
  items: BatchDomainLookupItem[],
  onProgress?: DomainProgressCallback
): Promise<BatchDomainLookupProgress> {
  const progress: BatchDomainLookupProgress = {
    total: items.length,
    processed: 0,
    results: [],
  };
  
  // Add a small delay between requests to avoid rate limiting
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  
  for (const item of items) {
    try {
      const result = await lookupDomain({ email: item.email });
      progress.results.push({ id: item.id, email: item.email, result });
    } catch (error) {
      console.error(`Domain lookup failed for ${item.email}:`, error);
      progress.results.push({
        id: item.id,
        email: item.email,
        result: null,
      });
    }
    
    progress.processed++;
    onProgress?.(progress);
    
    // Small delay between requests to be polite
    if (progress.processed < items.length) {
      await delay(500); // 2 requests per second max
    }
  }
  
  return progress;
}

// ============================================================================
// Manual Override Management
// ============================================================================

export interface DomainOverride {
  domain: string;
  companyName: string | null;
  website: string | null;
  country: string | null;
}

export async function setDomainOverride(data: DomainOverride): Promise<void> {
  const existing = await getCachedDomainLookup(data.domain);
  
  if (existing) {
    await db
      .update(domainLookups)
      .set({
        companyName: data.companyName,
        website: data.website,
        country: data.country,
        manuallyOverridden: true,
        updatedAt: new Date(),
      })
      .where(eq(domainLookups.domain, data.domain));
  } else {
    await db.insert(domainLookups).values({
      domain: data.domain,
      companyName: data.companyName,
      website: data.website,
      country: data.country,
      manuallyOverridden: true,
    });
  }
}

export async function clearDomainOverride(domain: string): Promise<void> {
  await db
    .update(domainLookups)
    .set({
      manuallyOverridden: false,
      updatedAt: new Date(),
    })
    .where(eq(domainLookups.domain, domain));
}

export async function listDomainOverrides(): Promise<DomainLookupResult[]> {
  const overrides = await db.query.domainLookups.findMany({
    where: eq(domainLookups.manuallyOverridden, true),
  });
  
  return overrides.map((o) => ({
    domain: o.domain,
    companyName: o.companyName,
    website: o.website,
    country: o.country,
    manuallyOverridden: o.manuallyOverridden,
    source: "cache" as const,
  }));
}
