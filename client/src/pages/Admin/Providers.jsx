import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import { Search, Users, Trophy } from "lucide-react";

export default function Providers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/providers");
        setItems(data || []);
      } catch {} finally { setLoading(false); }
    })();
    const id = setInterval(async () => {
      try { const { data } = await api.get("/admin/providers"); setItems(data || []); } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        (p.userId?.name || "").toLowerCase().includes(q) ||
        (p.skills || []).some((s) => s.toLowerCase().includes(q))
    );
  }, [items, query]);

  const verified = items.filter((p) => p.verified).length;

  return (
    <div className="w-full px-6 pt-8 pb-24 lg:pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Leaderboard
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            All service providers registered with your cooperative network.
          </p>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" strokeWidth={2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search providers, skills…"
            className="h-10 w-full rounded-xl border border-outline-variant bg-surface pl-9 pr-4 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Summary pills */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8edff] text-[#00288e] text-[13px] font-bold">
            <Users size={14} strokeWidth={2} /> {items.length} total providers
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e6f9ec] text-[#006d30] text-[13px] font-bold">
            <Trophy size={14} strokeWidth={2} /> {verified} verified
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 px-6 py-4 border-b border-outline-variant/40 last:border-0">
              <div className="w-9 h-9 rounded-full bg-surface-variant shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-surface-variant" />
                <div className="h-3 w-1/4 rounded bg-surface-variant" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-20 text-center">
          <Search size={44} className="text-outline-variant" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-on-surface">No providers found</p>
          <p className="text-[14px] text-on-surface-variant">{query ? "Try a different search term." : "No providers registered yet."}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">#</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Provider</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Skills</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Status</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filtered.map((p, idx) => (
                  <tr key={p._id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className={`text-[13px] font-bold ${idx === 0 ? "text-[#6b4200]" : "text-on-surface-variant"}`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-[13px] font-bold text-on-primary-container shrink-0">
                          {(p.userId?.name || "?").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-on-surface truncate">{p.userId?.name ?? "—"}</p>
                          <p className="text-[11px] text-on-surface-variant truncate">{p.userId?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {(p.skills || []).slice(0, 3).map((s) => (
                          <span key={s} className="px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e] text-[11px] font-semibold">{s}</span>
                        ))}
                        {(p.skills || []).length > 3 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px]">
                            +{(p.skills || []).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {p.verified
                        ? <VerifiedBadge label="Verified" />
                        : <span className="inline-flex px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-[11px] font-bold">Unverified</span>
                      }
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-[14px] font-bold text-on-surface">₹{p.hourlyRate ?? "—"}</span>
                      <span className="text-[11px] text-on-surface-variant">/hr</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
