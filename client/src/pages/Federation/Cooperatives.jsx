import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import {
  Building2, Plus, Search, Link2, Share2, Download,
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  ChevronRight, Copy, Check, QrCode, ExternalLink, RefreshCw, X
} from "lucide-react";

export default function FederationCooperatives() {
  const navigate = useNavigate();
  const [coops, setCoops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Modals
  const [registerOpen, setRegisterOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [inviteModal, setInviteModal] = useState(null);
  const [copied, setCopied] = useState(false);

  // Register Form
  const [regName, setRegName] = useState("");
  const [regId, setRegId] = useState("");
  const [regRegion, setRegRegion] = useState("Delhi Central");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCommission, setRegCommission] = useState("8");
  const [regAdminName, setRegAdminName] = useState("");

  // Link Form
  const [linkCoopId, setLinkCoopId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/federation/cooperatives");
      setCoops(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load cooperatives:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  }

  // Register New Cooperative
  async function handleRegister(e) {
    e.preventDefault();
    if (!regName.trim() || !regId.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/federation/cooperatives/register", {
        name: regName.trim(),
        registrationId: regId.trim(),
        region: regRegion,
        district: regRegion,
        state: "Delhi",
        contactEmail: regEmail.trim(),
        contactPhone: regPhone.trim(),
        commissionRate: Number(regCommission) || 8,
        adminName: regAdminName.trim(),
        adminEmail: regEmail.trim(),
      });
      showToast(data.message || "New Cooperative registered successfully!");
      setRegisterOpen(false);
      setRegName("");
      setRegId("");
      setRegEmail("");
      setRegPhone("");
      setRegAdminName("");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  // Link Existing Cooperative
  async function handleLink(e) {
    e.preventDefault();
    if (!linkCoopId.trim()) return;
    setBusy(true);
    try {
      await api.post("/federation/cooperatives/onboard", { cooperativeId: linkCoopId.trim() });
      showToast("Cooperative linked successfully!");
      setLinkOpen(false);
      setLinkCoopId("");
      load();
    } catch (err) {
      showToast("Failed to link cooperative. Please verify the ID.");
    } finally {
      setBusy(false);
    }
  }

  // Toggle Status (Active / Suspended)
  async function toggleStatus(coop, e) {
    e.stopPropagation();
    const newStatus = coop.status === "suspended" ? "active" : "suspended";
    const promptReason = newStatus === "suspended" ? window.prompt("Reason for suspending cooperative:") : "Re-activated";
    if (newStatus === "suspended" && !promptReason) return;

    try {
      await api.patch(`/federation/cooperatives/${coop._id}/status`, {
        status: newStatus,
        statusReason: promptReason || "",
      });
      showToast(`Cooperative marked as ${newStatus}.`);
      load();
    } catch (err) {
      showToast("Failed to update status.");
    }
  }

  // Open Member Invite Link Modal
  async function openInvite(coop, e) {
    e.stopPropagation();
    try {
      const { data } = await api.get(`/federation/cooperatives/${coop._id}/invite`);
      setInviteModal({ ...data, coop });
    } catch {
      const baseUrl = window.location.origin;
      setInviteModal({
        cooperativeName: coop.name,
        inviteCode: coop.inviteCode || "COOP-" + coop._id.slice(-4).toUpperCase(),
        inviteLink: `${baseUrl}/signup?coopId=${coop._id}&ref=fed`,
        coop,
      });
    }
  }

  // Download KPI Report
  async function downloadKpiReport() {
    try {
      const { data } = await api.get("/federation/cooperatives/kpi-report");
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Federation_Cooperative_KPI_Report_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      showToast("KPI Report downloaded successfully!");
    } catch (err) {
      showToast("Failed to generate KPI report.");
    }
  }

  const filtered = coops.filter((c) => {
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.registrationId?.toLowerCase().includes(q) || c.region?.toLowerCase().includes(q);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <Building2 size={16} />
            <span>Federation Governance</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-on-surface">
            Cooperative Societies Directory
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Register new primary cooperatives, monitor institutional KPIs, and manage member onboarding.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={downloadKpiReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
            title="Download monthly KPI report"
          >
            <Download size={14} />
            <span>Export KPI Report</span>
          </button>
          <button
            onClick={() => setLinkOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-primary/30 bg-[#e8edff] text-[#00288e] text-xs font-bold hover:bg-[#d7e3ff] transition-all cursor-pointer"
          >
            <Link2 size={14} />
            <span>Link Existing Coop</span>
          </button>
          <button
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-heading text-xs font-bold hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Register New Cooperative</span>
          </button>
        </div>
      </div>

      {/* Search & Statistics */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
          <span>{coops.length} Total Societies</span>
          <span>·</span>
          <span className="text-[#006d30]">{coops.filter((c) => c.status !== "suspended").length} Active</span>
          <span>·</span>
          <span className="text-error">{coops.filter((c) => c.status === "suspended").length} Suspended</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cooperative by name, reg ID..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Cooperatives Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-5 py-3.5">Cooperative Society</th>
                <th className="px-5 py-3.5">Registration ID</th>
                <th className="px-5 py-3.5">Jurisdiction / Region</th>
                <th className="px-5 py-3.5">Gig Members</th>
                <th className="px-5 py-3.5">Commission</th>
                <th className="px-5 py-3.5">Compliance Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-on-surface-variant">
                    <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                    Loading cooperative societies…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm text-on-surface-variant">
                    <Building2 size={36} className="mx-auto text-primary/40 mb-2" />
                    No cooperatives found. Click &quot;Register New Cooperative&quot; to onboard.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isSuspended = c.status === "suspended";
                  return (
                    <tr
                      key={c._id}
                      onClick={() => navigate(`/federation/cooperatives/${c._id}`)}
                      className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface hover:text-primary leading-tight">
                              {c.name}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              {c.contactEmail || c.adminId?.email || "Admin Configured"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-on-surface">
                        {c.registrationId || "REG-2026-001"}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-on-surface-variant">
                        {c.region || c.district || "Delhi Central"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-on-surface">
                          {c.providerCount || 0}{" "}
                          <span className="text-on-surface-variant font-normal">
                            ({c.verifiedCount || 0} verified)
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-[#e8edff] text-[#00288e] px-2.5 py-0.5 text-xs font-bold">
                          {c.commissionRate || 8}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold">
                            <XCircle size={12} /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e6f9ec] text-[#006d30] text-[11px] font-bold">
                            <ShieldCheck size={12} /> Active &amp; Verified
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => openInvite(c, e)}
                            className="p-1.5 rounded-lg border border-outline-variant text-primary hover:bg-primary-container text-xs font-bold transition-all cursor-pointer"
                            title="Generate Member Invite Link"
                          >
                            <Share2 size={14} />
                          </button>
                          <button
                            onClick={(e) => toggleStatus(c, e)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSuspended
                                ? "bg-[#006d30] text-white hover:bg-[#005a26]"
                                : "border border-error text-error hover:bg-error-container/40"
                            }`}
                          >
                            {isSuspended ? "Re-Activate" : "Suspend"}
                          </button>
                          <button
                            onClick={() => navigate(`/federation/cooperatives/${c._id}`)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary cursor-pointer"
                            title="View Full Profile"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Register New Cooperative Modal ── */}
      {registerOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setRegisterOpen(false)}>
          <div className="w-full max-w-xl bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 lg:p-8 space-y-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Register Primary Cooperative</h2>
                  <p className="text-xs text-on-surface-variant">Create and onboard a verified Labour Cooperative Society.</p>
                </div>
              </div>
              <button onClick={() => setRegisterOpen(false)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Society Legal Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Rohini Skilled Workers Cooperative"
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Registration Number (RCS / MSCS)</label>
                  <input
                    type="text"
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    placeholder="e.g. MSCS/CR/2026/089"
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Jurisdiction District / Area</label>
                  <input
                    type="text"
                    value={regRegion}
                    onChange={(e) => setRegRegion(e.target.value)}
                    placeholder="e.g. North West Delhi"
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Cooperative Commission Rate (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={regCommission}
                    onChange={(e) => setRegCommission(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-outline-variant/60 pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Contact Email / Admin Login</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="admin@rohini-coop.org"
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Contact Phone Number</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Designated Society Administrator Name</label>
                <input
                  type="text"
                  value={regAdminName}
                  onChange={(e) => setRegAdminName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setRegisterOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {busy ? "Registering…" : "Register Cooperative"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Link Existing Cooperative Modal ── */}
      {linkOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setLinkOpen(false)}>
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Link2 size={18} className="text-primary" />
                <h3 className="text-base font-bold text-on-surface">Link Existing Cooperative</h3>
              </div>
              <button onClick={() => setLinkOpen(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLink} className="space-y-3">
              <p className="text-xs text-on-surface-variant">
                Enter the MongoDB Object ID or Registration code of an existing cooperative to affiliate under this federation.
              </p>
              <input
                type="text"
                value={linkCoopId}
                onChange={(e) => setLinkCoopId(e.target.value)}
                placeholder="Paste Cooperative ID (e.g. 66c7f8...)"
                className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary font-mono"
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {busy ? "Linking…" : "Link Society"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Member Onboarding Invite Link Modal ── */}
      {inviteModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setInviteModal(null)}>
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-primary" />
                <h3 className="text-base font-bold text-on-surface">Member Worker Onboarding Invite</h3>
              </div>
              <button onClick={() => setInviteModal(null)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-center space-y-3">
              <p className="text-xs text-on-surface-variant">
                Share this unique invite link with local gig workers to onboard them under{" "}
                <strong className="text-on-surface">{inviteModal.cooperativeName}</strong>.
              </p>

              <div className="p-3 rounded-xl bg-surface border border-outline-variant flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-primary truncate">
                  {inviteModal.inviteLink}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteModal.inviteLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Join ${inviteModal.cooperativeName} on SahakarGig: ${inviteModal.inviteLink}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 size={14} /> Share via WhatsApp
                </a>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInviteModal(null)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
