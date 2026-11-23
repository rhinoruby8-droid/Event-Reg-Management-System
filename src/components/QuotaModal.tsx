import React, { useEffect, useState } from 'react';
import { Plus, SlidersHorizontal, Ticket, X } from 'lucide-react';
import { computePartnerDayPoolUsage, DAY_TICKET_KEYS } from '../services/quota';
import {
  CustomTicketField,
  DEFAULT_COLUMN_TITLES,
  Delegate,
  PartnerCompany,
} from '../types';

export interface PartnerQuotaUpdate {
  partnerId: string;
  complimentaryQuota: number;
  awardsQuota: number;
  ticketQuotas: Record<string, number>;
  categoryQuotas: Record<string, number>;
}

interface QuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  partners: PartnerCompany[];
  delegates: Delegate[];
  customTicketFields: CustomTicketField[];
  ticketCategories: string[];
  columnTitles: Record<string, string>;
  onSaveQuotas: (updates: PartnerQuotaUpdate[]) => void;
  onOpenAddPartner: () => void;
  onOpenAddTicketType: () => void;
}

interface PartnerDraft {
  complimentaryQuota: number;
  awardsQuota: number;
  /** string values so blank = Flexible / No per-day cap, numeric = enforced cap */
  ticketQuotas: Record<string, string>;
  categoryQuotas: Record<string, string>;
}

const COMP_POOL_DAY_TICKETS: {
  key: (typeof DAY_TICKET_KEYS)[number];
  fallbackLabel: string;
}[] = [
  { key: 'day1Workshop', fallbackLabel: 'Day 1 Workshop' },
  { key: 'day2', fallbackLabel: 'Day 2' },
  { key: 'day3', fallbackLabel: 'Day 3' },
];

function cleanHeaderTitle(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  return raw.replace(/^\d+\.\s*/, '').trim() || fallback;
}

function parseOptionalQuotas(map: Record<string, string>): Record<string, number> {
  const cleaned: Record<string, number> = {};
  for (const [key, raw] of Object.entries(map)) {
    const trimmed = raw.trim();
    if (trimmed !== '') {
      const num = Math.max(0, parseInt(trimmed, 10));
      if (!Number.isNaN(num)) {
        cleaned[key] = num;
      }
    }
  }
  return cleaned;
}

