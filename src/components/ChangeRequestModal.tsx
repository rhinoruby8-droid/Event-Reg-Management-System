import React, { useState } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import { Delegate } from '../types';

interface ChangeRequestModalProps {
  delegate: Delegate | null;
  onClose: () => void;
  onSubmit: (delegate: Delegate, note: string) => void;
}

export const ChangeRequestModal: React.FC<ChangeRequestModalProps> = ({
  delegate,
  onClose,
  onSubmit,
}) => {
  const [note, setNote] = useState('');

  if (!delegate) return null;

  const fullName = `${delegate.firstName} ${delegate.lastName}`.trim() || 'Unnamed Delegate';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) return;
    onSubmit(delegate, trimmed);
    setNote('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-request-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MessageSquarePlus className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 id="change-request-title" className="text-base font-bold text-slate-900">
                Request Change for {fullName}
              </h2>
              <p className="text-xs text-slate-500">
                {delegate.isLocked
                  ? 'This delegate row is locked (badge printed).'
                  : 'The registration portal is currently frozen for partners.'}
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

        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="font-semibold text-slate-900">{fullName}</div>
            <div className="mt-0.5 text-slate-500">
              {delegate.jobTitle || 'No job title'} · {delegate.company} ·{' '}
              <span className="font-mono">{delegate.email || 'No email'}</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="change-request-note"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Describe the requested update
            </label>
            <textarea
              id="change-request-note"
              required
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Please update dietary details to Gluten-Free & Dairy-Free, or substitute delegate with Alex Wong (a.wong@solidsupport.com.au)."
              className="w-full p-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!note.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            Send Request to Admin
          </button>
        </div>
      </form>
    </div>
  );
};
