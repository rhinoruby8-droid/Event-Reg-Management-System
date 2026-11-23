import * as XLSX from 'xlsx';
import {
  CustomTicketField,
  Delegate,
  EXPERIENCE_LEVELS,
  ExperienceLevel,
  INDUSTRY_OPTIONS,
  IndustryOption,
  PARTNER_TIERS,
  PartnerCompany,
  REGISTRATION_CATEGORIES,
  RegistrationCategory,
  UserAccount,
} from '../types';

export const EXCEL_COLUMN_ORDER = [
  'First Name',
  'Last Name',
  'Job Title',
  'Company',
  'Country',
  'Email',
  'Registration Category',
  'Phone',
  'Awards Night Dinner',
  'Day 1 Workshop',
  'Day 2',
  'Day 3',
  'Stadium Tour',
  'Has Dietary',
  'Dietary Details',
  'Experience Level',
  'Industry',
  'Promo Code',
  'Share Details With Partners',
  'Newsletter Opt-In',
] as const;

export type DelegateCanonicalKey =
  | 'firstName'
  | 'lastName'
  | 'jobTitle'
  | 'company'
  | 'country'
  | 'email'
  | 'registrationCategory'
  | 'phone'
  | 'awardsNightDinner'
  | 'day1Workshop'
  | 'day2'
  | 'day3'
  | 'stadiumTour'
  | 'hasDietary'
  | 'dietaryDetails'
  | 'experienceLevel'
  | 'industry'
  | 'promoCode'
  | 'shareDetailsWithPartners'
  | 'newsletterOptIn';

export type PartnerCanonicalKey =
  | 'partnerName'
  | 'partnerTier'
  | 'standNumber'
  | 'complimentaryQuota'
  | 'awardsQuota'
  | 'partnerContactName'
  | 'partnerLoginEmail'
  | 'partnerLoginPassword';

export type StaticMappingKey =
  | 'fullName'
  | DelegateCanonicalKey
  | PartnerCanonicalKey;

export type ImportMappingKey =
  | 'ignore'
  | StaticMappingKey
  | `custom:${string}`;

export type ImportMode = 'delegates' | 'partners';

export interface ParsedSheetData {
  name: string;
  rows: unknown[][];
  suggestedHeaderRowIndex: number;
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheetData[];
}

export interface ParsedPartnerCandidate {
  id: string;
  name: string;
  tier: string;
  standNumber: string;
  complimentaryQuota: number;
  awardsQuota: number;
  contactName: string;
  loginEmail: string;
  loginPassword: string;
  errors: string[];
}

export const MAPPING_FIELD_GROUPS: {
  group: string;
  options: { value: ImportMappingKey; label: string }[];
}[] = [
  {
    group: 'General',
    options: [
      { value: 'ignore', label: '— Ignore Column —' },
      { value: 'fullName', label: 'Full Name (Auto-Split First + Last)' },
    ],
  },
  {
    group: 'Partner Details',
    options: [
      { value: 'partnerName', label: 'Partner Company / Account Name' },
      { value: 'partnerTier', label: 'Partner Sponsorship Tier' },
      { value: 'standNumber', label: 'Stand / Booth Number' },
      { value: 'complimentaryQuota', label: 'Complimentary Pass Quota' },
      { value: 'awardsQuota', label: 'Awards Night Seat Quota' },
      { value: 'partnerContactName', label: 'Partner Contact / Admin Name' },
      { value: 'partnerLoginEmail', label: 'Partner Admin Login Email' },
      { value: 'partnerLoginPassword', label: 'Partner Admin Password' },
    ],
  },
  {
    group: 'Delegate Fields (20 Schema Columns)',
    options: [
      { value: 'firstName', label: '1. First Name' },
      { value: 'lastName', label: '2. Last Name' },
      { value: 'jobTitle', label: '3. Job Title' },
      { value: 'company', label: '4. Company' },
      { value: 'country', label: '5. Country' },
      { value: 'email', label: '6. Email (Delegate)' },
      { value: 'registrationCategory', label: '7. Registration Category' },
      { value: 'phone', label: '8. Phone' },
      { value: 'awardsNightDinner', label: '9. Awards Night Dinner (Yes/No)' },
      { value: 'day1Workshop', label: '10. Day 1 Workshop (Yes/No)' },
      { value: 'day2', label: '11. Day 2 (Yes/No)' },
      { value: 'day3', label: '12. Day 3 (Yes/No)' },
      { value: 'stadiumTour', label: '13. Stadium Tour (Yes/No)' },
      { value: 'hasDietary', label: '14. Has Dietary Req. (Yes/No)' },
      { value: 'dietaryDetails', label: '15. Dietary Details' },
      { value: 'experienceLevel', label: '16. Experience Level' },
      { value: 'industry', label: '17. Industry' },
      { value: 'promoCode', label: '18. Promo Code' },
      { value: 'shareDetailsWithPartners', label: '19. Share Details w/ Partners' },
      { value: 'newsletterOptIn', label: '20. Newsletter Opt-In' },
    ],
  },
];

const POSITIONAL_KEYS: DelegateCanonicalKey[] = [
  'firstName',
  'lastName',
  'jobTitle',
  'company',
  'country',
  'email',
  'registrationCategory',
  'phone',
  'awardsNightDinner',
  'day1Workshop',
  'day2',
  'day3',
  'stadiumTour',
  'hasDietary',
  'dietaryDetails',
  'experienceLevel',
  'industry',
  'promoCode',
  'shareDetailsWithPartners',
  'newsletterOptIn',
];

