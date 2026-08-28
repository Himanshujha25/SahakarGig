import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Icon from '../../components/Icon';

export default function FederationCooperatives() {
  const navigate = useNavigate();
  const [coops, setCoops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coopId, setCoopId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () =>
    api.get('/federation/cooperatives')
      .then((r) => setCoops(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  async function onboard(e) {
    e.preventDefault();
    if (!coopId.trim()) return;
    setBusy(true); setMsg('');
    try {
      await api.post('/federation/cooperatives/onboard', { cooperativeId: coopId.trim() });
      setCoopId('');
      setMsg('Cooperative linked successfully.');
      load();
    } catch {
      setMsg('Failed — check the Cooperative ID.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-on-surface">Cooperatives</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Manage cooperatives under this federation.</p>
      </div>

      {/* Onboard form */}
      <div className="rounded-xl border border-outline-variant bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-on-surface mb-3">Link a Cooperative</h2>
        <form onSubmit={onboard} className="flex gap-3 flex-wrap">
          <input
            className="h-11 flex-1 min-w-[220px] rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Cooperative MongoDB ID"
            value={coopId}
            onChange={(e) => setCoopId(e.target.value)}
          />
          <button type="submit" disabled={busy}
            className="h-11 px-5 rounded-lg bg-primary font-heading text-sm font-semibold text-on-primary hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)] disabled:opacity-60 flex items-center gap-2">
            <Icon name="add_link" className="text-[18px]" />
            Link Cooperative
          </button>
        </form>
        {msg && <p className={`mt-2 text-xs font-semibold ${msg.includes('success') ? 'text-[#006d30]' : 'text-error'}`}>{msg}</p>}
      </div>

      {/* Cooperatives list */}
      <div className="rounded-xl border border-outline-variant bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h2 className="font-heading text-base font-semibold text-on-surface">Linked Cooperatives ({coops.length})</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-surface-variant animate-pulse" />)}
          </div>
        ) : coops.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-on-surface-variant">
            No cooperatives linked yet. Use the form above to link one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  {['Name', 'Registration ID', 'Region', 'Commission', 'Action'].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coops.map((c) => (
                  <tr 
                    key={c._id} 
                    onClick={() => navigate(`/federation/cooperatives/${c._id}`)}
                    className="border-b border-outline-variant hover:bg-[#1e6b65]/5 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-bold text-sm text-on-surface hover:text-[#1e6b65]">{c.name}</td>
                    <td className="px-5 py-3.5 text-sm text-on-surface-variant font-mono">{c.registrationId || c.registrationNumber || 'REG-2026-001'}</td>
                    <td className="px-5 py-3.5 text-sm text-on-surface-variant">{c.region || c.state || 'Delhi Central'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-[#e8edff] text-[#00288e] px-2.5 py-0.5 text-xs font-bold">
                        {c.commissionRate || 8}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1e6b65]">
                        View Profile ➔
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
