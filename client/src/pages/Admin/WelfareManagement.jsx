import { useState, useEffect } from "react";
import {
  HeartHandshake, ShieldCheck, Plus, CheckCircle2,
  Clock, DollarSign, FileText, AlertCircle, X,
  Printer, QrCode, Search, ChevronRight, Check,
  Ban, Building2, Upload, FileCheck2, User, HelpCircle,
  Eye, Download, RefreshCw, Layers
} from "lucide-react";
import api from "../../lib/api";

export default function WelfareManagement() {
  const [activeTab, setActiveTab] = useState("schemes"); // 'schemes' | 'queue' | 'disbursed' | 'statutory'
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState([]);
  const [claims, setClaims] = useState([]);
  const [providers, setProviders] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateSchemeModal, setShowCreateSchemeModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [selectedSchemeForApply, setSelectedSchemeForApply] = useState(null);

  // Scheme Creation Form State
  const [schemeForm, setSchemeForm] = useState({
    title: "",
    category: "equipment",
    description: "",
    maxAmountPerMember: 5000,
    totalBudget: 50000,
    requiredDocs: "e-Shram UAN, GST Equipment Purchase Invoice / Receipt",
    minCompletedJobs: 3,
    minTrustScore: 4.0,
    requireEshram: true,
  });

  // Apply Form State (for simulation or direct submission)
  const [applyForm, setApplyForm] = useState({
    providerId: "",
    requestedAmount: 3500,
    purposeDescription: "",
    docName: "Tax_Invoice_Tools.pdf",
  });

  // Review Form State
  const [reviewForm, setReviewForm] = useState({
    status: "approved",
    approvedAmount: 0,
    reviewNotes: "Verified valid purchase invoice & active cooperative member standing.",
    rejectionReason: "",
  });

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  }

  // Load Data
  async function loadData() {
    setLoading(true);
    try {
      const [sRes, cRes, pRes] = await Promise.allSettled([
        api.get("/welfare/schemes"),
        api.get("/welfare/claims"),
        api.get("/providers"),
      ]);

      if (sRes.status === "fulfilled" && Array.isArray(sRes.value.data)) {
        setSchemes(sRes.value.data);
      } else {
        // Fallback demo schemes
        setSchemes([
          {
            _id: "sch-1",
            title: "Trade Tool & Equipment Subsidy",
            category: "equipment",
            description: "Financial grant for purchasing essential professional tools (drills, multimeters, wrench sets).",
            maxAmountPerMember: 5000,
            totalBudget: 50000,
            utilizedBudget: 14500,
            requiredDocs: ["e-Shram UAN", "Equipment Tax Invoice / GST Bill"],
            eligibility: { minCompletedJobs: 3, minTrustScore: 4.0, requireEshram: true },
            status: "active",
          },
          {
            _id: "sch-2",
            title: "Emergency Medical & Hospital Relief",
            category: "medical",
            description: "Cashless reimbursement for on-duty injuries and emergency hospitalizations for member families.",
            maxAmountPerMember: 25000,
            totalBudget: 150000,
            utilizedBudget: 25000,
            requiredDocs: ["Doctor Prescription", "Hospital Discharge Summary / Bills"],
            eligibility: { minCompletedJobs: 1, minTrustScore: 3.5, requireEshram: true },
            status: "active",
          },
          {
            _id: "sch-3",
            title: "Member Child Education Bursary",
            category: "education",
            description: "Annual academic grant for textbooks, uniform, and school fees for worker dependents.",
            maxAmountPerMember: 4000,
            totalBudget: 40000,
            utilizedBudget: 8000,
            requiredDocs: ["School Admission Receipt", "Aadhaar Card"],
            eligibility: { minCompletedJobs: 5, minTrustScore: 4.5, requireEshram: true },
            status: "active",
          },
        ]);
      }

      if (cRes.status === "fulfilled" && Array.isArray(cRes.value.data)) {
        setClaims(cRes.value.data);
      } else {
        // Fallback demo claims
        setClaims([
          {
            _id: "clm-101",
            schemeId: { _id: "sch-1", title: "Trade Tool & Equipment Subsidy", maxAmountPerMember: 5000 },
            providerId: { _id: "prov-1", userId: { name: "Ramesh Kumar", email: "plumber.test@gmail.com", phone: "+91 98110 00003" } },
            requestedAmount: 4500,
            approvedAmount: 4500,
            purposeDescription: "Heavy-duty rotary hammer drill kit for commercial plumbing pipe installations.",
            documentNames: ["Hammer_Drill_GST_Invoice.pdf", "eShram_Verified_Card.png"],
            status: "disbursed",
            transactionRef: "WLF-88X92-2026",
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
            disbursedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          {
            _id: "clm-102",
            schemeId: { _id: "sch-1", title: "Trade Tool & Equipment Subsidy", maxAmountPerMember: 5000 },
            providerId: { _id: "prov-2", userId: { name: "Amit Sharma", email: "electrician.test@gmail.com", phone: "+91 98220 11114" } },
            requestedAmount: 3800,
            approvedAmount: 0,
            purposeDescription: "Digital insulation resistance tester and heavy insulated safety pliers.",
            documentNames: ["Fluke_Tester_Estimate.pdf"],
            status: "submitted",
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      if (pRes.status === "fulfilled" && Array.isArray(pRes.value.data)) {
        setProviders(pRes.value.data);
      }
    } catch (err) {
      console.warn("Welfare fetch note:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compute Metrics
  const totalAllocatedBudget = schemes.reduce((sum, s) => sum + (s.totalBudget || 0), 0);
  const totalUtilizedBudget = schemes.reduce((sum, s) => sum + (s.utilizedBudget || 0), 0);
  const pendingClaimsCount = claims.filter((c) => c.status === "submitted" || c.status === "under_review").length;
  const disbursedClaimsCount = claims.filter((c) => c.status === "disbursed").length;

  // Handle Create Scheme
  async function handleCreateScheme(e) {
    e.preventDefault();
    try {
      const payload = {
        title: schemeForm.title,
        category: schemeForm.category,
        description: schemeForm.description,
        maxAmountPerMember: Number(schemeForm.maxAmountPerMember),
        totalBudget: Number(schemeForm.totalBudget),
        requiredDocs: schemeForm.requiredDocs.split(",").map((s) => s.trim()).filter(Boolean),
        eligibility: {
          minCompletedJobs: Number(schemeForm.minCompletedJobs),
          minTrustScore: Number(schemeForm.minTrustScore),
          requireEshram: schemeForm.requireEshram,
        },
      };

      const res = await api.post("/welfare/schemes", payload);
      setSchemes([res.data, ...schemes]);
      setShowCreateSchemeModal(false);
      showToast(`Scheme "${schemeForm.title}" published & funded successfully!`);
      setSchemeForm({
        title: "",
        category: "equipment",
        description: "",
        maxAmountPerMember: 5000,
        totalBudget: 50000,
        requiredDocs: "e-Shram UAN, GST Equipment Purchase Invoice / Receipt",
        minCompletedJobs: 3,
        minTrustScore: 4.0,
        requireEshram: true,
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create welfare scheme.");
    }
  }

  // Handle Apply Claim (Enforces 1 active claim constraint)
  async function handleApplyClaim(e) {
    e.preventDefault();
    if (!applyForm.providerId || !selectedSchemeForApply) {
      alert("Please select a worker and scheme.");
      return;
    }

    try {
      const payload = {
        schemeId: selectedSchemeForApply._id,
        providerId: applyForm.providerId,
        requestedAmount: Number(applyForm.requestedAmount),
        purposeDescription: applyForm.purposeDescription,
        documentNames: [applyForm.docName, "eShram_Credential_Pass.pdf"],
      };

      const res = await api.post("/welfare/claims", payload);
      setClaims([res.data, ...claims]);
      setShowApplyModal(false);
      showToast("Welfare application submitted for verification review!");
      setApplyForm({ providerId: "", requestedAmount: 3500, purposeDescription: "", docName: "Tax_Invoice_Tools.pdf" });
    } catch (err) {
      alert(err.response?.data?.message || "Application rejected. Worker already has an active claim.");
    }
  }

  // Handle Review Claim
  async function handleReviewClaim(e) {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      const payload = {
        status: reviewForm.status,
        approvedAmount: reviewForm.status === "approved" ? Number(reviewForm.approvedAmount) : 0,
        reviewNotes: reviewForm.reviewNotes,
        rejectionReason: reviewForm.rejectionReason,
      };

      await api.patch(`/welfare/claims/${selectedClaim._id}/review`, payload);
      setShowReviewModal(false);
      await loadData();
      showToast(`Claim ${reviewForm.status === "approved" ? "Approved" : "Rejected"} successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to review claim.");
    }
  }

  // Handle Disburse Claim
  async function handleDisburseClaim(claim) {
    if (!confirm(`Authorize immediate disbursal of ₹${claim.approvedAmount || claim.requestedAmount} from Welfare Reserve Pool?`)) return;
    try {
      const res = await api.post(`/welfare/claims/${claim._id}/disburse`);
      setClaims(claims.map((c) => (c._id === claim._id ? res.data : c)));
      loadData();
      showToast(`₹${claim.approvedAmount || claim.requestedAmount} disbursed from Society Reserve!`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to disburse funds.");
    }
  }

  const categoryBadges = {
    medical: { label: "Healthcare Relief", bg: "bg-rose-50 text-rose-700 border-rose-200" },
    equipment: { label: "Tool & Equipment", bg: "bg-blue-50 text-[#00288e] border-blue-200" },
    emergency: { label: "Emergency Pool", bg: "bg-amber-50 text-amber-800 border-amber-200" },
    education: { label: "Education Bursary", bg: "bg-purple-50 text-purple-700 border-purple-200" },
    insurance: { label: "Accident Cover", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    general: { label: "General Welfare", bg: "bg-slate-100 text-slate-700 border-slate-200" },
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-6 text-slate-900 font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Welfare &amp; Social Security Management
            </h1>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-200 text-xs font-bold flex items-center gap-1">
              <HeartHandshake size={13} />
              5-10% Reserve Pool Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cooperative-funded member security schemes, tool subsidies, verification tribunal, and verifiable digital grants.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCreateSchemeModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <Plus size={15} />
            <span>Launch New Scheme</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI STAT TILES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Welfare Budget</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
              <DollarSign size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{totalAllocatedBudget.toLocaleString('en-IN')}</p>
          <p className="text-[11px] font-semibold text-slate-500">Funded from 10% Society Margin</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Society Schemes</p>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Layers size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{schemes.filter(s => s.status === 'active').length}</p>
          <p className="text-[11px] font-semibold text-purple-700">Open for Member Claims</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disbursed Relief</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{totalUtilizedBudget.toLocaleString('en-IN')}</p>
          <p className="text-[11px] font-bold text-emerald-700">{disbursedClaimsCount} Grants Disbursed</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verification Queue</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Clock size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingClaimsCount}</p>
          <p className="text-[11px] font-bold text-amber-700">{pendingClaimsCount > 0 ? "Pending Board Review" : "Queue Clear ✓"}</p>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "schemes", label: `Active Society Schemes (${schemes.length})`, icon: HeartHandshake },
          { id: "queue", label: `Member Claims Queue (${pendingClaimsCount})`, icon: Clock },
          { id: "disbursed", label: `Disbursal Ledger & Certificates (${disbursedClaimsCount})`, icon: FileCheck2 },
          { id: "statutory", label: "Registrar Compliance & Annual Returns", icon: Building2 },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? "bg-[#00288e] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: ACTIVE SCHEMES ── */}
      {activeTab === "schemes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schemes.map((s) => {
              const catBadge = categoryBadges[s.category] || categoryBadges.general;
              const percentUsed = Math.min(100, Math.round(((s.utilizedBudget || 0) / (s.totalBudget || 1)) * 100));

              return (
                <div key={s._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadge.bg}`}>
                        {catBadge.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {s.status.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                    </div>

                    {/* Grant Details */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Max Cap Per Member</span>
                        <span className="font-bold text-emerald-700">₹{s.maxAmountPerMember.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Total Pool Budget</span>
                        <span className="font-bold text-slate-900">₹{s.totalBudget.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                          <span>Disbursed: ₹{(s.utilizedBudget || 0).toLocaleString('en-IN')}</span>
                          <span>{percentUsed}% Utilized</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00288e] rounded-full" style={{ width: `${percentUsed}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Eligibility & Required Docs */}
                    <div className="space-y-1.5 text-[11px]">
                      <p className="font-bold text-slate-700">Required Documents:</p>
                      <div className="flex flex-wrap gap-1">
                        {(s.requiredDocs || []).map((d, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Min Jobs: {s.eligibility?.minCompletedJobs || 0} • Score: {s.eligibility?.minTrustScore || 0}+
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSchemeForApply(s);
                        setApplyForm({ ...applyForm, requestedAmount: s.maxAmountPerMember });
                        setShowApplyModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                    >
                      Submit Member Claim
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: VERIFICATION & CLAIM QUEUE ── */}
      {activeTab === "queue" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-4">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Member Claims &amp; Proof Verification Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Inspect uploaded bills, verify eligibility, and authorize relief grants.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="px-4 py-3">Claim ID</th>
                  <th className="px-4 py-3">Worker Member</th>
                  <th className="px-4 py-3">Welfare Scheme</th>
                  <th className="px-4 py-3">Requested Amount</th>
                  <th className="px-4 py-3">Attached Proofs</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#00288e]">
                      {row._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{row.providerId?.userId?.name || "Worker Member"}</p>
                      <p className="text-[10.5px] text-slate-400">{row.providerId?.userId?.phone || row.providerId?.userId?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {row.schemeId?.title || "General Welfare Scheme"}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      ₹{(row.requestedAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(row.documentNames || ["Proof_Doc.pdf"]).map((d, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 text-[#00288e] border border-blue-200 font-bold text-[10px] flex items-center gap-1">
                            <FileText size={10} />
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "disbursed" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Disbursed ✓
                        </span>
                      ) : row.status === "approved" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-200 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />
                          Approved (Ready to Disburse)
                        </span>
                      ) : row.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status === "submitted" || row.status === "under_review" ? (
                        <button
                          onClick={() => {
                            setSelectedClaim(row);
                            setReviewForm({
                              status: "approved",
                              approvedAmount: row.requestedAmount,
                              reviewNotes: "All documents inspected and verified against cooperative rules.",
                              rejectionReason: "",
                            });
                            setShowReviewModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold cursor-pointer"
                        >
                          Review &amp; Verify
                        </button>
                      ) : row.status === "approved" ? (
                        <button
                          onClick={() => handleDisburseClaim(row)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Disburse Funds
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedClaim(row);
                            setShowCertificateModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          View Certificate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: DISBURSED LEDGER & CERTIFICATES ── */}
      {activeTab === "disbursed" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-4">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Certified Welfare Grant Disbursals</h3>
              <p className="text-xs text-slate-500 mt-0.5">Official treasury debits and digital verifiable grant passes.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="px-4 py-3">Tx Ref ID</th>
                  <th className="px-4 py-3">Disbursal Date</th>
                  <th className="px-4 py-3">Beneficiary Member</th>
                  <th className="px-4 py-3">Scheme</th>
                  <th className="px-4 py-3">Grant Disbursed</th>
                  <th className="px-4 py-3 text-right">Digital Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.filter((c) => c.status === "disbursed").map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-[#00288e]">
                      {row.transactionRef || `WLF-${row._id.slice(-6).toUpperCase()}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(row.disbursedAt || row.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {row.providerId?.userId?.name || "Worker Member"}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {row.schemeId?.title || "Trade Subsidy"}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      ₹{(row.approvedAmount || row.requestedAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedClaim(row);
                          setShowCertificateModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Printer size={13} className="text-[#00288e]" />
                        <span>Official PDF Certificate</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: STATUTORY REGISTRAR RETURNS ── */}
      {activeTab === "statutory" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Ministry of Cooperation Statutory Checklist
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">1. Multi-State / State Cooperative Society Registration</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Govt Reg: DL-COOP-2026-001</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">VERIFIED ✓</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">2. e-Shram Worker Universal Identity Linking</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">100% active gig worker UAN linkage</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">ACTIVE ✓</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">3. Transparent Escrow Commission Split Ledger</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">85% Worker • 10% Society • 5% Welfare</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">AUTOMATED ✓</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">4. Statutory Welfare Reserve Pool Compliance</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Subsidies funded directly from margins</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">CONFIGURED ✓</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: LAUNCH NEW WELFARE SCHEME ── */}
      {showCreateSchemeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowCreateSchemeModal(false)}>
          <div className="w-full max-w-xl bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Launch New Member Welfare Scheme</h2>
                  <p className="text-xs text-slate-500">Fund social security grants from the cooperative reserve pool</p>
                </div>
              </div>
              <button onClick={() => setShowCreateSchemeModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateScheme} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Scheme Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Electrician Safety Tooling Grant 2026"
                  value={schemeForm.title}
                  onChange={(e) => setSchemeForm({ ...schemeForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={schemeForm.category}
                    onChange={(e) => setSchemeForm({ ...schemeForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                  >
                    <option value="equipment">Tool &amp; Equipment Subsidy</option>
                    <option value="medical">Healthcare / Medical Relief</option>
                    <option value="emergency">Emergency Discretionary Pool</option>
                    <option value="education">Child Education Bursary</option>
                    <option value="insurance">Accident Insurance Support</option>
                    <option value="general">General Member Assistance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Max Grant Cap Per Member (₹)</label>
                  <input
                    type="number"
                    required
                    value={schemeForm.maxAmountPerMember}
                    onChange={(e) => setSchemeForm({ ...schemeForm, maxAmountPerMember: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Total Allocated Budget Pool (₹)</label>
                <input
                  type="number"
                  required
                  value={schemeForm.totalBudget}
                  onChange={(e) => setSchemeForm({ ...schemeForm, totalBudget: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description &amp; Objective</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain the assistance provided, eligible equipment, or medical criteria..."
                  value={schemeForm.description}
                  onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Required Documentary Proofs (comma separated)</label>
                <input
                  type="text"
                  value={schemeForm.requiredDocs}
                  onChange={(e) => setSchemeForm({ ...schemeForm, requiredDocs: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Min Completed Jobs</label>
                  <input
                    type="number"
                    value={schemeForm.minCompletedJobs}
                    onChange={(e) => setSchemeForm({ ...schemeForm, minCompletedJobs: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Min Trust Score</label>
                  <input
                    type="number"
                    step="0.1"
                    value={schemeForm.minTrustScore}
                    onChange={(e) => setSchemeForm({ ...schemeForm, minTrustScore: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateSchemeModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer"
                >
                  Publish &amp; Fund Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: APPLY ON BEHALF OF WORKER (1 Active Claim Limit) ── */}
      {showApplyModal && selectedSchemeForApply && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowApplyModal(false)}>
          <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Apply for: {selectedSchemeForApply.title}</h2>
                <p className="text-xs text-slate-500">Max permissible grant: ₹{selectedSchemeForApply.maxAmountPerMember}</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyClaim} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Worker Member</label>
                <select
                  required
                  value={applyForm.providerId}
                  onChange={(e) => setApplyForm({ ...applyForm, providerId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                >
                  <option value="">-- Choose Member from Roster --</option>
                  {providers.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.userId?.name || p.name || "Worker"} ({(p.skills || [])[0] || "Provider"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Requested Grant Amount (₹)</label>
                <input
                  type="number"
                  max={selectedSchemeForApply.maxAmountPerMember}
                  required
                  value={applyForm.requestedAmount}
                  onChange={(e) => setApplyForm({ ...applyForm, requestedAmount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Purpose Description &amp; Item Details</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specify tool model, medical diagnosis, or emergency reason..."
                  value={applyForm.purposeDescription}
                  onChange={(e) => setApplyForm({ ...applyForm, purposeDescription: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Proof Document Attachment</label>
                <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#00288e]" />
                    <span className="font-bold text-slate-800">{applyForm.docName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">Attached</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                ⚠️ Single Active Claim Rule: The worker must not have any other pending welfare claims in progress.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: REVIEW & VERIFY CLAIM ── */}
      {showReviewModal && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Review Welfare Application</h2>
                <p className="text-xs text-slate-500">Applicant: {selectedClaim.providerId?.userId?.name || "Worker Member"}</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewClaim} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheme:</span>
                  <span className="font-bold text-slate-900">{selectedClaim.schemeId?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Amount:</span>
                  <span className="font-bold text-emerald-700">₹{selectedClaim.requestedAmount}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-500 block">Member Purpose:</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedClaim.purposeDescription}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Review Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: "approved" })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      reviewForm.status === "approved"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    ✓ Approve Grant
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: "rejected" })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      reviewForm.status === "rejected"
                        ? "bg-red-600 text-white border-red-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    ✕ Reject Claim
                  </button>
                </div>
              </div>

              {reviewForm.status === "approved" ? (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Approved Disbursal Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={reviewForm.approvedAmount}
                    onChange={(e) => setReviewForm({ ...reviewForm, approvedAmount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Rejection Reason</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ineligible bill date, missing e-Shram pass..."
                    value={reviewForm.rejectionReason}
                    onChange={(e) => setReviewForm({ ...reviewForm, rejectionReason: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Internal Audit &amp; Board Notes</label>
                <textarea
                  rows={2}
                  value={reviewForm.reviewNotes}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewNotes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer"
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: VERIFIABLE DIGITAL PDF CERTIFICATE ── */}
      {showCertificateModal && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowCertificateModal(false)}>
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <Printer size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Official Welfare Grant Certificate</h2>
                  <p className="text-xs text-slate-500">Certified by Cooperative Social Security Tribunal</p>
                </div>
              </div>
              <button onClick={() => setShowCertificateModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-slate-300 bg-slate-50/60 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-300 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">SAHAKARGIG COOPERATIVE FEDERATION</h3>
                  <p className="text-xs text-slate-700 font-bold">Karol Bagh Labour Cooperative Society Ltd.</p>
                  <p className="text-[11px] text-slate-500">Ministry of Cooperation Govt Registration: DL-COOP-2026-001</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    GRANT DISBURSED ✓
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Date: {new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Beneficiary Member</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedClaim.providerId?.userId?.name || "Ramesh Kumar"}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Welfare Scheme</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedClaim.schemeId?.title || "Tool Subsidy"}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Grant Ref ID</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedClaim.transactionRef || "WLF-88X92"}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Disbursed Relief</span>
                  <p className="font-bold text-emerald-700 mt-0.5">₹{(selectedClaim.approvedAmount || selectedClaim.requestedAmount || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <p className="font-bold text-slate-800">Certified Purpose &amp; Disbursement Terms:</p>
                <p className="text-slate-600">{selectedClaim.purposeDescription}</p>
                <p className="text-[11px] text-slate-400 italic">"Funded directly from the 5-10% Cooperative Margin Reserve Pool under Section 12 of the Multi-State Cooperative Societies Act."</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-300 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <QrCode size={40} className="text-slate-800" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Digitally Certified via SahakarGig Nodal Escrow</p>
                    <p className="text-[10px]">Scan QR to verify authentic grant ledger entry</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-28 h-8 border-b border-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-700">Tribunal Authorized Signatory</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
