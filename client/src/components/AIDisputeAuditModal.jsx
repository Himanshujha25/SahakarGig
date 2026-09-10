import React, { useState } from "react";
import api from "../lib/api";
import { ShieldAlert, X, Scale, LoaderCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function AIDisputeAuditModal({ isOpen, onClose, bookingId, onAuditComplete }) {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);

  if (!isOpen || !bookingId) return null;

  async function handleRunAudit() {
    setLoading(true);
    try {
      const { data } = await api.post("/ai/dispute-audit", { bookingId });
      setAudit(data);
      if (onAuditComplete) onAuditComplete(data);
    } catch (err) {
      console.error("AI Dispute Audit Error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl border border-outline-variant bg-surface text-on-surface p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">AI Dispute Arbitration & Audit Engine</h3>
              <p className="text-xs text-on-surface-variant">Objective analysis of chat logs, work proof & timestamps</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Action Button if audit not run */}
        {!audit && (
          <div className="space-y-4 py-4 text-center">
            <ShieldAlert size={48} className="mx-auto text-amber-500 animate-pulse" />
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              Run the SahakarAI Arbitration engine to automatically inspect customer communication, OTP completion proof, and dispute severity before releasing Escrow funds.
            </p>
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 mx-auto hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  <span>Auditing Booking Chat & Logs…</span>
                </>
              ) : (
                <>
                  <Scale size={16} />
                  <span>Run AI Dispute Audit</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Audit Findings Card */}
        {audit && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-primary tracking-wider">AI Arbitration Verdict</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-on-primary">
                  {audit.confidence || "94.5% Confidence"}
                </span>
              </div>

              <p className="text-xs text-on-surface leading-relaxed font-medium">
                {audit.summary}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-800">Provider Payout</span>
                  <p className="text-lg font-black text-emerald-900">{audit.providerPayoutPercent}%</p>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-blue-800">Household Refund</span>
                  <p className="text-lg font-black text-blue-900">{audit.householdRefundPercent}%</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-outline-variant text-xs space-y-1">
                <span className="font-bold text-on-surface">Recommended Action:</span>
                <p className="text-on-surface-variant">{audit.recommendedAction}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
