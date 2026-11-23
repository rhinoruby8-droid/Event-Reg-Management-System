import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Plus,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { getCoordinatorEventIds } from '../services/auth';
import { Delegate, EventItem, PartnerCompany, UserAccount } from '../types';

export interface NewEventPayload {
  name: string;
  fullName: string;
  city: string;
  venue: string;
  dates: string;
  status: EventItem['status'];
  switchToEvent: boolean;
  assignCoordinatorIds: string[];
  createCoordinator: boolean;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPassword: string;
}

export interface NewCoordinatorPayload {
  eventIds: string[];
  name: string;
  email: string;
  password: string;
}

interface EventsModalProps {
  isOpen: boolean;
  initialTab?: 'list' | 'coordinators' | 'create';
  onClose: () => void;
  events: EventItem[];
  currentEventId: string;
  partners: PartnerCompany[];
  delegates: Delegate[];
  users: UserAccount[];
  onSwitchEvent: (eventId: string) => void;
  onCreateEvent: (payload: NewEventPayload) => void;
  onCreateCoordinator: (payload: NewCoordinatorPayload) => void;
  onUpdateCoordinatorEvents: (userId: string, nextEventIds: string[]) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const EventsModal: React.FC<EventsModalProps> = ({
  isOpen,
  initialTab = 'list',
  onClose,
  events,
  currentEventId,
  partners,
  delegates,
  users,
  onSwitchEvent,
  onCreateEvent,
  onCreateCoordinator,
  onUpdateCoordinatorEvents,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'coordinators' | 'create'>(
    initialTab
  );

  // Add Event form state
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [dates, setDates] = useState('');
  const [status, setStatus] = useState<EventItem['status']>('upcoming');
  const [switchToEvent, setSwitchToEvent] = useState(true);
  const [assignExistingCoordIds, setAssignExistingCoordIds] = useState<string[]>([]);
  const [createCoordinator, setCreateCoordinator] = useState(false);
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [coordinatorPassword, setCoordinatorPassword] = useState('coord123');
  const [showCoordPassword, setShowCoordPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Assign / Create Coordinator inside All Events tab
  const [addingCoordForEventId, setAddingCoordForEventId] = useState<string | null>(null);
  const [selectedExistingCoordId, setSelectedExistingCoordId] = useState('');
  const [inlineCoordName, setInlineCoordName] = useState('');
  const [inlineCoordEmail, setInlineCoordEmail] = useState('');
  const [inlineCoordPassword, setInlineCoordPassword] = useState('coord123');
  const [inlineCoordError, setInlineCoordError] = useState<string | null>(null);

  // Dedicated Coordinators Tab — Create Multi-Event Coordinator form state
  const [newCoordName, setNewCoordName] = useState('');
  const [newCoordEmail, setNewCoordEmail] = useState('');
  const [newCoordPassword, setNewCoordPassword] = useState('coord123');
  const [newCoordEventIds, setNewCoordEventIds] = useState<string[]>([]);
  const [newCoordError, setNewCoordError] = useState<string | null>(null);
  const [revealedCoordIds, setRevealedCoordIds] = useState<Record<string, boolean>>({});

  const coordinators = useMemo(
    () => users.filter((u) => u.role === 'event_coordinator'),
    [users]
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setName('');
      setFullName('');
      setCity('');
      setVenue('');
      setDates('');
      setStatus('upcoming');
      setSwitchToEvent(true);
      setAssignExistingCoordIds([]);
      setCreateCoordinator(false);
      setCoordinatorName('');
      setCoordinatorEmail('');
      setCoordinatorPassword('coord123');
      setShowCoordPassword(false);
      setFormError(null);
      setAddingCoordForEventId(null);
      setSelectedExistingCoordId('');
      setInlineCoordError(null);
      setNewCoordName('');
      setNewCoordEmail('');
      setNewCoordPassword('coord123');
      setNewCoordEventIds(currentEventId ? [currentEventId] : events[0] ? [events[0].id] : []);
      setNewCoordError(null);
    }
  }, [isOpen, initialTab, currentEventId, events]);

  if (!isOpen) return null;

  const toggleInList = (list: string[], id: string): string[] => {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  };

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedFullName = fullName.trim();
    const trimmedCity = city.trim();
    const trimmedVenue = venue.trim();
    const trimmedDates = dates.trim();

    if (!trimmedName) {
      setFormError('Event short name is required (e.g., PCE MENA 2026).');
      return;
    }
    if (
      events.some((ev) => ev.name.trim().toLowerCase() === trimmedName.toLowerCase())
    ) {
      setFormError(`An event named "${trimmedName}" already exists.`);
      return;
    }
    if (!trimmedFullName) {
      setFormError('Full event title is required.');
      return;
    }
    if (!trimmedCity || !trimmedVenue || !trimmedDates) {
      setFormError('City, venue, and event dates are required.');
      return;
    }

    const trimmedCoordName = coordinatorName.trim();
    const trimmedCoordEmail = coordinatorEmail.trim().toLowerCase();
    const trimmedCoordPassword = coordinatorPassword.trim();

    if (createCoordinator) {
      if (!trimmedCoordName) {
        setFormError('Event Coordinator name is required (or uncheck new coordinator creation).');
        return;
      }
      if (!trimmedCoordEmail || !EMAIL_REGEX.test(trimmedCoordEmail)) {
        setFormError('Please enter a valid Event Coordinator email address.');
        return;
      }
      if (
        users.some((u) => u.email.trim().toLowerCase() === trimmedCoordEmail)
      ) {
        setFormError(`The email "${trimmedCoordEmail}" is already in use by another account.`);
        return;
      }
      if (trimmedCoordPassword.length < 4) {
        setFormError('Coordinator password must be at least 4 characters.');
        return;
      }
    }

    onCreateEvent({
      name: trimmedName,
      fullName: trimmedFullName,
      city: trimmedCity,
      venue: trimmedVenue,
      dates: trimmedDates,
      status,
      switchToEvent,
      assignCoordinatorIds: assignExistingCoordIds,
      createCoordinator,
      coordinatorName: trimmedCoordName,
      coordinatorEmail: trimmedCoordEmail,
      coordinatorPassword: trimmedCoordPassword,
    });

    if (switchToEvent) {
      onClose();
    } else {
      setActiveTab('list');
      setName('');
      setFullName('');
      setCity('');
      setVenue('');
      setDates('');
      setAssignExistingCoordIds([]);
      setCreateCoordinator(false);
      setCoordinatorName('');
      setCoordinatorEmail('');
      setCoordinatorPassword('coord123');
    }
  };

