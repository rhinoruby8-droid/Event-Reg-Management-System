import React from 'react';
import { LogOut } from 'lucide-react';
import { AuthSession, EventItem } from '../types';

interface HeaderProps {
  session: AuthSession;
  activeEvent: EventItem;
  eventsCount: number;
  pendingRequestsCount: number;
  auditCount: number;
  onOpenEventsModal: () => void;
  onOpenAuditDrawer: (initialTab?: 'audit' | 'requests') => void;
  onOpenQuotaModal: () => void;
  onOpenTicketColumnModal: () => void;
  onRequestResetDemo: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  activeEvent,
  eventsCount,
  pendingRequestsCount,
  auditCount,
  onOpenEventsModal,
  onOpenAuditDrawer,
  onOpenQuotaModal,
  onOpenTicketColumnModal,
  onRequestResetDemo,
  onLogout,
}) => {
  const isAdmin = session.role === 'super_admin';
  const isCoordinator = session.role === 'event_coordinator';

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      <div className="w-full px-5 lg:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          {activeEvent.name}
        </div>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto"
        >
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenEventsModal}
              className="text-indigo-700 font-semibold hover:text-indigo-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-indigo-400"
            >
              Events ({eventsCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenAuditDrawer('audit')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-slate-300"
          >
            Audit Log ({auditCount})
          </button>

          {!isCoordinator && (
            <button
              type="button"
              onClick={() => onOpenAuditDrawer('requests')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                pendingRequestsCount > 0
                  ? 'text-amber-700 font-semibold border-amber-500 hover:text-amber-800'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Change Requests{pendingRequestsCount > 0 ? ` (${pendingRequestsCount})` : ''}
            </button>
          )}

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onOpenQuotaModal}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-slate-300"
              >
                Partner Quotas
              </button>
              <button
                type="button"
                onClick={onOpenTicketColumnModal}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-slate-300"
              >
                Tickets &amp; Titles
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onRequestResetDemo}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-slate-300"
          >
            Reset Demo
          </button>
        </nav>

        {/* Zone 3: Account identity + single Sign Out action */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
            <span className="font-semibold text-slate-900">{session.name}</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              {isAdmin
                ? 'Global Super Admin'
                : isCoordinator
                ? `Event Coordinator (${activeEvent.name})`
                : session.partnerName}
            </span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
