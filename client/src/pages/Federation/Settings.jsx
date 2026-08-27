import { useEffect, useState } from 'react';
import api from '../../lib/api';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { EmailStatusCard, ChangePasswordSection } from '../../components/AccountSecurity';

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface p-5 space-y-4">
      <div>
        <h2 className="font-heading text-base font-semibold text-on-surface">{title}</h2>
        {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function FederationSettings() {
  const { user } = useAuth();
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/federation/dashboard').then((r) => {
      // federation commissionRate not directly exposed; derive from dashboard or store separately
      // For now we just show the input empty and let admin set it
    }).catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await api.patch('/federation/commission', { rate: Number(rate) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-on-surface">Settings</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Configure federation-level settings.</p>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-on-surface mb-4">Federation Commission Rate</h2>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Commission Rate (%)</label>
            <div className="relative">
              <input
                type="number" min="0" max="20" step="0.5"
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="e.g. 2"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">This % is deducted from each payment before cooperative commission is applied.</p>
          </div>
          <button type="submit" disabled={saving}
            className={`inline-flex h-11 items-center gap-2 px-5 rounded-lg font-heading text-sm font-semibold transition-colors disabled:opacity-60 ${
              saved
                ? 'bg-[#e6f9ec] text-[#006d30] border border-[#006d30]/30'
                : 'border border-outline-variant bg-surface hover:border-primary/40 hover:bg-[#e8edff] hover:text-[#00288e]'
            }`}>
            <Icon name={saved ? 'check_circle' : 'save'} className="text-[18px]" />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Account security — email verification + OTP-protected password change */}
      <Section title="Email Verification" subtitle="Verify your email to secure your federation account.">
        <EmailStatusCard />
      </Section>

      <Section
        title="Change Password"
        subtitle="Use a strong password with at least 8 characters. A one-time code will be emailed to confirm the change."
      >
        <ChangePasswordSection />
      </Section>
    </div>
  );
}
