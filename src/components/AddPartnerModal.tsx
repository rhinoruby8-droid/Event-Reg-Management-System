import React, { useEffect, useState } from 'react';
import { AlertCircle, Building2, Eye, EyeOff, Upload, X } from 'lucide-react';
import { PARTNER_TIERS, PartnerCompany, UserAccount } from '../types';

export interface NewPartnerPayload {
  name: string;
  tier: string;
  standNumber: string;
  complimentaryQuota: number;
  awardsQuota: number;
  contactName: string;
  loginEmail: string;
  loginPassword: string;
  switchToPartner: boolean;
}

interface AddPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  showSwitchOption?: boolean;
  existingPartners: PartnerCompany[];
  existingUsers: UserAccount[];
  onCreatePartner: (payload: NewPartnerPayload) => void;
  onOpenBulkUploadPartners: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const AddPartnerModal: React.FC<AddPartnerModalProps> = ({
  isOpen,
  onClose,
  eventName,
  showSwitchOption = true,
  existingPartners,
  existingUsers,
  onCreatePartner,
  onOpenBulkUploadPartners,
}) => {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<string>(PARTNER_TIERS[1]);
  const [standNumber, setStandNumber] = useState('');
  const [complimentaryQuota, setComplimentaryQuota] = useState(10);
  const [awardsQuota, setAwardsQuota] = useState(2);
  const [contactName, setContactName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('partner123');
  const [showPassword, setShowPassword] = useState(false);
  const [switchToPartner, setSwitchToPartner] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTier(PARTNER_TIERS[1]);
      setStandNumber('');
      setComplimentaryQuota(5);
      setAwardsQuota(2);
      setContactName('');
      setLoginEmail('');
      setLoginPassword('partner123');
      setShowPassword(false);
      setSwitchToPartner(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedStand = standNumber.trim();
    const trimmedContact = contactName.trim();
    const trimmedEmail = loginEmail.trim().toLowerCase();
    const trimmedPassword = loginPassword.trim();

    if (!trimmedName) {
      setError('Partner company name is required.');
      return;
    }
    if (
      existingPartners.some(
        (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError(`A partner named "${trimmedName}" already exists.`);
      return;
    }
    if (!trimmedStand) {
      setError('Stand / booth number is required (e.g., Booth C08).');
      return;
    }
    if (!trimmedContact) {
      setError('Partner Admin contact name is required.');
      return;
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid Partner Admin login email address.');
      return;
    }
    if (
      existingUsers.some(
        (u) => u.email.trim().toLowerCase() === trimmedEmail
      )
    ) {
      setError(`The login email "${trimmedEmail}" is already assigned to another account.`);
      return;
    }
    if (trimmedPassword.length < 4) {
      setError('Partner Admin password must be at least 4 characters.');
      return;
    }

    onCreatePartner({
      name: trimmedName,
      tier,
      standNumber: trimmedStand,
      complimentaryQuota: Math.max(0, complimentaryQuota),
      awardsQuota: Math.max(0, awardsQuota),
      contactName: trimmedContact,
      loginEmail: trimmedEmail,
      loginPassword: trimmedPassword,
      switchToPartner,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-partner-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 id="add-partner-title" className="text-base font-bold text-slate-900">
                Add New Partner Company — {eventName}
              </h2>
              <p className="text-xs text-slate-500">
                Provision a partner organisation for {eventName} with pass quotas and a scoped Partner Admin login.
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
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Organisation & Quotas */}
          <div className="space-y-3.5">
            <div className="text-xs font-semibold text-slate-800">
              Organisation &amp; Entitlements
            </div>

            <div>
              <label
                htmlFor="partner-company-name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="partner-company-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Horizon Infrastructure Pty Ltd"
                className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="partner-tier"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Sponsorship Tier
                </label>
                <select
                  id="partner-tier"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                >
                  {PARTNER_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="partner-stand"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Stand / Booth Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="partner-stand"
                  type="text"
                  required
                  value={standNumber}
                  onChange={(e) => setStandNumber(e.target.value)}
                  placeholder="e.g., Booth C08"
                  className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="partner-comp-quota"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Total Comp Tickets (Day 1/2/3 Pool)
                </label>
                <input
                  id="partner-comp-quota"
                  type="number"
                  min={0}
                  max={500}
                  value={complimentaryQuota}
                  onChange={(e) =>
                    setComplimentaryQuota(Math.max(0, parseInt(e.target.value || '0', 10)))
                  }
                  className="w-full h-9 px-3 font-mono tabular-nums text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Divided across Day 1, Day 2 &amp; Day 3; extra tickets are payable.
                </p>
              </div>

              <div>
                <label
                  htmlFor="partner-awards-quota"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Awards Night Seat Quota
                </label>
                <input
                  id="partner-awards-quota"
                  type="number"
                  min={0}
                  max={100}
                  value={awardsQuota}
                  onChange={(e) =>
                    setAwardsQuota(Math.max(0, parseInt(e.target.value || '0', 10)))
                  }
                  className="w-full h-9 px-3 font-mono tabular-nums text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-3.5">
            <div className="text-xs font-semibold text-slate-800">
              Partner Admin Portal Login
            </div>

            <div>
              <label
                htmlFor="partner-contact-name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Primary Contact Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="partner-contact-name"
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g., Alex Rivera"
                className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="partner-login-email"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Login Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="partner-login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="partner@company.com.au"
                  className="w-full h-9 px-3 font-mono text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                />
              </div>

              <div>
                <label
                  htmlFor="partner-login-password"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Temporary Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="partner-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full h-9 pl-3 pr-9 font-mono text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {showSwitchOption && (
              <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={switchToPartner}
                  onChange={(e) => setSwitchToPartner(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Switch workspace filter to this new partner after creation</span>
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBulkUploadPartners();
            }}
            className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Partner Excel</span>
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Create Partner Account
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
