import React, { useMemo, useState } from 'react';
import { CheckCircle2, History, MessageSquare, Search, X } from 'lucide-react';
import { formatTimestamp } from '../services/audit';
import { AuditActionType, AuditLogEntry, ChangeRequest } from '../types';

interface AuditDrawerProps {
  isOpen: boolean;
  initialTab: 'audit' | 'requests';
  hideRequestsTab?: boolean;
  onClose: () => void;
  isAdmin: boolean;
  auditLogs: AuditLogEntry[];
  changeRequests: ChangeRequest[];
  onResolveChangeRequest: (requestId: string) => void;
}

const ACTION_LABELS: Record<AuditActionType, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  LOCK: 'Locked',
  UNLOCK: 'Unlocked',
  FREEZE: 'Portal Frozen',
  UNFREEZE: 'Portal Unfrozen',
  IMPORT: 'Bulk Import',
  QUOTA_UPDATE: 'Quota Updated',
  PARTNER_CREATE: 'Partner Added',
  EVENT_CREATE: 'Event Created',
  COORDINATOR_CREATE: 'Coordinator Added',
  CONFIG_UPDATE: 'Tickets / Titles',
  CHANGE_REQUEST: 'Change Request',
  RESOLVE_REQUEST: 'Request Resolved',
};

export const AuditDrawer: React.FC<AuditDrawerProps> = ({
  isOpen,
  initialTab,
  hideRequestsTab = false,
  onClose,
  isAdmin,
  auditLogs,
  changeRequests,
  onResolveChangeRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'requests'>(
    hideRequestsTab ? 'audit' : initialTab
  );
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(hideRequestsTab ? 'audit' : initialTab);
    }
  }, [isOpen, initialTab, hideRequestsTab]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditLogs.filter((entry) => {
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
      if (!q) return true;
      return (
        entry.delegateName.toLowerCase().includes(q) ||
        entry.actorEmail.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        (entry.field?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [auditLogs, search, actionFilter]);

  const pendingRequestsCount = changeRequests.filter(
    (r) => r.status === 'pending'
  ).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-drawer-title"
    >
      <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="audit-drawer-title" className="text-base font-bold text-slate-900">
              Audit Trail &amp; Change Requests
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable record of delegate updates, locks, imports, and freeze requests.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit drawer"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Log ({auditLogs.length})</span>
            </button>
            {!hideRequestsTab && (
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'requests'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  Change Requests ({pendingRequestsCount} pending)
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Audit Log */}
        {activeTab === 'audit' ? (
          <>
            <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by delegate, user, or field..."
                  className="w-full h-8 pl-8 pr-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                aria-label="Filter by action type"
                className="h-8 px-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
              >
                <option value="all">All Actions</option>
                <option value="CREATE">Created</option>
                <option value="UPDATE">Updated</option>
                <option value="DELETE">Deleted</option>
                <option value="LOCK">Locked</option>
                <option value="UNLOCK">Unlocked</option>
                <option value="IMPORT">Bulk Import</option>
                <option value="FREEZE">Portal Freeze</option>
                <option value="QUOTA_UPDATE">Quota Updates</option>
                <option value="PARTNER_CREATE">Partner Added</option>
                <option value="EVENT_CREATE">Event Created</option>
                <option value="COORDINATOR_CREATE">Coordinator Added</option>
                <option value="CONFIG_UPDATE">Tickets &amp; Titles</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  No audit events match your filter.
                </div>
              ) : (
                filteredLogs.map((entry) => (
                  <div key={entry.id} className="px-6 py-3.5 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-[11px] font-semibold ${
                            entry.action === 'DELETE'
                              ? 'text-rose-700'
                              : entry.action === 'LOCK' || entry.action === 'FREEZE'
                              ? 'text-amber-700'
                              : entry.action === 'CREATE' ||
                                entry.action === 'IMPORT' ||
                                entry.action === 'PARTNER_CREATE' ||
                                entry.action === 'EVENT_CREATE' ||
                                entry.action === 'COORDINATOR_CREATE'
                              ? 'text-emerald-700'
                              : 'text-indigo-700'
                          }`}
                        >
                          {ACTION_LABELS[entry.action]}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {entry.delegateName}
                        </span>
                      </div>
                      <time className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                        {formatTimestamp(entry.timestamp)}
                      </time>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">{entry.summary}</p>

                    {entry.oldValue !== undefined && entry.newValue !== undefined && (
                      <div className="mt-2 px-2.5 py-1.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700 flex flex-wrap items-center gap-1.5">
                        {entry.field && (
                          <span className="font-semibold text-slate-900">{entry.field}:</span>
                        )}
                        <span className="text-rose-700 line-through">{entry.oldValue}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-700 font-medium">{entry.newValue}</span>
                      </div>
                    )}

                    <div className="mt-1.5 text-[11px] text-slate-400 font-mono">
                      by {entry.actorEmail}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Tab 2: Change Requests */
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {changeRequests.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  No change requests submitted yet
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  When a row is locked or the portal is globally frozen, partners can click Request on any delegate row to send an edit note here.
                </p>
              </div>
            ) : (
              changeRequests.map((req) => (
                <div key={req.id} className="px-6 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-900">
                          {req.delegateName}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-slate-500">{req.partnerName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {req.requestedBy} · {formatTimestamp(req.createdAt)}
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-semibold ${
                        req.status === 'pending'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {req.status === 'pending' ? 'Pending' : 'Resolved'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
                    {req.note}
                  </p>

                  {req.status === 'pending' && isAdmin && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onResolveChangeRequest(req.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    </div>
                  )}

                  {req.status === 'resolved' && req.resolvedBy && (
                    <div className="text-[11px] text-emerald-700 font-mono">
                      Resolved by {req.resolvedBy}
                      {req.resolvedAt ? ` · ${formatTimestamp(req.resolvedAt)}` : ''}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
