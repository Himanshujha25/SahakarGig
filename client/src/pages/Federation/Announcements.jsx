import { useEffect, useState } from "react";
import api from "../../lib/api";
import CustomSelect from "../../components/CustomSelect";
import ConfirmModal from "../../components/ConfirmModal";
import {
  Megaphone, Plus, Search, Calendar, Users, Building2, Tag,
  Clock, Trash2, CheckCircle2, AlertCircle, Sparkles, Filter,
  Send, Pin, Layers, X, ShieldAlert, BadgeInfo, RefreshCw, BadgeCheck
} from "lucide-react";

export default function FederationAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("official"); // "official" | "safety" | "scheme" | "bonus" | "general"
  const [targetAudience, setTargetAudience] = useState("all"); // "all" | "specific_coop" | "skills"
  const [selectedCoopIds, setSelectedCoopIds] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [sending, setSending] = useState(false);

  const SKILL_OPTIONS = ["Plumber", "Electrician", "Carpenter", "Painter", "Cleaner", "Cook", "Caregiver", "Driver", "Gardener", "Tutor"];

  const load = async () => {
    setLoading(true);
    try {
      const [annRes, coopRes] = await Promise.all([
        api.get("/federation/announcements").catch(() => ({ data: [] })),
        api.get("/federation/cooperatives").catch(() => ({ data: [] })),
      ]);
      setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);
      setCooperatives(Array.isArray(coopRes.data) ? coopRes.data : []);
    } catch (err) {
      console.error("Failed to load announcements:", err);
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

  async function handleCreateAnnouncement(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    try {
      const { data } = await api.post("/federation/announcements", {
        title: title.trim(),
        body: body.trim(),
        category,
        targetAudience,
        targetCooperativeIds: targetAudience === "specific_coop" ? selectedCoopIds : [],
        targetSkills: targetAudience === "skills" ? selectedSkills : [],
        scheduledFor: isScheduled && scheduledFor ? scheduledFor : new Date(),
        isPinned,
      });

      showToast(data.message || "Announcement published to network!");
      setComposeOpen(false);
      setTitle("");
      setBody("");
      setSelectedCoopIds([]);
      setSelectedSkills([]);
      setIsScheduled(false);
      setScheduledFor("");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to post announcement.");
    } finally {
      setSending(false);
    }
  }

  const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", type: "danger", onConfirm: () => {} });

  function handleDelete(id) {
    setConfirmState({
      isOpen: true,
      title: "Delete Announcement?",
      message: "Are you sure you want to delete this announcement? This action cannot be undone.",
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await api.delete(`/federation/announcements/${id}`);
          showToast("Announcement removed.");
          load();
        } catch {
          showToast("Failed to delete announcement.");
        }
      },
    });
  }

  const filtered = announcements.filter((a) => {
    const q = search.toLowerCase();
    return a.title?.toLowerCase().includes(q) || a.body?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <BadgeCheck size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Network Announcements
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              Broadcast Center
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Publish official policies, government welfare updates, and targeted notices to member cooperatives.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setComposeOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Create Notice</span>
          </button>
          <button
            onClick={load}
            className="p-2 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors cursor-pointer shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Search & Counter ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          <span>{announcements.length} Total Notices</span>
          <span>·</span>
          <span>{announcements.filter((a) => a.status === "scheduled").length} Scheduled</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notices..."
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-medium text-on-surface outline-none focus:border-primary shadow-2xs"
          />
        </div>
      </div>

      {/* ── Announcements Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-surface-container animate-pulse border border-outline-variant/60" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-10 text-center rounded-2xl border border-dashed border-outline-variant bg-surface space-y-2">
            <Megaphone size={32} className="mx-auto text-primary/40" />
            <h3 className="text-sm font-bold text-on-surface">No announcements found</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Click &quot;Create Notice&quot; above to broadcast an official notice or scheme update.
            </p>
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a._id}
              className="rounded-2xl border border-outline-variant/60 bg-surface p-4 space-y-3 shadow-2xs flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase bg-surface-container text-on-surface-variant border border-outline-variant/40"
                    >
                      {a.category}
                    </span>
                    {a.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                        <Pin size={10} /> Pinned
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-on-surface-variant flex items-center gap-1 font-medium">
                      <Clock size={11} />
                      {new Date(a.scheduledFor || a.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-on-surface leading-snug">{a.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed whitespace-pre-line line-clamp-3">
                    {a.body}
                  </p>
                </div>
              </div>

              {/* Target Audience Footer Badge */}
              <div className="pt-2.5 border-t border-outline-variant/40 flex items-center justify-between text-xs text-on-surface-variant">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Users size={12} className="text-primary" />
                  <span>
                    Audience:{" "}
                    <strong className="text-on-surface font-semibold">
                      {a.targetAudience === "all"
                        ? "All Federation Workers"
                        : a.targetAudience === "specific_coop"
                        ? `${a.targetCooperativeIds?.length || 1} Selected Cooperatives`
                        : `${a.targetSkills?.join(", ") || "Selected Skills"}`}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Compose Modal ── */}
      {composeOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setComposeOpen(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Megaphone size={15} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-on-surface">Publish Broadcast Notice</h2>
                  <p className="text-[11px] text-on-surface-variant">Distribute to affiliated primary cooperatives.</p>
                </div>
              </div>
              <button onClick={() => setComposeOpen(false)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Notice Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory Safety Gear Compliance & Welfare Grant"
                  className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Category</label>
                  <CustomSelect
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    size="sm"
                    options={[
                      { value: "official", label: "Official Directive" },
                      { value: "scheme", label: "Govt Scheme / Welfare" },
                      { value: "bonus", label: "Bonus / Incentive" },
                      { value: "safety", label: "Safety & Compliance" },
                      { value: "general", label: "General Notice" },
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Target Audience</label>
                  <CustomSelect
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    size="sm"
                    options={[
                      { value: "all", label: "All Cooperatives & Workers" },
                      { value: "specific_coop", label: "Specific Cooperatives" },
                      { value: "skills", label: "Target Specific Skills" },
                    ]}
                  />
                </div>
              </div>

              {targetAudience === "specific_coop" && (
                <div className="space-y-1.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <label className="font-bold text-on-surface-variant">Select Cooperatives</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {cooperatives.map((c) => (
                      <label key={c._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface text-xs cursor-pointer text-on-surface">
                        <input
                          type="checkbox"
                          checked={selectedCoopIds.includes(c._id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCoopIds([...selectedCoopIds, c._id]);
                            else setSelectedCoopIds(selectedCoopIds.filter((id) => id !== c._id));
                          }}
                          className="rounded text-primary"
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {targetAudience === "skills" && (
                <div className="space-y-1.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <label className="font-bold text-on-surface-variant">Select Trade Skills</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_OPTIONS.map((skill) => {
                      const selected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            if (selected) setSelectedSkills(selectedSkills.filter((s) => s !== skill));
                            else setSelectedSkills([...selectedSkills, skill]);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selected
                              ? "bg-primary text-on-primary"
                              : "bg-surface text-on-surface-variant border border-outline-variant"
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Notice Content</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Enter full details of the notice..."
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-on-surface">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Pin to top of feed</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>{sending ? "Publishing..." : "Broadcast Notice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        {...confirmState}
        onClose={() => setConfirmState((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
