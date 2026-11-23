import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddPartnerModal, NewPartnerPayload } from './components/AddPartnerModal';
import { AuditDrawer } from './components/AuditDrawer';
import { BulkPasteModal } from './components/BulkPasteModal';
import { ChangeRequestModal } from './components/ChangeRequestModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CoordinatorWorkspace } from './components/CoordinatorWorkspace';
import { DelegateGrid } from './components/DelegateGrid';
import {
  EventsModal,
  NewCoordinatorPayload,
  NewEventPayload,
} from './components/EventsModal';
import {
  ExcelImportModal,
  UniversalExcelImportResult,
} from './components/ExcelImportModal';
import { Header } from './components/Header';
import { KpiBar } from './components/KpiBar';
import { LoginScreen } from './components/LoginScreen';
import { QuotaModal } from './components/QuotaModal';
import { TicketColumnModal } from './components/TicketColumnModal';
import { ToastContainer } from './components/ToastContainer';
import { ExportReportType, WorkspaceToolbar } from './components/WorkspaceToolbar';
import { createAuditEntry, formatAuditValue } from './services/audit';
import {
  canAddPartner,
  canCreateDelegate,
  canEditDelegate,
  clearSession,
  getStoredSession,
  isEventCoordinator,
  isSuperAdmin,
} from './services/auth';
import {
  exportBadgePrintingCsv,
  exportCateringReport,
  exportFullCsv,
  exportFullXlsx,
  exportMarketingOptIn,
  ImportMode,
} from './services/excel';
import { computeQuotaSummary, recalculateTicketTypes } from './services/quota';
import {
  loadPortalState,
  resetPortalState,
  savePortalState,
} from './services/storage';
import { hasAnyErrors, validateAllDelegates } from './services/validation';
import {
  AuthSession,
  ChangeRequest,
  CustomTicketField,
  DEFAULT_COLUMN_TITLES,
  Delegate,
  EditableDelegateField,
  EventItem,
  FIELD_LABELS,
  PartnerCompany,
  PortalState,
  QuickFilter,
  ToastMessage,
  UserAccount,
} from './types';

function getDelegateDisplayName(d: Delegate): string {
  const name = `${d.firstName} ${d.lastName}`.trim();
  return name || d.email || 'New Delegate';
}

