import { DEMO_USERS } from '../data/seedData';
import { AuthSession, Delegate, UserAccount } from '../types';

const SESSION_KEY = 'pce_multi_event_auth_session_v2';

/**
 * Authentication & RBAC Layer
 * Swappable for Firebase Auth or OAuth/JWT REST endpoints.
 */
export function authenticateUser(
  email: string,
  password: string,
  accounts: UserAccount[] = DEMO_USERS
): { success: true; session: AuthSession } | { success: false; error: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const matched: UserAccount | undefined = accounts.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  );

  if (!matched) {
    return {
      success: false,
      error: 'Invalid email address or password. Use one of the demo accounts below.',
    };
  }

  const eventIds =
    matched.role === 'event_coordinator'
      ? Array.from(
          new Set([
            ...(Array.isArray(matched.eventIds) ? matched.eventIds : []),
            ...(matched.eventId ? [matched.eventId] : []),
          ])
        )
      : matched.eventId
      ? [matched.eventId]
      : [];

  const session: AuthSession = {
    userId: matched.id,
    email: matched.email,
    name: matched.name,
    role: matched.role,
    eventId: matched.eventId ?? eventIds[0] ?? null,
    eventIds,
    eventName: matched.eventName,
    partnerId: matched.partnerId,
    partnerName: matched.partnerName,
  };

  saveSession(session);
  return { success: true, session };
}

export function getStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

export function isSuperAdmin(session: AuthSession | null): boolean {
  return session?.role === 'super_admin';
}

export function isEventCoordinator(session: AuthSession | null): boolean {
  return session?.role === 'event_coordinator';
}

export function isPartnerAdmin(session: AuthSession | null): boolean {
  return session?.role === 'partner_admin';
}

/**
 * Super Admins can add partners to any event.
 * Event Coordinators can add partners strictly for their assigned event.
 */
export function canAddPartner(session: AuthSession | null): boolean {
  if (!session) return false;
  return session.role === 'super_admin' || session.role === 'event_coordinator';
}

export function canManageEvents(session: AuthSession | null): boolean {
  return session?.role === 'super_admin';
}

export function getCoordinatorEventIds(user: {
  eventId: string | null;
  eventIds?: string[];
}): string[] {
  const list = Array.isArray(user.eventIds) ? user.eventIds.filter(Boolean) : [];
  if (list.length > 0) return Array.from(new Set(list));
  return user.eventId ? [user.eventId] : [];
}

export function canEditDelegate(
  session: AuthSession,
  delegate: Delegate,
  isGlobalFrozen: boolean
): boolean {
  if (session.role === 'super_admin') return true;
  // Event coordinator is restricted to partner management ("add partner only")
  if (session.role === 'event_coordinator') return false;
  if (isGlobalFrozen) return false;
  if (delegate.isLocked) return false;
  return delegate.partnerId === session.partnerId;
}

export function canCreateDelegate(
  session: AuthSession,
  isGlobalFrozen: boolean
): boolean {
  if (session.role === 'super_admin') return true;
  // Event coordinator is restricted to adding partners only
  if (session.role === 'event_coordinator') return false;
  return !isGlobalFrozen;
}