const ALL_HEADER_ALIASES: Record<StaticMappingKey, string[]> = {
  fullName: ['full name', 'fullname', 'delegate name', 'attendee name', 'name', 'delegate', 'attendee', 'person'],
  firstName: ['firstname', 'first name', 'first', 'given name', 'fname', 'forename'],
  lastName: ['lastname', 'last name', 'last', 'surname', 'family name', 'lname'],
  jobTitle: ['jobtitle', 'job title', 'title', 'role', 'position', 'designation', 'occupation'],
  company: ['company', 'organisation', 'organization', 'company name', 'employer', 'firm', 'business', 'org'],
  country: ['country', 'location', 'nation', 'region'],
  email: ['email', 'email address', 'e-mail', 'work email', 'delegate email', 'attendee email', 'mail'],
  registrationCategory: ['registrationcategory', 'registration category', 'category', 'pass type', 'reg category', 'ticket category', 'badge type', 'type'],
  phone: ['phone', 'mobile', 'telephone', 'phone number', 'contact number', 'mobile number', 'cell', 'tel'],
  awardsNightDinner: ['awardsnightdinner', 'awards night dinner', 'awards night', 'awards dinner', 'awards', 'gala dinner', 'dinner'],
  day1Workshop: ['day1workshop', 'day 1 workshop', 'day 1', 'workshop', 'day1', 'pre-conference workshop'],
  day2: ['day2', 'day 2', 'conference day 2', 'expo day 2'],
  day3: ['day3', 'day 3', 'conference day 3', 'expo day 3'],
  stadiumTour: ['stadiumtour', 'stadium tour', 'tour', 'mcg tour', 'venue tour'],
  hasDietary: ['hasdietary', 'has dietary', 'dietary', 'dietary req', 'dietary requirement', 'dietary requirements', 'special diet'],
  dietaryDetails: ['dietarydetails', 'dietary details', 'dietary notes', 'dietary info', 'dietary specification', 'allergies', 'food allergies', 'meal preference'],
  experienceLevel: ['experiencelevel', 'experience level', 'seniority', 'level', 'experience', 'management level'],
  industry: ['industry', 'sector', 'vertical'],
  promoCode: ['promocode', 'promo code', 'promo', 'voucher', 'discount code', 'code'],
  shareDetailsWithPartners: ['sharedetailswithpartners', 'share details with partners', 'share details', 'share w partners', 'partner sharing', 'share contact'],
  newsletterOptIn: ['newsletteroptin', 'newsletter opt-in', 'newsletter opt in', 'newsletter', 'marketing opt in', 'marketing opt-in', 'subscribe'],

  // Partner detail aliases
  partnerName: [
    'partner account',
    'partner company',
    'partner name',
    'partner',
    'sponsor',
    'sponsor name',
    'exhibitor name',
    'exhibitor company',
    'partner organisation',
    'partner organization',
  ],
  partnerTier: [
    'tier',
    'partner tier',
    'sponsorship tier',
    'sponsor tier',
    'package',
    'sponsorship level',
    'level of sponsorship',
    'membership tier',
  ],
  standNumber: [
    'stand',
    'stand number',
    'stand no',
    'stand #',
    'booth',
    'booth number',
    'booth no',
    'booth #',
    'exhibition stand',
    'space',
  ],
  complimentaryQuota: [
    'complimentary quota',
    'complimentary passes',
    'comp quota',
    'pass quota',
    'pass allocation',
    'free passes',
    'quota',
    'passes allowed',
    'delegate quota',
    'allocated passes',
  ],
  awardsQuota: [
    'awards quota',
    'awards night quota',
    'awards seats',
    'dinner seats',
    'gala seats',
    'awards allocation',
    'awards tickets',
  ],
  partnerContactName: [
    'contact name',
    'primary contact',
    'partner contact',
    'admin name',
    'account manager',
    'coordinator',
    'key contact',
  ],
  partnerLoginEmail: [
    'partner email',
    'primary contact email',
    'login email',
    'admin email',
    'contact email',
    'portal email',
    'account email',
  ],
  partnerLoginPassword: [
    'password',
    'login password',
    'temp password',
    'temporary password',
    'portal password',
  ],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9#]+/g, ' ').trim();
}

