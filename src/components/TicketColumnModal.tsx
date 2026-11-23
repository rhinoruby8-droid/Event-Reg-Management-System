import React, { useEffect, useState } from 'react';
import {
  Columns3,
  Plus,
  RotateCcw,
  Tag,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import {
  CustomTicketField,
  DEFAULT_COLUMN_TITLES,
  EditableDelegateField,
  REGISTRATION_CATEGORIES,
} from '../types';

interface TicketColumnModalProps {
  isOpen: boolean;
  initialTab?: 'tickets' | 'categories' | 'titles';
  onClose: () => void;
  columnTitles: Record<string, string>;
  ticketCategories: string[];
  customTicketFields: CustomTicketField[];
  onAddCustomTicket: (label: string, showInKpi: boolean) => void;
  onUpdateCustomTicket: (
    ticketId: string,
    updates: { label?: string; showInKpi?: boolean }
  ) => void;
  onDeleteCustomTicket: (ticketId: string) => void;
  onSaveTicketCategories: (categories: string[]) => void;
  onSaveColumnTitles: (titles: Record<string, string>) => void;
}

const ORDERED_FIELDS: EditableDelegateField[] = [
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

export const TicketColumnModal: React.FC<TicketColumnModalProps> = ({
  isOpen,
  initialTab = 'tickets',
  onClose,
  columnTitles,
  ticketCategories,
  customTicketFields,
  onAddCustomTicket,
  onUpdateCustomTicket,
  onDeleteCustomTicket,
  onSaveTicketCategories,
  onSaveColumnTitles,
}) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'categories' | 'titles'>(
    initialTab
  );

  // Tab 1: New future ticket column
  const [newTicketLabel, setNewTicketLabel] = useState('');
  const [newTicketShowInKpi, setNewTicketShowInKpi] = useState(true);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // Tab 2: Ticket / Pass categories
  const [categoryDrafts, setCategoryDrafts] = useState<string[]>(ticketCategories);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Tab 3: Header Row Column Titles
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>(columnTitles);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCategoryDrafts([...ticketCategories]);
      setTitleDrafts({ ...DEFAULT_COLUMN_TITLES, ...columnTitles });
      setNewTicketLabel('');
      setNewTicketShowInKpi(true);
      setTicketError(null);
      setNewCategoryName('');
    }
  }, [isOpen, initialTab, ticketCategories, columnTitles]);

  if (!isOpen) return null;

  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);
    const trimmed = newTicketLabel.trim();
    if (!trimmed) {
      setTicketError('Enter a ticket or session title (e.g., VIP Networking Breakfast).');
      return;
    }
    if (
      customTicketFields.some(
        (t) => t.label.trim().toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setTicketError(`A ticket named "${trimmed}" already exists.`);
      return;
    }
    onAddCustomTicket(trimmed, newTicketShowInKpi);
    setNewTicketLabel('');
    setNewTicketShowInKpi(true);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (
      categoryDrafts.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    ) {
      return;
    }
    const next = [...categoryDrafts, trimmed];
    setCategoryDrafts(next);
    setNewCategoryName('');
    onSaveTicketCategories(next);
  };

  const handleRemoveCategory = (idx: number) => {
    if (categoryDrafts.length <= 1) return;
    const next = categoryDrafts.filter((_, i) => i !== idx);
    setCategoryDrafts(next);
    onSaveTicketCategories(next);
  };

  const handleSaveTitles = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: Record<string, string> = {};
    for (const field of ORDERED_FIELDS) {
      const val = (titleDrafts[field] ?? '').trim();
      cleaned[field] = val || DEFAULT_COLUMN_TITLES[field];
    }
    onSaveColumnTitles(cleaned);
    onClose();
  };

  const handleResetDefaultTitles = () => {
    setTitleDrafts({ ...DEFAULT_COLUMN_TITLES });
    onSaveColumnTitles({ ...DEFAULT_COLUMN_TITLES });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-column-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <h2 id="ticket-column-modal-title" className="text-base font-bold text-slate-900">
                Manage Tickets &amp; Header Row Titles
              </h2>
              <p className="text-xs text-slate-500">
                Add future event ticket columns, customize pass categories, or rename any column header title.
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

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="inline-flex flex-wrap p-1 bg-slate-200/70 rounded-lg gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'tickets'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Future Ticket Columns ({customTicketFields.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Pass Categories ({categoryDrafts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('titles')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'titles'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Header Row Titles</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Future Ticket Add-On Columns */}
        {activeTab === 'tickets' && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <form
              onSubmit={handleAddTicket}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="text-xs font-bold text-slate-900">
                Add New Event Ticket / Session Column
              </div>
              <p className="text-xs text-slate-500">
                Adds a new Yes/No toggle column to the delegate spreadsheet, Partner Quotas menu, Excel import mapper, full exports, and optionally the live KPI header bar.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={newTicketLabel}
                  onChange={(e) => setNewTicketLabel(e.target.value)}
                  placeholder="e.g., VIP Networking Breakfast, Day 4 Site Tour, Golf Day..."
                  className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                />
                <button
                  type="submit"
                  className="h-9 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Ticket Column</span>
                </button>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newTicketShowInKpi}
                  onChange={(e) => setNewTicketShowInKpi(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Show live headcount in the KPI bar above the grid</span>
              </label>

              {ticketError && (
                <div className="text-xs text-rose-600 font-medium">{ticketError}</div>
              )}
            </form>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-700">
                Added Ticket Columns ({customTicketFields.length})
              </div>
              {customTicketFields.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                  No custom future tickets added yet. Use the form above to add new event passes, workshops, or networking sessions anytime.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {customTicketFields.map((ticket, idx) => (
                    <div
                      key={ticket.id}
                      className="px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                          {21 + idx}.
                        </span>
                        <input
                          type="text"
                          value={ticket.label}
                          onChange={(e) =>
                            onUpdateCustomTicket(ticket.id, { label: e.target.value })
                          }
                          aria-label={`Edit title for ${ticket.label}`}
                          className="flex-1 h-8 px-2.5 text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-md focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={ticket.showInKpi}
                            onChange={(e) =>
                              onUpdateCustomTicket(ticket.id, {
                                showInKpi: e.target.checked,
                              })
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Show in KPI</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => onDeleteCustomTicket(ticket.id)}
                          title="Remove ticket column"
                          aria-label={`Remove ${ticket.label}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Pass Categories */}
        {activeTab === 'categories' && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <form
              onSubmit={handleAddCategory}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="text-xs font-bold text-slate-900">
                Add New Registration / Ticket Category
              </div>
              <p className="text-xs text-slate-500">
                Customize the ticket types available in the Category dropdown and Partner Quotas menu (e.g., Media, Sponsor VIP, Gala Only, Day Pass).
              </p>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Media, Gala Only, Student Pass..."
                  className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                />
                <button
                  type="submit"
                  className="h-9 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {categoryDrafts.map((cat, idx) => {
                const isDefault = REGISTRATION_CATEGORIES.includes(cat);
                return (
                  <div
                    key={`${cat}-${idx}`}
                    className="px-4 py-2.5 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{cat}</span>
                      {isDefault && (
                        <span className="text-[11px] text-slate-400">· Default</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={categoryDrafts.length <= 1}
                      onClick={() => handleRemoveCategory(idx)}
                      title="Remove category"
                      aria-label={`Remove ${cat}`}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Edit Header Row Titles */}
        {activeTab === 'titles' && (
          <form
            onSubmit={handleSaveTitles}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Rename any column header title displayed across the spreadsheet header row. You can also click the edit icon directly on any header cell in the grid.
                </p>
                <button
                  type="button"
                  onClick={handleResetDefaultTitles}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ORDERED_FIELDS.map((field) => (
                  <div key={field} className="space-y-1">
                    <label
                      htmlFor={`col-title-${field}`}
                      className="block text-[11px] font-medium text-slate-500"
                    >
                      Default: {DEFAULT_COLUMN_TITLES[field]}
                    </label>
                    <input
                      id={`col-title-${field}`}
                      type="text"
                      value={titleDrafts[field] ?? DEFAULT_COLUMN_TITLES[field]}
                      onChange={(e) =>
                        setTitleDrafts((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                      className="w-full h-9 px-3 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
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
                Save Header Row Titles
              </button>
            </div>
          </form>
        )}

        {/* Footer for Tabs 1 & 2 (live-saving tabs) */}
        {activeTab !== 'titles' && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
