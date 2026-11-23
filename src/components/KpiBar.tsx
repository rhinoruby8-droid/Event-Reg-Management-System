import React from 'react';
import { QuotaSummary } from '../services/quota';
import { CustomTicketField, Delegate } from '../types';

interface KpiBarProps {
  summary: QuotaSummary;
  scopedDelegates: Delegate[];
  customTicketFields: CustomTicketField[];
  scopeTitle: string;
  scopeMeta: string;
  validationErrorRows: number;
}

export const KpiBar: React.FC<KpiBarProps> = ({
  summary,
  scopedDelegates,
  customTicketFields,
  scopeTitle,
  scopeMeta,
  validationErrorRows,
}) => {
  const passRatio =
    summary.complimentaryQuota > 0
      ? Math.min(100, Math.round((summary.complimentaryUsed / summary.complimentaryQuota) * 100))
      : 100;

  const isQuotaFull = summary.complimentaryUsed >= summary.complimentaryQuota;
  const hasExtras = summary.chargeableExtras > 0;
  const isAwardsOver = summary.awardsOverQuota > 0;

  const kpiCustomTickets = customTicketFields.filter((t) => t.showInKpi);

  return (
    <section
      aria-label="Live Registration KPIs"
      className="bg-white border-b border-slate-200 px-5 lg:px-6 py-4"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Active Partner Scope & Pass Quota Progress */}
        <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8 min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">
              {scopeTitle}
            </h1>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{scopeMeta}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-700 font-medium">
                {summary.totalDelegates} {summary.totalDelegates === 1 ? 'Delegate' : 'Delegates'}
              </span>
              {validationErrorRows > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-rose-600 font-semibold font-mono tabular-nums">
                    {validationErrorRows} {validationErrorRows === 1 ? 'Row' : 'Rows'} with Errors
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="h-9 w-px bg-slate-200 hidden md:block shrink-0" />

          {/* Complimentary Pass Quota Bar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="flex items-baseline justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Complimentary Passes</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {summary.complimentaryUsed} / {summary.complimentaryQuota}
                {hasExtras && (
                  <span className="ml-1.5 text-amber-700">
                    (+{summary.chargeableExtras} Extra)
                  </span>
                )}
              </span>
            </div>
            <div
              className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={summary.complimentaryUsed}
              aria-valuemin={0}
              aria-valuemax={summary.complimentaryQuota}
              aria-label="Complimentary pass quota usage"
            >
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  hasExtras
                    ? 'bg-amber-500'
                    : isQuotaFull
                    ? 'bg-emerald-600'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${passRatio}%` }}
              />
            </div>
          </div>

          {/* Awards Night Quota */}
          <div className="shrink-0">
            <div className="text-xs text-slate-500">Awards Night Seats</div>
            <div className="mt-0.5 flex items-baseline gap-1.5 font-mono tabular-nums text-sm font-semibold">
              <span className={isAwardsOver ? 'text-amber-700' : 'text-slate-900'}>
                {summary.awardsUsed} / {summary.awardsQuota}
              </span>
              {isAwardsOver && (
                <span className="text-xs font-sans font-medium text-amber-700">
                  ({summary.awardsOverQuota} over)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Booth Rotation & Ticket Coverage */}
        <div className="flex items-center flex-wrap gap-x-5 gap-y-2 xl:border-l xl:border-slate-200 xl:pl-6">
          <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Booth Rotation
          </div>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-slate-500">Day 1 Workshop</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 text-sm">
                {summary.day1WorkshopCount}
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-slate-500">Day 2</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 text-sm">
                {summary.day2Count}
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-slate-500">Day 3</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 text-sm">
                {summary.day3Count}
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-slate-500">Awards Night</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 text-sm">
                {summary.awardsUsed}
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-slate-500">Stadium Tour</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 text-sm">
                {summary.stadiumTourCount}
              </span>
            </div>

            {kpiCustomTickets.map((ticket) => {
              const count = scopedDelegates.filter(
                (d) => Boolean(d.customTickets?.[ticket.id])
              ).length;
              return (
                <React.Fragment key={ticket.id}>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-indigo-700 font-medium">{ticket.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-indigo-900 text-sm">
                      {count}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