function matchSingleHeader(
  header: string,
  mode: ImportMode
): ImportMappingKey {
  const norm = normalizeHeader(header);
  if (!norm) return 'ignore';

  // Priority order depends on mode so generic columns like "Company" or "Email" map naturally
  const partnerKeys: StaticMappingKey[] = [
    'partnerName',
    'partnerTier',
    'standNumber',
    'complimentaryQuota',
    'awardsQuota',
    'partnerContactName',
    'partnerLoginEmail',
    'partnerLoginPassword',
  ];

  const delegateKeys: StaticMappingKey[] = [
    'firstName',
    'lastName',
    'fullName',
    'jobTitle',
    'company',
    'country',
    'email',
    'registrationCategory',
    'phone',
    'awardsNightDinner',
    'day1Workshop',
    'day2',
    'day3',
    'stadiumTour',
    'hasDietary',
    'dietaryDetails',
    'experienceLevel',
    'industry',
    'promoCode',
    'shareDetailsWithPartners',
    'newsletterOptIn',
  ];

  // In partner directory mode, map generic "Company", "Email", "Name" to partner fields
  if (mode === 'partners') {
    if (['company', 'company name', 'organisation', 'organization', 'business', 'firm', 'name'].includes(norm)) {
      return 'partnerName';
    }
    if (['email', 'email address', 'work email', 'e-mail', 'mail'].includes(norm)) {
      return 'partnerLoginEmail';
    }
    if (['contact', 'primary contact name', 'representative', 'rep'].includes(norm)) {
      return 'partnerContactName';
    }
  }

  const orderedKeys =
    mode === 'partners'
      ? [...partnerKeys, ...delegateKeys]
      : [...partnerKeys, ...delegateKeys];

  // 1. Exact alias match
  for (const key of orderedKeys) {
    if (ALL_HEADER_ALIASES[key].some((alias) => normalizeHeader(alias) === norm)) {
      return key;
    }
  }

  // 2. Partial contains match (check longer/more specific aliases first)
  for (const key of orderedKeys) {
    if (
      ALL_HEADER_ALIASES[key].some((alias) => {
        const normAlias = normalizeHeader(alias);
        return normAlias.length >= 4 && (norm.includes(normAlias) || normAlias.includes(norm));
      })
    ) {
      return key;
    }
  }

  return 'ignore';
}

function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const str = String(val ?? '').trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 'x', '✓', 'checked', 'attending', 'opt-in', 'opt in'].includes(str);
}

function parseNumber(val: unknown, fallback: number): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return Math.max(0, Math.round(val));
  const cleaned = String(val ?? '').replace(/[^0-9.-]/g, '').trim();
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? fallback : Math.max(0, parsed);
}

function parseCategory(val: unknown): RegistrationCategory {
  const str = String(val ?? '').trim().toLowerCase();
  const found = REGISTRATION_CATEGORIES.find((c) => c.toLowerCase() === str);
  if (found) return found;
  if (str.includes('speak')) return 'Speaker';
  if (str.includes('exhib')) return 'Exhibitor';
  if (str.includes('vip') || str.includes('guest')) return 'VIP';
  if (str.includes('deleg') || str.includes('attend')) return 'Delegate';
  return 'Partner';
}

function parseExperience(val: unknown): ExperienceLevel {
  const str = String(val ?? '').trim().toLowerCase();
  const exact = EXPERIENCE_LEVELS.find((e) => e.toLowerCase() === str);
  if (exact) return exact;
  if (str.includes('exec') || str.includes('decision') || str.includes('director') || str.includes('c-level') || str.includes('vp')) {
    return 'Executive/Decision Maker';
  }
  if (str.includes('senior') || str.includes('principal') || str.includes('lead')) return 'Senior Management';
  if (str.includes('mid') || str.includes('manager')) return 'Mid-level Management';
  if (str.includes('tech') || str.includes('spec') || str.includes('eng') || str.includes('sched') || str.includes('cost')) {
    return 'Technical/Specialist';
  }
  if (str.includes('entry') || str.includes('junior') || str.includes('grad')) return 'Entry Level';
  return 'Mid-level Management';
}

function parseIndustry(val: unknown): IndustryOption {
  const str = String(val ?? '').trim().toLowerCase();
  const exact = INDUSTRY_OPTIONS.find((i) => i.toLowerCase() === str);
  if (exact) return exact;
  if (str.includes('oil') || str.includes('gas') || str.includes('energy') || str.includes('petrol')) return 'Oil & Gas';
  if (str.includes('soft') || str.includes('tech') || str.includes('it') || str.includes('saas')) return 'Software/Tech';
  if (str.includes('infra') || str.includes('rail') || str.includes('transport') || str.includes('civil')) return 'Infrastructure';
  if (str.includes('build') || str.includes('construct') || str.includes('property')) return 'Building';
  if (str.includes('mine') || str.includes('mining') || str.includes('resource') || str.includes('mineral')) return 'Mining';
  if (str.includes('gov') || str.includes('public') || str.includes('defence') || str.includes('defense')) return 'Government';
  if (str.includes('consult') || str.includes('advis') || str.includes('project')) return 'Consulting';
  return 'Other';
}

function parsePartnerTier(val: unknown): string {
  const str = String(val ?? '').trim();
  if (!str) return 'Gold Partner';
  const low = str.toLowerCase();
  const exact = PARTNER_TIERS.find((t) => t.toLowerCase() === low);
  if (exact) return exact;
  if (low.includes('plat')) return 'Platinum Partner';
  if (low.includes('gold')) return 'Gold Partner';
  if (low.includes('silv')) return 'Silver Partner';
  if (low.includes('bronz')) return 'Bronze Partner';
  if (low.includes('exhib')) return 'Exhibitor';
  if (low.includes('assoc') || low.includes('spons')) return 'Associate Sponsor';
  return str;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function makePartnerSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 18) || 'partner'
  );
}

/**
 * Scans the top 10 rows of a sheet to locate the real header row
 * (handles Excel sheets that have title banners or empty spacing rows above the table).
 */
