import { Delegate, PartnerCompany } from '../types';

export const DAY_TICKET_KEYS = ['day1Workshop', 'day2', 'day3'] as const;
export type DayTicketKey = (typeof DAY_TICKET_KEYS)[number];

export interface PartnerDayPoolUsage {
  complimentaryQuota: number;
  totalDayTickets: number;
  compUsed: number;
  compRemaining: number;
  payableTickets: number;
  day1Used: number;
  day2Used: number;
  day3Used: number;
}

export interface QuotaSummary {
  totalDelegates: number;
  complimentaryQuota: number;
  complimentaryUsed: number;
  complimentaryRemaining: number;
  /** Total payable Day 1/2/3 tickets exceeding complimentary pool */
  payableTickets: number;
  /** Alias for payableTickets for compatibility */
  chargeableExtras: number;
  /** Number of delegate rows that contain at least 1 payable ticket */
  payableDelegateRows: number;
  totalDayTickets: number;
  awardsQuota: number;
  awardsUsed: number;
  awardsOverQuota: number;
  day1WorkshopCount: number;
  day2Count: number;
  day3Count: number;
  stadiumTourCount: number;
  dietaryCount: number;
}

export function getDelegateDayTicketCount(d: Delegate): number {
  return (d.day1Workshop ? 1 : 0) + (d.day2 ? 1 : 0) + (d.day3 ? 1 : 0);
}

/**
 * Automated Business Rule:
 * Each partner's `complimentaryQuota` is the total pool of complimentary tickets.
 * Users divide those tickets across Day 1, Day 2, and Day 3 on delegate rows — each
 * selected Day 1 / Day 2 / Day 3 ticket deducts 1 from the partner's complimentary pool
 * (and respects optional per-day comp caps if configured by Super Admin).
 * Any day tickets added beyond the complimentary pool (or per-day cap) are marked Payable
 * (`ticketType: 'Chargeable Extra'`, `payableTicketsCount > 0`).
 */
export function recalculateTicketTypes(
  delegates: Delegate[],
  partners: PartnerCompany[]
): Delegate[] {
  const partnerMap = new Map<string, PartnerCompany>();
  for (const p of partners) {
    partnerMap.set(p.id, p);
  }

  const remainingCompByPartner = new Map<string, number>();
  const remainingDayCapByPartner = new Map<string, Record<DayTicketKey, number>>();

  const initPartnerState = (partnerId: string) => {
    if (remainingCompByPartner.has(partnerId)) return;
    const partner = partnerMap.get(partnerId);
    const totalComp = Math.max(0, partner?.complimentaryQuota ?? 0);
    remainingCompByPartner.set(partnerId, totalComp);

    const tq = partner?.ticketQuotas;
    remainingDayCapByPartner.set(partnerId, {
      day1Workshop:
        tq && typeof tq.day1Workshop === 'number' && !Number.isNaN(tq.day1Workshop)
          ? Math.max(0, tq.day1Workshop)
          : Infinity,
      day2:
        tq && typeof tq.day2 === 'number' && !Number.isNaN(tq.day2)
          ? Math.max(0, tq.day2)
          : Infinity,
      day3:
        tq && typeof tq.day3 === 'number' && !Number.isNaN(tq.day3)
          ? Math.max(0, tq.day3)
          : Infinity,
    });
  };

  return delegates.map((delegate) => {
    initPartnerState(delegate.partnerId);

    let compLeft = remainingCompByPartner.get(delegate.partnerId) ?? 0;
    const dayCaps = remainingDayCapByPartner.get(delegate.partnerId)!;

    let rowComp = 0;
    let rowPayable = 0;

    for (const dayKey of DAY_TICKET_KEYS) {
      if (!delegate[dayKey]) continue;

      if (compLeft > 0 && dayCaps[dayKey] > 0) {
        rowComp += 1;
        compLeft -= 1;
        if (Number.isFinite(dayCaps[dayKey])) {
          dayCaps[dayKey] -= 1;
        }
      } else {
        rowPayable += 1;
      }
    }

    remainingCompByPartner.set(delegate.partnerId, compLeft);

    const nextType = rowPayable > 0 ? 'Chargeable Extra' : 'Complimentary';
    if (
      delegate.ticketType === nextType &&
      delegate.compTicketsUsed === rowComp &&
      delegate.payableTicketsCount === rowPayable
    ) {
      return delegate;
    }

    return {
      ...delegate,
      ticketType: nextType,
      compTicketsUsed: rowComp,
      payableTicketsCount: rowPayable,
    };
  });
}

