import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Copy,
  Lock,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';
import { canEditDelegate } from '../services/auth';
import { getDelegateDayTicketCount } from '../services/quota';
import { getRowErrorCount, ValidationMap } from '../services/validation';
import {
  AuthSession,
  COUNTRY_OPTIONS,
  CustomTicketField,
  DEFAULT_COLUMN_TITLES,
  Delegate,
  EditableDelegateField,
  EXPERIENCE_LEVELS,
  INDUSTRY_OPTIONS,
  PartnerCompany,
} from '../types';

interface DelegateGridProps {
  delegates: Delegate[];
  partners: PartnerCompany[];
  session: AuthSession;
  isGlobalFrozen: boolean;
  showPartnerColumn: boolean;
  validationMap: ValidationMap;
  columnTitles: Record<string, string>;
  ticketCategories: string[];
  customTicketFields: CustomTicketField[];
  focusNewRowId: string | null;
  onClearFocusNewRow: () => void;
  onUpdateField: (
    delegateId: string,
    field: EditableDelegateField,
    value: string | boolean
  ) => void;
  onUpdateCustomTicketValue: (
    delegateId: string,
    ticketId: string,
    value: boolean
  ) => void;
  onRenameColumnTitle: (fieldKey: string, nextTitle: string) => void;
  onRenameCustomTicket: (ticketId: string, nextLabel: string) => void;
  onToggleLock: (delegateId: string) => void;
  onDuplicateRow: (delegateId: string) => void;
  onDeleteRow: (delegate: Delegate) => void;
  onRequestChange: (delegate: Delegate) => void;
  onAddRow: () => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

interface EditableHeaderProps {
  title: string;
  required?: boolean;
  canEditTitle: boolean;
  align?: 'left' | 'center';
  onSaveTitle: (nextTitle: string) => void;
}

const EditableHeaderContent: React.FC<EditableHeaderProps> = ({
  title,
  required = false,
  canEditTitle,
  align = 'left',
  onSaveTitle,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) {
      onSaveTitle(trimmed);
    } else {
      setDraft(title);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(title);
            setEditing(false);
          }
        }}
        className="w-full h-6 px-1.5 text-[11px] font-semibold text-slate-900 bg-white border border-indigo-500 rounded focus:outline-none"
      />
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 ${
        align === 'center' ? 'justify-center' : 'justify-between'
      }`}
      onDoubleClick={() => {
        if (canEditTitle) {
          setDraft(title);
          setEditing(true);
        }
      }}
      title={canEditTitle ? 'Click pencil or double-click to edit header title' : undefined}
    >
      <span className="truncate">
        {title}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {canEditTitle && (
        <button
          type="button"
          onClick={() => {
            setDraft(title);
            setEditing(true);
          }}
          aria-label={`Edit column title ${title}`}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity shrink-0"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

interface TextCellProps {
  rowIndex: number;
  colIndex: number;
  value: string;
  placeholder?: string;
  disabled: boolean;
  error?: string;
  type?: 'text' | 'email' | 'tel';
  mono?: boolean;
  onCommit: (nextValue: string) => void;
  onNavigate: (
    rowIndex: number,
    colIndex: number,
    dir: 'next' | 'prev' | 'down' | 'up'
  ) => void;
}

const GridTextCell: React.FC<TextCellProps> = ({
  rowIndex,
  colIndex,
  value,
  placeholder,
  disabled,
  error,
  type = 'text',
  mono = false,
  onCommit,
  onNavigate,
}) => {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(value);
    }
  }, [value, focused]);

  const commitIfChanged = () => {
    if (draft !== value) {
      onCommit(draft);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      commitIfChanged();
      onNavigate(rowIndex, colIndex, e.shiftKey ? 'prev' : 'next');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitIfChanged();
      onNavigate(rowIndex, colIndex, e.shiftKey ? 'up' : 'down');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(value);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  return (
    <div
      className={`relative w-full h-full flex items-center ${
        error ? 'bg-rose-50/80 ring-1 ring-inset ring-rose-400' : ''
      }`}
      title={error || undefined}
    >
      <input
        type={type}
        data-grid-cell={`${rowIndex}:${colIndex}`}
        value={focused ? draft : value}
        disabled={disabled}
        placeholder={disabled ? '—' : placeholder}
        onFocus={() => {
          setDraft(value);
          setFocused(true);
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setFocused(false);
          commitIfChanged();
        }}
        onKeyDown={handleKeyDown}
        className={`w-full h-10 px-2.5 text-xs bg-transparent focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors ${
          mono ? 'font-mono' : ''
        } ${
          disabled
            ? 'text-slate-400 cursor-not-allowed bg-slate-50/60'
            : 'text-slate-900'
        } ${error ? 'pr-7 text-rose-900 placeholder:text-rose-400' : 'placeholder:text-slate-300'}`}
      />
      {error && (
        <span
          className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-600 pointer-events-none"
          aria-label={error}
        >
          <AlertCircle className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  );
};

interface SelectCellProps {
  rowIndex: number;
  colIndex: number;
  value: string;
  options: readonly string[];
  disabled: boolean;
  error?: string;
  onCommit: (nextValue: string) => void;
  onNavigate: (
    rowIndex: number,
    colIndex: number,
    dir: 'next' | 'prev' | 'down' | 'up'
  ) => void;
}

const GridSelectCell: React.FC<SelectCellProps> = ({
  rowIndex,
  colIndex,
  value,
  options,
  disabled,
  error,
  onCommit,
  onNavigate,
}) => {
  const fullOptions =
    value && !options.includes(value) ? [value, ...options] : options;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      onNavigate(rowIndex, colIndex, e.shiftKey ? 'prev' : 'next');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onNavigate(rowIndex, colIndex, e.shiftKey ? 'up' : 'down');
    }
  };

  return (
    <div
      className={`relative w-full h-full flex items-center ${
        error ? 'bg-rose-50/80 ring-1 ring-inset ring-rose-400' : ''
      }`}
      title={error || undefined}
    >
      <select
        data-grid-cell={`${rowIndex}:${colIndex}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onCommit(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`w-full h-10 px-2 text-xs bg-transparent focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors ${
          disabled
            ? 'text-slate-400 cursor-not-allowed bg-slate-50/60'
            : 'text-slate-900 cursor-pointer'
        }`}
      >
        {!value && <option value="">Select...</option>}
        {fullOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

interface BooleanCellProps {
  rowIndex: number;
  colIndex: number;
  checked: boolean;
  disabled: boolean;
  label: string;
  accent?: 'indigo' | 'amber' | 'emerald';
  onToggle: (next: boolean) => void;
  onNavigate: (
    rowIndex: number,
    colIndex: number,
    dir: 'next' | 'prev' | 'down' | 'up'
  ) => void;
}

const GridBooleanCell: React.FC<BooleanCellProps> = ({
  rowIndex,
  colIndex,
  checked,
  disabled,
  label,
  accent = 'indigo',
  onToggle,
  onNavigate,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      onNavigate(rowIndex, colIndex, e.shiftKey ? 'prev' : 'next');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onNavigate(rowIndex, colIndex, e.shiftKey ? 'up' : 'down');
    } else if (e.key === ' ') {
      e.preventDefault();
      if (!disabled) onToggle(!checked);
    }
  };

  const activeBg =
    accent === 'amber'
      ? 'bg-amber-600'
      : accent === 'emerald'
      ? 'bg-emerald-600'
      : 'bg-indigo-600';

  return (
    <div className="w-full h-10 flex items-center justify-center px-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        data-grid-cell={`${rowIndex}:${colIndex}`}
        onClick={() => !disabled && onToggle(!checked)}
        onKeyDown={handleKeyDown}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        } ${
          checked
            ? `${activeBg} text-white`
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200/80'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            checked ? 'bg-white' : 'bg-slate-400'
          }`}
        />
        <span>{checked ? 'Yes' : 'No'}</span>
      </button>
    </div>
  );
};

export const DelegateGrid: React.FC<DelegateGridProps> = ({
  delegates,
  partners,
  session,
  isGlobalFrozen,
  showPartnerColumn,
  validationMap,
  columnTitles,
  ticketCategories,
  customTicketFields,
  focusNewRowId,
  onClearFocusNewRow,
  onUpdateField,
  onUpdateCustomTicketValue,
  onRenameColumnTitle,
  onRenameCustomTicket,
  onToggleLock,
  onDuplicateRow,
  onDeleteRow,
  onRequestChange,
  onAddRow,
  hasActiveFilters,
  onResetFilters,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAdmin = session.role === 'super_admin';
  const totalEditableCols = 20 + customTicketFields.length;

  const colTitle = (key: EditableDelegateField) =>
    columnTitles[key] || DEFAULT_COLUMN_TITLES[key];

  // Auto-focus first name cell when a new delegate row is added
  useEffect(() => {
    if (!focusNewRowId || !containerRef.current) return;
    const rowIndex = delegates.findIndex((d) => d.id === focusNewRowId);
    if (rowIndex >= 0) {
      const target = containerRef.current.querySelector<HTMLElement>(
        `[data-grid-cell="${rowIndex}:0"]`
      );
      if (target) {
        target.focus();
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      onClearFocusNewRow();
    }
  }, [focusNewRowId, delegates, onClearFocusNewRow]);

  const handleNavigate = useCallback(
    (
      rowIndex: number,
      colIndex: number,
      dir: 'next' | 'prev' | 'down' | 'up'
    ) => {
      const container = containerRef.current;
      if (!container) return;

      const totalRows = delegates.length;
      if (totalRows === 0) return;

      let r = rowIndex;
      let c = colIndex;

      for (let step = 0; step < totalRows * totalEditableCols; step++) {
        if (dir === 'next') {
          c += 1;
          if (c >= totalEditableCols) {
            c = 0;
            r += 1;
          }
        } else if (dir === 'prev') {
          c -= 1;
          if (c < 0) {
            c = totalEditableCols - 1;
            r -= 1;
          }
        } else if (dir === 'down') {
          r += 1;
        } else if (dir === 'up') {
          r -= 1;
        }

        if (r < 0 || r >= totalRows) return;

        const el = container.querySelector<
          HTMLInputElement | HTMLSelectElement | HTMLButtonElement
        >(`[data-grid-cell="${r}:${c}"]`);

        if (el && !el.disabled) {
          el.focus();
          if (el instanceof HTMLInputElement) {
            el.select();
          }
          return;
        }
      }
    },
    [delegates.length, totalEditableCols]
  );

  const getPartnerName = (partnerId: string) =>
    partners.find((p) => p.id === partnerId)?.name ?? 'Unknown Partner';

  if (delegates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-white">
        <div className="text-center max-w-md">
          <h2 className="text-base font-semibold text-slate-900">
            {hasActiveFilters
              ? 'No delegates match your current search or filter'
              : 'No delegates registered yet'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {hasActiveFilters
              ? 'Adjust your search query or clear the active filter to view all partner delegates.'
              : 'Add your first delegate row, paste directly from Excel, or upload an Excel spreadsheet.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Clear Search &amp; Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddRow}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Delegate Row</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto grid-scroll bg-white relative"
    >
      <table className="border-separate border-spacing-0 w-max min-w-full text-left">
        <thead>
          <tr className="bg-slate-100 text-[11px] font-semibold text-slate-600">
            {/* Sticky Left Col 1: Status & Actions */}
            <th
              scope="col"
              className="sticky top-0 left-0 z-40 bg-slate-100 border-b border-r border-slate-200 px-3 py-2.5 w-[198px] min-w-[198px] whitespace-nowrap"
            >
              Tickets / Actions
            </th>

            {/* Sticky Left Col 2: First Name */}
            <th
              scope="col"
              className="sticky top-0 left-[198px] z-40 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[138px] min-w-[138px] whitespace-nowrap"
            >
              <EditableHeaderContent
                title={colTitle('firstName')}
                required
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('firstName', t)}
              />
            </th>

            {/* Sticky Left Col 3: Last Name */}
            <th
              scope="col"
              className="sticky top-0 left-[336px] z-40 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[138px] min-w-[138px] whitespace-nowrap sticky-col-shadow"
            >
              <EditableHeaderContent
                title={colTitle('lastName')}
                required
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('lastName', t)}
              />
            </th>

            {showPartnerColumn && (
              <th
                scope="col"
                className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[175px] min-w-[175px] whitespace-nowrap"
              >
                Partner Account
              </th>
            )}

            {/* 3. Job Title (Validation removed — optional) */}
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[200px] min-w-[200px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('jobTitle')}
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('jobTitle', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[220px] min-w-[220px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('company')}
                required
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('company', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[148px] min-w-[148px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('country')}
                required
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('country', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[235px] min-w-[235px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('email')}
                required
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('email', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[138px] min-w-[138px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('registrationCategory')}
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('registrationCategory', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[155px] min-w-[155px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('phone')}
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('phone', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2.5 w-[124px] min-w-[124px] text-center whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('awardsNightDinner')}
                align="center"
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('awardsNightDinner', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2.5 w-[128px] min-w-[128px] text-center whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('day1Workshop')}
                align="center"
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('day1Workshop', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2.5 w-[96px] min-w-[96px] text-center whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('day2')}
                align="center"
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('day2', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2.5 w-[96px] min-w-[96px] text-center whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('day3')}
                align="center"
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('day3', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2.5 w-[128px] min-w-[128px] text-center whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('stadiumTour')}
                align="center"
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('stadiumTour', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2.5 w-[112px] min-w-[112px] text-center whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('hasDietary')}
                align="center"
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('hasDietary', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[215px] min-w-[215px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('dietaryDetails')}
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('dietaryDetails', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[200px] min-w-[200px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('experienceLevel')}
                required
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('experienceLevel', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[150px] min-w-[150px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('industry')}
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('industry', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2.5 w-[138px] min-w-[138px] whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('promoCode')}
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('promoCode', t)}
              />
            </th>
            <th scope="col" className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2.5 w-[132px] min-w-[132px] text-center whitespace-nowrap">
              <EditableHeaderContent
                title={colTitle('shareDetailsWithPartners')}
                align="center"
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('shareDetailsWithPartners', t)}
              />
            </th>
            <th
              scope="col"
              className={`sticky top-0 z-30 bg-slate-100 border-b ${
                customTicketFields.length > 0 ? 'border-r' : ''
              } border-slate-200 px-2 py-2.5 w-[124px] min-w-[124px] text-center whitespace-nowrap`}
            >
              <EditableHeaderContent
                title={colTitle('newsletterOptIn')}
                align="center"
                canEditTitle={isAdmin}
                onSaveTitle={(t) => onRenameColumnTitle('newsletterOptIn', t)}
              />
            </th>

            {/* Dynamic Future Ticket Columns */}
            {customTicketFields.map((ticket, idx) => (
              <th
                key={ticket.id}
                scope="col"
                className={`sticky top-0 z-30 bg-indigo-50/90 text-indigo-900 border-b ${
                  idx < customTicketFields.length - 1 ? 'border-r' : ''
                } border-slate-200 px-2.5 py-2.5 w-[142px] min-w-[142px] text-center whitespace-nowrap`}
              >
                <EditableHeaderContent
                  title={`${21 + idx}. ${ticket.label}`}
                  align="center"
                  canEditTitle={isAdmin}
                  onSaveTitle={(raw) => {
                    const cleaned = raw.replace(/^\d+\.\s*/, '').trim();
                    if (cleaned) onRenameCustomTicket(ticket.id, cleaned);
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {delegates.map((delegate, rowIndex) => {
            const editable = canEditDelegate(session, delegate, isGlobalFrozen);
            const rowErrors = validationMap[delegate.id] || {};
            const errorCount = getRowErrorCount(rowErrors);
            const rowDayTotal = getDelegateDayTicketCount(delegate);
            const rowPayable =
              typeof delegate.payableTicketsCount === 'number'
                ? delegate.payableTicketsCount
                : delegate.ticketType === 'Chargeable Extra'
                ? rowDayTotal
                : 0;
            const rowComp =
              typeof delegate.compTicketsUsed === 'number'
                ? delegate.compTicketsUsed
                : Math.max(0, rowDayTotal - rowPayable);
            const isChargeable = rowPayable > 0;
            const rowBg =
              errorCount > 0
                ? 'bg-rose-50/30'
                : delegate.isLocked
                ? 'bg-slate-50/90'
                : 'bg-white hover:bg-slate-50/70';

            const stickyCellBg =
              errorCount > 0
                ? 'bg-rose-50'
                : delegate.isLocked
                ? 'bg-slate-50'
                : 'bg-white';

            return (
              <tr key={delegate.id} className={`${rowBg} transition-colors`}>
                {/* Sticky Left Col 1: Status & Actions */}
                <td
                  className={`sticky left-0 z-20 ${stickyCellBg} border-b border-r border-slate-200 px-2.5 py-1.5 align-middle`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono tabular-nums text-[11px] text-slate-400 w-5 shrink-0">
                        {rowIndex + 1}
                      </span>

                      {isChargeable ? (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono tabular-nums bg-amber-100 text-amber-800 border border-amber-300/80 whitespace-nowrap"
                          title={
                            rowComp > 0
                              ? `${rowComp} Complimentary + ${rowPayable} Payable day ticket(s) — exceeds partner comp ticket pool`
                              : `${rowPayable} Payable day ticket(s) — exceeds partner complimentary ticket pool`
                          }
                        >
                          {rowComp > 0 ? `+${rowPayable} Pay` : `Payable (${rowPayable})`}
                        </span>
                      ) : rowComp > 0 ? (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium font-mono tabular-nums bg-slate-100 text-slate-700 whitespace-nowrap"
                          title={`${rowComp} day ticket(s) deducted from partner complimentary ticket pool`}
                        >
                          Comp ({rowComp})
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium font-mono tabular-nums bg-slate-50 text-slate-400 border border-slate-200 whitespace-nowrap"
                          title="No Day 1 / Day 2 / Day 3 tickets selected yet"
                        >
                          0 tkt
                        </span>
                      )}

                      {errorCount > 0 && (
                        <span
                          className="text-rose-600 shrink-0"
                          title={`${errorCount} validation ${
                            errorCount === 1 ? 'error' : 'errors'
                          } on this row`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Row Action Controls */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => onToggleLock(delegate.id)}
                          title={
                            delegate.isLocked
                              ? 'Unlock row for partner edits'
                              : 'Lock row (e.g. badge printed)'
                          }
                          aria-label={
                            delegate.isLocked ? 'Unlock delegate row' : 'Lock delegate row'
                          }
                          className={`p-1 rounded transition-colors ${
                            delegate.isLocked
                              ? 'text-amber-700 bg-amber-100 hover:bg-amber-200/80'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {delegate.isLocked ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        delegate.isLocked && (
                          <span
                            className="p-1 text-amber-700"
                            title="Row locked by Event Organiser"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )
                      )}

                      {editable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onDuplicateRow(delegate.id)}
                            title="Duplicate delegate row"
                            aria-label="Duplicate delegate row"
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRow(delegate)}
                            title="Delete delegate row"
                            aria-label="Delete delegate row"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRequestChange(delegate)}
                          title="Submit a change request note to the Event Organiser"
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 whitespace-nowrap"
                        >
                          <MessageSquarePlus className="w-3 h-3" />
                          <span>Request</span>
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                {/* Sticky Left Col 2: 1. First Name */}
                <td
                  className={`sticky left-[198px] z-20 ${stickyCellBg} border-b border-r border-slate-200 p-0`}
                >
                  <GridTextCell
                    rowIndex={rowIndex}
                    colIndex={0}
                    value={delegate.firstName}
                    placeholder="First name"
                    disabled={!editable}
                    error={rowErrors.firstName}
                    onCommit={(val) => onUpdateField(delegate.id, 'firstName', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* Sticky Left Col 3: 2. Last Name */}
                <td
                  className={`sticky left-[336px] z-20 ${stickyCellBg} border-b border-r border-slate-200 p-0 sticky-col-shadow`}
                >
                  <GridTextCell
                    rowIndex={rowIndex}
                    colIndex={1}
                    value={delegate.lastName}
                    placeholder="Last name"
                    disabled={!editable}
                    error={rowErrors.lastName}
                    onCommit={(val) => onUpdateField(delegate.id, 'lastName', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* Optional Super Admin Partner Account Context Column */}
                {showPartnerColumn && (
                  <td className="border-b border-r border-slate-200 px-2.5 py-0 text-xs text-slate-600 whitespace-nowrap bg-slate-50/40">
                    <span
                      className="truncate block max-w-[155px]"
                      title={getPartnerName(delegate.partnerId)}
                    >
                      {getPartnerName(delegate.partnerId)}
                    </span>
                  </td>
                )}

                {/* 3. Job Title (Optional — validation removed) */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridTextCell
                    rowIndex={rowIndex}
                    colIndex={2}
                    value={delegate.jobTitle}
                    placeholder="Optional"
                    disabled={!editable}
                    onCommit={(val) => onUpdateField(delegate.id, 'jobTitle', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 4. Company */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridTextCell
                    rowIndex={rowIndex}
                    colIndex={3}
                    value={delegate.company}
                    placeholder="Company or guest org"
                    disabled={!editable}
                    error={rowErrors.company}
                    onCommit={(val) => onUpdateField(delegate.id, 'company', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 5. Country */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridSelectCell
                    rowIndex={rowIndex}
                    colIndex={4}
                    value={delegate.country}
                    options={COUNTRY_OPTIONS}
                    disabled={!editable}
                    error={rowErrors.country}
                    onCommit={(val) => onUpdateField(delegate.id, 'country', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 6. Email */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridTextCell
                    rowIndex={rowIndex}
                    colIndex={5}
                    type="email"
                    mono
                    value={delegate.email}
                    placeholder="name@company.com.au"
                    disabled={!editable}
                    error={rowErrors.email}
                    onCommit={(val) => onUpdateField(delegate.id, 'email', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 7. Registration Category (Dynamic Ticket Categories) */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridSelectCell
                    rowIndex={rowIndex}
                    colIndex={6}
                    value={delegate.registrationCategory}
                    options={ticketCategories}
                    disabled={!editable}
                    error={rowErrors.registrationCategory}
                    onCommit={(val) =>
                      onUpdateField(delegate.id, 'registrationCategory', val)
                    }
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 8. Phone */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridTextCell
                    rowIndex={rowIndex}
                    colIndex={7}
                    type="tel"
                    mono
                    value={delegate.phone}
                    placeholder="+61 4XX XXX XXX"
                    disabled={!editable}
                    onCommit={(val) => onUpdateField(delegate.id, 'phone', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 9. Awards Night Dinner */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridBooleanCell
                    rowIndex={rowIndex}
                    colIndex={8}
                    checked={delegate.awardsNightDinner}
                    disabled={!editable}
                    label={colTitle('awardsNightDinner')}
                    accent="amber"
                    onToggle={(v) => onUpdateField(delegate.id, 'awardsNightDinner', v)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 10. Day 1 Workshop */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridBooleanCell
                    rowIndex={rowIndex}
                    colIndex={9}
                    checked={delegate.day1Workshop}
                    disabled={!editable}
                    label={colTitle('day1Workshop')}
                    onToggle={(v) => onUpdateField(delegate.id, 'day1Workshop', v)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 11. Day 2 */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridBooleanCell
                    rowIndex={rowIndex}
                    colIndex={10}
                    checked={delegate.day2}
                    disabled={!editable}
                    label={colTitle('day2')}
                    onToggle={(v) => onUpdateField(delegate.id, 'day2', v)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 12. Day 3 */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridBooleanCell
                    rowIndex={rowIndex}
                    colIndex={11}
                    checked={delegate.day3}
                    disabled={!editable}
                    label={colTitle('day3')}
                    onToggle={(v) => onUpdateField(delegate.id, 'day3', v)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 13. Stadium Tour */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridBooleanCell
                    rowIndex={rowIndex}
                    colIndex={12}
                    checked={delegate.stadiumTour}
                    disabled={!editable}
                    label={colTitle('stadiumTour')}
                    onToggle={(v) => onUpdateField(delegate.id, 'stadiumTour', v)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 14. Has Dietary */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridBooleanCell
                    rowIndex={rowIndex}
                    colIndex={13}
                    checked={delegate.hasDietary}
                    disabled={!editable}
                    label={colTitle('hasDietary')}
                    accent="emerald"
                    onToggle={(v) => onUpdateField(delegate.id, 'hasDietary', v)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 15. Dietary Details */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridTextCell
                    rowIndex={rowIndex}
                    colIndex={14}
                    value={delegate.hasDietary ? delegate.dietaryDetails : ''}
                    placeholder={
                      delegate.hasDietary ? 'Required: specify allergies/diet' : '—'
                    }
                    disabled={!editable || !delegate.hasDietary}
                    error={rowErrors.dietaryDetails}
                    onCommit={(val) => onUpdateField(delegate.id, 'dietaryDetails', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 16. Experience Level */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridSelectCell
                    rowIndex={rowIndex}
                    colIndex={15}
                    value={delegate.experienceLevel}
                    options={EXPERIENCE_LEVELS}
                    disabled={!editable}
                    error={rowErrors.experienceLevel}
                    onCommit={(val) => onUpdateField(delegate.id, 'experienceLevel', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 17. Industry */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridSelectCell
                    rowIndex={rowIndex}
                    colIndex={16}
                    value={delegate.industry}
                    options={INDUSTRY_OPTIONS}
                    disabled={!editable}
                    onCommit={(val) => onUpdateField(delegate.id, 'industry', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 18. Promo Code */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridTextCell
                    rowIndex={rowIndex}
                    colIndex={17}
                    mono
                    value={delegate.promoCode}
                    placeholder="Optional"
                    disabled={!editable}
                    onCommit={(val) => onUpdateField(delegate.id, 'promoCode', val)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 19. Share Details With Partners */}
                <td className="border-b border-r border-slate-200 p-0">
                  <GridBooleanCell
                    rowIndex={rowIndex}
                    colIndex={18}
                    checked={delegate.shareDetailsWithPartners}
                    disabled={!editable}
                    label={colTitle('shareDetailsWithPartners')}
                    onToggle={(v) =>
                      onUpdateField(delegate.id, 'shareDetailsWithPartners', v)
                    }
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* 20. Newsletter Opt-In */}
                <td
                  className={`border-b ${
                    customTicketFields.length > 0 ? 'border-r' : ''
                  } border-slate-200 p-0`}
                >
                  <GridBooleanCell
                    rowIndex={rowIndex}
                    colIndex={19}
                    checked={delegate.newsletterOptIn}
                    disabled={!editable}
                    label={colTitle('newsletterOptIn')}
                    onToggle={(v) => onUpdateField(delegate.id, 'newsletterOptIn', v)}
                    onNavigate={handleNavigate}
                  />
                </td>

                {/* Dynamic Future Ticket Columns */}
                {customTicketFields.map((ticket, idx) => (
                  <td
                    key={ticket.id}
                    className={`border-b ${
                      idx < customTicketFields.length - 1 ? 'border-r' : ''
                    } border-slate-200 p-0 bg-indigo-50/10`}
                  >
                    <GridBooleanCell
                      rowIndex={rowIndex}
                      colIndex={20 + idx}
                      checked={Boolean(delegate.customTickets?.[ticket.id])}
                      disabled={!editable}
                      label={ticket.label}
                      accent="indigo"
                      onToggle={(v) =>
                        onUpdateCustomTicketValue(delegate.id, ticket.id, v)
                      }
                      onNavigate={handleNavigate}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
