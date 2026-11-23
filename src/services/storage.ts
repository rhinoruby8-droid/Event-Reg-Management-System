import { createInitialPortalState, DEMO_EVENTS, DEMO_USERS } from '../data/seedData';
import {
  DEFAULT_COLUMN_TITLES,
  PortalState,
  REGISTRATION_CATEGORIES,
} from '../types';

const STORAGE_KEY = 'pce_multi_event_portal_state_v2';

/**
 * Storage Repository Layer
 * Structured as an isolated adapter so localStorage can be swapped for
 * Firestore or a REST backend with zero UI changes.
 */
export function loadPortalState(): PortalState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialPortalState();
      savePortalState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<PortalState>;
    if (
      !parsed ||
      !Array.isArray(parsed.partners) ||
      !Array.isArray(parsed.delegates) ||
      !Array.isArray(parsed.auditLogs)
    ) {
      const fallback = createInitialPortalState();
      savePortalState(fallback);
      return fallback;
    }

    const events =
      Array.isArray(parsed.events) && parsed.events.length > 0
        ? parsed.events
        : DEMO_EVENTS.map((e) => ({ ...e }));

    const fallbackEventId = events[0].id;
    const currentEventId =
      parsed.currentEventId && events.some((e) => e.id === parsed.currentEventId)
        ? parsed.currentEventId
        : fallbackEventId;

    const partners = parsed.partners.map((p) => ({
      ...p,
      eventId: p.eventId || fallbackEventId,
    }));

    const delegates = parsed.delegates.map((d) => ({
      ...d,
      eventId: d.eventId || fallbackEventId,
    }));

    const changeRequests = Array.isArray(parsed.changeRequests)
      ? parsed.changeRequests.map((r) => ({
          ...r,
          eventId: r.eventId || fallbackEventId,
        }))
      : [];

    const users =
      Array.isArray(parsed.users) && parsed.users.length > 0
        ? parsed.users.map((u) => ({
            ...u,
            eventId:
              u.role === 'super_admin'
                ? null
                : u.eventId !== undefined
                ? u.eventId
                : fallbackEventId,
          }))
        : DEMO_USERS.map((u) => ({ ...u }));

    return {
      events,
      currentEventId,
      partners,
      users,
      delegates,
      auditLogs: parsed.auditLogs,
      changeRequests,
      columnTitles: {
        ...DEFAULT_COLUMN_TITLES,
        ...(parsed.columnTitles && typeof parsed.columnTitles === 'object'
          ? parsed.columnTitles
          : {}),
      },
      ticketCategories:
        Array.isArray(parsed.ticketCategories) && parsed.ticketCategories.length > 0
          ? parsed.ticketCategories
          : [...REGISTRATION_CATEGORIES],
      customTicketFields: Array.isArray(parsed.customTicketFields)
        ? parsed.customTicketFields
        : [],
      isGlobalFrozen: Boolean(parsed.isGlobalFrozen),
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch {
    const initial = createInitialPortalState();
    savePortalState(initial);
    return initial;
  }
}

export function savePortalState(state: PortalState): void {
  try {
    const payload: PortalState = {
      ...state,
      lastUpdated: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to persist portal state to localStorage:', err);
  }
}

export function resetPortalState(): PortalState {
  const fresh = createInitialPortalState();
  savePortalState(fresh);
  return fresh;
}
