import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { useAuth } from "../../context/AuthContext";
import {
  Mic, IndianRupee, CalendarDays, Heart, CheckCircle2,
  ShieldCheck, Building2, MapPin, Send, Check
} from "lucide-react";
import {
  IconHammer, IconBolt, IconTool, IconSpray, IconChefHat,
  IconPaint, IconWall, IconCar, IconHeartbeat
} from "@tabler/icons-react";
import AIVoiceSearchModal from "../../components/AIVoiceSearchModal";

const SKILLS = [
  { label: "Carpenter", Icon: IconHammer, defaultRate: 800 },
  { label: "Electrician", Icon: IconBolt, defaultRate: 750 },
  { label: "Plumber", Icon: IconTool, defaultRate: 700 },
  { label: "Cleaner", Icon: IconSpray, defaultRate: 550 },
  { label: "Cook", Icon: IconChefHat, defaultRate: 700 },
  { label: "Painter", Icon: IconPaint, defaultRate: 650 },
  { label: "Mason", Icon: IconWall, defaultRate: 850 },
  { label: "Driver", Icon: IconCar, defaultRate: 750 },
  { label: "Caregiver", Icon: IconHeartbeat, defaultRate: 800 },
];

const DURATIONS = [
  { label: "1 Day (8h Shift)", days: 1 },
  { label: "3 Days Project", days: 3 },
  { label: "1 Week (6 Working Days)", days: 6 },
  { label: "15 Days Project", days: 15 },
  { label: "1 Month (26 Working Days)", days: 26 },
];

