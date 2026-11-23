import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import { computePartnerDayPoolUsage } from '../services/quota';
import { Delegate, EventItem, PartnerCompany, UserAccount } from '../types';

interface CoordinatorWorkspaceProps {
  activeEvent: EventItem;
  assignedEvents: EventItem[];
  onSwitchEvent: (eventId: string) => void;
  partners: PartnerCompany[];
  delegates: Delegate[];
  users: UserAccount[];
  onOpenAddPartner: () => void;
  onOpenUploadPartners: () => void;
}

export const CoordinatorWorkspace: React.FC<CoordinatorWorkspaceProps> = ({
  activeEvent,
  assignedEvents,
  onSwitchEvent,
  partners,
  delegates,
  users,
  onOpenAddPartner,
  onOpenUploadPartners,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedUserIds, setRevealedUserIds] = useState<Record<string, boolean>>({});

  const totals = useMemo(() => {
    const totalCompPasses = partners.reduce(
      (sum, p) => sum + p.complimentaryQuota,
      0
    );
    const totalAwardsSeats = partners.reduce((sum, p) => sum + p.awardsQuota, 0);
    return {
      partnerCount: partners.length,
      totalCompPasses,
      totalAwardsSeats,
      delegateCount: delegates.length,
    };
  }, [partners, delegates]);

  const userByPartner = useMemo(() => {
    const map = new Map<string, UserAccount>();
    for (const u of users) {
      if (u.role === 'partner_admin' && u.partnerId) {
        map.set(u.partnerId, u);
      }
    }
    return map;
  }, [users]);

  const filteredPartners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const account = userByPartner.get(p.id);
      const haystack = `${p.name} ${p.tier} ${p.standNumber} ${p.primaryContactEmail} ${account?.name ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [partners, searchQuery, userByPartner]);

  const toggleReveal = (userId: string) => {
    setRevealedUserIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Event Context & Live Partner Onboarding KPIs */}
      <section
        aria-label="Event Partner Onboarding Summary"
        className="bg-white border-b border-slate-200 px-5 lg:px-6 py-4"
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                {activeEvent.name} — Partner Directory
              </h1>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-xs font-semibold text-indigo-700">
                Event Coordinator Workspace
              </span>
            </div>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
              <span>{activeEvent.fullName}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {activeEvent.city} ({activeEvent.venue})
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeEvent.dates}</span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 xl:border-l xl:border-slate-200 xl:pl-6 text-xs">
            <div>
              <div className="text-slate-500">Partners Onboarded</div>
              <div className="font-mono tabular-nums text-base font-bold text-slate-900 mt-0.5">
                {totals.partnerCount}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="text-slate-500">Comp Passes Allocated</div>
              <div className="font-mono tabular-nums text-base font-bold text-slate-900 mt-0.5">
                {totals.totalCompPasses}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="text-slate-500">Awards Seats Allocated</div>
              <div className="font-mono tabular-nums text-base font-bold text-slate-900 mt-0.5">
                {totals.totalAwardsSeats}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="text-slate-500">Registered Delegates</div>
              <div className="font-mono tabular-nums text-base font-bold text-slate-900 mt-0.5">
                {totals.delegateCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 lg:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-3 flex-1 min-w-0">
          {assignedEvents.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="coord-event-switcher"
                className="text-xs font-medium text-slate-600 whitespace-nowrap flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>My Events ({assignedEvents.length}):</span>
              </label>
              <select
                id="coord-event-switcher"
                value={activeEvent.id}
                onChange={(e) => onSwitchEvent(e.target.value)}
                className="h-9 px-2.5 text-xs font-semibold text-slate-900 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
              >
                {assignedEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.city.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search partner name, booth, tier, email..."
              aria-label="Search partners"
              className="w-full h-9 pl-9 pr-8 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Coordinator access is scoped strictly to adding partners for{' '}
              <strong className="text-slate-700">{activeEvent.name}</strong>.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenUploadPartners}
            className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Partner Excel</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddPartner}
            className="h-9 px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Partner</span>
          </button>
        </div>
      </div>

      {/* Main Partner Table */}
      <main className="flex-1 overflow-auto p-5 lg:p-6">
        {partners.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto mt-6">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900">
              No partners added to {activeEvent.name} yet
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Provision your first partner company manually or bulk upload a partner list from Excel. Each partner receives an isolated Partner Admin portal login automatically.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onOpenUploadPartners}
                className="h-9 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Partner Excel</span>
              </button>
              <button
                type="button"
                onClick={onOpenAddPartner}
                className="h-9 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Partner</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Partner Company</th>
                    <th className="px-4 py-3 whitespace-nowrap">Sponsorship Tier</th>
                    <th className="px-4 py-3 whitespace-nowrap">Stand / Booth</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">
                      Comp Ticket Pool
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">
                      Awards Seats
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">
                      Day Tickets Used
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Primary Contact</th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      Partner Admin Login Credentials
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPartners.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-xs text-slate-500"
                      >
                        No partners match &ldquo;{searchQuery}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredPartners.map((partner) => {
                      const account = userByPartner.get(partner.id);
                      const partnerDelegates = delegates.filter(
                        (d) => d.partnerId === partner.id
                      );
                      const poolUsage = computePartnerDayPoolUsage(
                        partner,
                        partnerDelegates
                      );
                      const isRevealed = account ? Boolean(revealedUserIds[account.id]) : false;

                      return (
                        <tr
                          key={partner.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                            {partner.name}
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                            {partner.tier}
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                            {partner.standNumber}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                            {partner.complimentaryQuota}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {partner.awardsQuota}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                            <span
                              className={
                                poolUsage.payableTickets > 0
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-slate-700'
                              }
                            >
                              {poolUsage.totalDayTickets}
                              {poolUsage.payableTickets > 0 &&
                                ` (+${poolUsage.payableTickets} Pay)`}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                            {account?.name || '—'}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-slate-800">
                                {account?.email || partner.primaryContactEmail}
                              </span>
                              {account && (
                                <>
                                  <span aria-hidden="true" className="text-slate-300">
                                    ·
                                  </span>
                                  <span className="text-slate-500">
                                    {isRevealed ? account.password : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleReveal(account.id)}
                                    aria-label={
                                      isRevealed ? 'Hide password' : 'Show password'
                                    }
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                    title={
                                      isRevealed
                                        ? 'Hide temporary password'
                                        : 'Reveal temporary password'
                                    }
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>
                Showing <strong className="font-mono tabular-nums text-slate-700">{filteredPartners.length}</strong> of{' '}
                <strong className="font-mono tabular-nums text-slate-700">{partners.length}</strong> partner companies in {activeEvent.name}
              </span>
              <span>
                Delegate registration rosters and quota overrides are managed by each Partner Admin and the Global Super Admin.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
