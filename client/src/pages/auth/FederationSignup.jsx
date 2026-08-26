import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthShell from '../../components/AuthShell';
import Field from '../../components/Field';
import Icon from '../../components/Icon';

export default function FederationSignup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fedName: '', fedReg: '', fedRegion: '',
    name: '', email: '', phone: '', password: '',
  });
  const [err, setErr] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const u = await signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'Federation Admin',
        federation: {
          name: form.fedName,
          registrationId: form.fedReg,
          region: form.fedRegion,
        },
      });
      if (u.role === 'Federation Admin') navigate('/federation');
    } catch (e) {
      setErr(e.response?.data?.message || 'Federation registration failed');
    }
  }

  return (
    <AuthShell
      title="Register Your Federation"
      subtitle="Set up a Labour Cooperative Federation to oversee multiple cooperative societies."
    >
      <div className="mb-7">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
          Federation Signup
        </h2>
        <p className="font-body-md text-sm text-on-surface-variant mt-1.5">
          Create the federation and your admin account.
        </p>
      </div>

      {err && (
        <div className="mb-5 rounded-xl bg-error-container p-3.5 text-xs sm:text-sm font-medium text-on-error-container flex items-center gap-2.5 border border-error/30">
          <Icon name="error" className="text-[20px] text-error shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="mb-4 font-heading text-sm font-bold text-primary flex items-center gap-1.5">
            <Icon name="account_balance" className="text-[18px]" />
            Federation details
          </p>
          <div className="space-y-4">
            <Field label="Federation name" icon="account_balance" value={form.fedName} onChange={(e) => set('fedName', e.target.value)} placeholder="e.g. Maharashtra Labour Federation" required />
            <Field label="Registration ID" icon="badge" value={form.fedReg} onChange={(e) => set('fedReg', e.target.value)} placeholder="e.g. FED/MH/2024/001" required />
            <Field label="Region / State" icon="location_on" value={form.fedRegion} onChange={(e) => set('fedRegion', e.target.value)} placeholder="e.g. Maharashtra" required />
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <p className="mb-4 font-heading text-sm font-bold text-primary flex items-center gap-1.5">
            <Icon name="admin_panel_settings" className="text-[18px]" />
            Admin account
          </p>
          <div className="space-y-4">
            <Field label="Full name" icon="person" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Admin full name" required />
            <Field label="Email" icon="mail" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="admin@federation.com" required />
            <Field label="Phone" icon="call" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 9XXXXXXXXX" />
            <Field label="Password" icon="lock" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" required />
          </div>
        </div>

        <button type="submit"
          className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-white font-heading font-semibold text-sm transition-all hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)]">
          <Icon name="domain_add" className="text-[20px]" />
          Register Federation
        </button>
      </form>

      <p className="mt-6 text-center font-body-md text-sm text-on-surface-variant">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