export function detectHeaderRowIndex(rows: unknown[][]): number {
  let bestIdx = 0;
  let bestScore = -1;

  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const nonEmptyCells = row.filter((c) => String(c ?? '').trim() !== '');
    if (nonEmptyCells.length < 2) continue;

    let matchScore = 0;
    for (const cell of row) {
      const s = String(cell ?? '').trim();
      if (!s) continue;
      if (matchSingleHeader(s, 'delegates') !== 'ignore' || matchSingleHeader(s, 'partners') !== 'ignore') {
        matchScore += 3;
      }
    }
    // Slight preference for rows with multiple short text headers (not email addresses)
    const looksLikeData = nonEmptyCells.some((c) => EMAIL_REGEX.test(String(c ?? '').trim()));
    if (looksLikeData) matchScore -= 4;

    if (matchScore > bestScore) {
      bestScore = matchScore;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Reads ANY spreadsheet format supported by SheetJS (.xlsx, .xls, .xlsm, .xlsb, .ods, .csv, .tsv)
 * and extracts all sheets as raw 2D matrices for interactive column mapping.
 */
export async function readWorkbookRaw(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file contains no readable worksheets.');
  }

  const sheets: ParsedSheetData[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });
    const cleanRows = matrix.filter(
      (r) => Array.isArray(r) && r.some((cell) => String(cell ?? '').trim() !== '')
    );
    return {
      name: sheetName,
      rows: cleanRows,
      suggestedHeaderRowIndex: detectHeaderRowIndex(cleanRows),
    };
  }).filter((s) => s.rows.length > 0);

  if (sheets.length === 0) {
    throw new Error('All worksheets in this file are empty.');
  }

  return {
    fileName: file.name,
    sheets,
  };
}

/**
 * Automatically detects whether the uploaded sheet looks more like a Partner Directory
 * (Partner Companies + Booth + Quotas) or a Delegate Registration sheet.
 */
export function detectBestImportMode(headers: string[], isAdmin: boolean): ImportMode {
  if (!isAdmin) return 'delegates';

  let partnerSpecificHits = 0;
  let delegateSpecificHits = 0;

  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm) continue;
    if (
      (['partnerTier', 'standNumber', 'complimentaryQuota', 'awardsQuota', 'partnerLoginEmail'] as StaticMappingKey[]).some(
        (k) =>
          ALL_HEADER_ALIASES[k].some(
            (a) => norm === normalizeHeader(a) || norm.includes(normalizeHeader(a))
          )
      )
    ) {
      partnerSpecificHits += 1;
    }
    if (
      (['firstName', 'lastName', 'jobTitle', 'day1Workshop', 'day2', 'day3', 'hasDietary', 'dietaryDetails', 'experienceLevel'] as StaticMappingKey[]).some(
        (k) =>
          ALL_HEADER_ALIASES[k].some(
            (a) => norm === normalizeHeader(a) || norm.includes(normalizeHeader(a))
          )
      )
    ) {
      delegateSpecificHits += 1;
    }
  }

  if (partnerSpecificHits >= 2 && delegateSpecificHits === 0) {
    return 'partners';
  }
  return 'delegates';
}

/**
 * Suggests a column-by-column mapping using header aliases AND value-based heuristics.
 */
export function suggestColumnMappings(
  headers: string[],
  sampleRows: unknown[][],
  mode: ImportMode,
  customTicketFields: CustomTicketField[] = []
): ImportMappingKey[] {
  const used = new Set<ImportMappingKey>();

  const mapped: ImportMappingKey[] = headers.map((header) => {
    const norm = normalizeHeader(header);
    // Check custom ticket titles first if exact match
    if (norm && customTicketFields.length > 0) {
      const matchedCustom = customTicketFields.find(
        (t) => normalizeHeader(t.label) === norm
      );
      if (matchedCustom) {
        const key: ImportMappingKey = `custom:${matchedCustom.id}`;
        if (!used.has(key)) {
          used.add(key);
          return key;
        }
      }
    }

    const match = matchSingleHeader(header, mode);
    if (match !== 'ignore' && !used.has(match)) {
      used.add(match);
      return match;
    }
    return 'ignore';
  });

  // Value-based heuristic fallback for unmapped columns (e.g., weird/custom headers)
  headers.forEach((_header, colIdx) => {
    if (mapped[colIdx] !== 'ignore') return;
    const samples = sampleRows
      .slice(0, 6)
      .map((r) => String(r[colIdx] ?? '').trim())
      .filter(Boolean);
    if (samples.length === 0) return;

    // Detect email column by value pattern
    const emailRatio = samples.filter((s) => EMAIL_REGEX.test(s)).length / samples.length;
    if (emailRatio >= 0.6) {
      const targetKey: ImportMappingKey =
        mode === 'partners' ? 'partnerLoginEmail' : 'email';
      if (!used.has(targetKey)) {
        mapped[colIdx] = targetKey;
        used.add(targetKey);
        return;
      }
    }

    // Detect phone column by value pattern
    const phoneRatio =
      samples.filter((s) => /^\+?[\d\s\-()]{8,}$/.test(s)).length / samples.length;
    if (phoneRatio >= 0.6 && mode === 'delegates' && !used.has('phone')) {
      mapped[colIdx] = 'phone';
      used.add('phone');
    }
  });

  return mapped;
}

/**
 * Builds Delegate records from any mapped Excel sheet.
 * When `autoCreatePartners` is true (Super Admin), automatically creates PartnerCompany
 * + Partner Admin UserAccount records for any newly encountered partner/company names.
 */
