import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardCopy,
  ClipboardPaste,
  Code2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Sparkles,
  X,
} from 'lucide-react';
import {
  buildConsoleAutoFillScript,
  buildRegFormData,
  buildUniversalBookmarkletHref,
  extractCityFromEvent,
  formatKeyValueCopyText,
  parsePastedRegistrationPayload,
  RegFormData,
} from '../services/regFormFill';
import {
  COUNTRY_OPTIONS,
  CustomTicketField,
  Delegate,
  EventItem,
} from '../types';

interface RegFormAutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  delegates: Delegate[];
  initialDelegateId: string | null;
  activeEvent: EventItem;
  ticketCategories: string[];
  customTicketFields: CustomTicketField[];
  registeredDelegateIds: Record<string, boolean>;
  onToggleRegistered: (delegateId: string) => void;
  onNotify: (type: 'success' | 'info' | 'warning', title: string, detail?: string) => void;
}

const REG_PREFS_KEY = 'pce_reg_autofill_prefs_v1';

interface SavedPrefs {
  defaultPassword: string;
  cityByEvent: Record<string, string>;
  linkedInByDelegate: Record<string, string>;
}

function loadPrefs(): SavedPrefs {
  try {
    const raw = localStorage.getItem(REG_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedPrefs>;
      return {
        defaultPassword: parsed.defaultPassword || 'Pce2026!@#',
        cityByEvent: parsed.cityByEvent || {},
        linkedInByDelegate: parsed.linkedInByDelegate || {},
      };
    }
  } catch {
    // ignore
  }
  return {
    defaultPassword: 'Pce2026!@#',
    cityByEvent: {},
    linkedInByDelegate: {},
  };
}

