export type UserRole = 'super_admin' | 'event_coordinator' | 'partner_admin';

export type RegistrationCategory = string;

export interface EventItem {
  id: string;
  name: string;
  fullName: string;
  city: string;
  venue: string;
  dates: string;
  status: 'active' | 'upcoming' | 'completed';
  isGlobalFrozen: boolean;
}

export interface CustomTicketField {
  id: string;
  label: string;
  showInKpi: boolean;
  createdAt: string;
  eventId?: string;
}

export type ExperienceLevel =
  | 'Executive/Decision Maker'
  | 'Senior Management'
  | 'Mid-level Management'
  | 'Technical/Specialist'
  | 'Entry Level';

export type IndustryOption =
  | 'Consulting'
  | 'Building'
  | 'Infrastructure'
  | 'Mining'
  | 'Oil & Gas'
  | 'Software/Tech'
  | 'Government'
  | 'Other';

export type TicketType = 'Complimentary' | 'Chargeable Extra';

export interface PartnerCompany {
  id: string;
  eventId: string;
  name: string;
  tier: string;
  standNumber: string;
  complimentaryQuota: number;
  awardsQuota: number;
  primaryContactEmail: string;
}

export interface UserAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  eventId: string | null; // null for Super Admin (all events); string for Event Coordinator and Partner Admin
  eventName?: string;
  partnerId: string | null; // null for Super Admin & Event Coordinator; string for Partner Admin
  partnerName?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  eventId: string | null;
  eventName?: string;
  partnerId: string | null;
  partnerName?: string;
}

/**
 * Exact 20-column Delegate schema plus internal metadata fields.
 */
export interface Delegate {
  // 20 Registration Fields
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  country: string;
  email: string;
  registrationCategory: RegistrationCategory;
  phone: string;
  awardsNightDinner: boolean;
  day1Workshop: boolean;
  day2: boolean;
  day3: boolean;
  stadiumTour: boolean;
  hasDietary: boolean;
  dietaryDetails: string;
  experienceLevel: ExperienceLevel;
  industry: IndustryOption;
  promoCode: string;
  shareDetailsWithPartners: boolean;
  newsletterOptIn: boolean;
  customTickets?: Record<string, boolean>;

  // Internal Metadata
  id: string;
  eventId: string;
  partnerId: string;
  isLocked: boolean;
  ticketType: TicketType;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type EditableDelegateField =
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

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOCK'
  | 'UNLOCK'
  | 'FREEZE'
  | 'UNFREEZE'
  | 'IMPORT'
  | 'QUOTA_UPDATE'
  | 'PARTNER_CREATE'
  | 'CONFIG_UPDATE'
  | 'EVENT_CREATE'
  | 'COORDINATOR_CREATE'
  | 'CHANGE_REQUEST'
  | 'RESOLVE_REQUEST';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: UserRole;
  action: AuditActionType;
  eventId?: string | null;
  partnerId: string | null;
  delegateId: string | null;
  delegateName: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  summary: string;
}

export interface ChangeRequest {
  id: string;
  eventId: string;
  delegateId: string;
  delegateName: string;
  partnerId: string;
  partnerName: string;
  requestedBy: string;
  note: string;
  createdAt: string;
  status: 'pending' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface PortalState {
  events: EventItem[];
  currentEventId: string;
  partners: PartnerCompany[];
  users: UserAccount[];
  delegates: Delegate[];
  auditLogs: AuditLogEntry[];
  changeRequests: ChangeRequest[];
  columnTitles: Record<string, string>;
  ticketCategories: string[];
  customTicketFields: CustomTicketField[];
  isGlobalFrozen: boolean;
  lastUpdated: string;
}

export const PARTNER_TIERS = [
  'Platinum Partner',
  'Gold Partner',
  'Silver Partner',
  'Bronze Partner',
  'Exhibitor',
  'Associate Sponsor',
] as const;

export type QuickFilter =
  | 'all'
  | 'dietary'
  | 'awards'
  | 'chargeable'
  | 'errors';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
}

export const REGISTRATION_CATEGORIES: RegistrationCategory[] = [
  'Partner',
  'Speaker',
  'Exhibitor',
  'VIP',
  'Delegate',
];

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'Executive/Decision Maker',
  'Senior Management',
  'Mid-level Management',
  'Technical/Specialist',
  'Entry Level',
];

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  'Consulting',
  'Building',
  'Infrastructure',
  'Mining',
  'Oil & Gas',
  'Software/Tech',
  'Government',
  'Other',
];

export const COUNTRY_OPTIONS: string[] = [
  'Australia',
  'New Zealand',
  'Singapore',
  'United Kingdom',
  'United States',
  'Canada',
  'United Arab Emirates',
  'Malaysia',
  'Indonesia',
  'India',
  'Japan',
  'Germany',
  'South Africa',
  'Other',
];

export const FIELD_LABELS: Record<EditableDelegateField, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  jobTitle: 'Job Title',
  company: 'Company',
  country: 'Country',
  email: 'Email',
  registrationCategory: 'Category',
  phone: 'Phone',
  awardsNightDinner: 'Awards Night Dinner',
  day1Workshop: 'Day 1 Workshop',
  day2: 'Day 2',
  day3: 'Day 3',
  stadiumTour: 'Stadium Tour',
  hasDietary: 'Dietary Req.',
  dietaryDetails: 'Dietary Details',
  experienceLevel: 'Experience Level',
  industry: 'Industry',
  promoCode: 'Promo Code',
  shareDetailsWithPartners: 'Share w/ Partners',
  newsletterOptIn: 'Newsletter Opt-In',
};

export const DEFAULT_COLUMN_TITLES: Record<EditableDelegateField, string> = {
  firstName: '1. First Name',
  lastName: '2. Last Name',
  jobTitle: '3. Job Title',
  company: '4. Company',
  country: '5. Country',
  email: '6. Email (Unique)',
  registrationCategory: '7. Category',
  phone: '8. Phone',
  awardsNightDinner: '9. Awards Night',
  day1Workshop: '10. Day 1 Wkshp',
  day2: '11. Day 2',
  day3: '12. Day 3',
  stadiumTour: '13. Stadium Tour',
  hasDietary: '14. Dietary?',
  dietaryDetails: '15. Dietary Details',
  experienceLevel: '16. Experience Level',
  industry: '17. Industry',
  promoCode: '18. Promo Code',
  shareDetailsWithPartners: '19. Share Partners',
  newsletterOptIn: '20. Newsletter',
};