export function buildMappedDelegatesImport(params: {
  dataRows: unknown[][];
  columnMapping: ImportMappingKey[];
  existingPartners: PartnerCompany[];
  existingUsers: UserAccount[];
  eventId: string;
  eventName?: string;
  fallbackPartnerId: string;
  autoCreatePartners: boolean;
  actorEmail: string;
}): {
  delegates: Delegate[];
  newPartners: PartnerCompany[];
  newUsers: UserAccount[];
} {
  const {
    dataRows,
    columnMapping,
    existingPartners,
    existingUsers,
    eventId,
    eventName,
    fallbackPartnerId,
    autoCreatePartners,
    actorEmail,
  } = params;

  const fallbackPartner =
    existingPartners.find((p) => p.id === fallbackPartnerId) ?? existingPartners[0];

  const partnerByLowerName = new Map<string, PartnerCompany>();
  for (const p of existingPartners) {
    partnerByLowerName.set(p.name.trim().toLowerCase(), p);
  }

  const usedEmails = new Set<string>(
    existingUsers.map((u) => u.email.trim().toLowerCase())
  );

  const newPartners: PartnerCompany[] = [];
  const newUsers: UserAccount[] = [];
  const delegates: Delegate[] = [];
  const now = new Date().toISOString();

  dataRows.forEach((row, rowIdx) => {
    const rec: Partial<Record<Exclude<ImportMappingKey, 'ignore'>, unknown>> = {};
    const customTickets: Record<string, boolean> = {};
    columnMapping.forEach((key, colIdx) => {
      if (key !== 'ignore' && colIdx < row.length) {
        if (key.startsWith('custom:')) {
          const ticketId = key.slice('custom:'.length);
          customTickets[ticketId] = parseBoolean(row[colIdx]);
        } else {
          rec[key] = row[colIdx];
        }
      }
    });

    // Skip rows that have zero mapped content
    const hasAnyContent =
      Object.values(rec).some((v) => String(v ?? '').trim() !== '') ||
      Object.keys(customTickets).length > 0;
    if (!hasAnyContent) return;

    // Resolve partner ownership
    const explicitPartnerName = String(rec.partnerName ?? '').trim();
    const companyCell = String(rec.company ?? '').trim();
    const candidatePartnerName = explicitPartnerName || (autoCreatePartners ? companyCell : '');

    let resolvedPartner = fallbackPartner;

    if (candidatePartnerName) {
      const existingMatch = partnerByLowerName.get(candidatePartnerName.toLowerCase());
      if (existingMatch) {
        resolvedPartner = existingMatch;
      } else if (autoCreatePartners) {
        const slug = makePartnerSlug(candidatePartnerName);
        const partnerId = `partner-${slug}-${Date.now().toString(36)}-${newPartners.length}`;

        let loginEmail = String(rec.partnerLoginEmail ?? '').trim().toLowerCase();
        if (!loginEmail || !EMAIL_REGEX.test(loginEmail) || usedEmails.has(loginEmail)) {
          let candidateEmail = `partner@${slug}.com.au`;
          let suffix = 2;
          while (usedEmails.has(candidateEmail)) {
            candidateEmail = `partner${suffix}@${slug}.com.au`;
            suffix += 1;
          }
          loginEmail = candidateEmail;
        }
        usedEmails.add(loginEmail);

        const createdPartner: PartnerCompany = {
          id: partnerId,
          eventId,
          name: candidatePartnerName,
          tier: parsePartnerTier(rec.partnerTier),
          standNumber: String(rec.standNumber ?? '').trim() || 'Booth TBA',
          complimentaryQuota: parseNumber(rec.complimentaryQuota, 5),
          awardsQuota: parseNumber(rec.awardsQuota, 2),
          primaryContactEmail: loginEmail,
        };

        const contactName =
          String(rec.partnerContactName ?? '').trim() ||
          `${candidatePartnerName} Admin`;

        const createdUser: UserAccount = {
          id: `user-${slug}-${Date.now().toString(36)}-${newUsers.length}`,
          email: loginEmail,
          password: String(rec.partnerLoginPassword ?? '').trim() || 'partner123',
          name: contactName,
          role: 'partner_admin',
          eventId,
          eventName,
          partnerId,
          partnerName: candidatePartnerName,
        };

        partnerByLowerName.set(candidatePartnerName.toLowerCase(), createdPartner);
        newPartners.push(createdPartner);
        newUsers.push(createdUser);
        resolvedPartner = createdPartner;
      }
    }

    // Resolve first/last name (supports single "Full Name" column!)
    let firstName = String(rec.firstName ?? '').trim();
    let lastName = String(rec.lastName ?? '').trim();
    const fullNameStr = String(rec.fullName ?? '').trim();
    if ((!firstName || !lastName) && fullNameStr) {
      const split = splitFullName(fullNameStr);
      if (!firstName) firstName = split.firstName;
      if (!lastName) lastName = split.lastName;
    }

    const rawDietaryDetails = String(rec.dietaryDetails ?? '').trim();
    const parsedHasDietary =
      rec.hasDietary !== undefined && String(rec.hasDietary).trim() !== ''
        ? parseBoolean(rec.hasDietary)
        : rawDietaryDetails.length > 0 &&
          !['none', 'no', 'n/a', 'nil', 'standard', '-'].includes(
            rawDietaryDetails.toLowerCase()
          );

    const delegate: Delegate = {
      id: `del-imp-${Date.now()}-${rowIdx}-${Math.random().toString(36).slice(2, 6)}`,
      eventId,
      partnerId: resolvedPartner?.id || fallbackPartnerId,
      firstName,
      lastName,
      jobTitle: String(rec.jobTitle ?? '').trim(),
      company: companyCell || resolvedPartner?.name || '',
      country: String(rec.country ?? '').trim() || 'Australia',
      email: String(rec.email ?? '').trim(),
      registrationCategory: parseCategory(rec.registrationCategory),
      phone: String(rec.phone ?? '').trim(),
      awardsNightDinner: parseBoolean(rec.awardsNightDinner),
      day1Workshop: parseBoolean(rec.day1Workshop),
      day2: rec.day2 !== undefined && String(rec.day2).trim() !== '' ? parseBoolean(rec.day2) : true,
      day3: rec.day3 !== undefined && String(rec.day3).trim() !== '' ? parseBoolean(rec.day3) : true,
      stadiumTour: parseBoolean(rec.stadiumTour),
      hasDietary: parsedHasDietary,
      dietaryDetails: parsedHasDietary ? rawDietaryDetails : '',
      experienceLevel: parseExperience(rec.experienceLevel),
      industry: parseIndustry(rec.industry),
      promoCode: String(rec.promoCode ?? '').trim(),
      shareDetailsWithPartners: parseBoolean(rec.shareDetailsWithPartners),
      newsletterOptIn: parseBoolean(rec.newsletterOptIn),
      ...(Object.keys(customTickets).length > 0 ? { customTickets } : {}),
      isLocked: false,
      ticketType: 'Complimentary',
      createdAt: now,
      updatedAt: now,
      updatedBy: actorEmail,
    };

    delegates.push(delegate);
  });

  return { delegates, newPartners, newUsers };
}

