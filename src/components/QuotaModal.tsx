import React, { useEffect, useState } from 'react';
import { Plus, SlidersHorizontal, X } from 'lucide-react';
import { Delegate, PartnerCompany } from '../types';

interface QuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerCompany[];
  delegates: Delegate[];
  onSaveQuotas: (
    updates: { partnerId: string; complimentaryQuota: number; awardsQuota: number }[]
  ) => void;
  onOpenAddPartner: () => void;
}

export const QuotaModal: React.FC<QuotaModalProps> = ({
  isOpen,
  onClose,
  partners,
  delegates,
  onSaveQuotas,
  onOpenAddPartner,
}) => {
  const [drafts, setDrafts] = useState<
    Record<string, { complimentaryQuota: number; awardsQuota: number }>
  >({});

  useEffect(() => {
    if (isOpen) {
      const next: Record<string, { complimentaryQuota: number; awardsQuota: number }> = {};
      for (const p of partners) {
        next[p.id] = {
          complimentaryQuota: p.complimentaryQuota,
          awardsQuota: p.awardsQuota,
        };
      }
      setDrafts(next);
    }
  }, [isOpen, partners]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates = partners.map((p) => ({
      partnerId: p.id,
      complimentaryQuota: Math.max(0, drafts[p.id]?.complimentaryQuota ?? p.complimentaryQuota),
      awardsQuota: Math.max(0, drafts[p.id]?.awardsQuota ?? p.awardsQuota),
    }));
    onSaveQuotas(updates);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 id="quota-modal-title" className="text-base font-bold text-slate-900">
                Configure Partner Pass Quotas
              </h2>
              <p className="text-xs text-slate-500">
                Delegates exceeding a partner&apos;s complimentary quota are automatically badged as Chargeable Extra.
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

        <div className="p-6 divide-y divide-slate-200">
          {partners.map((partner) => {
            const partnerDelegates = delegates.filter((d) => d.partnerId === partner.id);
            const currentAwards = partnerDelegates.filter((d) => d.awardsNightDinner).length;
            const draft = drafts[partner.id] || {
              complimentaryQuota: partner.complimentaryQuota,
              awardsQuota: partner.awardsQuota,
            };
            const projectedExtras = Math.max(
              0,
              partnerDelegates.length - draft.complimentaryQuota
            );

            return (
              <div
                key={partner.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">{partner.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{partner.tier}</span>
                    <span aria-hidden="true">·</span>
                    <span>{partner.standNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {partnerDelegates.length} registered ({currentAwards} Awards)
                    </span>
                  </div>
                  {projectedExtras > 0 && (
                    <div className="text-xs text-amber-700 font-medium mt-1 font-mono tabular-nums">
                      → {projectedExtras} Chargeable {projectedExtras === 1 ? 'Extra' : 'Extras'} under this quota
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div>
                    <label
                      htmlFor={`comp-${partner.id}`}
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Complimentary Passes
                    </label>
                    <input
                      id={`comp-${partner.id}`}
                      type="number"
                      min={0}
                      max={200}
                      value={draft.complimentaryQuota}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [partner.id]: {
                            ...draft,
                            complimentaryQuota: Math.max(0, parseInt(e.target.value || '0', 10)),
                          },
                        }))
                      }
                      className="w-24 h-9 px-3 font-mono tabular-nums text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`awards-${partner.id}`}
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Awards Night Seats
                    </label>
                    <input
                      id={`awards-${partner.id}`}
                      type="number"
                      min={0}
                      max={100}
                      value={draft.awardsQuota}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [partner.id]: {
                            ...draft,
                            awardsQuota: Math.max(0, parseInt(e.target.value || '0', 10)),
                          },
                        }))
                      }
                      className="w-24 h-9 px-3 font-mono tabular-nums text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddPartner();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Partner</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Save Quotas &amp; Recalculate
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
