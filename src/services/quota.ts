import { Delegate, PartnerCompany } from '../types';

export interface QuotaSummary {
  totalDelegates: number;
  complimentaryQuota: number;
  complimentaryUsed: number;
  chargeableExtras: number;
  awardsQuota: number;
  awardsUsed: number;
  awardsOverQuota: number;
  day1WorkshopCount: number;
  day2Count: number;
  day3Count: number;
  stadiumTourCount: number;
  dietaryCount: number;
}

/**
 * Automated Business Rule:
 * Recomputes `ticketType` ('Complimentary' | 'Chargeable Extra') per partner
 * based on registration creation order vs the partner's configured complimentary pass quota.
 */
export function recalculateTicketTypes(
  delegates: Delegate[],
  partners: PartnerCompany[]
): Delegate[] {
  const quotaByPartner = new Map<string, number>();
  for (const p of partners) {
    quotaByPartner.set(p.id, Math.max(0, p.complimentaryQuota));
  }

  // Track order per partner preserving existing array sequence
  const countByPartner = new Map<string, number>();

  return delegates.map((delegate) => {
    const quota = quotaByPartner.get(delegate.partnerId) ?? 0;
    const currentIndex = countByPartner.get(delegate.partnerId) ?? 0;
    countByPartner.set(delegate.partnerId, currentIndex + 1);

    const nextType = currentIndex < quota ? 'Complimentary' : 'Chargeable Extra';
    if (delegate.ticketType === nextType) return delegate;
    return { ...delegate, ticketType: nextType };
  });
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
  let chargeableExtras = 0;
  let awardsUsed = 0;
  let day1WorkshopCount = 0;
  let day2Count = 0;
  let day3Count = 0;
  let stadiumTourCount = 0;
  let dietaryCount = 0;

  for (const d of scopedDelegates) {
    if (d.ticketType === 'Chargeable Extra') {
      chargeableExtras += 1;
    } else {
      complimentaryUsed += 1;
    }
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
    chargeableExtras,
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
