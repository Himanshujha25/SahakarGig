import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { toast } from "../../lib/toast";
import { useAuth } from "../../context/AuthContext";
import FileUpload from "../../components/FileUpload";
import {
  Mic, IndianRupee, CalendarDays, Heart, CheckCircle2,
  ShieldCheck, Building2, MapPin, Send, Check, Plus, Trash2,
  Clock, FileText, Upload, AlertCircle, Sparkles
} from "lucide-react";
import {
  IconHammer, IconBolt, IconTool, IconSpray, IconChefHat,
  IconPaint, IconWall, IconCar, IconHeartbeat, IconUsers
} from "@tabler/icons-react";
import AIVoiceSearchModal from "../../components/AIVoiceSearchModal";

const SKILLS = [
  { label: "General Labourer", Icon: IconUsers, defaultRate: 600 },
  { label: "Plumber", Icon: IconTool, defaultRate: 700 },
  { label: "Carpenter", Icon: IconHammer, defaultRate: 800 },
  { label: "Electrician", Icon: IconBolt, defaultRate: 750 },
  { label: "Cleaner", Icon: IconSpray, defaultRate: 550 },
  { label: "Cook", Icon: IconChefHat, defaultRate: 700 },
  { label: "Painter", Icon: IconPaint, defaultRate: 650 },
  { label: "Mason", Icon: IconWall, defaultRate: 850 },
  { label: "Driver", Icon: IconCar, defaultRate: 750 },
  { label: "Caregiver", Icon: IconHeartbeat, defaultRate: 800 },
];

const DURATIONS = [
  { label: "1 Day (8h Shift)", days: 1 },
  { label: "2 Days Project", days: 2 },
  { label: "3 Days Project", days: 3 },
  { label: "6 Days (1 Week)", days: 6 },
  { label: "15 Days Project", days: 15 },
  { label: "26 Days (1 Month)", days: 26 },
];