/**
 * Builds PartnerCompany + Partner Admin UserAccount candidates from ANY mapped Partner Directory Excel sheet.
 */
export function buildMappedPartnersImport(params: {
  dataRows: unknown[][];
  columnMapping: ImportMappingKey[];
  existingPartners: PartnerCompany[];
  existingUsers: UserAccount[];
}): ParsedPartnerCandidate[] {
  const { dataRows, columnMapping, existingPartners, existingUsers } = params;

  const existingPartnerNames = new Set(
    existingPartners.map((p) => p.name.trim().toLowerCase())
  );
  const existingEmails = new Set(
    existingUsers.map((u) => u.email.trim().toLowerCase())
  );
  const batchPartnerNames = new Set<string>();
  const batchEmails = new Set<string>();

  const candidates: ParsedPartnerCandidate[] = [];

  dataRows.forEach((row, idx) => {
    const rec: Partial<Record<Exclude<ImportMappingKey, 'ignore'>, unknown>> = {};
    columnMapping.forEach((key, colIdx) => {
      if (key !== 'ignore' && colIdx < row.length) {
        rec[key] = row[colIdx];
      }
    });

    const hasAnyContent = Object.values(rec).some(
      (v) => String(v ?? '').trim() !== ''
    );
    if (!hasAnyContent) return;

    const name = String(rec.partnerName ?? rec.company ?? '').trim();
    const tier = parsePartnerTier(rec.partnerTier);
    const standNumber = String(rec.standNumber ?? '').trim() || 'Booth TBA';
    const complimentaryQuota = parseNumber(rec.complimentaryQuota, 5);
    const awardsQuota = parseNumber(rec.awardsQuota, 2);

    const firstName = String(rec.firstName ?? '').trim();
    const lastName = String(rec.lastName ?? '').trim();
    const contactName =
      String(rec.partnerContactName ?? rec.fullName ?? '').trim() ||
      `${firstName} ${lastName}`.trim() ||
      (name ? `${name} Admin` : '');

    const rawEmail = String(rec.partnerLoginEmail ?? rec.email ?? '')
      .trim()
      .toLowerCase();
    const slug = makePartnerSlug(name || `partner${idx + 1}`);
    const loginEmail = rawEmail || (name ? `partner@${slug}.com.au` : '');
    const loginPassword =
      String(rec.partnerLoginPassword ?? '').trim() || 'partner123';

    const errors: string[] = [];
    if (!name) {
      errors.push('Partner company name is required');
    } else if (existingPartnerNames.has(name.toLowerCase())) {
      errors.push(`"${name}" already exists`);
    } else if (batchPartnerNames.has(name.toLowerCase())) {
      errors.push(`Duplicate company "${name}" in file`);
    } else {
      batchPartnerNames.add(name.toLowerCase());
    }

    if (!loginEmail || !EMAIL_REGEX.test(loginEmail)) {
      errors.push('Valid Partner Admin email is required');
    } else if (existingEmails.has(loginEmail)) {
      errors.push(`Email "${loginEmail}" is already registered`);
    } else if (batchEmails.has(loginEmail)) {
      errors.push(`Duplicate email "${loginEmail}" in file`);
    } else {
      batchEmails.add(loginEmail);
    }

    candidates.push({
      id: `cand-partner-${Date.now()}-${idx}`,
      name,
      tier,
      standNumber,
      complimentaryQuota,
      awardsQuota,
      contactName,
      loginEmail,
      loginPassword,
      errors,
    });
  });

  return candidates;
}

