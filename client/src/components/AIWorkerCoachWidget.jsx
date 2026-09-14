import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { Sparkles, TrendingUp, Award, Clock, ArrowRight, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AIWorkerCoachWidget() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchInsights() {
      try {
        const { data } = await api.get("/ai/worker-insights");
        setInsights(data);
      } catch (err) {
        console.error("Worker Coach Insights Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low flex items-center justify-center gap-2 text-xs font-semibold text-on-surface-variant">
        <LoaderCircle size={16} className="animate-spin text-primary" />
        <span>Loading AI Worker Coach Insights…</span>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary-container/20 via-surface to-surface p-5 space-y-4 shadow-sm">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">AI Worker Earnings Coach</h3>
            <p className="text-[11px] text-on-surface-variant">Regional demand analytics & upskilling recommendations</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
          {insights.estimatedEarningsMultiplier || '1.35x'} Potential Earnings
        </span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-surface border border-outline-variant/80">
          <span className="text-[10px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
            <Clock size={12} className="text-primary" /> Recommended Peak Hours
          </span>
          <p className="font-bold text-on-surface mt-1 truncate">{insights.peakHoursRecommendation}</p>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-outline-variant/80">
          <span className="text-[10px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-600" /> High Regional Demand
          </span>
          <p className="font-bold text-on-surface mt-1">{insights.highDemandSkillInDistrict}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-surface border border-outline-variant/80">
          <span className="text-[10px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
            <Award size={12} className="text-amber-500" /> Current AI Trust Score
          </span>
          <p className="font-black text-primary mt-1">{insights.trustScore || 75} Pts</p>
        </div>
      </div>

      {/* Actionable Tips */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-on-surface">Cooperative Growth Recommendations:</p>
        <div className="space-y-1.5 text-xs text-on-surface-variant">
          {(insights.actionableTips || []).map((tip, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-surface/60 p-2.5 rounded-xl border border-outline-variant/40">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Certification CTA */}
      <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between">
        <div className="text-xs">
          <span className="font-bold text-on-surface">Unlock Higher Rates:</span>
          <p className="text-[11px] text-on-surface-variant">Complete Cooperative Skill Certification</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/provider/training")}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-xs"
        >
          <span>Sahakar Academy</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
