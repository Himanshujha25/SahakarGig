import { useEffect, useState } from "react";
import api from "../../lib/api";
import CustomSelect from "../../components/CustomSelect";
import ConfirmModal from "../../components/ConfirmModal";
import {
  Megaphone, Plus, Bell, FileText, Calendar,
  Users, CheckCircle2, AlertCircle, Trash2, X,
  ExternalLink, Upload, Shield, Send
} from "lucide-react";

export default function CooperativeNotices() {
  const [notices, setNotices] = useState([]);
  const [meetingMinutes, setMeetingMinutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [activeTab, setActiveTab] = useState("notices");

  // Create Notice Modal
  const [noticeModal, setNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [noticeCategory, setNoticeCategory] = useState("General");
  const [noticePriority, setNoticePriority] = useState("Normal");
  const [noticeBusy, setNoticeBusy] = useState(false);

  // Upload Minutes Modal
  const [minuteModal, setMinuteModal] = useState(false);
  const [minuteTitle, setMinuteTitle] = useState("");
  const [minuteDate, setMinuteDate] = useState(new Date().toISOString().slice(0, 10));
  const [minuteAttendees, setMinuteAttendees] = useState("14");
  const [minuteSummary, setMinuteSummary] = useState("");
  const [minuteDocUrl, setMinuteDocUrl] = useState("");
  const [minuteBusy, setMinuteBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/notices");
      setNotices(data.notices || []);
      setMeetingMinutes(data.meetingMinutes || []);
    } catch (err) {
      console.error("Failed to load cooperative notices:", err);
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

  async function handleCreateNotice(e) {
    e.preventDefault();
    if (!noticeTitle || !noticeContent) return;
    setNoticeBusy(true);
    try {
      const { data: res } = await api.post("/admin/notices", {
        title: noticeTitle,
        content: noticeContent,
        category: noticeCategory,
        priority: noticePriority,
      });
      showToast(res.message || "Notice broadcasted to cooperative members!");
      setNoticeModal(false);
      setNoticeTitle("");
      setNoticeContent("");
      load();
    } catch (err) {
      showToast("Failed to post notice.");
    } finally {
      setNoticeBusy(false);
    }
  }

  const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", type: "danger", onConfirm: () => {} });

  function handleDeleteNotice(id) {
    setConfirmState({
      isOpen: true,
      title: "Delete Notice?",
      message: "Are you sure you want to delete this notice? This action cannot be undone.",
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await api.delete(`/admin/notices/${id}`);
          showToast("Notice deleted.");
          load();
        } catch (err) {
          showToast("Failed to delete notice.");
        }
      },
    });
  }

  async function handleUploadMinutes(e) {
    e.preventDefault();
    if (!minuteTitle) return;
    setMinuteBusy(true);
    try {
      const { data: res } = await api.post("/admin/meeting-minutes", {
        title: minuteTitle,
        date: minuteDate,
        attendeesCount: Number(minuteAttendees),
        summary: minuteSummary,
        docUrl: minuteDocUrl,
      });
      showToast(res.message || "Meeting minutes recorded!");
      setMinuteModal(false);
      setMinuteTitle("");
      setMinuteSummary("");
      load();
    } catch (err) {
      showToast("Failed to record meeting minutes.");
    } finally {
      setMinuteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-8 text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#00288e] uppercase tracking-wider mb-1">
            <Megaphone size={16} />
            <span>Cooperative Communications</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Notice Board &amp; Assembly Minutes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast official circulars to all member providers and maintain statutory assembly minutes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMinuteModal(true)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <Upload size={14} />
            <span>Log Meeting Minutes</span>
          </button>

          <button
            onClick={() => setNoticeModal(true)}
            className="px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Broadcast New Notice</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("notices")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "notices"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Member Notices ({notices.length})
        </button>
        <button
          onClick={() => setActiveTab("minutes")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "minutes"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          General Body Meeting Minutes ({meetingMinutes.length})
        </button>
      </div>

      {/* ── Tab 1: Member Notices ── */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
              <Megaphone size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-900">No Active Notices</h3>
              <p className="text-xs text-slate-500">Post announcements to broadcast instant notifications to all your affiliated workers.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map((n) => (
                <div
                  key={n._id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3 relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold mb-1.5 ${
                          n.priority === "Urgent"
                            ? "bg-red-100 text-red-800"
                            : n.priority === "High"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {n.priority} · {n.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{n.title}</h4>
                    </div>

                    <button
                      onClick={() => handleDeleteNotice(n._id)}
                      className="p-1.5 text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete notice"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Posted by {n.postedBy}</span>
                    <span>{new Date(n.postedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Meeting Minutes Repository ── */}
      {activeTab === "minutes" && (
        <div className="space-y-4">
          {meetingMinutes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
              <FileText size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-900">No Meeting Minutes Uploaded</h3>
              <p className="text-xs text-slate-500">Record resolutions passed during General Body or Executive Committee meetings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meetingMinutes.map((m, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{m.title}</h4>
                        <p className="text-[11px] text-slate-400">
                          {new Date(m.date).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })} · {m.attendeesCount} Attendees
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {m.summary}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-emerald-700 font-semibold">✓ Certified by Secretary</span>
                    <a
                      href={m.docUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#00288e] font-bold hover:underline"
                    >
                      <span>View PDF</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Broadcast Notice Modal */}
      {noticeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setNoticeModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Broadcast Member Notice</h2>
                  <p className="text-xs text-slate-500">Sends instant notification to all member provider phones.</p>
                </div>
              </div>
              <button onClick={() => setNoticeModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Notice Title</label>
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Mandatory Tool Verification & Uniform Pickup"
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase">Category</label>
                  <CustomSelect
                    value={noticeCategory}
                    onChange={(e) => setNoticeCategory(e.target.value)}
                    options={[
                      { value: "General", label: "General Notice" },
                      { value: "Compliance", label: "Compliance & Documents" },
                      { value: "Payout", label: "Payout & Earnings" },
                      { value: "Training", label: "Skill Upskilling / Training" },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase">Priority</label>
                  <CustomSelect
                    value={noticePriority}
                    onChange={(e) => setNoticePriority(e.target.value)}
                    options={[
                      { value: "Normal", label: "Normal" },
                      { value: "High", label: "High" },
                      { value: "Urgent", label: "Urgent Alert" },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Detailed Announcement Message</label>
                <textarea
                  rows={4}
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Type notice message to be sent to member app..."
                  className="w-full p-4 rounded-2xl border border-slate-200 font-medium text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoticeModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={noticeBusy}
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{noticeBusy ? "Broadcasting..." : "Send Announcement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Meeting Minutes Modal */}
      {minuteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setMinuteModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Record General Assembly Minutes</h2>
              <button onClick={() => setMinuteModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadMinutes} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Meeting Title / Topic</label>
                <input
                  type="text"
                  value={minuteTitle}
                  onChange={(e) => setMinuteTitle(e.target.value)}
                  placeholder="e.g. 14th Executive Committee Review on Commission Rates"
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase">Meeting Date</label>
                  <input
                    type="date"
                    value={minuteDate}
                    onChange={(e) => setMinuteDate(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase">Attendees Count</label>
                  <input
                    type="number"
                    value={minuteAttendees}
                    onChange={(e) => setMinuteAttendees(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Resolutions &amp; Key Decisions</label>
                <textarea
                  rows={3}
                  value={minuteSummary}
                  onChange={(e) => setMinuteSummary(e.target.value)}
                  placeholder="Summarize resolutions passed by unanimous voting..."
                  className="w-full p-4 rounded-2xl border border-slate-200 font-medium text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMinuteModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={minuteBusy}
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer transition-all"
                >
                  {minuteBusy ? "Saving..." : "Save Minutes"}
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