function getDefaultCountryForEvent(ev?: EventItem): string {
  const city = (ev?.city || '').toLowerCase();
  if (city.includes('uk') || city.includes('london')) return 'United Kingdom';
  if (city.includes('usa') || city.includes('orlando') || city.includes('united states')) {
    return 'United States';
  }
  if (city.includes('uae') || city.includes('dubai')) return 'United Arab Emirates';
  if (city.includes('singapore')) return 'Singapore';
  if (city.includes('new zealand')) return 'New Zealand';
  return 'Australia';
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [portalState, setPortalState] = useState<PortalState>(() => {
    const loaded = loadPortalState();
    return {
      ...loaded,
      delegates: recalculateTicketTypes(loaded.delegates, loaded.partners),
    };
  });

  // Workspace view filters
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');
  const [focusNewRowId, setFocusNewRowId] = useState<string | null>(null);

  // Modals & Drawers
  const [eventsModalState, setEventsModalState] = useState<{
    open: boolean;
    tab: 'list' | 'create';
  }>({ open: false, tab: 'list' });
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [excelImportState, setExcelImportState] = useState<{
    open: boolean;
    mode: ImportMode;
  }>({ open: false, mode: 'delegates' });
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [ticketColumnModalOpen, setTicketColumnModalOpen] = useState(false);
  const [auditDrawerState, setAuditDrawerState] = useState<{
    open: boolean;
    tab: 'audit' | 'requests';
  }>({ open: false, tab: 'audit' });
  const [changeRequestTarget, setChangeRequestTarget] = useState<Delegate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Delegate | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persist portalState to localStorage whenever it changes
  useEffect(() => {
    savePortalState(portalState);
  }, [portalState]);

  const adminMode = isSuperAdmin(session);
  const coordinatorMode = isEventCoordinator(session);

  // Resolve active event ID based on RBAC:
  // - Global Super Admin switches freely across all events
  // - Event Coordinator & Partner Admin are strictly locked to their assigned event
  const activeEventId = useMemo(() => {
    const fallbackId = portalState.events[0]?.id || 'pce-aus-2026';
    if (!session) return portalState.currentEventId || fallbackId;
    if (adminMode) {
      return portalState.events.some((e) => e.id === portalState.currentEventId)
        ? portalState.currentEventId
        : fallbackId;
    }
    return session.eventId && portalState.events.some((e) => e.id === session.eventId)
      ? session.eventId
      : fallbackId;
  }, [session, adminMode, portalState.currentEventId, portalState.events]);

  const activeEvent = useMemo<EventItem>(() => {
    return (
      portalState.events.find((e) => e.id === activeEventId) ??
      portalState.events[0] ?? {
        id: 'pce-aus-2026',
        name: 'PCE AUS 2026',
        fullName: 'Project Controls Expo Australia 2026',
        city: 'Melbourne, Australia',
        venue: 'Melbourne Cricket Ground',
        dates: '16–18 Nov 2026',
        status: 'active',
        isGlobalFrozen: false,
      }
    );
  }, [portalState.events, activeEventId]);

  const isEventFrozen = Boolean(activeEvent.isGlobalFrozen);

  // Event-scoped slices
  const eventPartners = useMemo(
    () => portalState.partners.filter((p) => p.eventId === activeEventId),
    [portalState.partners, activeEventId]
  );

  const eventDelegates = useMemo(
    () => portalState.delegates.filter((d) => d.eventId === activeEventId),
    [portalState.delegates, activeEventId]
  );

  const eventChangeRequests = useMemo(
    () => portalState.changeRequests.filter((r) => r.eventId === activeEventId),
    [portalState.changeRequests, activeEventId]
  );

  const eventAuditLogs = useMemo(
    () =>
      portalState.auditLogs.filter(
        (log) => !log.eventId || log.eventId === activeEventId
      ),
    [portalState.auditLogs, activeEventId]
  );

  // Determine active partner scope (Partner Admin is strictly locked to their own partnerId)
  const effectivePartnerFilter = adminMode
    ? selectedPartnerFilter
    : session?.partnerId || '';

  // Validate across all delegates IN THE ACTIVE EVENT so duplicate emails are caught per event
  const validationMap = useMemo(
    () => validateAllDelegates(eventDelegates),
    [eventDelegates]
  );

  // Delegates visible within the user's RBAC & partner filter scope
  const scopedDelegates = useMemo(() => {
    if (!session || coordinatorMode) return [];
    if (adminMode) {
      if (effectivePartnerFilter === 'all') return eventDelegates;
      return eventDelegates.filter((d) => d.partnerId === effectivePartnerFilter);
    }
    return eventDelegates.filter((d) => d.partnerId === session.partnerId);
  }, [session, adminMode, coordinatorMode, effectivePartnerFilter, eventDelegates]);

  const scopedPartners = useMemo(() => {
    if (!session) return [];
    if (adminMode) {
      if (effectivePartnerFilter === 'all') return eventPartners;
      return eventPartners.filter((p) => p.id === effectivePartnerFilter);
    }
    if (coordinatorMode) return eventPartners;
    return eventPartners.filter((p) => p.id === session.partnerId);
  }, [session, adminMode, coordinatorMode, effectivePartnerFilter, eventPartners]);

  // Scoped Audit Logs & Change Requests
  const scopedAuditLogs = useMemo(() => {
    if (!session) return [];
    if (adminMode) {
      if (effectivePartnerFilter === 'all') return eventAuditLogs;
      return eventAuditLogs.filter(
        (log) => log.partnerId === null || log.partnerId === effectivePartnerFilter
      );
    }
    if (coordinatorMode) {
      return portalState.auditLogs.filter(
        (log) =>
          log.eventId === activeEventId &&
          (log.action === 'PARTNER_CREATE' ||
            log.action === 'EVENT_CREATE' ||
            log.action === 'COORDINATOR_CREATE')
      );
    }
    return eventAuditLogs.filter(
      (log) =>
        log.partnerId === session.partnerId ||
        log.action === 'FREEZE' ||
        log.action === 'UNFREEZE'
    );
  }, [
    session,
    adminMode,
    coordinatorMode,
    effectivePartnerFilter,
    eventAuditLogs,
    portalState.auditLogs,
    activeEventId,
  ]);

  const scopedChangeRequests = useMemo(() => {
    if (!session || coordinatorMode) return [];
    if (adminMode) {
      if (effectivePartnerFilter === 'all') return eventChangeRequests;
      return eventChangeRequests.filter(
        (r) => r.partnerId === effectivePartnerFilter
      );
    }
    return eventChangeRequests.filter((r) => r.partnerId === session.partnerId);
  }, [session, adminMode, coordinatorMode, effectivePartnerFilter, eventChangeRequests]);

  const pendingRequestsCount = useMemo(
    () => scopedChangeRequests.filter((r) => r.status === 'pending').length,
    [scopedChangeRequests]
  );

  // Live KPIs
  const quotaSummary = useMemo(
    () => computeQuotaSummary(scopedDelegates, scopedPartners),
    [scopedDelegates, scopedPartners]
  );

  // Quick Filter Counts
  const filterCounts = useMemo<Record<QuickFilter, number>>(() => {
    let dietary = 0;
    let awards = 0;
    let chargeable = 0;
    let errors = 0;

    for (const d of scopedDelegates) {
      if (d.hasDietary) dietary += 1;
      if (d.awardsNightDinner) awards += 1;
      if (d.ticketType === 'Chargeable Extra') chargeable += 1;
      if (hasAnyErrors(validationMap[d.id])) errors += 1;
    }

    return {
      all: scopedDelegates.length,
      dietary,
      awards,
      chargeable,
      errors,
    };
  }, [scopedDelegates, validationMap]);

  // Apply Search + Quick Filter
  const visibleDelegates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedDelegates.filter((d) => {
      if (activeFilter === 'dietary' && !d.hasDietary) return false;
      if (activeFilter === 'awards' && !d.awardsNightDinner) return false;
      if (activeFilter === 'chargeable' && d.ticketType !== 'Chargeable Extra')
        return false;
      if (activeFilter === 'errors' && !hasAnyErrors(validationMap[d.id]))
        return false;

      if (!q) return true;
      const haystack = `${d.firstName} ${d.lastName} ${d.email} ${d.company} ${d.jobTitle} ${d.promoCode} ${d.dietaryDetails}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [scopedDelegates, activeFilter, searchQuery, validationMap]);

  // Default partner for adding/importing new delegates
  const defaultTargetPartnerId = useMemo(() => {
    if (!adminMode && session?.partnerId) return session.partnerId;
    if (
      selectedPartnerFilter !== 'all' &&
      eventPartners.some((p) => p.id === selectedPartnerFilter)
    ) {
      return selectedPartnerFilter;
    }
    return eventPartners[0]?.id || '';
  }, [adminMode, session, selectedPartnerFilter, eventPartners]);

  // Handlers
  const handleLogin = (nextSession: AuthSession) => {
    setSession(nextSession);
    setSelectedPartnerFilter('all');
    setSearchQuery('');
    setActiveFilter('all');

    const roleSubtitle =
      nextSession.role === 'super_admin'
        ? 'Global Super Admin — Full multi-event access enabled'
        : nextSession.role === 'event_coordinator'
        ? `Event Coordinator — Scoped to adding partners for ${nextSession.eventName || 'your event'}`
        : `Partner Admin — Scoped to ${nextSession.partnerName}${
            nextSession.eventName ? ` (${nextSession.eventName})` : ''
          }`;

    pushToast('success', `Signed in as ${nextSession.name}`, roleSubtitle);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setAuditDrawerState({ open: false, tab: 'audit' });
    setEventsModalState({ open: false, tab: 'list' });
  };

  const handleSwitchEvent = (nextEventId: string) => {
    if (!adminMode) return;
    const target = portalState.events.find((e) => e.id === nextEventId);
    if (!target) return;

    setPortalState((prev) => ({
      ...prev,
      currentEventId: nextEventId,
      isGlobalFrozen: Boolean(target.isGlobalFrozen),
    }));
    setSelectedPartnerFilter('all');
    setSearchQuery('');
    setActiveFilter('all');
    pushToast(
      'info',
      `Switched to ${target.name}`,
      `${target.city} · ${target.dates}`
    );
  };

  const handleCreateEvent = (payload: NewEventPayload) => {
    if (!session || !adminMode) return;

    const slug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const eventId = `ev-${slug || 'expo'}-${Date.now().toString(36)}`;

    const newEvent: EventItem = {
      id: eventId,
      name: payload.name,
      fullName: payload.fullName,
      city: payload.city,
      venue: payload.venue,
      dates: payload.dates,
      status: payload.status,
      isGlobalFrozen: false,
    };

    let newCoordinator: UserAccount | null = null;
    if (payload.createCoordinator) {
      newCoordinator = {
        id: `user-coord-${slug || 'ev'}-${Date.now().toString(36)}`,
        email: payload.coordinatorEmail,
        password: payload.coordinatorPassword,
        name: payload.coordinatorName,
        role: 'event_coordinator',
        eventId,
        eventName: payload.name,
        partnerId: null,
      };
    }

    setPortalState((prev) => {
      const nextLogs = [...prev.auditLogs];
      nextLogs.unshift(
        createAuditEntry({
          session,
          action: 'EVENT_CREATE',
          eventId,
          partnerId: null,
          delegateName: payload.name,
          summary: `Created event ${payload.name} (${payload.city}, ${payload.venue}, ${payload.dates})`,
        })
      );

      if (newCoordinator) {
        nextLogs.unshift(
          createAuditEntry({
            session,
            action: 'COORDINATOR_CREATE',
            eventId,
            partnerId: null,
            delegateName: newCoordinator.name,
            summary: `Provisioned Event Coordinator ${newCoordinator.email} for ${payload.name} (Add Partners Only)`,
          })
        );
      }

      return {
        ...prev,
        events: [...prev.events, newEvent],
        currentEventId: payload.switchToEvent ? eventId : prev.currentEventId,
        isGlobalFrozen: payload.switchToEvent ? false : prev.isGlobalFrozen,
        users: newCoordinator ? [...prev.users, newCoordinator] : prev.users,
        auditLogs: nextLogs,
      };
    });

    if (payload.switchToEvent) {
      setSelectedPartnerFilter('all');
      setSearchQuery('');
      setActiveFilter('all');
    }

    pushToast(
      'success',
      `Event "${payload.name}" created`,
      newCoordinator
        ? `Coordinator login provisioned: ${newCoordinator.email}`
        : `${payload.city} · ${payload.dates}`
    );
  };

  const handleCreateCoordinator = (payload: NewCoordinatorPayload) => {
    if (!session || !adminMode) return;
    const targetEvent = portalState.events.find((e) => e.id === payload.eventId);
    if (!targetEvent) return;

    const newCoordinator: UserAccount = {
      id: `user-coord-${Date.now().toString(36)}`,
      email: payload.email,
      password: payload.password,
      name: payload.name,
      role: 'event_coordinator',
      eventId: targetEvent.id,
      eventName: targetEvent.name,
      partnerId: null,
    };

    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'COORDINATOR_CREATE',
        eventId: targetEvent.id,
        partnerId: null,
        delegateName: payload.name,
        summary: `Added Event Coordinator ${payload.email} for ${targetEvent.name} (Add Partners Only)`,
      });
      return {
        ...prev,
        users: [...prev.users, newCoordinator],
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    pushToast(
      'success',
      `Coordinator added for ${targetEvent.name}`,
      `Login: ${payload.email}`
    );
  };

  const handleUpdateField = useCallback(
    (
      delegateId: string,
      field: EditableDelegateField,
      nextValue: string | boolean
    ) => {
      if (!session) return;

      setPortalState((prev) => {
        const target = prev.delegates.find((d) => d.id === delegateId);
        if (!target) return prev;
        const targetEvent = prev.events.find((e) => e.id === target.eventId);
        const frozen = Boolean(targetEvent?.isGlobalFrozen);
        if (!canEditDelegate(session, target, frozen)) return prev;

        const oldValue = target[field];
        if (oldValue === nextValue) return prev;

        const updatedDelegate: Delegate = {
          ...target,
          [field]: nextValue,
          ...(field === 'hasDietary' && nextValue === false
            ? { dietaryDetails: '' }
            : {}),
          updatedAt: new Date().toISOString(),
          updatedBy: session.email,
        };

        const nextDelegates = prev.delegates.map((d) =>
          d.id === delegateId ? updatedDelegate : d
        );

        const fieldLabel = FIELD_LABELS[field];
        const entry = createAuditEntry({
          session,
          action: 'UPDATE',
          eventId: target.eventId,
          partnerId: target.partnerId,
          delegateId: target.id,
          delegateName: getDelegateDisplayName(updatedDelegate),
          field: fieldLabel,
          oldValue,
          newValue: nextValue,
          summary: `Updated ${fieldLabel}: "${formatAuditValue(oldValue)}" → "${formatAuditValue(nextValue)}"`,
        });

        return {
          ...prev,
          delegates: nextDelegates,
          auditLogs: [entry, ...prev.auditLogs],
        };
      });

      pushToast(
        'success',
        `Saved ${FIELD_LABELS[field]}`,
        typeof nextValue === 'boolean'
          ? `Set to ${nextValue ? 'Yes' : 'No'}`
          : undefined
      );
    },
    [session, pushToast]
  );

  const handleUpdateCustomTicketValue = useCallback(
    (delegateId: string, ticketId: string, nextValue: boolean) => {
      if (!session) return;

      const ticketLabel =
        portalState.customTicketFields.find((t) => t.id === ticketId)?.label ||
        'Custom Ticket';

      setPortalState((prev) => {
        const target = prev.delegates.find((d) => d.id === delegateId);
        if (!target) return prev;
        const targetEvent = prev.events.find((e) => e.id === target.eventId);
        const frozen = Boolean(targetEvent?.isGlobalFrozen);
        if (!canEditDelegate(session, target, frozen)) return prev;

        const oldValue = Boolean(target.customTickets?.[ticketId]);
        if (oldValue === nextValue) return prev;

        const updatedDelegate: Delegate = {
          ...target,
          customTickets: {
            ...(target.customTickets || {}),
            [ticketId]: nextValue,
          },
          updatedAt: new Date().toISOString(),
          updatedBy: session.email,
        };

        const entry = createAuditEntry({
          session,
          action: 'UPDATE',
          eventId: target.eventId,
          partnerId: target.partnerId,
          delegateId: target.id,
          delegateName: getDelegateDisplayName(updatedDelegate),
          field: ticketLabel,
          oldValue,
          newValue: nextValue,
          summary: `Updated ${ticketLabel}: "${formatAuditValue(oldValue)}" → "${formatAuditValue(nextValue)}"`,
        });

        return {
          ...prev,
          delegates: prev.delegates.map((d) =>
            d.id === delegateId ? updatedDelegate : d
          ),
          auditLogs: [entry, ...prev.auditLogs],
        };
      });

      pushToast(
        'success',
        `Saved ${ticketLabel}`,
        `Set to ${nextValue ? 'Yes' : 'No'}`
      );
    },
    [session, portalState.customTicketFields, pushToast]
  );

  const handleAddCustomTicket = (label: string, showInKpi: boolean) => {
    if (!session || !adminMode) return;
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');
    const newField: CustomTicketField = {
      id: `ticket_${slug || 'custom'}_${Date.now().toString(36)}`,
      label,
      showInKpi,
      createdAt: new Date().toISOString(),
    };

    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'CONFIG_UPDATE',
        eventId: null,
        partnerId: null,
        delegateName: label,
        summary: `Added new ticket column "${label}"${showInKpi ? ' (shown in KPI bar)' : ''}`,
      });
      return {
        ...prev,
        customTicketFields: [...prev.customTicketFields, newField],
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    pushToast(
      'success',
      `Ticket column "${label}" added`,
      'Now live in the grid, KPI bar, and exports.'
    );
  };

  const handleUpdateCustomTicket = (
    ticketId: string,
    updates: { label?: string; showInKpi?: boolean }
  ) => {
    if (!session || !adminMode) return;
    setPortalState((prev) => {
      const nextFields = prev.customTicketFields.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              ...(updates.label !== undefined ? { label: updates.label } : {}),
              ...(updates.showInKpi !== undefined
                ? { showInKpi: updates.showInKpi }
                : {}),
            }
          : t
      );
      return {
        ...prev,
        customTicketFields: nextFields,
      };
    });
  };

  const handleRenameCustomTicket = (ticketId: string, nextLabel: string) => {
    if (!session || !adminMode) return;
    const existing = portalState.customTicketFields.find((t) => t.id === ticketId);
    if (!existing || existing.label === nextLabel) return;

    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'CONFIG_UPDATE',
        eventId: null,
        partnerId: null,
        delegateName: nextLabel,
        field: 'Ticket Title',
        oldValue: existing.label,
        newValue: nextLabel,
        summary: `Renamed ticket column "${existing.label}" → "${nextLabel}"`,
      });
      return {
        ...prev,
        customTicketFields: prev.customTicketFields.map((t) =>
          t.id === ticketId ? { ...t, label: nextLabel } : t
        ),
        auditLogs: [entry, ...prev.auditLogs],
      };
    });
    pushToast(
      'success',
      'Ticket column title updated',
      `"${existing.label}" → "${nextLabel}"`
    );
  };

  const handleDeleteCustomTicket = (ticketId: string) => {
    if (!session || !adminMode) return;
    const target = portalState.customTicketFields.find((t) => t.id === ticketId);
    if (!target) return;

    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'CONFIG_UPDATE',
        eventId: null,
        partnerId: null,
        delegateName: target.label,
        summary: `Removed custom ticket column "${target.label}"`,
      });
      return {
        ...prev,
        customTicketFields: prev.customTicketFields.filter((t) => t.id !== ticketId),
        auditLogs: [entry, ...prev.auditLogs],
      };
    });
    pushToast('warning', `Removed ticket column "${target.label}"`);
  };

  const handleSaveTicketCategories = (categories: string[]) => {
    if (!session || !adminMode) return;
    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'CONFIG_UPDATE',
        eventId: null,
        partnerId: null,
        delegateName: 'Pass Categories',
        summary: `Updated pass categories (${categories.join(', ')})`,
      });
      return {
        ...prev,
        ticketCategories: categories,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });
    pushToast('success', 'Pass categories updated');
  };

  const handleRenameColumnTitle = (fieldKey: string, nextTitle: string) => {
    if (!session || !adminMode) return;
    const oldTitle =
      portalState.columnTitles[fieldKey] ||
      DEFAULT_COLUMN_TITLES[fieldKey as EditableDelegateField] ||
      fieldKey;
    if (oldTitle === nextTitle) return;

    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'CONFIG_UPDATE',
        eventId: null,
        partnerId: null,
        delegateName: 'Header Row Title',
        field: fieldKey,
        oldValue: oldTitle,
        newValue: nextTitle,
        summary: `Renamed column header "${oldTitle}" → "${nextTitle}"`,
      });
      return {
        ...prev,
        columnTitles: {
          ...prev.columnTitles,
          [fieldKey]: nextTitle,
        },
        auditLogs: [entry, ...prev.auditLogs],
      };
    });
    pushToast('success', 'Column header renamed', `"${oldTitle}" → "${nextTitle}"`);
  };

  const handleSaveColumnTitles = (titles: Record<string, string>) => {
    if (!session || !adminMode) return;
    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'CONFIG_UPDATE',
        eventId: null,
        partnerId: null,
        delegateName: 'Header Row Titles',
        summary: 'Updated spreadsheet header row titles',
      });
      return {
        ...prev,
        columnTitles: titles,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });
    pushToast('success', 'Header row titles saved');
  };

  const handleAddRow = () => {
    if (!session || !canCreateDelegate(session, isEventFrozen)) return;

    const targetPartner =
      eventPartners.find((p) => p.id === defaultTargetPartnerId) ??
      eventPartners[0];
    if (!targetPartner) {
      pushToast(
        'warning',
        `Add a partner to ${activeEvent.name} first`,
        'Create or import at least one partner company before adding delegate rows.'
      );
      return;
    }

    const defaultCountry = getDefaultCountryForEvent(activeEvent);
    const now = new Date().toISOString();
    const newDelegate: Delegate = {
      id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventId: activeEventId,
      partnerId: targetPartner.id,
      firstName: '',
      lastName: '',
      jobTitle: '',
      company: targetPartner.name,
      country: defaultCountry,
      email: '',
      registrationCategory: 'Partner',
      phone: '',
      awardsNightDinner: false,
      day1Workshop: false,
      day2: true,
      day3: true,
      stadiumTour: false,
      hasDietary: false,
      dietaryDetails: '',
      experienceLevel: 'Mid-level Management',
      industry: 'Consulting',
      promoCode: '',
      shareDetailsWithPartners: false,
      newsletterOptIn: false,
      isLocked: false,
      ticketType: 'Complimentary',
      createdAt: now,
      updatedAt: now,
      updatedBy: session.email,
    };

    if (activeFilter !== 'all' && activeFilter !== 'errors') {
      setActiveFilter('all');
    }
    if (searchQuery) {
      setSearchQuery('');
    }

    setPortalState((prev) => {
      const nextDelegates = recalculateTicketTypes(
        [...prev.delegates, newDelegate],
        prev.partners
      );
      const assigned = nextDelegates.find((d) => d.id === newDelegate.id);
      const entry = createAuditEntry({
        session,
        action: 'CREATE',
        eventId: activeEventId,
        partnerId: targetPartner.id,
        delegateId: newDelegate.id,
        delegateName: 'New Delegate',
        summary: `Added new delegate row for ${targetPartner.name} in ${activeEvent.name} (${assigned?.ticketType ?? 'Complimentary'})`,
      });
      return {
        ...prev,
        delegates: nextDelegates,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    setFocusNewRowId(newDelegate.id);
    pushToast(
      'info',
      'New delegate row added',
      `Pre-filled company "${targetPartner.name}" and country "${defaultCountry}".`
    );
  };

  const handleDuplicateRow = (delegateId: string) => {
    if (!session || !canCreateDelegate(session, isEventFrozen)) return;

    const source = portalState.delegates.find((d) => d.id === delegateId);
    if (!source) return;

    const now = new Date().toISOString();
    const cloned: Delegate = {
      ...source,
      id: `del-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      firstName: source.firstName ? `${source.firstName} (Copy)` : '',
      email: '',
      isLocked: false,
      createdAt: now,
      updatedAt: now,
      updatedBy: session.email,
    };

    setPortalState((prev) => {
      const idx = prev.delegates.findIndex((d) => d.id === delegateId);
      const inserted = [...prev.delegates];
      inserted.splice(idx + 1, 0, cloned);
      const recalculated = recalculateTicketTypes(inserted, prev.partners);

      const entry = createAuditEntry({
        session,
        action: 'CREATE',
        eventId: source.eventId,
        partnerId: source.partnerId,
        delegateId: cloned.id,
        delegateName: getDelegateDisplayName(cloned),
        summary: `Duplicated delegate row from ${getDelegateDisplayName(source)} (email cleared for uniqueness)`,
      });

      return {
        ...prev,
        delegates: recalculated,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    setFocusNewRowId(cloned.id);
    pushToast(
      'success',
      'Delegate row duplicated',
      'Email cleared so you can enter a unique delegate email.'
    );
  };

  const handleConfirmDelete = () => {
    if (!session || !deleteTarget) return;

    const target = deleteTarget;
    setDeleteTarget(null);

    setPortalState((prev) => {
      const remaining = prev.delegates.filter((d) => d.id !== target.id);
      const recalculated = recalculateTicketTypes(remaining, prev.partners);
      const entry = createAuditEntry({
        session,
        action: 'DELETE',
        eventId: target.eventId,
        partnerId: target.partnerId,
        delegateId: target.id,
        delegateName: getDelegateDisplayName(target),
        summary: `Removed delegate ${getDelegateDisplayName(target)} (${target.email || 'no email'})`,
      });
      return {
        ...prev,
        delegates: recalculated,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    pushToast(
      'warning',
      'Delegate removed',
      `${getDelegateDisplayName(target)} deleted from roster.`
    );
  };

  const handleToggleRowLock = (delegateId: string) => {
    if (!session || !adminMode) return;

    const target = portalState.delegates.find((d) => d.id === delegateId);
    if (!target) return;

    const nextLocked = !target.isLocked;
    setPortalState((prev) => {
      const nextDelegates = prev.delegates.map((d) =>
        d.id === delegateId
          ? {
              ...d,
              isLocked: nextLocked,
              updatedAt: new Date().toISOString(),
              updatedBy: session.email,
            }
          : d
      );
      const entry = createAuditEntry({
        session,
        action: nextLocked ? 'LOCK' : 'UNLOCK',
        eventId: target.eventId,
        partnerId: target.partnerId,
        delegateId: target.id,
        delegateName: getDelegateDisplayName(target),
        field: 'Row Lock',
        oldValue: target.isLocked ? 'Locked' : 'Unlocked',
        newValue: nextLocked ? 'Locked' : 'Unlocked',
        summary: nextLocked
          ? `Locked row for ${getDelegateDisplayName(target)} (read-only for partner)`
          : `Unlocked row for ${getDelegateDisplayName(target)}`,
      });
      return {
        ...prev,
        delegates: nextDelegates,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    pushToast(
      nextLocked ? 'warning' : 'success',
      nextLocked ? 'Delegate row locked' : 'Delegate row unlocked',
      getDelegateDisplayName(target)
    );
  };

  const handleToggleGlobalFreeze = () => {
    if (!session || !adminMode) return;
    const nextFrozen = !isEventFrozen;

    setPortalState((prev) => {
      const nextEvents = prev.events.map((ev) =>
        ev.id === activeEventId ? { ...ev, isGlobalFrozen: nextFrozen } : ev
      );
      const entry = createAuditEntry({
        session,
        action: nextFrozen ? 'FREEZE' : 'UNFREEZE',
        eventId: activeEventId,
        partnerId: null,
        delegateName: `${activeEvent.name} (All Partners)`,
        field: 'Global Freeze',
        oldValue: isEventFrozen ? 'Frozen' : 'Open',
        newValue: nextFrozen ? 'Frozen' : 'Open',
        summary: nextFrozen
          ? `Enabled Global Freeze for ${activeEvent.name} — Partner accounts switched to read-only mode`
          : `Disabled Global Freeze for ${activeEvent.name} — Partner editing reopened`,
      });
      return {
        ...prev,
        events: nextEvents,
        isGlobalFrozen: nextFrozen,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    pushToast(
      nextFrozen ? 'warning' : 'success',
      nextFrozen
        ? `Global Freeze Enabled (${activeEvent.name})`
        : `Global Freeze Disabled (${activeEvent.name})`,
      nextFrozen
        ? 'Partners in this event are now read-only and can submit Change Requests.'
        : 'Partners can resume direct editing on unlocked rows.'
    );
  };

  const handleBulkImport = (incoming: Delegate[], sourceLabel: string) => {
    if (!session || incoming.length === 0) return;

    const partnerId = incoming[0].partnerId;
    const partnerName =
      eventPartners.find((p) => p.id === partnerId)?.name ?? 'Partner';

    setPortalState((prev) => {
      const nextDelegates = recalculateTicketTypes(
        [...prev.delegates, ...incoming],
        prev.partners
      );
      const entry = createAuditEntry({
        session,
        action: 'IMPORT',
        eventId: activeEventId,
        partnerId,
        delegateName: `${incoming.length} Delegates`,
        summary: `Imported ${incoming.length} delegate ${incoming.length === 1 ? 'row' : 'rows'} into ${partnerName} (${activeEvent.name}) via ${sourceLabel}`,
      });
      return {
        ...prev,
        delegates: nextDelegates,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    pushToast(
      'success',
      `Imported ${incoming.length} ${incoming.length === 1 ? 'delegate' : 'delegates'}`,
      `Source: ${sourceLabel}. Any validation errors are highlighted in red.`
    );
  };

  const handleUniversalExcelImport = (result: UniversalExcelImportResult) => {
    if (!session) return;

    const { delegates: incomingDelegates, newPartners, newUsers, sourceLabel, mode } = result;
    if (incomingDelegates.length === 0 && newPartners.length === 0) return;

    setPortalState((prev) => {
      const nextPartners =
        newPartners.length > 0 ? [...prev.partners, ...newPartners] : prev.partners;
      const nextUsers =
        newUsers.length > 0 ? [...prev.users, ...newUsers] : prev.users;
      const nextDelegates =
        incomingDelegates.length > 0
          ? recalculateTicketTypes(
              [...prev.delegates, ...incomingDelegates],
              nextPartners
            )
          : prev.delegates;

      const addedLogs = [...prev.auditLogs];

      if (newPartners.length > 0) {
        addedLogs.unshift(
          createAuditEntry({
            session,
            action: 'PARTNER_CREATE',
            eventId: activeEventId,
            partnerId: newPartners.length === 1 ? newPartners[0].id : null,
            delegateName:
              newPartners.length === 1
                ? newPartners[0].name
                : `${newPartners.length} Partner Companies`,
            summary: `Imported ${newPartners.length} new partner ${
              newPartners.length === 1 ? 'account' : 'accounts'
            } into ${activeEvent.name} (${newPartners.map((p) => p.name).join(', ')}) from ${sourceLabel}`,
          })
        );
      }

      if (incomingDelegates.length > 0) {
        const singlePartnerId =
          new Set(incomingDelegates.map((d) => d.partnerId)).size === 1
            ? incomingDelegates[0].partnerId
            : null;
        addedLogs.unshift(
          createAuditEntry({
            session,
            action: 'IMPORT',
            eventId: activeEventId,
            partnerId: singlePartnerId,
            delegateName: `${incomingDelegates.length} Delegates`,
            summary: `Imported ${incomingDelegates.length} delegate ${
              incomingDelegates.length === 1 ? 'row' : 'rows'
            } into ${activeEvent.name} via ${sourceLabel}`,
          })
        );
      }

      return {
        ...prev,
        partners: nextPartners,
        users: nextUsers,
        delegates: nextDelegates,
        auditLogs: addedLogs,
      };
    });

    if (mode === 'partners') {
      pushToast(
        'success',
        `Imported ${newPartners.length} ${newPartners.length === 1 ? 'partner' : 'partners'} into ${activeEvent.name}`,
        `Partner Admin accounts provisioned from ${sourceLabel}.`
      );
    } else if (newPartners.length > 0) {
      pushToast(
        'success',
        `Imported ${incomingDelegates.length} delegates & ${newPartners.length} new ${
          newPartners.length === 1 ? 'partner' : 'partners'
        }`,
        `Source: ${sourceLabel}.`
      );
    } else {
      pushToast(
        'success',
        `Imported ${incomingDelegates.length} ${
          incomingDelegates.length === 1 ? 'delegate' : 'delegates'
        }`,
        `Source: ${sourceLabel}. Any validation errors are highlighted in red.`
      );
    }
  };

  const handleSaveQuotas = (
    updates: { partnerId: string; complimentaryQuota: number; awardsQuota: number }[]
  ) => {
    if (!session || !adminMode) return;

    setPortalState((prev) => {
      const newLogs = [...prev.auditLogs];
      const nextPartners = prev.partners.map((partner) => {
        const upd = updates.find((u) => u.partnerId === partner.id);
        if (!upd) return partner;
        if (
          upd.complimentaryQuota !== partner.complimentaryQuota ||
          upd.awardsQuota !== partner.awardsQuota
        ) {
          newLogs.unshift(
            createAuditEntry({
              session,
              action: 'QUOTA_UPDATE',
              eventId: partner.eventId,
              partnerId: partner.id,
              delegateName: partner.name,
              field: 'Pass Quotas',
              oldValue: `${partner.complimentaryQuota} Comp / ${partner.awardsQuota} Awards`,
              newValue: `${upd.complimentaryQuota} Comp / ${upd.awardsQuota} Awards`,
              summary: `Updated ${partner.name} quotas to ${upd.complimentaryQuota} complimentary passes and ${upd.awardsQuota} Awards Night seats`,
            })
          );
        }
        return {
          ...partner,
          complimentaryQuota: upd.complimentaryQuota,
          awardsQuota: upd.awardsQuota,
        };
      });

      const recalculated = recalculateTicketTypes(prev.delegates, nextPartners);
      return {
        ...prev,
        partners: nextPartners,
        delegates: recalculated,
        auditLogs: newLogs,
      };
    });

    pushToast(
      'success',
      'Partner quotas updated',
      'Complimentary and Chargeable Extra pass badges recalculated.'
    );
  };

  const handleCreatePartner = (payload: NewPartnerPayload) => {
    if (!session || !canAddPartner(session)) return;

    const slug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const partnerId = `partner-${slug || 'org'}-${Date.now().toString(36)}`;
    const userId = `user-${slug || 'partner'}-${Date.now().toString(36)}`;

    const newPartner: PartnerCompany = {
      id: partnerId,
      eventId: activeEventId,
      name: payload.name,
      tier: payload.tier,
      standNumber: payload.standNumber,
      complimentaryQuota: payload.complimentaryQuota,
      awardsQuota: payload.awardsQuota,
      primaryContactEmail: payload.loginEmail,
    };

    const newUser: UserAccount = {
      id: userId,
      email: payload.loginEmail,
      password: payload.loginPassword,
      name: payload.contactName,
      role: 'partner_admin',
      eventId: activeEventId,
      eventName: activeEvent.name,
      partnerId,
      partnerName: payload.name,
    };

    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'PARTNER_CREATE',
        eventId: activeEventId,
        partnerId,
        delegateName: payload.name,
        summary: `Added partner ${payload.name} to ${activeEvent.name} (${payload.tier}, ${payload.standNumber}) with ${payload.complimentaryQuota} complimentary passes, ${payload.awardsQuota} Awards seats, and login ${payload.loginEmail}`,
      });

      return {
        ...prev,
        partners: [...prev.partners, newPartner],
        users: [...prev.users, newUser],
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    if (adminMode && payload.switchToPartner) {
      setSelectedPartnerFilter(partnerId);
      setActiveFilter('all');
      setSearchQuery('');
    }

    pushToast(
      'success',
      `Partner "${payload.name}" added to ${activeEvent.name}`,
      `Partner Admin login created: ${payload.loginEmail}`
    );
  };

  const handleSubmitChangeRequest = (delegate: Delegate, note: string) => {
    if (!session) return;

    const partnerName =
      eventPartners.find((p) => p.id === delegate.partnerId)?.name ?? 'Partner';
    const request: ChangeRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventId: delegate.eventId,
      delegateId: delegate.id,
      delegateName: getDelegateDisplayName(delegate),
      partnerId: delegate.partnerId,
      partnerName,
      requestedBy: session.email,
      note,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    setPortalState((prev) => {
      const entry = createAuditEntry({
        session,
        action: 'CHANGE_REQUEST',
        eventId: delegate.eventId,
        partnerId: delegate.partnerId,
        delegateId: delegate.id,
        delegateName: getDelegateDisplayName(delegate),
        summary: `Submitted change request: "${note}"`,
      });
      return {
        ...prev,
        changeRequests: [request, ...prev.changeRequests],
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    pushToast(
      'success',
      'Change request sent to Event Organiser',
      `Logged for ${getDelegateDisplayName(delegate)}.`
    );
  };

  const handleResolveChangeRequest = (requestId: string) => {
    if (!session || !adminMode) return;

    setPortalState((prev) => {
      const target = prev.changeRequests.find((r) => r.id === requestId);
      if (!target) return prev;

      const nextRequests = prev.changeRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'resolved' as const,
              resolvedBy: session.email,
              resolvedAt: new Date().toISOString(),
            }
          : r
      );

      const entry = createAuditEntry({
        session,
        action: 'RESOLVE_REQUEST',
        eventId: target.eventId,
        partnerId: target.partnerId,
        delegateId: target.delegateId,
        delegateName: target.delegateName,
        summary: `Marked change request from ${target.requestedBy} as resolved`,
      });

      return {
        ...prev,
        changeRequests: nextRequests,
        auditLogs: [entry, ...prev.auditLogs],
      };
    });

    pushToast('success', 'Change request marked resolved');
  };

  const handleExportReport = (type: ExportReportType) => {
    const eventSlug = activeEvent.name.replace(/[^a-zA-Z0-9]+/g, '_');
    const partnerSlug =
      scopedPartners.length === 1
        ? scopedPartners[0].name.replace(/[^a-zA-Z0-9]+/g, '_')
        : 'All_Partners';
    const scopeSlug = `${eventSlug}_${partnerSlug}`;

    let count = 0;
    let label = '';

    if (type === 'full_xlsx') {
      count = exportFullXlsx(
        scopedDelegates,
        eventPartners,
        scopeSlug,
        portalState.customTicketFields
      );
      label = 'Full List (.xlsx)';
    } else if (type === 'full_csv') {
      count = exportFullCsv(
        scopedDelegates,
        eventPartners,
        scopeSlug,
        portalState.customTicketFields
      );
      label = 'Full List (.csv)';
    } else if (type === 'catering') {
      count = exportCateringReport(scopedDelegates, eventPartners, scopeSlug);
      label = 'Catering & Dietary Report (.xlsx)';
    } else if (type === 'badges') {
      count = exportBadgePrintingCsv(scopedDelegates, scopeSlug);
      label = 'Badge Printing List (.csv)';
    } else if (type === 'marketing') {
      count = exportMarketingOptIn(scopedDelegates, eventPartners, scopeSlug);
      label = 'Marketing Opt-In List (.xlsx)';
    }

    if (count === 0) {
      pushToast(
        'warning',
        `No matching rows for ${label}`,
        'Adjust your registrations or filter scope before exporting.'
      );
      return;
    }

    pushToast(
      'success',
      `Exported ${label}`,
      `${count} ${count === 1 ? 'record' : 'records'} downloaded.`
    );
  };

  const handleConfirmResetDemo = () => {
    setResetConfirmOpen(false);
    const fresh = resetPortalState();
    setPortalState({
      ...fresh,
      delegates: recalculateTicketTypes(fresh.delegates, fresh.partners),
    });
    setSearchQuery('');
    setActiveFilter('all');
    setSelectedPartnerFilter('all');
    pushToast(
      'info',
      'Demo data reset',
      'Restored PCE AUS 2026, PCE UK 2026, and PCE USA 2026 demo events, coordinators, and partner rosters.'
    );
  };

  if (!session) {
    return (
      <>
        <LoginScreen
          accounts={portalState.users}
          events={portalState.events}
          onLogin={handleLogin}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Event Coordinator Workspace (Strictly scoped to adding & viewing partners for their assigned event)
  if (coordinatorMode) {
    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <Header
          session={session}
          activeEvent={activeEvent}
          eventsCount={portalState.events.length}
          pendingRequestsCount={0}
          auditCount={scopedAuditLogs.length}
          onOpenEventsModal={() => {}}
          onOpenAuditDrawer={() => setAuditDrawerState({ open: true, tab: 'audit' })}
          onOpenQuotaModal={() => {}}
          onOpenTicketColumnModal={() => {}}
          onRequestResetDemo={() => setResetConfirmOpen(true)}
          onLogout={handleLogout}
        />

        <CoordinatorWorkspace
          activeEvent={activeEvent}
          partners={eventPartners}
          delegates={eventDelegates}
          users={portalState.users}
          onOpenAddPartner={() => setAddPartnerOpen(true)}
          onOpenUploadPartners={() =>
            setExcelImportState({ open: true, mode: 'partners' })
          }
        />

        <AddPartnerModal
          isOpen={addPartnerOpen}
          onClose={() => setAddPartnerOpen(false)}
          eventName={activeEvent.name}
          showSwitchOption={false}
          existingPartners={eventPartners}
          existingUsers={portalState.users}
          onCreatePartner={handleCreatePartner}
          onOpenBulkUploadPartners={() =>
            setExcelImportState({ open: true, mode: 'partners' })
          }
        />

        <ExcelImportModal
          isOpen={excelImportState.open}
          initialMode="partners"
          partnersOnly
          eventId={activeEventId}
          eventName={activeEvent.name}
          onClose={() =>
            setExcelImportState((prev) => ({ ...prev, open: false }))
          }
          partners={eventPartners}
          users={portalState.users}
          customTicketFields={portalState.customTicketFields}
          defaultPartnerId={defaultTargetPartnerId}
          isAdmin={false}
          actorEmail={session.email}
          existingDelegates={eventDelegates}
          onImportComplete={handleUniversalExcelImport}
        />

        <AuditDrawer
          isOpen={auditDrawerState.open}
          initialTab="audit"
          hideRequestsTab
          onClose={() => setAuditDrawerState((prev) => ({ ...prev, open: false }))}
          isAdmin={false}
          auditLogs={scopedAuditLogs}
          changeRequests={[]}
          onResolveChangeRequest={() => {}}
        />

        <ConfirmModal
          isOpen={resetConfirmOpen}
          title="Reset Demo Data"
          description="This will restore all pre-seeded events (PCE AUS 2026, PCE UK 2026, PCE USA 2026), coordinators, partner companies, and delegate rosters."
          confirmLabel="Reset Demo Data"
          destructive
          onCancel={() => setResetConfirmOpen(false)}
          onConfirm={handleConfirmResetDemo}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  const scopeTitle =
    scopedPartners.length === 1
      ? scopedPartners[0].name
      : `${activeEvent.name} — All Partner Companies`;

  const scopeMeta =
    scopedPartners.length === 1
      ? `${activeEvent.name} · ${scopedPartners[0].tier} · ${scopedPartners[0].standNumber}`
      : `${activeEvent.city} · ${activeEvent.dates} · ${scopedPartners.length} ${
          scopedPartners.length === 1 ? 'Partner' : 'Partners'
        }`;

  const canCreate = canCreateDelegate(session, isEventFrozen);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header
        session={session}
        activeEvent={activeEvent}
        eventsCount={portalState.events.length}
        pendingRequestsCount={pendingRequestsCount}
        auditCount={scopedAuditLogs.length}
        onOpenEventsModal={() =>
          setEventsModalState({ open: true, tab: 'list' })
        }
        onOpenAuditDrawer={(tab = 'audit') =>
          setAuditDrawerState({ open: true, tab })
        }
        onOpenQuotaModal={() => setQuotaModalOpen(true)}
        onOpenTicketColumnModal={() => setTicketColumnModalOpen(true)}
        onRequestResetDemo={() => setResetConfirmOpen(true)}
        onLogout={handleLogout}
      />

      <KpiBar
        summary={quotaSummary}
        scopedDelegates={scopedDelegates}
        customTicketFields={portalState.customTicketFields}
        scopeTitle={scopeTitle}
        scopeMeta={scopeMeta}
        validationErrorRows={filterCounts.errors}
      />

      <WorkspaceToolbar
        isAdmin={adminMode}
        isGlobalFrozen={isEventFrozen}
        events={portalState.events}
        currentEventId={activeEventId}
        onSwitchEvent={handleSwitchEvent}
        onOpenAddEvent={() =>
          setEventsModalState({ open: true, tab: 'create' })
        }
        partners={eventPartners}
        selectedPartnerFilter={effectivePartnerFilter}
        onChangePartnerFilter={setSelectedPartnerFilter}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        onChangeFilter={setActiveFilter}
        filterCounts={filterCounts}
        canCreate={canCreate}
        onAddRow={handleAddRow}
        onOpenAddPartner={() => setAddPartnerOpen(true)}
        onOpenTicketColumnModal={() => setTicketColumnModalOpen(true)}
        onOpenBulkPaste={() => setBulkPasteOpen(true)}
        onOpenExcelImport={() =>
          setExcelImportState({ open: true, mode: 'delegates' })
        }
        onToggleGlobalFreeze={handleToggleGlobalFreeze}
        onExportReport={handleExportReport}
      />

      <main className="flex-1 flex flex-col min-h-0">
        <DelegateGrid
          delegates={visibleDelegates}
          partners={eventPartners}
          session={session}
          isGlobalFrozen={isEventFrozen}
          showPartnerColumn={adminMode && effectivePartnerFilter === 'all'}
          validationMap={validationMap}
          columnTitles={portalState.columnTitles}
          ticketCategories={portalState.ticketCategories}
          customTicketFields={portalState.customTicketFields}
          focusNewRowId={focusNewRowId}
          onClearFocusNewRow={() => setFocusNewRowId(null)}
          onUpdateField={handleUpdateField}
          onUpdateCustomTicketValue={handleUpdateCustomTicketValue}
          onRenameColumnTitle={handleRenameColumnTitle}
          onRenameCustomTicket={handleRenameCustomTicket}
          onToggleLock={handleToggleRowLock}
          onDuplicateRow={handleDuplicateRow}
          onDeleteRow={(delegate) => setDeleteTarget(delegate)}
          onRequestChange={(delegate) => setChangeRequestTarget(delegate)}
          onAddRow={handleAddRow}
          hasActiveFilters={searchQuery.trim().length > 0 || activeFilter !== 'all'}
          onResetFilters={() => {
            setSearchQuery('');
            setActiveFilter('all');
          }}
        />
      </main>

      {/* Modals & Drawers */}
      <BulkPasteModal
        isOpen={bulkPasteOpen}
        onClose={() => setBulkPasteOpen(false)}
        eventId={activeEventId}
        partners={eventPartners}
        defaultPartnerId={defaultTargetPartnerId}
        isAdmin={adminMode}
        actorEmail={session.email}
        existingDelegates={eventDelegates}
        onImport={handleBulkImport}
      />

      <ExcelImportModal
        isOpen={excelImportState.open}
        initialMode={excelImportState.mode}
        eventId={activeEventId}
        eventName={activeEvent.name}
        onClose={() =>
          setExcelImportState((prev) => ({ ...prev, open: false }))
        }
        partners={eventPartners}
        users={portalState.users}
        customTicketFields={portalState.customTicketFields}
        defaultPartnerId={defaultTargetPartnerId}
        isAdmin={adminMode}
        actorEmail={session.email}
        existingDelegates={eventDelegates}
        onImportComplete={handleUniversalExcelImport}
      />

      {adminMode && (
        <>
          <EventsModal
            isOpen={eventsModalState.open}
            initialTab={eventsModalState.tab}
            onClose={() =>
              setEventsModalState((prev) => ({ ...prev, open: false }))
            }
            events={portalState.events}
            currentEventId={activeEventId}
            partners={portalState.partners}
            delegates={portalState.delegates}
            users={portalState.users}
            onSwitchEvent={handleSwitchEvent}
            onCreateEvent={handleCreateEvent}
            onCreateCoordinator={handleCreateCoordinator}
          />
          <QuotaModal
            isOpen={quotaModalOpen}
            onClose={() => setQuotaModalOpen(false)}
            partners={eventPartners}
            delegates={eventDelegates}
            onSaveQuotas={handleSaveQuotas}
            onOpenAddPartner={() => setAddPartnerOpen(true)}
          />
          <TicketColumnModal
            isOpen={ticketColumnModalOpen}
            onClose={() => setTicketColumnModalOpen(false)}
            columnTitles={portalState.columnTitles}
            ticketCategories={portalState.ticketCategories}
            customTicketFields={portalState.customTicketFields}
            onAddCustomTicket={handleAddCustomTicket}
            onUpdateCustomTicket={handleUpdateCustomTicket}
            onDeleteCustomTicket={handleDeleteCustomTicket}
            onSaveTicketCategories={handleSaveTicketCategories}
            onSaveColumnTitles={handleSaveColumnTitles}
          />
          <AddPartnerModal
            isOpen={addPartnerOpen}
            onClose={() => setAddPartnerOpen(false)}
            eventName={activeEvent.name}
            existingPartners={eventPartners}
            existingUsers={portalState.users}
            onCreatePartner={handleCreatePartner}
            onOpenBulkUploadPartners={() =>
              setExcelImportState({ open: true, mode: 'partners' })
            }
          />
        </>
      )}

      <AuditDrawer
        isOpen={auditDrawerState.open}
        initialTab={auditDrawerState.tab}
        onClose={() => setAuditDrawerState((prev) => ({ ...prev, open: false }))}
        isAdmin={adminMode}
        auditLogs={scopedAuditLogs}
        changeRequests={scopedChangeRequests}
        onResolveChangeRequest={handleResolveChangeRequest}
      />

      <ChangeRequestModal
        delegate={changeRequestTarget}
        onClose={() => setChangeRequestTarget(null)}
        onSubmit={handleSubmitChangeRequest}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Delegate Row"
        description={`Are you sure you want to remove ${
          deleteTarget ? getDelegateDisplayName(deleteTarget) : 'this delegate'
        } from the registration list? Complimentary pass allocations will recalculate automatically.`}
        confirmLabel="Delete Delegate"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmModal
        isOpen={resetConfirmOpen}
        title="Reset Demo Data"
        description="This will restore all pre-seeded events (PCE AUS 2026, PCE UK 2026, PCE USA 2026), event coordinators, partner rosters, quotas, and clear custom audit logs."
        confirmLabel="Reset Demo Data"
        destructive
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={handleConfirmResetDemo}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