const DEFAULT_COOPERATIVES = [
  { _id: "coop-delhi-shramik", name: "Delhi Shramik Vikas Sahakari Samiti", registrationNumber: "MSCS-DEL-2023-881", district: "Delhi NCR", state: "Delhi", rating: 4.9, activeCrew: 24 },
  { _id: "coop-noida-urban", name: "Noida Sector 62 Karigar Sahakar Union", registrationNumber: "UP-GNB-2022-412", district: "Gautam Buddha Nagar", state: "Uttar Pradesh", rating: 4.8, activeCrew: 18 },
  { _id: "coop-bengaluru-craft", name: "Bengaluru Technical & Craft Gig Cooperative", registrationNumber: "KA-BLR-2021-109", district: "Bengaluru Urban", state: "Karnataka", rating: 4.9, activeCrew: 32 },
  { _id: "coop-mumbai-shramik", name: "Mumbai Mahanagar Shramik Sahakari Sanstha", registrationNumber: "MH-MUM-2022-553", district: "Mumbai Suburban", state: "Maharashtra", rating: 4.7, activeCrew: 22 },
];

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function timeAgo(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(seconds) || seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function BulkOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Multi-role selection state (e.g. 3 Labourers, 2 Plumbers, 1 Carpenter)
  const [selectedRoles, setSelectedRoles] = useState([
    { role: "General Labourer", count: 3, dailyRate: 600 },
    { role: "Plumber", count: 2, dailyRate: 700 },
    { role: "Carpenter", count: 1, dailyRate: 800 },
  ]);

  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0]
  );
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[2]); // 3 Days
  const [siteLocation, setSiteLocation] = useState("Noida Sector 62, Uttar Pradesh");
  const [requirementMsg, setRequirementMsg] = useState("");
  const [selectedCoopId, setSelectedCoopId] = useState(DEFAULT_COOPERATIVES[0]._id);

  const [cooperatives, setCooperatives] = useState(DEFAULT_COOPERATIVES);
  const [submitting, setSubmitting] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  // Active RFPs list
  const [myRfps, setMyRfps] = useState([]);
  const [loadingRfps, setLoadingRfps] = useState(false);
  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'track'

  // Payment Proof Modal State
  const [paymentModalRfp, setPaymentModalRfp] = useState(null);
  const [paymentSsUrl, setPaymentSsUrl] = useState("");
  const [paymentTxnRef, setPaymentTxnRef] = useState("");
  const [uploadingPayment, setUploadingPayment] = useState(false);

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
    fetchMyRfps();

    socket.on("booking:updated", fetchMyRfps);
    socket.on("rfp:worker_response", fetchMyRfps);
    return () => {
      socket.off("booking:updated");
      socket.off("rfp:worker_response");
    };
  }, []);

  async function fetchMyRfps() {
    setLoadingRfps(true);
    try {
      const { data } = await api.get("/bookings/household/mine");
      const bulkOnly = (data || []).filter(
        (b) => b.bulkDetails?.isBulk || b.service?.includes("Bulk") || b.groupBooking?.enabled
      );
      setMyRfps(bulkOnly);
    } catch {
      setMyRfps([]);
    } finally {
      setLoadingRfps(false);
    }
  }

  // Handle Role Add / Remove / Count Change
  function handleAddRole(skillLabel) {
    if (selectedRoles.some((r) => r.role === skillLabel)) return;
    const skillObj = SKILLS.find((s) => s.label === skillLabel) || SKILLS[0];
    setSelectedRoles((prev) => [
      ...prev,
      { role: skillLabel, count: 1, dailyRate: skillObj.defaultRate },
    ]);
  }

  function handleRemoveRole(roleName) {
    if (selectedRoles.length <= 1) {
      toast.warning("At least 1 worker role requirement is required.");
      return;
    }
    setSelectedRoles((prev) => prev.filter((r) => r.role !== roleName));
  }

  function handleCountChange(roleName, delta) {
    setSelectedRoles((prev) =>
      prev.map((r) => {
        if (r.role === roleName) {
          const newCount = Math.max(1, Math.min(50, r.count + delta));
          return { ...r, count: newCount };
        }
        return r;
      })
    );
  }

  const totalWorkerHeadcount = selectedRoles.reduce((sum, r) => sum + r.count, 0);
  const totalDays = selectedDuration.days;
  const totalGrossWage = selectedRoles.reduce(
    (sum, r) => sum + r.count * r.dailyRate * totalDays,
    0
  );

  const workerTakeHome = Math.round(totalGrossWage * 0.85);
  const coopWelfarePool = Math.round(totalGrossWage * 0.10);
  const fedPlatformFee = Math.round(totalGrossWage * 0.05);

  async function handleSendRFP(e) {
    e.preventDefault();
    if (submitting) return;
    if (!requirementMsg.trim()) {
      toast.warning("Please provide project scope details and requirements for the Cooperative.");
      return;
    }

    setSubmitting(true);
    try {
      const targetCoop = cooperatives.find((c) => c._id === selectedCoopId) || cooperatives[0];
      const rolesSummary = selectedRoles.map((r) => `${r.count}x ${r.role}`).join(", ");
      
      const payload = {
        service: `Bulk Crew: ${rolesSummary} (${selectedDuration.label})`,
        roles: selectedRoles,
        price: totalGrossWage,
        cooperativeId: targetCoop?._id,
        workerCount: totalWorkerHeadcount,
        durationDays: totalDays,
        startDate,
        siteLocation,
        scopeOfWork: requirementMsg,
      };

      const { data } = await api.post("/bookings/bulk-rfp", payload);

      setSuccessModal({
        bookingId: data?._id || `RFP-${Date.now().toString().slice(-6)}`,
        coopName: targetCoop?.name || "Cooperative Union",
        rolesSummary,
        workerCount: totalWorkerHeadcount,
        durationDays: totalDays,
        startDate,
        amount: totalGrossWage,
      });

      fetchMyRfps();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to dispatch RFP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptQuotation(rfpId) {
    try {
      await api.patch(`/bookings/${rfpId}/accept-quotation`, { startDate });
      toast.success("Cooperative Quotation accepted successfully! Cooperative has been notified to allocate workers.");
      fetchMyRfps();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not accept quotation.");
    }
  }

  async function handleSubmitPaymentProof(e) {
    e.preventDefault();
    if (!paymentSsUrl) {
      toast.warning("Please upload a payment screenshot proof.");
      return;
    }
    setUploadingPayment(true);
    try {
      const payAmt = Number(paymentModalRfp?.price) || Number(paymentModalRfp?.bulkDetails?.quotation?.price) || 0;
      await api.post(`/bookings/${paymentModalRfp._id}/household-payment-proof`, {
        ssUrl: paymentSsUrl,
        amount: payAmt,
        txnRef: paymentTxnRef || `SS-TXN-${Date.now().toString().slice(-6)}`,
      });
      toast.success("Payment screenshot proof uploaded! Cooperative Admin will verify shortly.");
      setPaymentModalRfp(null);
      setPaymentSsUrl("");
      setPaymentTxnRef("");
      fetchMyRfps();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to upload payment proof.");
    } finally {
      setUploadingPayment(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-6">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary-container/50 text-primary text-xs font-bold border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Institutional RFP & Multi-Worker Dispatch
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
          >
            Bulk Workforce RFP & Quotations
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Order custom worker combinations (e.g. 3 Labourers, 2 Plumbers, 1 Carpenter), receive formal quotations, and track allocations.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "create"
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <Plus size={14} />
            <span>Create Bulk RFP</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("track")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "track"
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <FileText size={14} />
            <span>My RFP Orders ({myRfps.length})</span>
          </button>
        </div>
      </div>

      {activeTab === "track" ? (
        /* ── MY RFP ORDERS TRACKER TAB ── */
        <div className="space-y-4">
          {loadingRfps ? (
            <div className="p-8 text-center text-sm font-bold text-on-surface-variant">Loading your active RFP orders...</div>
          ) : myRfps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant p-8 text-center space-y-3 bg-surface">
              <Building2 size={32} className="mx-auto text-primary/40" />
              <h3 className="text-base font-bold text-on-surface">No Active Bulk RFPs</h3>
              <p className="text-xs text-on-surface-variant">Create a bulk request to receive formal quotations from registered cooperatives.</p>
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition cursor-pointer inline-flex items-center gap-1"
              >
                <Plus size={14} /> Create Bulk RFP Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRfps.map((rfp) => {
                const isQuotationSent = rfp.bulkDetails?.quotation?.status === "sent";
                const isQuotationAccepted = rfp.bulkDetails?.quotation?.status === "accepted" || rfp.status === "accepted" || rfp.status === "in-progress";
                const paymentProof = rfp.bulkDetails?.householdPaymentProof;
                const allocations = rfp.bulkDetails?.allocations || [];
                const totalAllocated = allocations.length;
                const acceptedWorkers = allocations.filter((a) => a.status === "accepted").length;
                const rejectedWorkers = allocations.filter((a) => a.status === "rejected").length;

                return (
                  <div key={rfp._id} className="rounded-2xl border border-outline-variant bg-surface p-5 space-y-4 shadow-xs">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-outline-variant/60">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-primary-container/60 text-primary text-[10.5px] font-bold">
                          RFP #{rfp._id.slice(-6)}
                        </span>
                        <span className="ml-1.5 px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10.5px] font-bold border border-outline-variant/60">
                          {timeAgo(rfp.createdAt)}
                        </span>
                        <h3 className="text-base font-bold text-on-surface mt-1">{rfp.service}</h3>
                        <p className="text-xs text-on-surface-variant">
                          Cooperative: <strong className="text-on-surface">{rfp.cooperativeId?.name || "Primary Cooperative Union"}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-on-surface-variant uppercase">Estimated Quote</p>
                        <p className="text-lg font-black text-primary">₹{(rfp.price || 0).toLocaleString("en-IN")}</p>
                      </div>
                    </div>

                    {/* Roles Breakdown */}
                    {rfp.bulkDetails?.rolesNeeded && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-on-surface-variant uppercase">Requested Worker Crew:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rfp.bulkDetails.rolesNeeded.map((r, i) => (
                            <span key={i} className="px-2 py-1 rounded-lg bg-surface-container-low border border-outline-variant text-xs font-bold text-on-surface">
                              {r.count}x {r.role} (₹{r.dailyRate || 0}/day)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dates & Duration */}
                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60">
                      <div>
                        <p className="text-on-surface-variant font-bold text-[10px] uppercase">Start Date</p>
                        <p className="font-bold text-on-surface">
                          {rfp.scheduledTime ? new Date(rfp.scheduledTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                        </p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant font-bold text-[10px] uppercase">Duration</p>
                        <p className="font-bold text-on-surface">{rfp.bulkDetails?.durationDays || 1} Days</p>
                      </div>
                    </div>

                    {/* Worker Allocation Status matrix summary */}
                    {totalAllocated > 0 && (
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-primary flex items-center gap-1">
                            <IconUsers size={14} /> Worker Allocations ({acceptedWorkers}/{totalAllocated} Confirmed)
                          </span>
                          {rejectedWorkers > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 text-[10.5px]">
                              ⚠️ {rejectedWorkers} Rejected (Re-allocating)
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {allocations.map((a, idx) => (
                            <div key={idx} className="p-1.5 rounded-lg bg-surface border border-outline-variant text-[11px] flex items-center justify-between">
                              <span className="font-bold text-on-surface truncate">{a.role}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                a.status === "accepted"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : a.status === "rejected"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {a.status === "accepted" ? "✓ Accepted" : a.status === "rejected" ? "❌ Rejected" : "● Pending"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quotation Status & Actions */}
                    <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between gap-2 flex-wrap">
                      {isQuotationSent && !isQuotationAccepted ? (
                        <div className="w-full space-y-2">
                          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs">
                            <p className="font-bold">📑 Official Quotation Received!</p>
                            <p className="text-[11px] mt-0.5">{rfp.bulkDetails?.quotation?.notes || "Cooperative has reviewed and sent final institutional quotation."}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAcceptQuotation(rfp._id)}
                            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <CheckCircle2 size={14} /> Accept Quotation & Request Crew
                          </button>
                        </div>
                      ) : isQuotationAccepted ? (
                        <div className="w-full space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 size={14} /> Quotation Accepted
                            </span>
                            {paymentProof ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                paymentProof.verifiedByCoop ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {paymentProof.verifiedByCoop ? "✓ Payment Proof Verified" : "● Payment Proof Pending Verification"}
                              </span>
                            ) : null}
                          </div>

                          {!paymentProof && (
                            <button
                              type="button"
                              onClick={() => setPaymentModalRfp(rfp)}
                              className="w-full h-9 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1 hover:opacity-90 transition cursor-pointer"
                            >
                              <Upload size={14} /> Upload Payment Screenshot Proof (SS)
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                          <Clock size={13} /> Awaiting Cooperative Secretary Quotation...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── CREATE BULK RFP FORM TAB ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Multi-Role Configuration Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSendRFP} className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-xs space-y-6">
              
              {/* 1. Multi-Role Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant">
                    1. Define Required Worker Crew Roles & Headcount
                  </label>
                  <span className="text-xs font-bold text-primary bg-primary-container/50 px-2.5 py-0.5 rounded-md border border-primary/20">
                    Total: {totalWorkerHeadcount} Workers
                  </span>
                </div>

                {/* Selected Roles List */}
                <div className="space-y-2">
                  {selectedRoles.map((roleObj) => (
                    <div key={roleObj.role} className="flex items-center justify-between p-3 rounded-xl border border-outline-variant bg-surface-container-low">
                      <div>
                        <p className="text-xs font-bold text-on-surface">{roleObj.role}</p>
                        <p className="text-[11px] text-on-surface-variant">₹{roleObj.dailyRate}/worker/day</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-surface px-2 py-1 rounded-lg border border-outline-variant">
                          <button
                            type="button"
                            onClick={() => handleCountChange(roleObj.role, -1)}
                            className="w-6 h-6 rounded bg-surface-container-high font-bold text-xs flex items-center justify-center hover:bg-outline-variant cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-primary w-6 text-center">{roleObj.count}</span>
                          <button
                            type="button"
                            onClick={() => handleCountChange(roleObj.role, 1)}
                            className="w-6 h-6 rounded bg-surface-container-high font-bold text-xs flex items-center justify-center hover:bg-outline-variant cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRole(roleObj.role)}
                          className="text-on-surface-variant hover:text-error transition cursor-pointer p-1"
                          title="Remove Role"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add More Trade Buttons */}
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase mb-2">+ Add Additional Role to Crew:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILLS.map((skill) => {
                      const isAdded = selectedRoles.some((r) => r.role === skill.label);
                      return (
                        <button
                          key={skill.label}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddRole(skill.label)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isAdded
                              ? "bg-surface-container-low text-on-surface-variant/50 border border-outline-variant/40 cursor-not-allowed"
                              : "bg-surface border border-outline-variant text-on-surface hover:border-primary hover:text-primary"
                          }`}
                        >
                          <Plus size={12} /> {skill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Duration & Start Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-outline-variant/60">
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    2. Confirmed Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full h-11 px-3.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    3. Work Duration (Days)
                  </label>
                  <select
                    value={selectedDuration.days}
                    onChange={(e) => {
                      const d = DURATIONS.find((x) => x.days === Number(e.target.value)) || DURATIONS[0];
                      setSelectedDuration(d);
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.days} value={d.days}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Site Location & Detailed Scope */}
              <div className="space-y-3 pt-1 border-t border-outline-variant/60">
                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    4. Project Site Location
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low focus-within:border-primary transition">
                    <MapPin size={16} className="text-primary shrink-0" />
                    <input
                      type="text"
                      value={siteLocation}
                      onChange={(e) => setSiteLocation(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-on-surface"
                      placeholder="Project site address / landmark in India"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    5. Detailed Scope of Work & Instructions for Cooperative
                  </label>
                  <textarea
                    rows={3}
                    value={requirementMsg}
                    onChange={(e) => setRequirementMsg(e.target.value)}
                    placeholder={`e.g. Requirement for ${selectedRoles.map(r => `${r.count} ${r.role}`).join(', ')} for ${totalDays} days. Shift timings 9 AM - 6 PM. Tools & site clearance provided.`}
                    className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary outline-none transition"
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
                <span>{submitting ? "Transmitting RFP to Cooperative..." : `Dispatch Institutional RFP for ${totalWorkerHeadcount} Workers (${totalDays} Days)`}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Quotation Breakdown & Cooperative Selection (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quotation Breakdown Card */}
            <div className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant/60">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-on-surface" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                    Estimated Institutional Quotation
                  </h3>
                  <p className="text-xs text-on-surface-variant">Statutory Nodal Escrow Model</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container/50 text-primary text-[11px] font-bold border border-primary/20">
                  <ShieldCheck size={11} /> Statutory Cap
                </span>
              </div>

              {/* Role-wise Summary */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-on-surface-variant uppercase text-[10.5px]">Selected Crew Composition:</p>
                <div className="space-y-1">
                  {selectedRoles.map((r) => (
                    <div key={r.role} className="flex justify-between text-on-surface font-semibold">
                      <span>• {r.count}x {r.role} ({totalDays} days):</span>
                      <span>₹{(r.count * r.dailyRate * totalDays).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1.5 text-xs pt-2">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>• Net Worker Escrow Take-Home (85%):</span>
                    <span className="font-bold text-emerald-700">₹{workerTakeHome.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>• Cooperative Member Welfare Pool (10%):</span>
                    <span className="font-bold text-primary">₹{coopWelfarePool.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>• Platform Tech & Insurance (5%):</span>
                    <span className="font-bold text-on-surface-variant">₹{fedPlatformFee.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-outline-variant/60">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Total Estimated RFP</p>
                    <p className="text-[10px] text-on-surface-variant/70">Final quotation subject to coop review</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">₹{totalGrossWage.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cooperative Directory */}
            <div className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-on-surface" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                    Select Target Cooperative Union
                  </h3>
                </div>
                <Building2 size={16} className="text-primary" />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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
                            <p className="text-[10.5px] text-on-surface-variant">
                              Reg: {coop.registrationNumber || "MSCS-DEL-2024"} • {coop.district || "Delhi NCR"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Upload Modal */}
      {paymentModalRfp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleSubmitPaymentProof} className="w-full max-w-md rounded-2xl bg-surface p-6 space-y-4 shadow-2xl border border-outline-variant">
            <h3 className="text-base font-bold text-on-surface">Upload Payment Screenshot Proof</h3>
            <p className="text-xs text-on-surface-variant">
              Upload payment screenshot (SS) proof for RFP #{paymentModalRfp._id.slice(-6)} (Total Amount: ₹{(paymentModalRfp.price || 0).toLocaleString("en-IN")}).
            </p>

            <FileUpload
              label="Upload Payment Screenshot (SS)"
              onSelect={(url) => setPaymentSsUrl(url)}
              multiple={false}
              folder="sahakargig/payments/household"
            />

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Transaction Ref / UTR (Optional)</label>
              <input
                type="text"
                value={paymentTxnRef}
                onChange={(e) => setPaymentTxnRef(e.target.value)}
                placeholder="e.g. UTR-9824128941"
                className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalRfp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingPayment || !paymentSsUrl}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                {uploadingPayment ? "Uploading..." : "Submit Payment Proof"}
              </button>
            </div>
          </form>
        </div>
      )}

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
              Your request for <strong className="text-on-surface">{successModal.rolesSummary}</strong> ({successModal.durationDays} Days, starting {successModal.startDate}) has been transmitted to <strong className="text-primary">{successModal.coopName}</strong>. The Cooperative Admin will review and send a formal quotation.
            </p>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface-variant text-left space-y-1">
              <p>• <strong>RFP Reference ID:</strong> {successModal.bookingId}</p>
              <p>• <strong>Estimated Escrow:</strong> ₹{successModal.amount.toLocaleString("en-IN")}</p>
              <p>• <strong>Status:</strong> Dispatched to Society Admin Desk</p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSuccessModal(null);
                  setActiveTab("track");
                }}
                className="w-full h-10 rounded-xl bg-primary hover:opacity-90 text-white text-xs font-bold transition cursor-pointer"
              >
                Track in My RFP Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
