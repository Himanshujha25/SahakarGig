import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  Megaphone, Plus, Search, Calendar, Users, Building2, Tag,
  Clock, Trash2, CheckCircle2, AlertCircle, Sparkles, Filter,
  Send, Pin, Layers, X, ShieldAlert, BadgeInfo
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

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`/federation/announcements/${id}`);
      showToast("Announcement removed.");
      load();
    } catch (err) {
      showToast("Failed to delete announcement.");
    }
  }

  const filtered = announcements.filter((a) => {
    const q = search.toLowerCase();
    return a.title?.toLowerCase().includes(q) || a.body?.toLowerCase().includes(q);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <Megaphone size={16} />
            <span>Federation Broadcast Center</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-on-surface">
            Network Announcements
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Publish official policies, government welfare updates, and targeted notices to member cooperatives and gig workers.
          </p>
        </div>

        <button
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-heading text-sm font-semibold hover:shadow-lg active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Create Announcement</span>
        </button>
      </div>

      {/* Search & Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
          <span>{announcements.length} Total Announcements</span>
          <span>·</span>
          <span>{announcements.filter((a) => a.status === "scheduled").length} Scheduled</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-surface-container-low animate-pulse border border-outline-variant/60" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-outline-variant bg-surface space-y-2">
            <Megaphone size={36} className="mx-auto text-primary/40" />
            <h3 className="text-base font-bold text-on-surface">No announcements found</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Click &quot;Create Announcement&quot; above to broadcast an official notice or scheme update.
            </p>
          </div>
        ) : (
          filtered.map((a) => {
            const isScheduledItem = a.status === "scheduled";
            return (
              <div
                key={a._id}
                className="rounded-2xl border border-outline-variant bg-surface p-5 space-y-3 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          a.category === "safety"
                            ? "bg-red-100 text-red-800"
                            : a.category === "bonus"
                            ? "bg-emerald-100 text-emerald-800"
                            : a.category === "scheme"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-[#e8edff] text-[#00288e]"
                        }`}
                      >
                        {a.category}
                      </span>
                      {a.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold">
                          <Pin size={11} /> Pinned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(a.scheduledFor || a.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDelete(a._id)}
                        className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-on-surface leading-snug">{a.title}</h3>
                    <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed whitespace-pre-line line-clamp-3">
                      {a.body}
                    </p>
                  </div>
                </div>

                {/* Target Audience Footer Badge */}
                <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant">
                  <div className="flex items-center gap-1">
                    <Users size={13} className="text-primary" />
                    <span>
                      Audience:{" "}
                      <strong className="text-on-surface">
                        {a.targetAudience === "all"
                          ? "All Federation Workers"
                          : a.targetAudience === "specific_coop"
                          ? `${a.targetCooperativeIds?.length || 1} Selected Cooperatives`
                          : `${a.targetSkills?.join(", ") || "Selected Skills"}`}
                      </strong>
                    </span>
                  </div>

                  {isScheduledItem && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      Scheduled
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Create Announcement Modal ── */}
      {composeOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setComposeOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 lg:p-8 space-y-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Broadcast New Announcement</h2>
                  <p className="text-xs text-on-surface-variant">Targeted notice to affiliated societies and registered gig workers.</p>
                </div>
              </div>
              <button onClick={() => setComposeOpen(false)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              {/* Category Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Announcement Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "official", label: "Official Notice", icon: BadgeInfo },
                    { id: "scheme", label: "Govt. Scheme / Welfare", icon: Sparkles },
                    { id: "safety", label: "Safety Alert", icon: ShieldAlert },
                    { id: "bonus", label: "Incentive / Bonus", icon: Tag },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        category === c.id
                          ? "border-primary bg-primary-container text-on-primary-container ring-1 ring-primary"
                          : "border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface"
                      }`}
                    >
                      <c.icon size={14} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Subject / Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory e-Shram Verification Deadline & PMSBY Claim Window"
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface text-sm font-semibold text-on-surface outline-none focus:border-primary font-heading"
                  required
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Announcement Content</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Type the detailed circular or guidelines to be distributed across worker apps..."
                  className="w-full p-3.5 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface outline-none focus:border-primary font-medium leading-relaxed"
                  required
                />
              </div>

              {/* Target Audience Filter */}
              <div className="space-y-2 border-t border-outline-variant/60 pt-3">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Target Audience</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: "all", label: "Broadcast to ALL Cooperatives" },
                    { id: "specific_coop", label: "Filter by Cooperative" },
                    { id: "skills", label: "Filter by Skill Categories" },
                  ].map((aud) => (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setTargetAudience(aud.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        targetAudience === aud.id
                          ? "bg-[#00288e] text-white shadow-2xs"
                          : "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low"
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>

                {/* Sub-selectors for targeted audience */}
                {targetAudience === "specific_coop" && (
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                    <span className="text-[11px] font-bold text-on-surface-variant">Select Cooperatives to receive this alert:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {cooperatives.map((coop) => {
                        const isSel = selectedCoopIds.includes(coop._id);
                        return (
                          <button
                            key={coop._id}
                            type="button"
                            onClick={() =>
                              setSelectedCoopIds((prev) =>
                                isSel ? prev.filter((id) => id !== coop._id) : [...prev, coop._id]
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                              isSel
                                ? "bg-primary text-on-primary"
                                : "bg-surface border border-outline-variant text-on-surface"
                            }`}
                          >
                            {coop.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {targetAudience === "skills" && (
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                    <span className="text-[11px] font-bold text-on-surface-variant">Select Trade Categories:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {SKILL_OPTIONS.map((skill) => {
                        const isSel = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() =>
                              setSelectedSkills((prev) =>
                                isSel ? prev.filter((s) => s !== skill) : [...prev, skill]
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                              isSel
                                ? "bg-primary text-on-primary"
                                : "bg-surface border border-outline-variant text-on-surface"
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule & Pin Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant/60 pt-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-on-surface">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="rounded accent-primary h-4 w-4"
                  />
                  <Calendar size={14} className="text-primary" />
                  <span>Schedule for Future Date</span>
                </label>

                {isScheduled && (
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary"
                    required={isScheduled}
                  />
                )}

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-on-surface">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded accent-primary h-4 w-4"
                  />
                  <Pin size={14} className="text-amber-600" />
                  <span>Pin to Top of Worker Feed</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{sending ? "Broadcasting…" : isScheduled ? "Schedule Announcement" : "Publish Announcement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