/**
 * Parses tab-separated values copied directly from Microsoft Excel / Google Sheets.
 */
export function parseExcelPaste(
  rawText: string,
  eventId: string,
  partnerId: string,
  defaultCompany: string,
  actorEmail: string
): { delegates: Delegate[]; detectedHeaderRow: boolean; mappedColumns: string[] } {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  const matrix = lines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((cell) => cell.trim());
    }
    return line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
  });

  if (matrix.length === 0) {
    return { delegates: [], detectedHeaderRow: false, mappedColumns: [] };
  }

  const firstRowStrings = matrix[0].map((c) => String(c ?? '').trim());
  const headerMapping = suggestColumnMappings(firstRowStrings, matrix.slice(1), 'delegates');
  const matchedCount = headerMapping.filter((k) => k !== 'ignore').length;
  const detectedHeaderRow = matchedCount >= 3;

  const dataRows = detectedHeaderRow ? matrix.slice(1) : matrix;
  const finalMapping: ImportMappingKey[] = detectedHeaderRow
    ? headerMapping
    : POSITIONAL_KEYS.slice(0, matrix[0].length);

  const fallbackPartner: PartnerCompany = {
    id: partnerId,
    eventId,
    name: defaultCompany,
    tier: 'Partner',
    standNumber: 'TBA',
    complimentaryQuota: 5,
    awardsQuota: 2,
    primaryContactEmail: actorEmail,
  };

  const { delegates } = buildMappedDelegatesImport({
    dataRows,
    columnMapping: finalMapping,
    existingPartners: [fallbackPartner],
    existingUsers: [],
    eventId,
    fallbackPartnerId: partnerId,
    autoCreatePartners: false,
    actorEmail,
  });

  return {
    delegates,
    detectedHeaderRow,
    mappedColumns: finalMapping.filter((k) => k !== 'ignore'),
  };
}

function yn(v: boolean): string {
  return v ? 'Yes' : 'No';
}

function getPartnerName(partnerId: string, partners: PartnerCompany[]): string {
  return partners.find((p) => p.id === partnerId)?.name ?? partnerId;
}

function formatFullRow(
  d: Delegate,
  partners: PartnerCompany[],
  customTicketFields: CustomTicketField[] = []
) {
  const dayTotal = (d.day1Workshop ? 1 : 0) + (d.day2 ? 1 : 0) + (d.day3 ? 1 : 0);
  const payableCount =
    typeof d.payableTicketsCount === 'number'
      ? d.payableTicketsCount
      : d.ticketType === 'Chargeable Extra'
      ? dayTotal
      : 0;
  const compCount =
    typeof d.compTicketsUsed === 'number'
      ? d.compTicketsUsed
      : Math.max(0, dayTotal - payableCount);

  const base: Record<string, unknown> = {
    'Partner Account': getPartnerName(d.partnerId, partners),
    'Pass Allocation': payableCount > 0 ? 'Payable' : 'Complimentary',
    'Day Tickets (D1+D2+D3)': dayTotal,
    'Comp Tickets Used': compCount,
    'Payable Tickets': payableCount,
    'Row Lock': d.isLocked ? 'Locked' : 'Unlocked',
    'First Name': d.firstName,
    'Last Name': d.lastName,
    'Job Title': d.jobTitle,
    Company: d.company,
    Country: d.country,
    Email: d.email,
    'Registration Category': d.registrationCategory,
    Phone: d.phone,
    'Awards Night Dinner': yn(d.awardsNightDinner),
    'Day 1 Workshop': yn(d.day1Workshop),
    'Day 2': yn(d.day2),
    'Day 3': yn(d.day3),
    'Stadium Tour': yn(d.stadiumTour),
    'Has Dietary': yn(d.hasDietary),
    'Dietary Details': d.dietaryDetails,
    'Experience Level': d.experienceLevel,
    Industry: d.industry,
    'Promo Code': d.promoCode,
    'Share Details With Partners': yn(d.shareDetailsWithPartners),
    'Newsletter Opt-In': yn(d.newsletterOptIn),
  };

  for (const ticket of customTicketFields) {
    base[ticket.label] = yn(Boolean(d.customTickets?.[ticket.id]));
  }

  base['Updated At'] = d.updatedAt;
  base['Updated By'] = d.updatedBy;
  return base;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsvCell(val: unknown): string {
  const str = String(val ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportObjectsAsCsv(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(toCsvCell).join(','),
    ...rows.map((r) => headers.map((h) => toCsvCell(r[h])).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  downloadBlob(blob, filename);
}

function exportObjectsAsXlsx(
  rows: Record<string, unknown>[],
  sheetName: string,
  filename: string
): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    worksheet['!cols'] = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => String(r[key] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 3, 12), 42) };
    });
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportFullXlsx(
  delegates: Delegate[],
  partners: PartnerCompany[],
  scopeSlug: string,
  customTicketFields: CustomTicketField[] = []
): number {
  const rows = delegates.map((d) => formatFullRow(d, partners, customTicketFields));
  exportObjectsAsXlsx(rows, 'Delegates', `PCE_AUS_2026_${scopeSlug}_Full_${dateStamp()}.xlsx`);
  return rows.length;
}

