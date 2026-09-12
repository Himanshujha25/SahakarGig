import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { Sparkles, X, Calculator, ShieldCheck, ArrowRight, LoaderCircle, CheckCircle2 } from "lucide-react";

export default function AIEstimateModal({ isOpen, onClose, defaultService = "Electrician", onApplyEstimate }) {
  const [service, setService] = useState(defaultService);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleCalculate() {
    if (!service) return;
    setLoading(true);
    setEstimate(null);
    try {
      const { data } = await api.post("/ai/estimate-price", { service, description });
      setEstimate(data);
    } catch (err) {
      console.error("AI Price Estimator Error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-3xl border border-outline-variant bg-surface text-on-surface p-6 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-md">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">AI Instant Job Price Estimator</h3>
              <p className="text-xs text-on-surface-variant">Itemized cost calculation powered by SahakarAI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Select Service Trade
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary"
            >
              {['Electrician', 'Plumber', 'Carpenter', 'AC Repair', 'Cook', 'Cleaner', 'Gardener', 'Tutor', 'Caregiver', 'Driver'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Job Description / Requirements
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 3 ceiling fans installation & MCB tripping inspection in living room..."
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary placeholder:text-on-surface-variant/50"
            />
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                <span>Calculating AI Itemized Estimate…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Itemized AI Quote</span>
              </>
            )}
          </button>
        </div>

        {/* Result Card */}
        {estimate && (
          <div className="mt-5 p-4 rounded-2xl border border-primary/30 bg-primary-container/30 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <span className="text-xs font-extrabold uppercase text-primary tracking-wider">Estimated Price Range</span>
              <span className="text-lg font-black text-primary">₹{estimate.minPrice} - ₹{estimate.maxPrice}</span>
            </div>

            <div className="space-y-1.5 text-xs text-on-surface">
              <p className="font-bold">Itemized Breakdown:</p>
              <ul className="space-y-1 pl-1">
                {(estimate.breakdown || []).map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={13} className="text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-2.5 rounded-xl bg-surface border border-outline-variant text-[11px] text-on-surface-variant flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <ShieldCheck size={14} /> Razorpay Escrow Guarantee
              </span>
              <span className="font-bold text-on-surface">Deposit: ₹{estimate.escrowDeposit}</span>
            </div>

            {onApplyEstimate && (
              <button
                type="button"
                onClick={() => {
                  onApplyEstimate(estimate);
                  onClose();
                }}
                className="w-full h-10 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 cursor-pointer shadow-sm"
              >
                <span>Use This Price for Booking</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
