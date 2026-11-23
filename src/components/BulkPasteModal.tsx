import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardPaste, X } from 'lucide-react';
import { parseExcelPaste } from '../services/excel';
import { getRowErrorCount, validateCandidateDelegates } from '../services/validation';
import { Delegate, PartnerCompany } from '../types';

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  partners: PartnerCompany[];
  defaultPartnerId: string;
  isAdmin: boolean;
  actorEmail: string;
  existingDelegates: Delegate[];
  onImport: (delegates: Delegate[], sourceLabel: string) => void;
}

const SAMPLE_TSV = [
  'First Name\tLast Name\tJob Title\tCompany\tCountry\tEmail\tCategory\tPhone\tAwards Night\tDay 1 Workshop\tDay 2\tDay 3\tStadium Tour\tHas Dietary\tDietary Details\tExperience Level\tIndustry\tPromo Code\tShare Details\tNewsletter',
  'Oliver\tBennett\tLead Scheduler\tSolid Support Pty Ltd\tAustralia\to.bennett@solidsupport.com.au\tPartner\t+61 419 220 318\tYes\tYes\tYes\tYes\tNo\tYes\tHalal\tSenior Management\tInfrastructure\tPCE26-PLAT\tYes\tYes',
  'Rachel\tKim\tProject Controls Director\tLendlease (Guest Solid Support)\tAustralia\tr.kim@lendlease-guest.com.au\tVIP\t+61 428 773 910\tYes\tNo\tYes\tYes\tYes\tNo\t\tExecutive/Decision Maker\tBuilding\tVIP-GUEST\tYes\tNo',
].join('\n');

export const BulkPasteModal: React.FC<BulkPasteModalProps> = ({
  isOpen,
  onClose,
  eventId,
  partners,
  defaultPartnerId,
  isAdmin,
  actorEmail,
  existingDelegates,
  onImport,
}) => {
  const [targetPartnerId, setTargetPartnerId] = useState(defaultPartnerId);
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTargetPartnerId(defaultPartnerId);
    }
  }, [isOpen, defaultPartnerId]);

  const activePartner =
    partners.find((p) => p.id === targetPartnerId) ?? partners[0];

  const parsed = useMemo(() => {
    if (!rawText.trim() || !activePartner) {
      return { delegates: [], detectedHeaderRow: false, mappedColumns: [] };
    }
    return parseExcelPaste(
      rawText,
      eventId,
      activePartner.id,
      activePartner.name,
      actorEmail
    );
  }, [rawText, eventId, activePartner, actorEmail]);

  const validationMap = useMemo(() => {
    return validateCandidateDelegates(parsed.delegates, existingDelegates);
  }, [parsed.delegates, existingDelegates]);

  if (!isOpen) return null;

  const errorRowCount = parsed.delegates.filter(
    (d) => getRowErrorCount(validationMap[d.id]) > 0
  ).length;

  const handleConfirmImport = () => {
    if (parsed.delegates.length === 0) return;
    onImport(parsed.delegates, 'Excel Clipboard Paste');
    setRawText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-paste-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ClipboardPaste className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 id="bulk-paste-title" className="text-base font-bold text-slate-900">
                Paste Delegates from Excel
              </h2>
              <p className="text-xs text-slate-500">
                Copy rows directly from Microsoft Excel or Google Sheets (tab-separated) and paste below.
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="paste-partner-select"
                  className="text-xs font-semibold text-slate-700"
                >
                  Assign to Partner:
                </label>
                <select
                  id="paste-partner-select"
                  value={targetPartnerId}
                  onChange={(e) => setTargetPartnerId(e.target.value)}
                  className="h-9 px-3 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-slate-600">
                Importing into: <strong className="text-slate-900">{activePartner?.name}</strong>
              </div>
            )}

            <button
              type="button"
              onClick={() => setRawText(SAMPLE_TSV)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline whitespace-nowrap self-start sm:self-auto"
            >
              Load Sample 2 Excel Rows
            </button>
          </div>

          <div>
            <label htmlFor="paste-textarea" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tab-Separated Spreadsheet Data (Headers auto-detected, or 20-column schema order)
            </label>
            <textarea
              id="paste-textarea"
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`First Name\tLast Name\tJob Title\tCompany\tCountry\tEmail\tCategory\tPhone\tAwards Night\tDay 1...\nJane\tSmith\tProject Director\t${activePartner?.name || 'Company'}\tAustralia\tjane@company.com.au\tPartner\t+61 400 000 000\tYes\tYes...`}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          {/* Live Parsed Preview */}
          {parsed.delegates.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    Parsed Preview ({parsed.delegates.length}{' '}
                    {parsed.delegates.length === 1 ? 'row' : 'rows'})
                  </span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="text-slate-500">
                    {parsed.detectedHeaderRow
                      ? `Matched ${parsed.mappedColumns.length} header columns automatically`
                      : `Mapped ${parsed.mappedColumns.length} positional columns`}
                  </span>
                </div>

                {errorRowCount > 0 ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorRowCount} {errorRowCount === 1 ? 'row has' : 'rows have'} validation errors (editable after import)
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All rows passed validation
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-auto max-h-60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-[11px] font-semibold text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 border-b border-slate-200">#</th>
                      <th className="px-3 py-2 border-b border-slate-200">Status</th>
                      <th className="px-3 py-2 border-b border-slate-200">Name</th>
                      <th className="px-3 py-2 border-b border-slate-200">Job Title</th>
                      <th className="px-3 py-2 border-b border-slate-200">Company</th>
                      <th className="px-3 py-2 border-b border-slate-200">Email</th>
                      <th className="px-3 py-2 border-b border-slate-200">Category</th>
                      <th className="px-3 py-2 border-b border-slate-200">Dietary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsed.delegates.map((d, idx) => {
                      const errs = validationMap[d.id] || {};
                      const errMessages = Object.values(errs);
                      const hasErr = errMessages.length > 0;
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
                                title={errMessages.join(' | ')}
                              >
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{errMessages[0]}</span>
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Valid</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                            {d.firstName} {d.lastName}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{d.jobTitle || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{d.company || '—'}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{d.email || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{d.registrationCategory}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {d.hasDietary ? d.dietaryDetails || 'Missing details!' : 'None'}
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            Quota rules and duplicate email checks apply automatically upon import.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsed.delegates.length === 0}
              onClick={handleConfirmImport}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              Import {parsed.delegates.length}{' '}
              {parsed.delegates.length === 1 ? 'Delegate' : 'Delegates'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