  const handleOpenInlineCoord = (eventId: string, eventName: string) => {
    setAddingCoordForEventId(eventId);
    const unassigned = coordinators.filter(
      (c) => !getCoordinatorEventIds(c).includes(eventId)
    );
    setSelectedExistingCoordId(unassigned[0]?.id || '');
    setInlineCoordName('');
    const slug = eventName
      .toLowerCase()
      .replace(/^pce\s+/i, '')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 12);
    setInlineCoordEmail(`coordinator.${slug || 'event'}@expo.com`);
    setInlineCoordPassword('coord123');
    setInlineCoordError(null);
  };

  const handleAssignExistingToEvent = (eventId: string) => {
    if (!selectedExistingCoordId) return;
    const coord = coordinators.find((c) => c.id === selectedExistingCoordId);
    if (!coord) return;
    const currentIds = getCoordinatorEventIds(coord);
    if (!currentIds.includes(eventId)) {
      onUpdateCoordinatorEvents(coord.id, [...currentIds, eventId]);
    }
    setAddingCoordForEventId(null);
  };

  const handleSubmitInlineCoord = (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    setInlineCoordError(null);

    const trimmedName = inlineCoordName.trim();
    const trimmedEmail = inlineCoordEmail.trim().toLowerCase();
    const trimmedPassword = inlineCoordPassword.trim();

    if (!trimmedName) {
      setInlineCoordError('Coordinator name is required.');
      return;
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setInlineCoordError('Enter a valid email address.');
      return;
    }
    if (users.some((u) => u.email.trim().toLowerCase() === trimmedEmail)) {
      setInlineCoordError(`Email "${trimmedEmail}" is already registered.`);
      return;
    }
    if (trimmedPassword.length < 4) {
      setInlineCoordError('Password must be at least 4 characters.');
      return;
    }

    onCreateCoordinator({
      eventIds: [eventId],
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
    });
    setAddingCoordForEventId(null);
  };

  const handleCreateMultiEventCoord = (e: React.FormEvent) => {
    e.preventDefault();
    setNewCoordError(null);

    const trimmedName = newCoordName.trim();
    const trimmedEmail = newCoordEmail.trim().toLowerCase();
    const trimmedPassword = newCoordPassword.trim();

    if (!trimmedName) {
      setNewCoordError('Coordinator name is required.');
      return;
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setNewCoordError('Please enter a valid coordinator email address.');
      return;
    }
    if (users.some((u) => u.email.trim().toLowerCase() === trimmedEmail)) {
      setNewCoordError(`The email "${trimmedEmail}" is already assigned to another login.`);
      return;
    }
    if (trimmedPassword.length < 4) {
      setNewCoordError('Password must be at least 4 characters.');
      return;
    }
    if (newCoordEventIds.length === 0) {
      setNewCoordError('Select at least one event to assign this coordinator to.');
      return;
    }

    onCreateCoordinator({
      eventIds: newCoordEventIds,
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
    });

    setNewCoordName('');
    setNewCoordEmail('');
    setNewCoordPassword('coord123');
  };

  const handleToggleCoordinatorEvent = (coord: UserAccount, eventId: string) => {
    const current = getCoordinatorEventIds(coord);
    const exists = current.includes(eventId);
    if (exists && current.length <= 1) {
      // Keep at least 1 event assigned to a coordinator
      return;
    }
    const next = exists
      ? current.filter((id) => id !== eventId)
      : [...current, eventId];
    onUpdateCoordinatorEvents(coord.id, next);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="events-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <h2 id="events-modal-title" className="text-base font-bold text-slate-900">
                Multi-Event Portfolio &amp; Coordinators
              </h2>
              <p className="text-xs text-slate-500">
                Manage events across the year, view all coordinator logins, and assign one coordinator across multiple events.
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

        {/* Segmented Tabs */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>All Events ({events.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('coordinators')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'coordinators'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Coordinators ({coordinators.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Event</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 hidden sm:inline">
            Coordinators are scoped to adding partners in assigned events only
          </span>
        </div>

        {/* TAB 1: ALL EVENTS */}
        {activeTab === 'list' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {events.map((ev) => {
              const isCurrent = ev.id === currentEventId;
              const evPartners = partners.filter((p) => p.eventId === ev.id);
              const evDelegates = delegates.filter((d) => d.eventId === ev.id);
              const evCoordinators = coordinators.filter((u) =>
                getCoordinatorEventIds(u).includes(ev.id)
              );
              const unassignedCoords = coordinators.filter(
                (u) => !getCoordinatorEventIds(u).includes(ev.id)
              );

              return (
                <div
                  key={ev.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isCurrent
                      ? 'border-indigo-300 bg-indigo-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{ev.name}</h3>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span
                          className={`text-xs font-semibold capitalize ${
                            ev.status === 'active'
                              ? 'text-emerald-700'
                              : ev.status === 'upcoming'
                              ? 'text-indigo-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {ev.status}
                        </span>
                        {ev.isGlobalFrozen && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-xs font-semibold text-amber-700">
                              Frozen
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{ev.fullName}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {ev.city} ({ev.venue})
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span>{ev.dates}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenInlineCoord(ev.id, ev.name)}
                        className="h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                        <span>Assign / Add Coordinator</span>
                      </button>

                      {isCurrent ? (
                        <span className="h-8 px-3 text-xs font-semibold text-indigo-700 bg-indigo-100/70 rounded-lg inline-flex items-center gap-1 whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Workspace</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchEvent(ev.id);
                            onClose();
                          }}
                          className="h-8 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Open Event
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Event Metrics & Assigned Coordinators */}
                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-600">
                      <span>
                        <strong className="font-mono tabular-nums text-slate-900">
                          {evPartners.length}
                        </strong>{' '}
                        {evPartners.length === 1 ? 'Partner' : 'Partners'}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span>
                        <strong className="font-mono tabular-nums text-slate-900">
                          {evDelegates.length}
                        </strong>{' '}
                        {evDelegates.length === 1 ? 'Delegate' : 'Delegates'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-slate-500">
                        Coordinators ({evCoordinators.length}):
                      </span>
                      {evCoordinators.length === 0 ? (
                        <span className="text-slate-400 italic">None assigned</span>
                      ) : (
                        evCoordinators.map((coord, idx) => (
                          <span key={coord.id} className="font-mono text-[11px] text-slate-800">
                            {idx > 0 ? ', ' : ''}
                            {coord.name} ({coord.email})
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Inline Assign Existing OR Create New Coordinator Panel */}
                  {addingCoordForEventId === ev.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50 -mx-4 -mb-4 px-4 py-3.5 rounded-b-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Assign or Create Coordinator for {ev.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddingCoordForEventId(null)}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          Close
                        </button>
                      </div>

                      {unassignedCoords.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-3 border-b border-slate-200">
                          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                            Assign Existing:
                          </span>
                          <select
                            value={selectedExistingCoordId}
                            onChange={(e) => setSelectedExistingCoordId(e.target.value)}
                            className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                          >
                            {unassignedCoords.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.email}) — currently on{' '}
                                {getCoordinatorEventIds(c).length}{' '}
                                {getCoordinatorEventIds(c).length === 1 ? 'event' : 'events'}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAssignExistingToEvent(ev.id)}
                            className="h-8 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Assign to {ev.name}</span>
                          </button>
                        </div>
                      )}

                      <form
                        onSubmit={(e) => handleSubmitInlineCoord(e, ev.id)}
                        className="space-y-2"
                      >
                        <div className="text-[11px] font-semibold text-slate-600">
                          Or create a brand-new Coordinator login for {ev.name}:
                        </div>

                        {inlineCoordError && (
                          <div className="text-xs text-rose-700 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{inlineCoordError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            required
                            value={inlineCoordName}
                            onChange={(e) => setInlineCoordName(e.target.value)}
                            placeholder="Coordinator Name"
                            className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                          />
                          <input
                            type="email"
                            required
                            value={inlineCoordEmail}
                            onChange={(e) => setInlineCoordEmail(e.target.value)}
                            placeholder="coordinator@expo.com"
                            className="h-8 px-2.5 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              value={inlineCoordPassword}
                              onChange={(e) => setInlineCoordPassword(e.target.value)}
                              placeholder="Password"
                              className="h-8 px-2.5 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 flex-1 min-w-0"
                            />
                            <button
                              type="submit"
                              className="h-8 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg whitespace-nowrap shrink-0"
                            >
                              Create
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: COORDINATORS DIRECTORY & MULTI-EVENT ASSIGNMENT */}
        {activeTab === 'coordinators' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Create Multi-Event Coordinator Form */}
            <form
              onSubmit={handleCreateMultiEventCoord}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Create Coordinator Login (Assign to One or Multiple Events)
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Created logins appear immediately in the Coordinators list below and on the sign-in page.
                </p>
              </div>

              {newCoordError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{newCoordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="new-coord-name"
                    className="block text-[11px] font-semibold text-slate-700 mb-1"
                  >
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="new-coord-name"
                    type="text"
                    required
                    value={newCoordName}
                    onChange={(e) => setNewCoordName(e.target.value)}
                    placeholder="e.g., Priya Nair"
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-coord-email"
                    className="block text-[11px] font-semibold text-slate-700 mb-1"
                  >
                    Login Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="new-coord-email"
                    type="email"
                    required
                    value={newCoordEmail}
                    onChange={(e) => setNewCoordEmail(e.target.value)}
                    placeholder="coordinator.apac@expo.com"
                    className="w-full h-9 px-3 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-coord-pass"
                    className="block text-[11px] font-semibold text-slate-700 mb-1"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="new-coord-pass"
                    type="text"
                    required
                    value={newCoordPassword}
                    onChange={(e) => setNewCoordPassword(e.target.value)}
                    className="w-full h-9 px-3 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-700 mb-2">
                  Assign to Events ({newCoordEventIds.length} selected):
                </div>
                <div className="flex flex-wrap gap-2">
                  {events.map((ev) => {
                    const checked = newCoordEventIds.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-colors ${
                          checked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setNewCoordEventIds((prev) => toggleInList(prev, ev.id))
                          }
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{ev.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-9 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Coordinator Login</span>
                </button>
              </div>
            </form>

            {/* Existing Coordinators Directory List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">
                  All Event Coordinator Logins ({coordinators.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Check or uncheck events below to assign a single coordinator to multiple events
                </span>
              </div>

              {coordinators.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-xs text-slate-500">
                  No Event Coordinators created yet. Use the form above to provision your first coordinator login.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {coordinators.map((coord) => {
                    const assignedIds = getCoordinatorEventIds(coord);
                    const isRevealed = Boolean(revealedCoordIds[coord.id]);
                    return (
                      <div key={coord.id} className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {coord.name}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs font-mono text-slate-600">
                              <span>{coord.email}</span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="text-slate-500">
                                {isRevealed ? coord.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedCoordIds((prev) => ({
                                    ...prev,
                                    [coord.id]: !prev[coord.id],
                                  }))
                                }
                                aria-label={isRevealed ? 'Hide password' : 'Show password'}
                                className="p-0.5 text-slate-400 hover:text-slate-700"
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="text-xs font-mono tabular-nums text-slate-500">
                            Assigned to{' '}
                            <strong className="text-slate-900">{assignedIds.length}</strong>{' '}
                            {assignedIds.length === 1 ? 'event' : 'events'}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {events.map((ev) => {
                            const isAssigned = assignedIds.includes(ev.id);
                            const isOnlyEvent = isAssigned && assignedIds.length <= 1;
                            return (
                              <label
                                key={ev.id}
                                title={
                                  isOnlyEvent
                                    ? 'Coordinator must remain assigned to at least 1 event'
                                    : `Toggle ${ev.name} access for ${coord.name}`
                                }
                                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium select-none transition-colors ${
                                  isAssigned
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                } ${isOnlyEvent ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  disabled={isOnlyEvent}
                                  onChange={() =>
                                    handleToggleCoordinatorEvent(coord, ev.id)
                                  }
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>{ev.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADD NEW EVENT */}
        {activeTab === 'create' && (
          <form
            onSubmit={handleCreateEventSubmit}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-3.5">
                <div className="text-xs font-semibold text-slate-800">
                  Event Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="event-short-name"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Event Short Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="event-short-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., PCE MENA 2026"
                      className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="event-status"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Event Status
                    </label>
                    <select
                      id="event-status"
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as EventItem['status'])
                      }
                      className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                    >
                      <option value="active">Active</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="event-full-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Full Event Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="event-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Project Controls Expo Middle East 2026"
                    className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label
                      htmlFor="event-city"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      City / Region <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="event-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g., Dubai, UAE"
                      className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="event-venue"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Venue <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="event-venue"
                      type="text"
                      required
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g., Dubai World Trade Centre"
                      className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="event-dates"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Event Dates <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="event-dates"
                      type="text"
                      required
                      value={dates}
                      onChange={(e) => setDates(e.target.value)}
                      placeholder="e.g., 14–16 Oct 2026"
                      className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Assign Existing Coordinators */}
              {coordinators.length > 0 && (
                <div className="border-t border-slate-200 pt-4 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-800">
                    Assign Existing Event Coordinator(s) to this Event
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {coordinators.map((coord) => {
                      const checked = assignExistingCoordIds.includes(coord.id);
                      return (
                        <label
                          key={coord.id}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                            checked
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setAssignExistingCoordIds((prev) =>
                                toggleInList(prev, coord.id)
                              )
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{coord.name}</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            ({coord.email})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Create New Event Coordinator */}
              <div className="border-t border-slate-200 pt-4 space-y-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createCoordinator}
                    onChange={(e) => setCreateCoordinator(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      Also create a new Event Coordinator login for this event
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Event Coordinators can add partners only for their assigned events.
                    </p>
                  </div>
                </label>

                {createCoordinator && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    <div>
                      <label
                        htmlFor="coord-name"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Coordinator Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="coord-name"
                        type="text"
                        required={createCoordinator}
                        value={coordinatorName}
                        onChange={(e) => setCoordinatorName(e.target.value)}
                        placeholder="e.g., Nadia Al-Mansoor"
                        className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="coord-email"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Login Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="coord-email"
                        type="email"
                        required={createCoordinator}
                        value={coordinatorEmail}
                        onChange={(e) => setCoordinatorEmail(e.target.value)}
                        placeholder="coordinator.mena@expo.com"
                        className="w-full h-9 px-3 font-mono text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="coord-password"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Temporary Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="coord-password"
                          type={showCoordPassword ? 'text' : 'password'}
                          required={createCoordinator}
                          value={coordinatorPassword}
                          onChange={(e) => setCoordinatorPassword(e.target.value)}
                          className="w-full h-9 pl-3 pr-9 font-mono text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCoordPassword((p) => !p)}
                          aria-label={
                            showCoordPassword ? 'Hide password' : 'Show password'
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showCoordPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={switchToEvent}
                    onChange={(e) => setSwitchToEvent(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Switch active Super Admin workspace to this new event immediately</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Back to Events
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Create Event
              </button>
            </div>
          </form>
        )}

        {/* Footer for List & Coordinators tabs */}
        {activeTab !== 'create' && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              One coordinator login can manage partner onboarding across any number of assigned events.
            </span>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Event</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
