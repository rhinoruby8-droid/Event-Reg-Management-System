import React, { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  MailCheck,
  Plus,
  Search,
  Snowflake,
  Ticket,
  Unlock,
  Upload,
  Utensils,
  X,
} from 'lucide-react';
import { EventItem, PartnerCompany, QuickFilter } from '../types';

export type ExportReportType =
  | 'full_xlsx'
  | 'full_csv'
  | 'catering'
  | 'badges'
  | 'marketing';

interface WorkspaceToolbarProps {
  isAdmin: boolean;
  isGlobalFrozen: boolean;
  events: EventItem[];
  currentEventId: string;
  onSwitchEvent: (eventId: string) => void;
  onOpenAddEvent: () => void;
  partners: PartnerCompany[];
  selectedPartnerFilter: string; // 'all' or partnerId
  onChangePartnerFilter: (partnerId: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  activeFilter: QuickFilter;
  onChangeFilter: (f: QuickFilter) => void;
  filterCounts: Record<QuickFilter, number>;
  canCreate: boolean;
  onAddRow: () => void;
  onOpenAddPartner: () => void;
  onOpenTicketColumnModal: () => void;
  onOpenBulkPaste: () => void;
  onOpenExcelImport: () => void;
  onOpenRegAutoFill: () => void;
  onToggleGlobalFreeze: () => void;
  onExportReport: (type: ExportReportType) => void;
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  isAdmin,
  isGlobalFrozen,
  events,
  currentEventId,
  onSwitchEvent,
  onOpenAddEvent,
  partners,
  selectedPartnerFilter,
  onChangePartnerFilter,
  searchQuery,
  onChangeSearchQuery,
  activeFilter,
  onChangeFilter,
  filterCounts,
  canCreate,
  onAddRow,
  onOpenAddPartner,
  onOpenTicketColumnModal,
  onOpenBulkPaste,
  onOpenExcelImport,
  onOpenRegAutoFill,
  onToggleGlobalFreeze,
  onExportReport,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filters: { id: QuickFilter; label: string; count: number; alert?: boolean }[] = [
    { id: 'all', label: 'All', count: filterCounts.all },
    { id: 'dietary', label: 'Dietary Only', count: filterCounts.dietary },
    { id: 'awards', label: 'Awards Night', count: filterCounts.awards },
    { id: 'chargeable', label: 'Payable Tickets', count: filterCounts.chargeable },
    {
      id: 'errors',
      label: 'Validation Errors',
      count: filterCounts.errors,
      alert: filterCounts.errors > 0,
    },
  ];

  const handleSelectExport = (type: ExportReportType) => {
    setExportOpen(false);
    onExportReport(type);
  };

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-5 lg:px-6 py-3 space-y-3">
      {/* Row 1: Search, Admin Partner Scope & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Search name, email, company, title..."
              aria-label="Search delegates"
              className="w-full h-9 pl-9 pr-8 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Admin Event Switcher + Partner Company Filter + Add Partner */}
          {isAdmin && (
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="admin-event-switcher"
                  className="text-xs font-medium text-slate-600 whitespace-nowrap flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Event:</span>
                </label>
                <select
                  id="admin-event-switcher"
                  value={currentEventId}
                  onChange={(e) => onSwitchEvent(e.target.value)}
                  className="h-9 px-2.5 text-xs font-semibold text-slate-900 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.city.split(',')[0]})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onOpenAddEvent}
                  className="h-9 px-2.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                  title="Add a new event or manage event coordinators"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              </div>

              <label htmlFor="admin-partner-filter" className="text-xs font-medium text-slate-600 whitespace-nowrap">
                Partner:
              </label>
              <select
                id="admin-partner-filter"
                value={selectedPartnerFilter}
                onChange={(e) => onChangePartnerFilter(e.target.value)}
                className="h-9 px-3 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
              >
                <option value="all">All Partners ({partners.length})</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.standNumber})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onOpenAddPartner}
                className="h-9 px-3 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Add Partner</span>
              </button>
              <button
                type="button"
                onClick={onOpenTicketColumnModal}
                className="h-9 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tickets &amp; Titles</span>
              </button>
            </div>
          )}

          {/* Admin Global Freeze Toggle */}
          {isAdmin && (
            <button
              type="button"
              onClick={onToggleGlobalFreeze}
              className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isGlobalFrozen
                  ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title={
                isGlobalFrozen
                  ? 'Portal is currently frozen for partners. Click to unfreeze.'
                  : 'Freeze the entire portal to read-only mode for partners.'
              }
            >
              {isGlobalFrozen ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Global Freeze: ON</span>
                </>
              ) : (
                <>
                  <Snowflake className="w-3.5 h-3.5 text-slate-500" />
                  <span>Global Freeze: OFF</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Bulk Tools, Reg Form Auto-Fill & Export Dropdown */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenRegAutoFill}
            className="h-9 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Copy-paste & auto-fill the live Registration Form from delegate rows"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fill Reg Form</span>
          </button>

          <button
            type="button"
            disabled={!canCreate}
            onClick={onOpenBulkPaste}
            className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-slate-500" />
            <span>Paste from Excel</span>
          </button>

          <button
            type="button"
            disabled={!canCreate}
            onClick={onOpenExcelImport}
            className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Excel</span>
          </button>

          {/* Segmented Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((prev) => !prev)}
              aria-expanded={exportOpen}
              aria-haspopup="menu"
              className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Reports</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50"
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                  1-Click Segmented Exports
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectExport('full_xlsx')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Full List (.xlsx)</div>
                    <div className="text-[11px] text-slate-500">All 20 registration fields &amp; quota status</div>
                  </div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectExport('full_csv')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Full List (.csv)</div>
                    <div className="text-[11px] text-slate-500">Standard UTF-8 CSV for CRM import</div>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectExport('catering')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                >
                  <Utensils className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Catering &amp; Dietary Report (.xlsx)</div>
                    <div className="text-[11px] text-slate-500">Filtered to Dietary = Yes or Awards Night = Yes</div>
                  </div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectExport('badges')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                >
                  <BadgeCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Badge Printing List (.csv)</div>
                    <div className="text-[11px] text-slate-500">First, Last, Job Title, Company, Category</div>
                  </div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectExport('marketing')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                >
                  <MailCheck className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Marketing Opt-In List (.xlsx)</div>
                    <div className="text-[11px] text-slate-500">Newsletter = Yes or Partner Sharing = Yes</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!canCreate}
            onClick={onAddRow}
            className="h-9 px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Delegate Row</span>
          </button>
        </div>
      </div>

      {/* Row 2: Segmented Quick Filters + Keyboard Hint */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Quick Filters"
          className="inline-flex items-center flex-wrap gap-1 p-1 bg-slate-200/70 rounded-lg w-fit"
        >
          {filters.map((f) => {
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : f.alert
                    ? 'text-rose-700 hover:bg-white/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    active
                      ? f.alert
                        ? 'text-rose-600 font-semibold'
                        : 'text-indigo-600 font-semibold'
                      : f.alert
                      ? 'text-rose-600 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 whitespace-nowrap">
          <span>Inline Edit: Click any cell</span>
          <span aria-hidden="true">·</span>
          <span>Tab / Shift+Tab across columns</span>
          <span aria-hidden="true">·</span>
          <span>Enter moves down</span>
        </div>
      </div>

      {/* Global Freeze Warning Banner for Partners (and informative notice for Super Admin) */}
      {isGlobalFrozen && (
        <div
          role="status"
          className="px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2 text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {isAdmin ? (
                <>
                  <strong>Global Freeze is active.</strong> Partner accounts are locked in read-only mode. As Super Admin, you retain full editing privileges.
                </>
              ) : (
                <>
                  <strong>Registration Portal Frozen (Read-Only Mode).</strong> Direct editing is closed for the event deadline. Click <strong>Request Change</strong> on any delegate row to send an edit note to the event organiser.
                </>
              )}
            </span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={onToggleGlobalFreeze}
              className="text-xs font-semibold text-amber-900 hover:text-amber-950 underline flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unfreeze Portal</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
