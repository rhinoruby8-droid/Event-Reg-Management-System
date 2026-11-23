import { AuditActionType, AuditLogEntry, AuthSession } from '../types';

export function formatAuditValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '(empty)';
  return String(value);
}

export function createAuditEntry(params: {
  session: AuthSession;
  action: AuditActionType;
  eventId?: string | null;
  partnerId: string | null;
  delegateId?: string | null;
  delegateName: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  summary: string;
}): AuditLogEntry {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    actorEmail: params.session.email,
    actorRole: params.session.role,
    action: params.action,
    eventId: params.eventId !== undefined ? params.eventId : params.session.eventId ?? null,
    partnerId: params.partnerId,
    delegateId: params.delegateId ?? null,
    delegateName: params.delegateName,
    field: params.field,
    oldValue:
      params.oldValue !== undefined ? formatAuditValue(params.oldValue) : undefined,
    newValue:
      params.newValue !== undefined ? formatAuditValue(params.newValue) : undefined,
    summary: params.summary,
  };
}

export function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return iso;
  }
}