export const QuotaModal: React.FC<QuotaModalProps> = ({
  isOpen,
  onClose,
  eventName,
  partners,
  delegates,
  customTicketFields,
  ticketCategories,
  columnTitles,
  onSaveQuotas,
  onOpenAddPartner,
  onOpenAddTicketType,
}) => {
  const [drafts, setDrafts] = useState<Record<string, PartnerDraft>>({});

  useEffect(() => {
    if (isOpen) {
      const next: Record<string, PartnerDraft> = {};
      for (const p of partners) {
        const ticketQuotasStr: Record<string, string> = {};
        if (p.ticketQuotas) {
          for (const [k, v] of Object.entries(p.ticketQuotas)) {
            if (typeof v === 'number' && !Number.isNaN(v)) {
              ticketQuotasStr[k] = String(v);
            }
          }
        }
        const categoryQuotasStr: Record<string, string> = {};
        if (p.categoryQuotas) {
          for (const [k, v] of Object.entries(p.categoryQuotas)) {
            if (typeof v === 'number' && !Number.isNaN(v)) {
              categoryQuotasStr[k] = String(v);
            }
          }
        }
        next[p.id] = {
          complimentaryQuota: p.complimentaryQuota,
          awardsQuota: p.awardsQuota,
          ticketQuotas: ticketQuotasStr,
          categoryQuotas: categoryQuotasStr,
        };
      }
      setDrafts(next);
    }
  }, [isOpen, partners, customTicketFields, ticketCategories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: PartnerQuotaUpdate[] = partners.map((p) => {
      const draft = drafts[p.id];
      return {
        partnerId: p.id,
        complimentaryQuota: Math.max(
          0,
          draft?.complimentaryQuota ?? p.complimentaryQuota
        ),
        awardsQuota: Math.max(0, draft?.awardsQuota ?? p.awardsQuota),
        ticketQuotas: parseOptionalQuotas(draft?.ticketQuotas || {}),
        categoryQuotas: parseOptionalQuotas(draft?.categoryQuotas || {}),
      };
    });
    onSaveQuotas(updates);
    onClose();
  };

  const awardsLabel = cleanHeaderTitle(
    columnTitles.awardsNightDinner || DEFAULT_COLUMN_TITLES.awardsNightDinner,
    'Awards Night'
  );
  const stadiumLabel = cleanHeaderTitle(
    columnTitles.stadiumTour || DEFAULT_COLUMN_TITLES.stadiumTour,
    'Stadium Tour'
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <h2 id="quota-modal-title" className="text-base font-bold text-slate-900">
                Partner Pass &amp; Ticket Quotas — {eventName}
              </h2>
              <p className="text-xs text-slate-500">
                Complimentary Tickets are the partner&apos;s total pool divided across Day 1, Day 2 &amp; Day 3. Tickets beyond the comp pool are automatically marked Payable.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {partners.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-300 rounded-xl text-xs text-slate-500">
              No partner companies in {eventName} yet. Add a partner first to configure their ticket quotas.
            </div>
          ) : (
            partners.map((partner) => {
              const partnerDelegates = delegates.filter(
                (d) => d.partnerId === partner.id
              );
              const draft = drafts[partner.id] || {
                complimentaryQuota: partner.complimentaryQuota,
                awardsQuota: partner.awardsQuota,
                ticketQuotas: {},
                categoryQuotas: {},
              };

              const parsedTicketQuotas = parseOptionalQuotas(draft.ticketQuotas);
              const poolUsage = computePartnerDayPoolUsage(
                {
                  id: partner.id,
                  complimentaryQuota: draft.complimentaryQuota,
                  ticketQuotas: parsedTicketQuotas,
                },
                partnerDelegates
              );

              // Calculate how the admin has divided the Comp Pool across Day 1 / Day 2 / Day 3
              const hasAnyDaySplit = COMP_POOL_DAY_TICKETS.some(
                (item) => (draft.ticketQuotas[item.key] ?? '').trim() !== ''
              );
              const daySplitAllocated = COMP_POOL_DAY_TICKETS.reduce((sum, item) => {
                const raw = (draft.ticketQuotas[item.key] ?? '').trim();
                if (raw === '') return sum;
                const parsed = Math.max(0, parseInt(raw, 10));
                return sum + (Number.isNaN(parsed) ? 0 : parsed);
              }, 0);
              const splitBalance = draft.complimentaryQuota - daySplitAllocated;
              const isSplitOverComp = hasAnyDaySplit && splitBalance < 0;

              const awardsUsed = partnerDelegates.filter(
                (d) => d.awardsNightDinner
              ).length;
              const stadiumUsed = partnerDelegates.filter((d) => d.stadiumTour).length;
              const stadiumValStr = draft.ticketQuotas.stadiumTour ?? '';
              const stadiumCap =
                stadiumValStr.trim() !== '' ? parseInt(stadiumValStr, 10) : null;
              const isStadiumOver =
                stadiumCap !== null &&
                !Number.isNaN(stadiumCap) &&
                stadiumUsed > stadiumCap;

              const handleAutoSplit = () => {
                const total = Math.max(0, draft.complimentaryQuota);
                const base = Math.floor(total / 3);
                const rem = total % 3;
                setDrafts((prev) => ({
                  ...prev,
                  [partner.id]: {
                    ...draft,
                    ticketQuotas: {
                      ...draft.ticketQuotas,
                      day1Workshop: String(base),
                      day2: String(base + (rem >= 2 ? 1 : 0)),
                      day3: String(base + (rem >= 1 ? 1 : 0)),
                    },
                  },
                }));
              };

              const handleClearSplit = () => {
                const nextTicketQuotas = { ...draft.ticketQuotas };
                delete nextTicketQuotas.day1Workshop;
                delete nextTicketQuotas.day2;
                delete nextTicketQuotas.day3;
                setDrafts((prev) => ({
                  ...prev,
                  [partner.id]: {
                    ...draft,
                    ticketQuotas: nextTicketQuotas,
                  },
                }));
              };

              return (
                <div
                  key={partner.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  {/* Partner Header Row */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {partner.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{partner.tier}</span>
                        <span aria-hidden="true">·</span>
                        <span>{partner.standNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-700">
                          {partnerDelegates.length}{' '}
                          {partnerDelegates.length === 1 ? 'delegate' : 'delegates'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-700">
                          {poolUsage.totalDayTickets} day{' '}
                          {poolUsage.totalDayTickets === 1 ? 'ticket' : 'tickets'} used
                        </span>
                      </div>
                    </div>

                    {poolUsage.payableTickets > 0 ? (
                      <div className="text-xs text-amber-700 font-semibold font-mono tabular-nums">
                        → +{poolUsage.payableTickets} Payable{' '}
                        {poolUsage.payableTickets === 1 ? 'Ticket' : 'Tickets'}
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-700 font-semibold font-mono tabular-nums">
                        {poolUsage.compRemaining} Comp{' '}
                        {poolUsage.compRemaining === 1 ? 'Ticket' : 'Tickets'} Left
                      </div>
                    )}
                  </div>

                  {/* Ticket Quotas Body */}
                  <div className="p-4 space-y-4">
                    {/* Group 1: Complimentary Ticket Pool (Divided across Day 1, Day 2, Day 3) */}
                    <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/30 p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                            Complimentary Ticket Pool (Day 1 + Day 2 + Day 3)
                          </span>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Each Day 1, Day 2 &amp; Day 3 ticket deducts from Total Comp Tickets. Extra tickets beyond the pool become Payable.
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleAutoSplit}
                            className="h-7 px-2.5 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors"
                          >
                            Auto-Split Days
                          </button>
                          {hasAnyDaySplit && (
                            <button
                              type="button"
                              onClick={handleClearSplit}
                              className="h-7 px-2.5 text-[11px] font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
                            >
                              Flexible Pool
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Live Pool Allocation & Deduction Equation Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md bg-white border border-slate-200 text-xs">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-slate-600">
                            Total Comp:{' '}
                            <strong className="font-mono tabular-nums text-slate-900">
                              {draft.complimentaryQuota}
                            </strong>
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            −
                          </span>
                          {hasAnyDaySplit ? (
                            <>
                              <span className="text-slate-600">
                                Divided (D1+D2+D3):{' '}
                                <strong className="font-mono tabular-nums text-slate-900">
                                  {daySplitAllocated}
                                </strong>
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                =
                              </span>
                              {isSplitOverComp ? (
                                <span className="font-mono tabular-nums font-semibold text-amber-700">
                                  Exceeds Comp by +{Math.abs(splitBalance)} (Payable)
                                </span>
                              ) : splitBalance === 0 ? (
                                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                                  0 Remaining (Fully Divided)
                                </span>
                              ) : (
                                <span className="font-mono tabular-nums font-semibold text-indigo-700">
                                  {splitBalance} Unallocated Comp Left
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-500">
                              Flexible — partner can divide {draft.complimentaryQuota} tickets freely across Day 1, Day 2 &amp; Day 3
                            </span>
                          )}
                        </div>

                        <div className="font-mono tabular-nums text-[11px]">
                          <span className="text-slate-500">Roster Used: </span>
                          <span
                            className={
                              poolUsage.payableTickets > 0
                                ? 'font-semibold text-amber-700'
                                : 'font-semibold text-slate-900'
                            }
                          >
                            {poolUsage.compUsed}/{draft.complimentaryQuota} Comp
                          </span>
                          {poolUsage.payableTickets > 0 && (
                            <span className="ml-1.5 font-semibold text-amber-700">
                              (+{poolUsage.payableTickets} Payable)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 4 Inputs: Total Comp Pool + Day 1 + Day 2 + Day 3 */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Total Complimentary Pool */}
                        <div className="p-2.5 rounded-lg border border-indigo-300 bg-white">
                          <label
                            htmlFor={`comp-${partner.id}`}
                            className="block text-[11px] font-bold text-indigo-900 truncate"
                            title="Total Complimentary Tickets Pool"
                          >
                            Total Comp Tickets
                          </label>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <input
                              id={`comp-${partner.id}`}
                              type="number"
                              min={0}
                              max={500}
                              value={draft.complimentaryQuota}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [partner.id]: {
                                    ...draft,
                                    complimentaryQuota: Math.max(
                                      0,
                                      parseInt(e.target.value || '0', 10)
                                    ),
                                  },
                                }))
                              }
                              className="w-20 h-8 px-2 font-mono tabular-nums text-xs font-semibold bg-white border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                            />
                            <div className="text-right leading-tight">
                              <div
                                className={`text-[11px] font-mono tabular-nums ${
                                  poolUsage.payableTickets > 0
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-slate-600'
                                }`}
                              >
                                Used: {poolUsage.totalDayTickets}
                              </div>
                              <div
                                className={`text-[10px] font-mono tabular-nums ${
                                  poolUsage.payableTickets > 0
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {poolUsage.payableTickets > 0
                                  ? `+${poolUsage.payableTickets} Pay`
                                  : `${poolUsage.compRemaining} left`}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Day 1, Day 2, Day 3 Split Inputs */}
                        {COMP_POOL_DAY_TICKETS.map((item) => {
                          const label = cleanHeaderTitle(
                            columnTitles[item.key] || DEFAULT_COLUMN_TITLES[item.key],
                            item.fallbackLabel
                          );
                          const used =
                            item.key === 'day1Workshop'
                              ? poolUsage.day1Used
                              : item.key === 'day2'
                              ? poolUsage.day2Used
                              : poolUsage.day3Used;
                          const valStr = draft.ticketQuotas[item.key] ?? '';
                          const numericCap =
                            valStr.trim() !== '' ? parseInt(valStr, 10) : null;
                          const isOver =
                            numericCap !== null &&
                            !Number.isNaN(numericCap) &&
                            used > numericCap;

                          return (
                            <div
                              key={item.key}
                              className="p-2.5 rounded-lg border border-slate-200 bg-white"
                            >
                              <label
                                htmlFor={`tkt-${partner.id}-${item.key}`}
                                className="block text-[11px] font-semibold text-slate-800 truncate"
                                title={`${label} (deducted from Comp Tickets)`}
                              >
                                {label}
                              </label>
                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <input
                                  id={`tkt-${partner.id}-${item.key}`}
                                  type="number"
                                  min={0}
                                  max={500}
                                  placeholder="Flex"
                                  value={valStr}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [partner.id]: {
                                        ...draft,
                                        ticketQuotas: {
                                          ...draft.ticketQuotas,
                                          [item.key]: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="w-20 h-8 px-2 font-mono tabular-nums text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                                />
                                <div className="text-right leading-tight">
                                  <div
                                    className={`text-[11px] font-mono tabular-nums ${
                                      isOver
                                        ? 'text-amber-700 font-semibold'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    Used: {used}
                                  </div>
                                  {numericCap !== null && !Number.isNaN(numericCap) && (
                                    <div
                                      className={`text-[10px] font-mono tabular-nums ${
                                        isOver
                                          ? 'text-amber-700 font-semibold'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {isOver
                                        ? `+${used - numericCap} Pay`
                                        : `${Math.max(0, numericCap - used)} left`}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group 2: Additional Event Tickets & Dynamic Custom Tickets */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Additional Event &amp; Custom Ticket Types
                        </span>
                        <span className="text-[11px] text-slate-400">
                          New Super Admin ticket columns appear here automatically
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {/* Awards Night Dinner */}
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                          <label
                            htmlFor={`awards-${partner.id}`}
                            className="block text-[11px] font-semibold text-slate-800 truncate"
                            title={awardsLabel}
                          >
                            {awardsLabel}
                          </label>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <input
                              id={`awards-${partner.id}`}
                              type="number"
                              min={0}
                              max={500}
                              value={draft.awardsQuota}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [partner.id]: {
                                    ...draft,
                                    awardsQuota: Math.max(
                                      0,
                                      parseInt(e.target.value || '0', 10)
                                    ),
                                  },
                                }))
                              }
                              className="w-20 h-8 px-2 font-mono tabular-nums text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                            />
                            <span
                              className={`text-[11px] font-mono tabular-nums ${
                                awardsUsed > draft.awardsQuota
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-slate-500'
                              }`}
                            >
                              Used: {awardsUsed}
                            </span>
                          </div>
                        </div>

                        {/* Stadium Tour */}
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                          <label
                            htmlFor={`tkt-${partner.id}-stadiumTour`}
                            className="block text-[11px] font-semibold text-slate-700 truncate"
                            title={stadiumLabel}
                          >
                            {stadiumLabel}
                          </label>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <input
                              id={`tkt-${partner.id}-stadiumTour`}
                              type="number"
                              min={0}
                              max={500}
                              placeholder="Any"
                              value={stadiumValStr}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [partner.id]: {
                                    ...draft,
                                    ticketQuotas: {
                                      ...draft.ticketQuotas,
                                      stadiumTour: e.target.value,
                                    },
                                  },
                                }))
                              }
                              className="w-20 h-8 px-2 font-mono tabular-nums text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                            />
                            <span
                              className={`text-[11px] font-mono tabular-nums ${
                                isStadiumOver
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-slate-500'
                              }`}
                            >
                              Used: {stadiumUsed}
                            </span>
                          </div>
                        </div>

                        {/* Dynamic Custom Ticket Columns Added by Super Admin */}
                        {customTicketFields.map((ticket) => {
                          const used = partnerDelegates.filter((d) =>
                            Boolean(d.customTickets?.[ticket.id])
                          ).length;
                          const valStr = draft.ticketQuotas[ticket.id] ?? '';
                          const numericCap =
                            valStr.trim() !== '' ? parseInt(valStr, 10) : null;
                          const isOver =
                            numericCap !== null &&
                            !Number.isNaN(numericCap) &&
                            used > numericCap;

                          return (
                            <div
                              key={ticket.id}
                              className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/30"
                            >
                              <label
                                htmlFor={`tkt-${partner.id}-${ticket.id}`}
                                className="block text-[11px] font-semibold text-indigo-900 truncate"
                                title={`${ticket.label} (Custom Ticket)`}
                              >
                                {ticket.label}
                              </label>
                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <input
                                  id={`tkt-${partner.id}-${ticket.id}`}
                                  type="number"
                                  min={0}
                                  max={500}
                                  placeholder="Any"
                                  value={valStr}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [partner.id]: {
                                        ...draft,
                                        ticketQuotas: {
                                          ...draft.ticketQuotas,
                                          [ticket.id]: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="w-20 h-8 px-2 font-mono tabular-nums text-xs bg-white border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                                />
                                <span
                                  className={`text-[11px] font-mono tabular-nums ${
                                    isOver
                                      ? 'text-amber-700 font-semibold'
                                      : 'text-indigo-700'
                                  }`}
                                >
                                  Used: {used}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group 3: Pass / Registration Categories (Auto-synced with Super Admin categories) */}
                    {ticketCategories.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Pass Categories ({ticketCategories.length})
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Optional cap per registration category
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {ticketCategories.map((category) => {
                            const used = partnerDelegates.filter(
                              (d) =>
                                d.registrationCategory.toLowerCase() ===
                                category.toLowerCase()
                            ).length;
                            const valStr = draft.categoryQuotas[category] ?? '';
                            const numericCap =
                              valStr.trim() !== '' ? parseInt(valStr, 10) : null;
                            const isOver =
                              numericCap !== null &&
                              !Number.isNaN(numericCap) &&
                              used > numericCap;

                            return (
                              <div
                                key={category}
                                className="p-2.5 rounded-lg border border-slate-200 bg-white"
                              >
                                <label
                                  htmlFor={`cat-${partner.id}-${category}`}
                                  className="block text-[11px] font-semibold text-slate-700 truncate"
                                  title={category}
                                >
                                  {category}
                                </label>
                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                  <input
                                    id={`cat-${partner.id}-${category}`}
                                    type="number"
                                    min={0}
                                    max={500}
                                    placeholder="Any"
                                    value={valStr}
                                    onChange={(e) =>
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [partner.id]: {
                                          ...draft,
                                          categoryQuotas: {
                                            ...draft.categoryQuotas,
                                            [category]: e.target.value,
                                          },
                                        },
                                      }))
                                    }
                                    className="w-20 h-8 px-2 font-mono tabular-nums text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                                  />
                                  <span
                                    className={`text-[11px] font-mono tabular-nums ${
                                      isOver
                                        ? 'text-amber-700 font-semibold'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    Used: {used}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddPartner();
              }}
              className="h-9 px-3.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Partner
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddTicketType();
              }}
              className="h-9 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <Ticket className="w-3.5 h-3.5 text-indigo-600" />
              Add Ticket Type
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={partners.length === 0}
              className="h-9 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              Save Quotas &amp; Recalculate
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
