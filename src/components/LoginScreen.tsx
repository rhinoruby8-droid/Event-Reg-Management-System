import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { authenticateUser, getCoordinatorEventIds } from '../services/auth';
import { AuthSession, EventItem, UserAccount } from '../types';

interface LoginScreenProps {
  accounts: UserAccount[];
  events: EventItem[];
  onLogin: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  accounts,
  events,
  onLogin,
}) => {
  const [email, setEmail] = useState('admin@expo.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = authenticateUser(email, password, accounts);
    if (result.success) {
      onLogin(result.session);
    } else {
      setError(result.error);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    const result = authenticateUser(demoEmail, demoPassword, accounts);
    if (result.success) {
      onLogin(result.session);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            PCE Global Portal
          </span>
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span>Project Controls Expo</span>
            <span aria-hidden="true">·</span>
            <span>Multi-Event Partner &amp; Delegate Operations</span>
          </div>
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0 font-mono tabular-nums">
            {events.length} {events.length === 1 ? 'Event' : 'Events'} · 2026
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Multi-Event Context & Demo Accounts */}
          <div className="lg:col-span-7 bg-slate-900 text-white rounded-xl p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-indigo-300 mb-3">
                Multi-Event Partner &amp; Exhibitor Operations
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
                Partner Registration Portal
              </h1>
              <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-xl">
                Run every expo across the calendar from one platform. A single Global Super Admin manages all events, Event Coordinators onboard partners for their own event, and Partner Admins manage their company&apos;s live delegate spreadsheet.
              </p>

              <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-semibold font-mono tabular-nums text-white">
                    {events.length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Active &amp; Upcoming Events
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-semibold font-mono tabular-nums text-white">
                    3 Roles
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Admin, Coordinator, Partner
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-semibold font-mono tabular-nums text-white">
                    XLSX
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Universal Import &amp; Exports
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-200 tracking-wide">
                  Pre-Seeded Demo Accounts (Click to Sign In)
                </h2>
                <span className="text-xs text-slate-400">3-tier RBAC</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {accounts.map((user) => {
                  const isAdmin = user.role === 'super_admin';
                  const isCoord = user.role === 'event_coordinator';
                  const coordEventLabel = isCoord
                    ? getCoordinatorEventIds(user)
                        .map((id) => events.find((e) => e.id === id)?.name || id)
                        .join(', ') || user.eventName || 'Event'
                    : '';
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleQuickLogin(user.email, user.password)}
                      className="w-full text-left px-4 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400/60 transition-colors flex items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white">
                          {isAdmin ? (
                            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                          ) : isCoord ? (
                            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {isAdmin
                              ? 'Global Super Admin — All Events'
                              : isCoord
                              ? `Event Coordinator — ${coordEventLabel} (Add Partners Only)`
                              : `Partner Admin — ${user.partnerName}${
                                  user.eventName ? ` (${user.eventName})` : ''
                                }`}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-400">
                          <span className="truncate">{user.email}</span>
                          <span aria-hidden="true">·</span>
                          <span>{user.password}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-indigo-300 group-hover:text-indigo-200 flex items-center gap-1 whitespace-nowrap shrink-0">
                        Sign in
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Standard Sign-In Form */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-8 lg:p-10 flex flex-col justify-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Sign in to your workspace
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Enter your Super Admin, Event Coordinator, or Partner Admin credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-11 pl-10 pr-3.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-11 pl-10 pr-3.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-11 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span>Access Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-1.5">
              <div className="font-medium text-slate-700">Role Scoping Policy</div>
              <p className="leading-relaxed">
                <strong className="text-slate-700">Super Admin</strong> handles all events across the year.{' '}
                <strong className="text-slate-700">Event Coordinators</strong> log in strictly to their assigned event to add partners only.{' '}
                <strong className="text-slate-700">Partner Admins</strong> edit only their company&apos;s delegate roster.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Project Controls Expo — Multi-Event Partner Portal</span>
          <span>Data persists locally in browser storage · Modular auth/storage adapter</span>
        </div>
      </footer>
    </div>
  );
};