export function exportFullCsv(
  delegates: Delegate[],
  partners: PartnerCompany[],
  scopeSlug: string,
  customTicketFields: CustomTicketField[] = []
): number {
  const rows = delegates.map((d) => formatFullRow(d, partners, customTicketFields));
  exportObjectsAsCsv(rows, `PCE_AUS_2026_${scopeSlug}_Full_${dateStamp()}.csv`);
  return rows.length;
}

export function exportCateringReport(delegates: Delegate[], partners: PartnerCompany[], scopeSlug: string): number {
  const filtered = delegates.filter((d) => d.hasDietary || d.awardsNightDinner);
  if (filtered.length === 0) return 0;

  const rows = filtered.map((d) => ({
    'Partner Account': getPartnerName(d.partnerId, partners),
    'First Name': d.firstName,
    'Last Name': d.lastName,
    Company: d.company,
    Email: d.email,
    'Awards Night Dinner': yn(d.awardsNightDinner),
    'Day 1 Workshop': yn(d.day1Workshop),
    'Day 2': yn(d.day2),
    'Day 3': yn(d.day3),
    'Has Dietary Requirement': yn(d.hasDietary),
    'Dietary Specification': d.dietaryDetails || 'Standard Menu',
  }));
  exportObjectsAsXlsx(rows, 'Catering Report', `PCE_AUS_2026_${scopeSlug}_Catering_${dateStamp()}.xlsx`);
  return rows.length;
}

export function exportBadgePrintingCsv(delegates: Delegate[], scopeSlug: string): number {
  if (delegates.length === 0) return 0;
  const rows = delegates.map((d) => ({
    'First Name': d.firstName,
    'Last Name': d.lastName,
    'Job Title': d.jobTitle,
    Company: d.company,
    Category: d.registrationCategory,
  }));
  exportObjectsAsCsv(rows, `PCE_AUS_2026_${scopeSlug}_Badges_${dateStamp()}.csv`);
  return rows.length;
}

export function exportMarketingOptIn(delegates: Delegate[], partners: PartnerCompany[], scopeSlug: string): number {
  const filtered = delegates.filter((d) => d.newsletterOptIn || d.shareDetailsWithPartners);
  if (filtered.length === 0) return 0;

  const rows = filtered.map((d) => ({
    'Partner Account': getPartnerName(d.partnerId, partners),
    'First Name': d.firstName,
    'Last Name': d.lastName,
    'Job Title': d.jobTitle,
    Company: d.company,
    Country: d.country,
    Email: d.email,
    Industry: d.industry,
    'Experience Level': d.experienceLevel,
    'Share Details With Partners': yn(d.shareDetailsWithPartners),
    'Newsletter Opt-In': yn(d.newsletterOptIn),
  }));
  exportObjectsAsXlsx(rows, 'Marketing Opt-In', `PCE_AUS_2026_${scopeSlug}_Marketing_OptIn_${dateStamp()}.xlsx`);
  return rows.length;
}

export function downloadExcelTemplate(defaultCompany: string): void {
  const sampleRow: Record<string, string> = {
    'Partner Account': defaultCompany,
    'Stand / Booth #': 'Booth A12',
    'Partner Tier': 'Platinum Partner',
    'First Name': 'Jordan',
    'Last Name': 'Taylor',
    'Job Title': 'Senior Project Controls Engineer',
    Company: defaultCompany,
    Country: 'Australia',
    Email: 'j.taylor@example.com.au',
    'Registration Category': 'Partner',
    Phone: '+61 400 123 456',
    'Awards Night Dinner': 'Yes',
    'Day 1 Workshop': 'Yes',
    'Day 2': 'Yes',
    'Day 3': 'Yes',
    'Stadium Tour': 'No',
    'Has Dietary': 'Yes',
    'Dietary Details': 'Vegetarian',
    'Experience Level': 'Senior Management',
    Industry: 'Infrastructure',
    'Promo Code': 'PCE26-PARTNER',
    'Share Details With Partners': 'Yes',
    'Newsletter Opt-In': 'Yes',
  };
  exportObjectsAsXlsx([sampleRow], 'Delegate Template', 'PCE_AUS_2026_Delegates_Template.xlsx');
}

export function downloadPartnerDirectoryTemplate(): void {
  const sampleRows = [
    {
      'Partner Company': 'Horizon Infrastructure Pty Ltd',
      'Sponsorship Tier': 'Gold Partner',
      'Stand / Booth #': 'Booth C08',
      'Complimentary Pass Quota': 6,
      'Awards Night Seat Quota': 2,
      'Primary Contact Name': 'Alex Rivera',
      'Partner Admin Email': 'partner@horizoninfra.com.au',
      'Temporary Password': 'partner123',
    },
    {
      'Partner Company': 'Apex Rail Controls',
      'Sponsorship Tier': 'Silver Partner',
      'Stand / Booth #': 'Booth D14',
      'Complimentary Pass Quota': 4,
      'Awards Night Seat Quota': 2,
      'Primary Contact Name': 'Maya Patel',
      'Partner Admin Email': 'events@apexrail.com.au',
      'Temporary Password': 'partner123',
    },
  ];
  exportObjectsAsXlsx(sampleRows, 'Partner Directory', 'PCE_AUS_2026_Partners_Template.xlsx');
}