/**
 * Computes day-ticket pool usage for a single partner against a given quota configuration
 * (also usable for live preview inside Partner Quotas modal before saving).
 */
export function computePartnerDayPoolUsage(
  partner: Pick<PartnerCompany, 'id' | 'complimentaryQuota' | 'ticketQuotas'>,
  partnerDelegates: Delegate[]
): PartnerDayPoolUsage {
  const complimentaryQuota = Math.max(0, partner.complimentaryQuota);
  let compLeft = complimentaryQuota;
  const tq = partner.ticketQuotas;
  const dayCaps: Record<DayTicketKey, number> = {
    day1Workshop:
      tq && typeof tq.day1Workshop === 'number' && !Number.isNaN(tq.day1Workshop)
        ? Math.max(0, tq.day1Workshop)
        : Infinity,
    day2:
      tq && typeof tq.day2 === 'number' && !Number.isNaN(tq.day2)
        ? Math.max(0, tq.day2)
        : Infinity,
    day3:
      tq && typeof tq.day3 === 'number' && !Number.isNaN(tq.day3)
        ? Math.max(0, tq.day3)
        : Infinity,
  };

  let compUsed = 0;
  let payableTickets = 0;
  let day1Used = 0;
  let day2Used = 0;
  let day3Used = 0;

  for (const d of partnerDelegates) {
    if (d.day1Workshop) day1Used += 1;
    if (d.day2) day2Used += 1;
    if (d.day3) day3Used += 1;

    for (const dayKey of DAY_TICKET_KEYS) {
      if (!d[dayKey]) continue;
      if (compLeft > 0 && dayCaps[dayKey] > 0) {
        compUsed += 1;
        compLeft -= 1;
        if (Number.isFinite(dayCaps[dayKey])) {
          dayCaps[dayKey] -= 1;
        }
      } else {
        payableTickets += 1;
      }
    }
  }

  return {
    complimentaryQuota,
    totalDayTickets: day1Used + day2Used + day3Used,
    compUsed,
    compRemaining: Math.max(0, complimentaryQuota - compUsed),
    payableTickets,
    day1Used,
    day2Used,
    day3Used,
  };
}

/**
 * Computes live dashboard KPIs for the currently visible partner scope.
 */
export function computeQuotaSummary(
  scopedDelegates: Delegate[],
  scopedPartners: PartnerCompany[]
): QuotaSummary {
  const complimentaryQuota = scopedPartners.reduce(
    (sum, p) => sum + Math.max(0, p.complimentaryQuota),
    0
  );
  const awardsQuota = scopedPartners.reduce(
    (sum, p) => sum + Math.max(0, p.awardsQuota),
    0
  );

  let complimentaryUsed = 0;
  let payableTickets = 0;
  let payableDelegateRows = 0;
  let awardsUsed = 0;
  let day1WorkshopCount = 0;
  let day2Count = 0;
  let day3Count = 0;
  let stadiumTourCount = 0;
  let dietaryCount = 0;

  for (const d of scopedDelegates) {
    const rowDayTotal = getDelegateDayTicketCount(d);
    const rowPayable =
      typeof d.payableTicketsCount === 'number'
        ? d.payableTicketsCount
        : d.ticketType === 'Chargeable Extra'
        ? rowDayTotal
        : 0;
    const rowComp =
      typeof d.compTicketsUsed === 'number'
        ? d.compTicketsUsed
        : Math.max(0, rowDayTotal - rowPayable);

    complimentaryUsed += rowComp;
    payableTickets += rowPayable;
    if (rowPayable > 0) payableDelegateRows += 1;

    if (d.awardsNightDinner) awardsUsed += 1;
    if (d.day1Workshop) day1WorkshopCount += 1;
    if (d.day2) day2Count += 1;
    if (d.day3) day3Count += 1;
    if (d.stadiumTour) stadiumTourCount += 1;
    if (d.hasDietary) dietaryCount += 1;
  }

  return {
    totalDelegates: scopedDelegates.length,
    complimentaryQuota,
    complimentaryUsed,
    complimentaryRemaining: Math.max(0, complimentaryQuota - complimentaryUsed),
    payableTickets,
    chargeableExtras: payableTickets,
    payableDelegateRows,
    totalDayTickets: day1WorkshopCount + day2Count + day3Count,
    awardsQuota,
    awardsUsed,
    awardsOverQuota: Math.max(0, awardsUsed - awardsQuota),
    day1WorkshopCount,
    day2Count,
    day3Count,
    stadiumTourCount,
    dietaryCount,
  };
}