export const RegFormAutoFillModal: React.FC<RegFormAutoFillModalProps> = ({
  isOpen,
  onClose,
  delegates,
  initialDelegateId,
  activeEvent,
  ticketCategories,
  customTicketFields,
  registeredDelegateIds,
  onToggleRegistered,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'autofill' | 'sandbox'>('autofill');
  const [selectedId, setSelectedId] = useState<string>('');
  const [prefs, setPrefs] = useState<SavedPrefs>(() => loadPrefs());
  const [showPassword, setShowPassword] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive Test / Paste Sandbox Form state (exact replica of Registration Form)
  const [pasteInput, setPasteInput] = useState('');
  const [sandboxFilledKeys, setSandboxFilledKeys] = useState<Record<string, boolean>>({});
  const [sandboxForm, setSandboxForm] = useState<RegFormData>(() => ({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    jobTitle: '',
    company: '',
    city: '',
    country: 'Australia',
    email: '',
    phone: '',
    registrationCategory: '',
    basicComboTicket: 'Yes',
    linkedInUrl: '',
    shareDetailsWithPartners: 'Yes',
    hasDietary: 'No',
    dietaryDetails: '',
    stadiumTour: 'No',
    awardsNightDinner: 'No',
    day1Workshop: 'No',
    day2: 'Yes',
    day3: 'Yes',
    experienceLevel: '',
    industry: '',
    promoCode: '',
    newsletterOptIn: 'No',
    customTickets: {},
  }));

  useEffect(() => {
    try {
      localStorage.setItem(REG_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('autofill');
    if (initialDelegateId && delegates.some((d) => d.id === initialDelegateId)) {
      setSelectedId(initialDelegateId);
    } else if (delegates.length > 0) {
      setSelectedId(delegates[0].id);
    } else {
      setSelectedId('');
    }
  }, [isOpen, initialDelegateId, delegates]);

  const currentIndex = useMemo(
    () => delegates.findIndex((d) => d.id === selectedId),
    [delegates, selectedId]
  );

  const selectedDelegate =
    currentIndex >= 0 ? delegates[currentIndex] : delegates[0] ?? null;

  const eventDefaultCity =
    prefs.cityByEvent[activeEvent.id] ?? extractCityFromEvent(activeEvent);

  const formData = useMemo(() => {
    if (!selectedDelegate) return null;
    return buildRegFormData(selectedDelegate, activeEvent, customTicketFields, {
      password: prefs.defaultPassword,
      city: eventDefaultCity,
      linkedInUrl: prefs.linkedInByDelegate[selectedDelegate.id] ?? '',
    });
  }, [
    selectedDelegate,
    activeEvent,
    customTicketFields,
    prefs.defaultPassword,
    eventDefaultCity,
    prefs.linkedInByDelegate,
  ]);

  const bookmarkletHref = useMemo(() => buildUniversalBookmarkletHref(), []);

  const registeredCount = useMemo(
    () => delegates.filter((d) => registeredDelegateIds[d.id]).length,
    [delegates, registeredDelegateIds]
  );

  if (!isOpen) return null;

  const copyText = async (text: string, key: string, toastTitle: string, toastDetail?: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
    onNotify('success', toastTitle, toastDetail);
  };

  const handleCopyAutoFillScript = () => {
    if (!formData || !selectedDelegate) return;
    const script = buildConsoleAutoFillScript(formData);
    copyText(
      script,
      'script',
      `Auto-Fill Script copied for ${formData.firstName || 'Delegate'} ${formData.lastName}`,
      'Open the Registration Form tab → F12 → Console → Paste & press Enter.'
    );
  };

  const handleCopyJsonPayload = () => {
    if (!formData) return;
    copyText(
      JSON.stringify(formData),
      'json',
      'Delegate Form Data copied',
      'Click your "PCE Auto-Fill" bookmarklet on the Registration Form tab (or test in the Sandbox tab).'
    );
  };

  const handleCopyKeyValue = () => {
    if (!formData) return;
    copyText(
      formatKeyValueCopyText(formData),
      'kv',
      'Form summary copied',
      'All registration fields copied as plain text.'
    );
  };

  const applyToSandbox = (incoming: Partial<RegFormData>) => {
    const filled: Record<string, boolean> = {};
    setSandboxForm((prev) => {
      const next = { ...prev };
      (Object.keys(incoming) as (keyof RegFormData)[]).forEach((k) => {
        const val = incoming[k];
        if (val !== undefined && val !== '') {
          (next as Record<string, unknown>)[k] = val;
          filled[k] = true;
        }
      });
      if (incoming.password && !incoming.confirmPassword) {
        next.confirmPassword = incoming.password;
        filled.confirmPassword = true;
      }
      return next;
    });
    setSandboxFilledKeys(filled);
    onNotify(
      'success',
      `Auto-filled ${Object.keys(filled).length} form fields`,
      'Review the form below to verify every field.'
    );
  };

  const handlePasteFillSandbox = (raw?: string) => {
    const text = raw ?? pasteInput;
    const parsed = parsePastedRegistrationPayload(text, eventDefaultCity);
    if (!parsed) {
      onNotify(
        'warning',
        'Could not parse pasted text',
        'Paste Delegate Form Data JSON, Key: Value lines, or a tab-separated Excel row.'
      );
      return;
    }
    applyToSandbox(parsed);
  };

  const goPrev = () => {
    if (delegates.length === 0) return;
    const prevIdx = currentIndex <= 0 ? delegates.length - 1 : currentIndex - 1;
    setSelectedId(delegates[prevIdx].id);
  };

  const goNext = () => {
    if (delegates.length === 0) return;
    const nextIdx = currentIndex >= delegates.length - 1 ? 0 : currentIndex + 1;
    setSelectedId(delegates[nextIdx].id);
  };

  const fieldCard = (
    key: string,
    label: string,
    value: string,
    opts?: { required?: boolean; mono?: boolean; badge?: string }
  ) => {
    const isCopied = copiedKey === `field-${key}`;
    return (
      <div
        key={key}
        className="group flex flex-col justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-colors"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-medium text-slate-600 truncate">
            {label}
            {opts?.required && <span className="text-rose-500 ml-0.5">*</span>}
          </span>
          {opts?.badge && (
            <span className="text-[10px] font-semibold text-emerald-700">
              {opts.badge}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs font-semibold truncate ${
              value ? 'text-slate-900' : 'text-slate-400 italic font-normal'
            } ${opts?.mono ? 'font-mono tabular-nums' : ''}`}
            title={value || 'Empty'}
          >
            {value || '—'}
          </span>
          <button
            type="button"
            disabled={!value}
            onClick={() => copyText(value, `field-${key}`, `Copied ${label}`, value)}
            className={`shrink-0 h-7 px-2 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
              isCopied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 disabled:opacity-40'
            }`}
            title={`Copy ${label}`}
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-autofill-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <ClipboardCheck className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <h2
                id="reg-autofill-modal-title"
                className="text-base font-bold text-slate-900 truncate"
              >
                Registration Form Auto-Fill &amp; Copy-Paste — {activeEvent.name}
              </h2>
              <p className="text-xs text-slate-500">
                Directly fill the live Registration Form from delegate records using 1-click Auto-Fill Script, Bookmarklet, or instant field copy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs + Delegate Stepper */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('autofill')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'autofill'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill Live Form</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sandbox')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'sandbox'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Copy-Paste Form Tester</span>
            </button>
          </div>

          {delegates.length > 0 && selectedDelegate && (
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                {registeredCount}/{delegates.length} Registered
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous delegate"
                  className="h-8 w-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 inline-flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  aria-label="Select delegate to auto-fill"
                  value={selectedDelegate.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="h-8 px-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 max-w-[230px]"
                >
                  {delegates.map((d, idx) => (
                    <option key={d.id} value={d.id}>
                      {registeredDelegateIds[d.id] ? '✓ ' : ''}
                      {idx + 1}. {`${d.firstName} ${d.lastName}`.trim() || 'Unnamed'} —{' '}
                      {d.company || 'No Company'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next delegate"
                  className="h-8 w-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 inline-flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onToggleRegistered(selectedDelegate.id)}
                className={`h-8 px-2.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
                  registeredDelegateIds[selectedDelegate.id]
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {registeredDelegateIds[selectedDelegate.id]
                    ? 'Registered'
                    : 'Mark Registered'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'autofill' ? (
            !selectedDelegate || !formData ? (
              <div className="p-10 text-center border border-dashed border-slate-300 rounded-xl text-xs text-slate-500">
                No delegates in the current view. Add or import delegates first to auto-fill the registration form.
              </div>
            ) : (
              <>
                {/* Primary Direct Auto-Fill Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Method 1: Instant Console Auto-Fill Script */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-indigo-950">
                            Option 1: 1-Click Auto-Fill Script (Instant)
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.5 rounded">
                          Zero Setup
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        Copies a ready-to-run script with{' '}
                        <strong className="text-slate-900">
                          {formData.firstName} {formData.lastName}
                        </strong>
                        &apos;s exact form fields. Open the live Registration Form tab, press{' '}
                        <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded">
                          F12
                        </kbd>{' '}
                        → <strong>Console</strong> → Paste &amp; hit{' '}
                        <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded">
                          Enter
                        </kbd>
                        .
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyAutoFillScript}
                        className="h-9 px-4 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        {copiedKey === 'script' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Script Copied!</span>
                          </>
                        ) : (
                          <>
                            <Code2 className="w-3.5 h-3.5" />
                            <span>Copy Auto-Fill Script</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          applyToSandbox(formData);
                          setActiveTab('sandbox');
                        }}
                        className="h-9 px-3 rounded-lg text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Preview in Form</span>
                      </button>
                    </div>
                  </div>

                  {/* Method 2: Universal Reusable Bookmarklet */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-slate-700" />
                          <span className="text-xs font-bold text-slate-900">
                            Option 2: 1-Click Bookmarklet (Best for Bulk)
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          No DevTools
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        Drag the bookmark button below to your browser bookmarks bar once. Then click{' '}
                        <strong>Copy Form Data</strong> here and click the bookmark on the Registration Form page to fill every field in 1 click.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={bookmarkletHref}
                        draggable
                        onClick={(e) => {
                          e.preventDefault();
                          onNotify(
                            'info',
                            'Drag this button to your Bookmarks Bar',
                            'Then click it while viewing the live Registration Form tab.'
                          );
                        }}
                        className="h-9 px-3.5 rounded-lg text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 border-dashed inline-flex items-center gap-1.5 cursor-grab active:cursor-grabbing"
                        title="Drag me to your browser's bookmarks bar"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                        <span>PCE Reg Auto-Fill</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyJsonPayload}
                        className="h-9 px-3.5 rounded-lg text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 inline-flex items-center gap-1.5 transition-colors"
                      >
                        {copiedKey === 'json' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Data Copied!</span>
                          </>
                        ) : (
                          <>
                            <ClipboardCopy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Form Data</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyKeyValue}
                        className="h-9 px-3 rounded-lg text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Text</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Defaults (Password, City, LinkedIn) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    Extra Registration Form Fields (Included Automatically in Auto-Fill)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="autofill-password"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Create / Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          id="autofill-password"
                          type={showPassword ? 'text' : 'password'}
                          value={prefs.defaultPassword}
                          onChange={(e) =>
                            setPrefs((prev) => ({
                              ...prev,
                              defaultPassword: e.target.value,
                            }))
                          }
                          className="w-full h-8 pl-2.5 pr-8 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="autofill-city"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        City * (Default for {activeEvent.name})
                      </label>
                      <input
                        id="autofill-city"
                        type="text"
                        value={eventDefaultCity}
                        onChange={(e) =>
                          setPrefs((prev) => ({
                            ...prev,
                            cityByEvent: {
                              ...prev.cityByEvent,
                              [activeEvent.id]: e.target.value,
                            },
                          }))
                        }
                        placeholder="e.g. Melbourne"
                        className="w-full h-8 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="autofill-linkedin"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        LinkedIn Profile Link (Optional)
                      </label>
                      <input
                        id="autofill-linkedin"
                        type="url"
                        value={prefs.linkedInByDelegate[selectedDelegate.id] ?? ''}
                        onChange={(e) =>
                          setPrefs((prev) => ({
                            ...prev,
                            linkedInByDelegate: {
                              ...prev.linkedInByDelegate,
                              [selectedDelegate.id]: e.target.value,
                            },
                          }))
                        }
                        placeholder="https://linkedin.com/in/..."
                        className="w-full h-8 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Exact 2-Column Registration Form Field Sheet (Click Any Field to Copy) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Registration Form Field Mapping (Matches Live Form Order)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click Copy on any individual field if pasting manually
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fieldCard('firstName', 'First Name', formData.firstName, {
                      required: true,
                    })}
                    {fieldCard('lastName', 'Last Name', formData.lastName, {
                      required: true,
                    })}
                    {fieldCard(
                      'password',
                      'Create Password',
                      showPassword ? formData.password : '••••••••',
                      { required: true, mono: true }
                    )}
                    {fieldCard(
                      'confirmPassword',
                      'Confirm Password',
                      showPassword ? formData.confirmPassword : '••••••••',
                      { required: true, mono: true }
                    )}
                    {fieldCard('jobTitle', 'Job Title', formData.jobTitle, {
                      required: true,
                    })}
                    {fieldCard('company', 'Company', formData.company, {
                      required: true,
                    })}
                    {fieldCard('city', 'City', formData.city, { required: true })}
                    {fieldCard('country', 'Country', formData.country, {
                      required: true,
                    })}
                    {fieldCard('email', 'Email', formData.email, {
                      required: true,
                      mono: true,
                    })}
                    {fieldCard('phone', 'Phone', formData.phone, { mono: true })}
                    {fieldCard(
                      'registrationCategory',
                      'Registration Category',
                      formData.registrationCategory,
                      { required: true }
                    )}
                    {fieldCard(
                      'basicComboTicket',
                      'Basic Combo Ticket',
                      formData.basicComboTicket
                    )}
                    {fieldCard(
                      'linkedInUrl',
                      'LinkedIn Profile Link',
                      formData.linkedInUrl
                    )}
                    {fieldCard(
                      'shareDetailsWithPartners',
                      "Share my details with Expo's carefully chosen partners",
                      formData.shareDetailsWithPartners,
                      { required: true }
                    )}
                    {fieldCard(
                      'hasDietary',
                      'Do you have any dietary requirements?',
                      formData.hasDietary === 'Yes' && formData.dietaryDetails
                        ? `Yes — ${formData.dietaryDetails}`
                        : formData.hasDietary,
                      { required: true }
                    )}
                    {fieldCard('stadiumTour', 'Stadium Tour', formData.stadiumTour, {
                      required: true,
                      badge: 'Limit to 10',
                    })}
                  </div>
                </div>
              </>
            )
          ) : (
            /* TAB 2: Interactive Registration Form Copy-Paste Tester */
            <div className="space-y-5">
              {/* Paste Bar */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-indigo-950">
                      Paste Delegate Data to Auto-Fill Form Instantly
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Paste copied Delegate Form Data (JSON), Key: Value text, or a tab-separated Excel row — or click{' '}
                      <strong>Fill Selected Delegate</strong>.
                    </p>
                  </div>
                  {formData && (
                    <button
                      type="button"
                      onClick={() => applyToSandbox(formData)}
                      className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        Fill {formData.firstName || 'Selected'} {formData.lastName}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    rows={2}
                    value={pasteInput}
                    onChange={(e) => setPasteInput(e.target.value)}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted.trim()) {
                        setTimeout(() => handlePasteFillSandbox(pasted), 20);
                      }
                    }}
                    placeholder="Paste copied delegate JSON, Key: Value lines, or an Excel row here (auto-fills immediately on paste)..."
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => handlePasteFillSandbox()}
                    className="sm:w-36 h-auto py-2 px-3 rounded-lg text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-300 inline-flex items-center justify-center gap-1.5"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Auto-Fill Form</span>
                  </button>
                </div>
              </div>

              {/* Exact Registration Form Replica */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">
                    REGISTRATION FORM
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSandboxFilledKeys({});
                      setSandboxForm((prev) => ({
                        ...prev,
                        firstName: '',
                        lastName: '',
                        password: '',
                        confirmPassword: '',
                        jobTitle: '',
                        company: '',
                        city: '',
                        email: '',
                        phone: '',
                        registrationCategory: '',
                        linkedInUrl: '',
                        dietaryDetails: '',
                      }));
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    Clear Form
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                  {/* First Name / Last Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sandboxForm.firstName}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, firstName: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.firstName
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sandboxForm.lastName}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, lastName: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.lastName
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>

                  {/* Create Password / Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Create Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sandboxForm.password}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, password: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs font-mono rounded-md border transition-colors ${
                        sandboxFilledKeys.password
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sandboxForm.confirmPassword}
                      onChange={(e) =>
                        setSandboxForm((p) => ({
                          ...p,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className={`w-full h-10 px-3 text-xs font-mono rounded-md border transition-colors ${
                        sandboxFilledKeys.confirmPassword
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>

                  {/* Job Title / Company */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Job Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sandboxForm.jobTitle}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, jobTitle: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.jobTitle
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Company <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sandboxForm.company}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, company: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.company
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>

                  {/* City / Country */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sandboxForm.city}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, city: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.city
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Country <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={sandboxForm.country}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, country: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.country
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {!COUNTRY_OPTIONS.includes(sandboxForm.country as never) &&
                        sandboxForm.country && (
                          <option value={sandboxForm.country}>
                            {sandboxForm.country}
                          </option>
                        )}
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email / Phone */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={sandboxForm.email}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, email: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.email
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={sandboxForm.phone}
                      onChange={(e) =>
                        setSandboxForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.phone
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>

                  {/* Registration Category / Basic Combo Ticket */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Registration Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={sandboxForm.registrationCategory}
                      onChange={(e) =>
                        setSandboxForm((p) => ({
                          ...p,
                          registrationCategory: e.target.value,
                        }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.registrationCategory
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      <option value="">Select Registration Category</option>
                      {ticketCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Basic Combo Ticket
                    </label>
                    <select
                      value={sandboxForm.basicComboTicket}
                      onChange={(e) =>
                        setSandboxForm((p) => ({
                          ...p,
                          basicComboTicket: e.target.value as 'Yes' | 'No',
                        }))
                      }
                      className="w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-slate-100 text-slate-600"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {/* LinkedIn Profile Link / Share Details Radio */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      LinkedIn Profile Link
                    </label>
                    <input
                      type="url"
                      value={sandboxForm.linkedInUrl}
                      onChange={(e) =>
                        setSandboxForm((p) => ({
                          ...p,
                          linkedInUrl: e.target.value,
                        }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.linkedInUrl
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Share my details with Expo&apos;s carefully chosen partners{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-5 h-9">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="sandbox-share-details"
                          checked={sandboxForm.shareDetailsWithPartners === 'Yes'}
                          onChange={() =>
                            setSandboxForm((p) => ({
                              ...p,
                              shareDetailsWithPartners: 'Yes',
                            }))
                          }
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="sandbox-share-details"
                          checked={sandboxForm.shareDetailsWithPartners === 'No'}
                          onChange={() =>
                            setSandboxForm((p) => ({
                              ...p,
                              shareDetailsWithPartners: 'No',
                            }))
                          }
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>

                  {/* Dietary / Stadium Tour */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Do you have any dietary requirements?{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={sandboxForm.hasDietary}
                      onChange={(e) =>
                        setSandboxForm((p) => ({
                          ...p,
                          hasDietary: e.target.value as 'Yes' | 'No',
                        }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.hasDietary
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                    {sandboxForm.hasDietary === 'Yes' && (
                      <input
                        type="text"
                        value={sandboxForm.dietaryDetails}
                        onChange={(e) =>
                          setSandboxForm((p) => ({
                            ...p,
                            dietaryDetails: e.target.value,
                          }))
                        }
                        placeholder="Dietary details..."
                        className="mt-2 w-full h-9 px-3 text-xs rounded-md border border-emerald-400 bg-emerald-50/30"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Stadium Tour <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Limit to 10
                      </span>
                    </div>
                    <select
                      value={sandboxForm.stadiumTour}
                      onChange={(e) =>
                        setSandboxForm((p) => ({
                          ...p,
                          stadiumTour: e.target.value as 'Yes' | 'No',
                        }))
                      }
                      className={`w-full h-10 px-3 text-xs rounded-md border transition-colors ${
                        sandboxFilledKeys.stadiumTour
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Works on React, WordPress, Bootstrap, and standard HTML registration forms.
          </div>
          <div className="flex items-center gap-2">
            {delegates.length > 1 && selectedDelegate && (
              <button
                type="button"
                onClick={goNext}
                className="h-9 px-3.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg inline-flex items-center gap-1 transition-colors"
              >
                <span>Next Delegate</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