// Fallback verified cooperative societies registered under Multi-State Cooperative Societies Act
const DEFAULT_COOPERATIVES = [
  { _id: "coop-delhi-shramik", name: "Delhi Shramik Vikas Sahakari Samiti", registrationNumber: "MSCS-DEL-2023-881", district: "Delhi NCR", state: "Delhi", rating: 4.9, activeCrew: 24 },
  { _id: "coop-noida-urban", name: "Noida Sector 62 Karigar Sahakar Union", registrationNumber: "UP-GNB-2022-412", district: "Gautam Buddha Nagar", state: "Uttar Pradesh", rating: 4.8, activeCrew: 18 },
  { _id: "coop-bengaluru-craft", name: "Bengaluru Technical & Craft Gig Cooperative", registrationNumber: "KA-BLR-2021-109", district: "Bengaluru Urban", state: "Karnataka", rating: 4.9, activeCrew: 32 },
  { _id: "coop-mumbai-shramik", name: "Mumbai Mahanagar Shramik Sahakari Sanstha", registrationNumber: "MH-MUM-2022-553", district: "Mumbai Suburban", state: "Maharashtra", rating: 4.7, activeCrew: 22 },
  { _id: "coop-gurugram-trades", name: "Gurugram Infrastructure & Services Union", registrationNumber: "HR-GGM-2023-904", district: "Gurugram", state: "Haryana", rating: 4.8, activeCrew: 16 },
  { _id: "coop-pune-artisan", name: "Pune District Artisan & Labor Cooperative", registrationNumber: "MH-PUN-2021-314", district: "Pune", state: "Maharashtra", rating: 4.9, activeCrew: 20 },
];

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export default function BulkOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedSkill, setSelectedSkill] = useState("Carpenter");
  const [workerCount, setWorkerCount] = useState(10);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[1]); // 3 days default
  const [siteLocation, setSiteLocation] = useState("Noida Sector 62, Uttar Pradesh");
  const [requirementMsg, setRequirementMsg] = useState("");
  const [selectedCoopId, setSelectedCoopId] = useState(DEFAULT_COOPERATIVES[0]._id);

  const [cooperatives, setCooperatives] = useState(DEFAULT_COOPERATIVES);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [coopsRes, wRes] = await Promise.all([
          api.get("/providers/cooperatives").catch(() => null),
          api.get("/wallet").catch(() => null),
        ]);
        const list = coopsRes?.data?.cooperatives || (Array.isArray(coopsRes?.data) ? coopsRes.data : []);
        if (list.length > 0) {
          const merged = list.map((c) => ({
            _id: c._id,
            name: c.name,
            registrationNumber: c.registrationNumber || c.registrationId || "MSCS-REG-2024",
            district: c.district || c.region || "Delhi NCR",
            state: c.state || "Delhi",
            totalWorkers: c.totalWorkers || (c.memberProviderIds ? c.memberProviderIds.length : 0),
            skillCounts: c.skillCounts || {},
          }));
          setCooperatives(merged);
          setSelectedCoopId(merged[0]._id);
        } else {
          setCooperatives(DEFAULT_COOPERATIVES);
          setSelectedCoopId(DEFAULT_COOPERATIVES[0]._id);
        }
        if (wRes?.data && typeof wRes.data.balance === "number") setWalletBalance(wRes.data.balance);
      } catch {
        setCooperatives(DEFAULT_COOPERATIVES);
      }
    }
    loadData();
  }, []);

  const currentSkillData = SKILLS.find((s) => s.label === selectedSkill) || SKILLS[0];
  const ratePerWorkerDay = currentSkillData.defaultRate;
  const totalDays = selectedDuration.days;

  // Quotation calculations
  const totalGrossWage = workerCount * totalDays * ratePerWorkerDay;
  const workerTakeHome = Math.round(totalGrossWage * 0.85); // 85% Escrow
  const coopWelfarePool = Math.round(totalGrossWage * 0.10); // 10% Society Pool
  const fedPlatformFee = Math.round(totalGrossWage * 0.05); // 5% Platform Tech

  async function handleSendRFP(e) {
    e.preventDefault();
    if (!requirementMsg.trim()) {
      alert("Please provide project scope details and message for the Cooperative.");
      return;
    }

    setSubmitting(true);
    try {
      const targetCoop = cooperatives.find((c) => c._id === selectedCoopId) || cooperatives[0];
      const payload = {
        service: `Bulk Crew: ${workerCount}x ${selectedSkill} (${selectedDuration.label})`,
        price: totalGrossWage,
        cooperativeId: targetCoop?._id,
        isBulkOrder: true,
        workerCount,
        durationDays: totalDays,
        siteLocation,
        scopeOfWork: requirementMsg,
      };

      // Call bulk-rfp endpoint
      const { data } = await api.post("/bookings/bulk-rfp", payload);

      // Emit real-time Socket event to target cooperative
      socket.emit("rfp:send", {
        bookingId: data?._id,
        cooperativeId: targetCoop?._id,
        cooperativeName: targetCoop?.name,
        workerCount,
        skill: selectedSkill,
        duration: selectedDuration.label,
        price: totalGrossWage,
        location: siteLocation,
        message: requirementMsg,
        sender: user?.name || "Household Client",
      });

      setSuccessModal({
        bookingId: data?._id || `RFP-${Date.now().toString().slice(-6)}`,
        coopName: targetCoop?.name || "Delhi Shramik Vikas Sahakari Samiti",
        skill: selectedSkill,
        workerCount,
        amount: totalGrossWage,
      });
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to dispatch RFP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-6">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary-container/50 text-primary text-xs font-bold border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Institutional RFP & Quotations
            </span>
            <span className="hidden sm:inline text-xs text-on-surface-variant/70 font-medium">
              • {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
          >
            Bulk Workforce RFP & Quotations
          </h1>
          <p className="hidden sm:block text-sm text-on-surface-variant mt-0.5">
            Deploy certified cooperative crews in bulk with statutory 100% Escrow security.
          </p>
        </div>

        {/* Action Buttons (desktop only) */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="h-9 inline-flex items-center gap-2 px-3.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
          >
            <Mic size={14} className="animate-bounce" />
            <span>Voice AI</span>
          </button>

          {walletBalance !== null && (
            <Link
              to="/household/wallet"
              className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
            >
              <IndianRupee size={13} className="text-primary" strokeWidth={2.5} />
              <span>Wallet {formatMoney(walletBalance)}</span>
            </Link>
          )}

          <Link
            to="/household/bookings"
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
          >
            <CalendarDays size={14} strokeWidth={2} />
            <span>My Bookings</span>
          </Link>

          <Link
            to="/household/saved"
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
            title="Saved Providers"
          >
            <Heart size={14} strokeWidth={2} />
            <span>Saved</span>
          </Link>
        </div>
        <AIVoiceSearchModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      </div>

      {/* ── Blue-Themed Hero Banner Card (desktop only) ── */}
      <div className="hidden sm:flex rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-container/70 via-primary-container/40 to-surface-container-low p-5 sm:p-6 flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-surface border border-primary/30 text-[11px] font-bold text-primary">
              <CheckCircle2 size={12} /> 100% Escrow Protected
            </span>
            <span className="hidden sm:inline text-xs text-on-surface-variant font-semibold">• Zero Contractor Cuts • Direct Cooperative Union Rates</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            Deploy Certified Cooperative Crews in Bulk
          </h2>
          <p className="hidden sm:block text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Need 10 Carpenters, 20 Electricians, or an entire sanitation crew? Directly connect with registered cooperative unions, receive transparent institutional quotations, and lock verified manpower.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-xl bg-surface border border-primary/20 shadow-xs text-center">
            <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider">Statutory Escrow</p>
            <p className="text-base sm:text-lg font-black text-on-surface">85% To Workers</p>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: RFP Configuration Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSendRFP} className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-xs space-y-5">
            
            {/* 1. Select Skill / Trade */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant">
                  1. Select Required Trade / Skill
                </label>
                <span className="text-xs font-bold text-primary bg-primary-container/50 px-2 py-0.5 rounded-md border border-primary/20">
                  ₹{ratePerWorkerDay}/worker/day
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SKILLS.map((skill) => {
                  const IconComponent = skill.Icon;
                  const isSelected = selectedSkill === skill.label;
                  return (
                    <button
                      key={skill.label}
                      type="button"
                      onClick={() => setSelectedSkill(skill.label)}
                      className={`relative h-16 p-3.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? "border-primary/70 bg-primary-container/40 ring-2 ring-primary/15 shadow-xs"
                          : "border-outline-variant/70 bg-surface hover:border-primary/40 hover:bg-surface-container-low"
                      }`}
                    >
                      <IconComponent size={20} stroke={1.5} className="text-primary shrink-0" />
                      <span className={`min-w-0 flex-1 text-[13px] font-bold leading-tight truncate ${isSelected ? "text-primary" : "text-on-surface"}`}>
                        {skill.label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xs">
                          <Check size={10} strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Worker Count Selector */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant">
                  2. Number of Workers Needed
                </label>
                <span className="text-xs font-extrabold text-primary bg-primary-container/50 px-2.5 py-0.5 rounded-md border border-primary/20">
                  {workerCount} {selectedSkill}{workerCount > 1 ? "s" : ""}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setWorkerCount((c) => Math.max(2, c - 1))}
                  className="w-10 h-10 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface-variant font-bold text-lg flex items-center justify-center hover:bg-surface-container-high transition cursor-pointer"
                >
                  -
                </button>
                <input
                  type="range"
                  min="2"
                  max="100"
                  value={workerCount}
                  onChange={(e) => setWorkerCount(Number(e.target.value))}
                  className="flex-1 accent-primary h-2 bg-outline-variant rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setWorkerCount((c) => Math.min(100, c + 1))}
                  className="w-10 h-10 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface-variant font-bold text-lg flex items-center justify-center hover:bg-surface-container-high transition cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Quick Count Pills in uniform 6-column grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-0.5">
                {[5, 10, 15, 25, 50, 100].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setWorkerCount(count)}
                    className={`h-9 rounded-xl text-[11.5px] font-bold transition flex items-center justify-center cursor-pointer ${
                      workerCount === count
                        ? "bg-primary text-on-primary shadow-xs"
                        : "bg-surface-container-low text-on-surface-variant border border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {count} Workers
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Duration & Shift in uniform 5-column grid */}
            <div className="space-y-2.5 pt-1">
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant">
                3. Deployment Duration / Shift Length
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DURATIONS.map((d, index) => {
                  const isSelected = selectedDuration.label === d.label;
                  return (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setSelectedDuration(d)}
                      className={`h-[56px] p-2 rounded-xl border text-center flex flex-col items-center justify-center transition cursor-pointer ${
                        index === 4 ? "col-span-2 sm:col-span-1" : ""
                      } ${
                        isSelected
                          ? "border-primary bg-primary-container/50 text-primary font-bold shadow-xs"
                          : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="text-[11.5px] font-bold leading-tight truncate w-full">{d.label.split(" (")[0]}</span>
                      <span className="text-[10px] text-on-surface-variant font-semibold mt-0.5">
                        {d.days} {d.days === 1 ? "Day" : "Days"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Site Location & Scope */}
            <div className="space-y-3.5 pt-1">
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  4. Site Deployment Location
                </label>
                <div className="flex items-center gap-2 px-3.5 py-3 sm:py-2.5 rounded-xl border border-outline-variant bg-surface-container-low focus-within:border-primary focus-within:bg-surface transition">
                  <MapPin size={16} className="text-primary shrink-0" />
                  <input
                    type="text"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-on-surface"
                    placeholder="Enter project site address / landmark in India"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  5. Detailed Scope of Work & Message for Cooperative
                </label>
                <textarea
                  rows={3}
                  value={requirementMsg}
                  onChange={(e) => setRequirementMsg(e.target.value)}
                  placeholder={`e.g. Requirement for ${workerCount} certified ${selectedSkill.toLowerCase()}s for modular furniture assembly and structural fitting. Tools and materials will be provided on site. Daily reporting to site manager required.`}
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15 outline-none transition"
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary hover:opacity-90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-98 transition cursor-pointer disabled:opacity-60"
            >
              <Send size={16} />
              <span className="sm:hidden">Dispatch RFP · {workerCount} {selectedSkill}s</span>
              <span className="hidden sm:inline">{submitting ? "Transmitting RFP to Cooperative..." : `Dispatch Institutional RFP for ${workerCount} ${selectedSkill}s`}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Dynamic Quotation & Cooperative Capacity Directory (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Institutional Quotation Breakdown Card */}
          <div className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant/60">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-on-surface" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                  Estimated Institutional Quotation
                </h3>
                <p className="hidden sm:block text-xs text-on-surface-variant">Statutory Nodal Escrow Model</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container/50 text-primary text-[11px] font-bold border border-primary/20">
                <ShieldCheck size={11} /> 100% Escrow
              </span>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Crew Deployment:</span>
                <span className="font-bold text-on-surface">{workerCount} {selectedSkill}s × {totalDays} {totalDays === 1 ? "Day" : "Days"}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Base Daily Wage (₹{ratePerWorkerDay}/worker):</span>
                <span className="font-bold text-on-surface">₹{totalGrossWage.toLocaleString("en-IN")}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1.5 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>• Net Worker Escrow Take-Home (85%):</span>
                  <span className="font-bold text-emerald-700">₹{workerTakeHome.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>• Cooperative Member Welfare Pool (10%):</span>
                  <span className="font-bold text-primary">₹{coopWelfarePool.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>• Platform Tech & Insurance Escrow (5%):</span>
                  <span className="font-bold text-on-surface-variant">₹{fedPlatformFee.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-outline-variant/60">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Total Transparent Quotation</p>
                  <p className="hidden sm:block text-[10px] text-on-surface-variant/70">Zero hidden contractor cuts</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-primary">₹{totalGrossWage.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cooperative Societies Capacity Directory */}
          <div className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-on-surface" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                  Registered Cooperative Societies
                </h3>
                <p className="hidden sm:block text-xs text-on-surface-variant">Select which society union receives your RFP</p>
              </div>
              <Building2 size={16} className="text-primary" />
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {cooperatives.map((coop) => {
                const isSelected = selectedCoopId === coop._id;
                return (
                  <label
                    key={coop._id}
                    className={`block p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary-container/50/70 shadow-xs"
                        : "border-outline-variant bg-surface hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="selectedCoop"
                          value={coop._id}
                          checked={isSelected}
                          onChange={() => setSelectedCoopId(coop._id)}
                          className="mt-0.5 accent-primary cursor-pointer"
                        />
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? "text-primary" : "text-on-surface"}`}>{coop.name}</p>
                          <p className="hidden sm:block text-[10.5px] text-on-surface-variant">
                            Reg: {coop.registrationNumber || "MSCS-DEL-2024"} • {coop.district || "Delhi NCR"}
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const skillKey = selectedSkill.toLowerCase().trim();
                        const count = coop.skillCounts?.[skillKey] || 0;
                        if (count > 0) {
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold shrink-0 border border-emerald-200">
                              {count} {selectedSkill}{count > 1 ? "s" : ""} Verified
                            </span>
                          );
                        }
                        if (coop.totalWorkers > 0) {
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-primary text-[10px] font-bold shrink-0 border border-primary/20">
                              {coop.totalWorkers} Member{coop.totalWorkers > 1 ? "s" : ""}
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant text-[10px] font-bold shrink-0 border border-outline-variant">
                            Verified Union Hub
                          </span>
                        );
                      })()}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Success Confirmation Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 text-center space-y-3.5 shadow-2xl border border-outline-variant/60">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-on-surface font-heading">
              Bulk RFP Transmitted Successfully!
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your request for <strong className="text-on-surface">{successModal.workerCount} {successModal.skill}s</strong> has been transmitted directly to <strong className="text-primary">{successModal.coopName}</strong>. The Cooperative Admin will review your scope of work and allocate the verified worker crew shortly.
            </p>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface-variant text-left space-y-1">
              <p>• <strong>RFP Reference ID:</strong> {successModal.bookingId}</p>
              <p>• <strong>Total Estimated Escrow:</strong> ₹{successModal.amount.toLocaleString("en-IN")}</p>
              <p>• <strong>Status:</strong> Dispatched to Society Admin Desk</p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => navigate("/household/bookings")}
                className="w-full h-10 rounded-xl bg-primary hover:opacity-90 text-white text-xs font-bold transition cursor-pointer"
              >
                Track in My Bookings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
