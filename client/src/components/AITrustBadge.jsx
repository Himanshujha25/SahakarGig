import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { ShieldCheck, Award, CheckCircle2, AlertCircle, X, LoaderCircle } from "lucide-react";

export default function AITrustBadge({ providerId, showDetails = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function fetchTrust() {
      try {
        const { data: res } = await api.post("/ai/verify-trust", { providerId });
        setData(res);
      } catch (err) {
        console.error("AI Trust Verification Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrust();
  }, [providerId]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-xs font-semibold text-on-surface-variant">
        <LoaderCircle size={12} className="animate-spin text-primary" /> Calculating Trust…
      </span>
    );
  }

  if (!data) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer shadow-2xs"
      >
        <ShieldCheck size={14} className="text-emerald-600" />
        <span>AI Trust Score: {data.trustScore}%</span>
        <span className="w-1 h-1 rounded-full bg-emerald-400" />
        <span className="text-emerald-900 font-extrabold">{data.tier}</span>
      </button>

      {/* Trust Score Breakdown Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-outline-variant bg-surface text-on-surface p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">AI Verified Trust Audit</h3>
                  <p className="text-xs text-on-surface-variant">{data.providerName} • {data.badge}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-full hover:bg-surface-container-high cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Overall Trust Score</span>
                <p className="text-3xl font-black text-emerald-900">{data.trustScore} / 100</p>
                <p className="text-xs font-bold text-emerald-700">{data.tier} ({data.badge})</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-on-surface uppercase tracking-wider">Verification Breakdown:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(data.breakdownChecks || []).map((check, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-outline-variant bg-surface-container-low flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-on-surface">
                          {check.status === 'passed' ? (
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle size={14} className="text-amber-500 shrink-0" />
                          )}
                          <span className="truncate">{check.name}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-tight">{check.detail}</p>
                      </div>

                      <span className="font-bold text-emerald-700 shrink-0 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        +{check.points} Pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant">
                <span>Completed Certifications: <strong>{data.completedCertificationsCount || 0}</strong></span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs cursor-pointer hover:opacity-90"
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
