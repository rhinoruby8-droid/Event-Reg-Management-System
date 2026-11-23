import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  SlidersHorizontal,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  buildMappedDelegatesImport,
  buildMappedPartnersImport,
  detectBestImportMode,
  downloadExcelTemplate,
  downloadPartnerDirectoryTemplate,
  ImportMappingKey,
  ImportMode,
  MAPPING_FIELD_GROUPS,
  ParsedWorkbook,
  readWorkbookRaw,
  suggestColumnMappings,
} from '../services/excel';
import { getRowErrorCount, validateCandidateDelegates } from '../services/validation';
import { CustomTicketField, Delegate, PartnerCompany, UserAccount } from '../types';

export interface UniversalExcelImportResult {
  mode: ImportMode;
  delegates: Delegate[];
  newPartners: PartnerCompany[];
  newUsers: UserAccount[];
  sourceLabel: string;
}

interface ExcelImportModalProps {
  isOpen: boolean;
  initialMode?: ImportMode;
  partnersOnly?: boolean;
  eventId: string;
  eventName: string;
  onClose: () => void;
  partners: PartnerCompany[];
  users: UserAccount[];
  customTicketFields: CustomTicketField[];
  defaultPartnerId: string;
  isAdmin: boolean;
  actorEmail: string;
  existingDelegates: Delegate[];
  onImportComplete: (result: UniversalExcelImportResult) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  initialMode = 'delegates',
  partnersOnly = false,
  eventId,
  eventName,
  onClose,
  partners,
  users,
  customTicketFields,
  defaultPartnerId,
  isAdmin,
  actorEmail,
  existingDelegates,
  onImportComplete,
}) => {
  const [importMode, setImportMode] = useState<ImportMode>(
    partnersOnly ? 'partners' : isAdmin ? initialMode : 'delegates'
  );
  const [targetPartnerId, setTargetPartnerId] = useState(defaultPartnerId);
  const [autoCreatePartners, setAutoCreatePartners] = useState(true);

  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState(0); // -1 means no header row
  const [columnMapping, setColumnMapping] = useState<ImportMappingKey[]>([]);
  const [showMapper, setShowMapper] = useState(true);

  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetPartnerId(defaultPartnerId);
      setImportMode(partnersOnly ? 'partners' : isAdmin ? initialMode : 'delegates');
    }
  }, [isOpen, defaultPartnerId, isAdmin, initialMode, partnersOnly]);

  const activeSheet = workbook?.sheets[selectedSheetIndex] ?? null;

  // Extract headers and data rows based on chosen headerRowIndex
  const { headers, dataRows } = useMemo(() => {
    if (!activeSheet || activeSheet.rows.length === 0) {
      return { headers: [] as string[], dataRows: [] as unknown[][] };
    }
    const maxCols = activeSheet.rows.reduce(
      (max, r) => Math.max(max, Array.isArray(r) ? r.length : 0),
      0
    );

    if (headerRowIndex < 0) {
      return {
        headers: Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`),
        dataRows: activeSheet.rows,
      };
    }

    const safeHeaderIdx = Math.min(headerRowIndex, activeSheet.rows.length - 1);
    const rawHeaderRow = activeSheet.rows[safeHeaderIdx] || [];
    const extractedHeaders = Array.from({ length: maxCols }, (_, i) => {
      const label = String(rawHeaderRow[i] ?? '').trim();
      return label || `Column ${i + 1}`;
    });

    return {
      headers: extractedHeaders,
      dataRows: activeSheet.rows.slice(safeHeaderIdx + 1),
    };
  }, [activeSheet, headerRowIndex]);

  // Re-run smart auto-mapping whenever sheet, header row, or mode changes
  useEffect(() => {
    if (headers.length === 0) {
      setColumnMapping([]);
      return;
    }
    setColumnMapping(
      suggestColumnMappings(headers, dataRows, importMode, customTicketFields)
    );
  }, [headers, dataRows, importMode, customTicketFields]);

  const activePartner =
    partners.find((p) => p.id === targetPartnerId) ?? partners[0];

  // Mode A: Delegates + optional Auto-Created Partners
  const delegateImportPreview = useMemo(() => {
    if (importMode !== 'delegates' || dataRows.length === 0) {
      return {
        delegates: [] as Delegate[],
        newPartners: [] as PartnerCompany[],
        newUsers: [] as UserAccount[],
      };
    }
    return buildMappedDelegatesImport({
      dataRows,
      columnMapping,
      existingPartners: partners,
      existingUsers: users,
      eventId,
      eventName,
      fallbackPartnerId: activePartner?.id || defaultPartnerId,
      autoCreatePartners: isAdmin && autoCreatePartners,
      actorEmail,
    });
  }, [
    importMode,
    dataRows,
    columnMapping,
    partners,
    users,
    eventId,
    eventName,
    activePartner,
    defaultPartnerId,
    isAdmin,
    autoCreatePartners,
    actorEmail,
  ]);

  const delegateValidationMap = useMemo(() => {
    return validateCandidateDelegates(
      delegateImportPreview.delegates,
      existingDelegates
    );
  }, [delegateImportPreview.delegates, existingDelegates]);

  // Mode B: Partner Companies Directory
  const partnerCandidates = useMemo(() => {
    if (importMode !== 'partners' || dataRows.length === 0) return [];
    return buildMappedPartnersImport({
      dataRows,
      columnMapping,
      existingPartners: partners,
      existingUsers: users,
    });
  }, [importMode, dataRows, columnMapping, partners, users]);

  const validPartnerCandidates = useMemo(
    () => partnerCandidates.filter((p) => p.errors.length === 0),
    [partnerCandidates]
  );

  if (!isOpen) return null;

  const resetFileState = () => {
    setWorkbook(null);
    setSelectedSheetIndex(0);
    setHeaderRowIndex(0);
    setColumnMapping([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (file: File) => {
    setParseError(null);
    try {
      const parsed = await readWorkbookRaw(file);
      const firstSheet = parsed.sheets[0];
      const detectedHeaderIdx = firstSheet.suggestedHeaderRowIndex;
      const firstHeaders = (firstSheet.rows[detectedHeaderIdx] || []).map((c) =>
        String(c ?? '').trim()
      );

      setWorkbook(parsed);
      setSelectedSheetIndex(0);
      setHeaderRowIndex(detectedHeaderIdx);

      // Auto-switch to Partner Directory mode if uploaded file is clearly a partner list
      if (partnersOnly) {
        setImportMode('partners');
      } else if (isAdmin) {
        const autoMode = detectBestImportMode(firstHeaders, isAdmin);
        setImportMode(autoMode);
      }
      setShowMapper(true);
    } catch (err) {
      setParseError(
        err instanceof Error
          ? err.message
          : 'Could not read spreadsheet. Supported formats: .xlsx, .xls, .xlsm, .ods, .csv, .tsv.'
      );
      setWorkbook(null);
    }
  };

  const handleSheetChange = (idx: number) => {
    setSelectedSheetIndex(idx);
    const nextSheet = workbook?.sheets[idx];
    if (nextSheet) {
      setHeaderRowIndex(nextSheet.suggestedHeaderRowIndex);
    }
  };

  const handleMappingChange = (colIndex: number, nextKey: ImportMappingKey) => {
    setColumnMapping((prev) => {
      const updated = [...prev];
      updated[colIndex] = nextKey;
      return updated;
    });
  };

  const handleConfirmImport = () => {
    if (!workbook) return;

    if (importMode === 'delegates') {
      if (delegateImportPreview.delegates.length === 0) return;
      onImportComplete({
        mode: 'delegates',
        delegates: delegateImportPreview.delegates,
        newPartners: delegateImportPreview.newPartners,
        newUsers: delegateImportPreview.newUsers,
        sourceLabel: `${workbook.fileName} (${activeSheet?.name || 'Sheet1'})`,
      });
    } else {
      if (validPartnerCandidates.length === 0) return;
      const newPartners: PartnerCompany[] = [];
      const newUsers: UserAccount[] = [];

      validPartnerCandidates.forEach((cand, idx) => {
        const slug = cand.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const partnerId = `partner-${slug || 'org'}-${Date.now().toString(36)}-${idx}`;
        newPartners.push({
          id: partnerId,
          eventId,
          name: cand.name,
          tier: cand.tier,
          standNumber: cand.standNumber,
          complimentaryQuota: cand.complimentaryQuota,
          awardsQuota: cand.awardsQuota,
          primaryContactEmail: cand.loginEmail,
        });
        newUsers.push({
          id: `user-${slug || 'partner'}-${Date.now().toString(36)}-${idx}`,
          email: cand.loginEmail,
          password: cand.loginPassword,
          name: cand.contactName,
          role: 'partner_admin',
          eventId,
          eventName,
          partnerId,
          partnerName: cand.name,
        });
      });

      onImportComplete({
        mode: 'partners',
        delegates: [],
        newPartners,
        newUsers,
        sourceLabel: `${workbook.fileName} (${activeSheet?.name || 'Sheet1'})`,
      });
    }

    resetFileState();
    onClose();
  };

  const mappedCount = columnMapping.filter((k) => k !== 'ignore').length;
  const delegateErrorRowCount = delegateImportPreview.delegates.filter(
    (d) => getRowErrorCount(delegateValidationMap[d.id]) > 0
  ).length;
  const partnerErrorRowCount = partnerCandidates.length - validPartnerCandidates.length;

  const canConfirm =
    importMode === 'delegates'
      ? delegateImportPreview.delegates.length > 0
      : validPartnerCandidates.length > 0;

  const partnerNameById = new Map<string, string>();
  partners.forEach((p) => partnerNameById.set(p.id, p.name));
  delegateImportPreview.newPartners.forEach((p) => partnerNameById.set(p.id, p.name));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="excel-upload-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h2 id="excel-upload-title" className="text-base font-bold text-slate-900">
                Universal Excel Upload (Any Format &amp; Partner Details)
              </h2>
              <p className="text-xs text-slate-500">
                Upload any .xlsx, .xls, .ods, or .csv spreadsheet. Automatically detects sheets, headers, partner details, and lets you map any custom column.
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Controls: Mode Switcher + Template Downloads */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {partnersOnly ? (
              <div className="text-xs text-slate-600">
                Uploading partner companies for:{' '}
                <strong className="text-slate-900">{eventName}</strong>
              </div>
            ) : isAdmin ? (
              <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
                <button
                  type="button"
                  onClick={() => setImportMode('delegates')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    importMode === 'delegates'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Delegates (+ Partner Details)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('partners')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    importMode === 'partners'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Partner Companies Directory</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-600">
                Uploading delegates for:{' '}
                <strong className="text-slate-900">{activePartner?.name}</strong> ({eventName})
              </div>
            )}

            <div className="flex items-center flex-wrap gap-3">
              {!partnersOnly && (
                <button
                  type="button"
                  onClick={() =>
                    downloadExcelTemplate(activePartner?.name || 'Partner Company')
                  }
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Delegates Template (.xlsx)</span>
                </button>
              )}
              {(isAdmin || partnersOnly) && (
                <>
                  {!partnersOnly && (
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadPartnerDirectoryTemplate()}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Partner Directory Template (.xlsx)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* File Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void processFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-6 py-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : workbook
                ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processFile(file);
              }}
              className="hidden"
            />
            <Upload
              className={`w-6 h-6 mx-auto mb-2 ${
                workbook ? 'text-emerald-600' : 'text-slate-400'
              }`}
            />
            <div className="text-sm font-semibold text-slate-900">
              {workbook
                ? `Loaded: ${workbook.fileName} (${workbook.sheets.length} ${
                    workbook.sheets.length === 1 ? 'worksheet' : 'worksheets'
                  }) — click to replace`
                : 'Drop any Excel or CSV file here, or click to browse'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports .xlsx, .xls, .xlsm, .xlsb, .ods, .csv, and .tsv · Handles custom headers, Full Name columns, and multi-partner rosters
            </p>
          </div>

          {parseError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Workbook Controls: Sheet Picker, Header Row Picker, Default Partner & Auto-Create Toggle */}
          {workbook && activeSheet && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
              <div className="flex flex-wrap items-center gap-4">
                {workbook.sheets.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="sheet-selector"
                      className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                    >
                      Worksheet:
                    </label>
                    <select
                      id="sheet-selector"
                      value={selectedSheetIndex}
                      onChange={(e) => handleSheetChange(Number(e.target.value))}
                      className="h-8 px-2.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                    >
                      {workbook.sheets.map((s, i) => (
                        <option key={s.name} value={i}>
                          {s.name} ({s.rows.length} rows)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="header-row-selector"
                    className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                  >
                    Header Row:
                  </label>
                  <select
                    id="header-row-selector"
                    value={headerRowIndex}
                    onChange={(e) => setHeaderRowIndex(Number(e.target.value))}
                    className="h-8 px-2.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                  >
                    <option value={-1}>No header row (Row 1 is data)</option>
                    {activeSheet.rows.slice(0, 8).map((row, idx) => {
                      const preview = row
                        .filter((c) => String(c ?? '').trim() !== '')
                        .slice(0, 3)
                        .map((c) => String(c).trim())
                        .join(', ');
                      return (
                        <option key={idx} value={idx}>
                          Row {idx + 1}: {preview.slice(0, 48)}
                          {preview.length > 48 ? '…' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {importMode === 'delegates' && isAdmin && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="fallback-partner-select"
                      className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                    >
                      Fallback Partner:
                    </label>
                    <select
                      id="fallback-partner-select"
                      value={targetPartnerId}
                      onChange={(e) => setTargetPartnerId(e.target.value)}
                      className="h-8 px-2.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                    >
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {importMode === 'delegates' && isAdmin && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoCreatePartners}
                      onChange={(e) => setAutoCreatePartners(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong>Auto-create new Partner accounts</strong> when unmatched Partner / Company names appear in the Excel file
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Interactive Column Mapping Panel */}
          {workbook && headers.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMapper((prev) => !prev)}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Column Mapping ({mappedCount} of {headers.length} columns mapped)
                  </span>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    — Adjust any column below to fit your spreadsheet
                  </span>
                </div>
                {showMapper ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {showMapper && (
                <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border-t border-slate-200">
                  {headers.map((header, colIdx) => {
                    const currentVal = columnMapping[colIdx] || 'ignore';
                    const sampleVal = dataRows
                      .slice(0, 5)
                      .map((r) => String(r[colIdx] ?? '').trim())
                      .find(Boolean);

                    return (
                      <div
                        key={colIdx}
                        className={`p-2.5 rounded-lg border transition-colors ${
                          currentVal === 'ignore'
                            ? 'bg-slate-50/70 border-slate-200'
                            : 'bg-indigo-50/30 border-indigo-200'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span
                            className="text-xs font-semibold text-slate-900 truncate"
                            title={header}
                          >
                            {header}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            Col {colIdx + 1}
                          </span>
                        </div>
                        <div
                          className="text-[11px] text-slate-500 truncate mb-2 font-mono"
                          title={sampleVal || '(empty)'}
                        >
                          e.g. {sampleVal || '(empty)'}
                        </div>
                        <select
                          aria-label={`Map column ${header}`}
                          value={currentVal}
                          onChange={(e) =>
                            handleMappingChange(
                              colIdx,
                              e.target.value as ImportMappingKey
                            )
                          }
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                        >
                          {MAPPING_FIELD_GROUPS.map((grp) => (
                            <optgroup key={grp.group} label={grp.group}>
                              {grp.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          {customTicketFields.length > 0 && (
                            <optgroup label="Custom Event Tickets">
                              {customTicketFields.map((t) => (
                                <option key={t.id} value={`custom:${t.id}`}>
                                  {t.label} (Yes/No)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Auto-Detected New Partners Callout (Delegate Mode) */}
          {importMode === 'delegates' &&
            delegateImportPreview.newPartners.length > 0 && (
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-indigo-900">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>
                    {delegateImportPreview.newPartners.length} New Partner{' '}
                    {delegateImportPreview.newPartners.length === 1
                      ? 'Account'
                      : 'Accounts'}{' '}
                    Will Be Created Automatically
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-indigo-800">
                  {delegateImportPreview.newPartners.map((np) => (
                    <span key={np.id}>
                      <strong>{np.name}</strong> ({np.tier} · {np.standNumber} · Quota:{' '}
                      <span className="font-mono tabular-nums">{np.complimentaryQuota}</span> · Login:{' '}
                      <span className="font-mono">{np.primaryContactEmail}</span>)
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Preview Table: DELEGATES MODE */}
          {workbook && importMode === 'delegates' && delegateImportPreview.delegates.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-900">
                  Delegate Preview ({delegateImportPreview.delegates.length} rows)
                </span>
                {delegateErrorRowCount > 0 ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {delegateErrorRowCount}{' '}
                    {delegateErrorRowCount === 1 ? 'row' : 'rows'} with validation errors (highlighted in red — fixable inline after import)
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All rows valid
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-auto max-h-60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-[11px] font-semibold text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 border-b border-slate-200">#</th>
                      <th className="px-3 py-2 border-b border-slate-200">Validation</th>
                      <th className="px-3 py-2 border-b border-slate-200">Partner Account</th>
                      <th className="px-3 py-2 border-b border-slate-200">Name</th>
                      <th className="px-3 py-2 border-b border-slate-200">Job Title</th>
                      <th className="px-3 py-2 border-b border-slate-200">Company</th>
                      <th className="px-3 py-2 border-b border-slate-200">Email</th>
                      <th className="px-3 py-2 border-b border-slate-200">Dietary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {delegateImportPreview.delegates.map((d, idx) => {
                      const errs = Object.values(delegateValidationMap[d.id] || {});
                      const hasErr = errs.length > 0;
                      const isNewPartner = delegateImportPreview.newPartners.some(
                        (np) => np.id === d.partnerId
                      );
                      return (
                        <tr
                          key={d.id}
                          className={hasErr ? 'bg-rose-50/80' : 'bg-white'}
                        >
                          <td className="px-3 py-2 font-mono tabular-nums text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {hasErr ? (
                              <span
                                className="text-rose-700 font-semibold flex items-center gap-1"
                                title={errs.join(' | ')}
                              >
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{errs[0]}</span>
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Valid</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                            <span>{partnerNameById.get(d.partnerId) || 'Partner'}</span>
                            {isNewPartner && (
                              <span className="ml-1.5 text-[10px] font-semibold text-indigo-700">
                                (New)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                            {d.firstName} {d.lastName}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{d.jobTitle || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{d.company || '—'}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{d.email || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {d.hasDietary ? d.dietaryDetails || 'Required!' : 'None'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview Table: PARTNER DIRECTORY MODE */}
          {workbook && importMode === 'partners' && partnerCandidates.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-900">
                  Partner Companies Preview ({validPartnerCandidates.length} ready of{' '}
                  {partnerCandidates.length} rows)
                </span>
                {partnerErrorRowCount > 0 ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {partnerErrorRowCount}{' '}
                    {partnerErrorRowCount === 1 ? 'row skipped' : 'rows skipped'} due to duplicates/errors
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All partner rows ready to create
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-auto max-h-60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-[11px] font-semibold text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 border-b border-slate-200">#</th>
                      <th className="px-3 py-2 border-b border-slate-200">Status</th>
                      <th className="px-3 py-2 border-b border-slate-200">Partner Company</th>
                      <th className="px-3 py-2 border-b border-slate-200">Tier</th>
                      <th className="px-3 py-2 border-b border-slate-200">Stand / Booth</th>
                      <th className="px-3 py-2 border-b border-slate-200">Quotas (Comp / Awards)</th>
                      <th className="px-3 py-2 border-b border-slate-200">Contact</th>
                      <th className="px-3 py-2 border-b border-slate-200">Portal Login Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {partnerCandidates.map((p, idx) => {
                      const hasErr = p.errors.length > 0;
                      return (
                        <tr
                          key={p.id}
                          className={hasErr ? 'bg-rose-50/80' : 'bg-white'}
                        >
                          <td className="px-3 py-2 font-mono tabular-nums text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {hasErr ? (
                              <span
                                className="text-rose-700 font-semibold flex items-center gap-1"
                                title={p.errors.join(' | ')}
                              >
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{p.errors[0]}</span>
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Ready</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900 whitespace-nowrap">
                            {p.name || '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{p.tier}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {p.standNumber}
                          </td>
                          <td className="px-3 py-2 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {p.complimentaryQuota} / {p.awardsQuota}
                          </td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {p.contactName || '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                            {p.loginEmail || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {importMode === 'delegates'
              ? 'Any newly created partner accounts receive immediate Partner Admin portal logins (default password: partner123 unless mapped).'
              : 'Valid partner rows will be provisioned with scoped Partner Admin logins and quota limits immediately.'}
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirmImport}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              {importMode === 'delegates'
                ? `Import ${delegateImportPreview.delegates.length} ${
                    delegateImportPreview.delegates.length === 1 ? 'Delegate' : 'Delegates'
                  }${
                    delegateImportPreview.newPartners.length > 0
                      ? ` + ${delegateImportPreview.newPartners.length} New ${
                          delegateImportPreview.newPartners.length === 1
                            ? 'Partner'
                            : 'Partners'
                        }`
                      : ''
                  }`
                : `Import ${validPartnerCandidates.length} ${
                    validPartnerCandidates.length === 1 ? 'Partner' : 'Partners'
                  }`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
