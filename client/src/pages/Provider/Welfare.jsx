import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';

export default function Welfare() {
  const { t } = useTranslation();
  const [providerId, setProviderId] = useState(null);
  const [form, setForm] = useState({
    eShramId: '',
    insuranceOptIn: false,
    insuranceProvider: '',
  });
  const [schemes, setSchemes] = useState([]);
  const [welfareScore, setWelfareScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await api.get('/providers/me');
        setProviderId(me.data._id);
        const w = await api.get(`/welfare/${me.data._id}`);
        setForm({
          eShramId: w.data.eShramId || '',
          insuranceOptIn: !!w.data.insuranceOptIn,
          insuranceProvider: w.data.insuranceProvider || '',
        });
        setSchemes(w.data.schemesEligible || []);
        setWelfareScore(w.data.welfareScore || 0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    if (!providerId) return;
    setSaving(true);
    try {
      await api.put(`/welfare/${providerId}`, {
        eShramId: form.eShramId,
        insuranceOptIn: form.insuranceOptIn,
        insuranceProvider: form.insuranceProvider,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-on-surface-variant">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold text-on-surface">{t('welfare')}</h1>

      <div className="card-lg flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-on-surface">e-Shram ID</label>
          <input
            className="input"
            value={form.eShramId}
            onChange={(e) => setForm({ ...form, eShramId: e.target.value })}
            placeholder="e.g. ES12345678"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <input
            type="checkbox"
            checked={form.insuranceOptIn}
            onChange={(e) => setForm({ ...form, insuranceOptIn: e.target.checked })}
          />
          Opt in to Insurance
        </label>

        <div>
          <label className="mb-1 block text-sm font-semibold text-on-surface">Insurance Provider</label>
          <input
            className="input"
            value={form.insuranceProvider}
            onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })}
            placeholder="e.g. LIC"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-on-surface">Schemes Eligible</label>
          <div className="flex flex-wrap gap-2">
            {schemes.length === 0 && <span className="text-sm text-on-surface-variant">None</span>}
            {schemes.map((s) => (
              <span key={s} className="status-pill bg-secondary-container text-on-secondary-container">{s}</span>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-on-surface">Welfare Score</label>
          <span className="font-heading text-2xl font-bold text-primary">{welfareScore}</span>
        </div>

        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="card-lg flex flex-col items-center gap-2 border-2 border-dashed border-outline-variant">
        <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-surface-container-low font-heading text-xs text-on-surface-variant">
          [ Welfare / ID QR ]
        </div>
        <p className="text-sm text-on-surface-variant">Welfare / ID QR card</p>
        <p className="font-heading text-sm font-bold text-on-surface">{form.eShramId || '—'}</p>
      </div>
    </div>
  );
}
