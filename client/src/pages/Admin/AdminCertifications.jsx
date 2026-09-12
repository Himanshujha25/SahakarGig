import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { toast } from "../../lib/toast";
import {
  GraduationCap, Plus, Video, HelpCircle, Award, CheckCircle2,
  Trash2, LoaderCircle, Sparkles, BookOpen, UserCheck, ChevronDown, Check, X
} from "lucide-react";

const CATEGORIES = [
  "Carpentry", "Electrical", "Plumbing", "AC Repair", "Cook",
  "Cleaner", "Gardener", "Tutor", "Caregiver", "Driver", "Renewable Energy", "Professionalism"
];

export default function AdminCertifications() {
  const [courses, setCourses] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showIssueCertModal, setShowIssueCertModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Custom Dropdown State for Category
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // New Course Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Carpentry");
  const [nicheSkill, setNicheSkill] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationMins, setDurationMins] = useState(25);
  const [badgeName, setBadgeName] = useState("");
  const [trustScoreBonus, setTrustScoreBonus] = useState(10);
  const [quizQuestions, setQuizQuestions] = useState([
    { question: "", options: ["", "", "", ""], correctAnswerIndex: 0 }
  ]);

  // Issue Direct Certificate Form State
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [certBadgeName, setCertBadgeName] = useState("");
  const [certCategory, setCertCategory] = useState("Plumbing");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        api.get("/certifications"),
        api.get("/admin/providers"),
      ]);
      setCourses(cRes.data.courses || []);
      setProviders(pRes.data || []);
      if (pRes.data?.length > 0) {
        setSelectedProviderId(pRes.data[0]._id);
      }
    } catch (err) {
      console.error("Fetch certifications error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddQuestion() {
    setQuizQuestions([
      ...quizQuestions,
      { question: "", options: ["", "", "", ""], correctAnswerIndex: 0 }
    ]);
  }

  function handleQuestionChange(idx, field, val) {
    const updated = [...quizQuestions];
    updated[idx][field] = val;
    setQuizQuestions(updated);
  }

  function handleOptionChange(qIdx, optIdx, val) {
    const updated = [...quizQuestions];
    updated[qIdx].options[optIdx] = val;
    setQuizQuestions(updated);
  }

  async function handleCreateCourse(e) {
    e.preventDefault();
    if (!title || !category || !badgeName) {
      toast.warning("Please fill in course title, category, and badge name");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/certifications/create", {
        title,
        description,
        category,
        nicheSkill: nicheSkill || category,
        videoUrl,
        durationMins,
        badgeName,
        trustScoreBonus,
        quiz: quizQuestions,
      });

      toast.success("Niche certification course published successfully!");
      setShowCourseModal(false);
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setBadgeName("");
      setQuizQuestions([{ question: "", options: ["", "", "", ""], correctAnswerIndex: 0 }]);
      fetchData();
    } catch (err) {
      console.error("Create course error:", err);
      toast.error(err.response?.data?.error || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleIssueDirectCertificate(e) {
    e.preventDefault();
    if (!selectedProviderId || !certTitle || !certBadgeName) {
      toast.warning("Please select an employee and fill in title & badge name");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/certifications/issue-direct", {
        providerId: selectedProviderId,
        title: certTitle,
        badgeName: certBadgeName,
        category: certCategory,
        scorePercent: 100,
      });

      toast.success(data.message || "Certificate issued directly to employee profile!");
      setShowIssueCertModal(false);
      setCertTitle("");
      setCertBadgeName("");
      fetchData();
    } catch (err) {
      console.error("Issue certificate error:", err);
      toast.error(err.response?.data?.error || "Failed to issue certificate");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-md">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Cooperative Skill Certifications &amp; Employee Credentials Portal
            </h1>
            <p className="text-xs text-on-surface-variant">Issue verified PACS skill certificates &amp; publish niche training video modules</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setShowIssueCertModal(true)}
            className="px-4 py-2.5 rounded-xl border border-primary/30 bg-primary-container/40 text-primary font-bold text-xs flex items-center gap-2 hover:bg-primary hover:text-on-primary transition-all cursor-pointer shadow-xs"
          >
            <UserCheck size={16} />
            <span>Issue Certificate to Employee</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCourseModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-md"
          >
            <Plus size={16} />
            <span>Add Niche Video Certification</span>
          </button>
        </div>
      </div>

      {/* Success Alert Toast */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Courses Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-on-surface-variant">
          <LoaderCircle size={24} className="animate-spin text-primary mx-auto mb-2" />
          <span>Loading Cooperative Skill Certification Courses…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div key={course._id} className="p-5 rounded-3xl border border-outline-variant bg-surface space-y-3 shadow-xs hover:border-primary transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container/40 text-on-primary-container text-[10.5px] font-bold border border-primary/20">
                    {course.category}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    +{course.trustScoreBonus || 10} Trust Pts
                  </span>
                </div>

                <h3 className="font-bold text-base text-on-surface line-clamp-1">{course.title}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2">{course.description || "Niche skill video course certified by Cooperative."}</p>

                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-semibold text-on-surface-variant">
                    <Video size={13} className="text-primary" /> {course.durationMins} Mins Video
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-on-surface-variant">
                    <HelpCircle size={13} className="text-primary" /> {course.quiz?.length || 0} Quiz Questions
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-xs">
                <span className="font-bold text-primary flex items-center gap-1">
                  <Award size={14} /> {course.badgeName}
                </span>
                <span className="text-[11px] font-semibold text-on-surface-variant">By {course.createdByName || 'Cooperative'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL 1: CREATE NICHE VIDEO COURSE ── */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-outline-variant bg-surface text-on-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Video size={20} className="text-primary" />
                <h3 className="text-base font-bold">Create Niche Video Certification Course</h3>
              </div>
              <button onClick={() => setShowCourseModal(false)} className="p-1.5 rounded-full hover:bg-surface-container-high cursor-pointer font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface font-bold mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Master Carpentry & Door Lock Installation"
                    className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                {/* Modern Custom Dropdown UI for Category */}
                <div className="relative">
                  <label className="block text-on-surface font-bold mb-1">Category *</label>
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-semibold flex items-center justify-between cursor-pointer hover:border-primary"
                  >
                    <span>{category}</span>
                    <ChevronDown size={16} className={`transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {categoryDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 p-1.5 rounded-2xl border border-outline-variant bg-surface shadow-xl max-h-48 overflow-y-auto space-y-0.5">
                      {CATEGORIES.map((cat) => (
                        <div
                          key={cat}
                          onClick={() => {
                            setCategory(cat);
                            if (!badgeName) setBadgeName(`Master ${cat} Level 1`);
                            setCategoryDropdownOpen(false);
                          }}
                          className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold cursor-pointer transition ${
                            category === cat ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container-low text-on-surface'
                          }`}
                        >
                          <span>{cat}</span>
                          {category === cat && <Check size={14} className="text-primary" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-on-surface font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of what gig workers will learn in this video course..."
                  className="w-full p-3 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-semibold outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-on-surface font-bold mb-1">Training Video URL</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/embed/..."
                    className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-on-surface font-bold mb-1">Badge Name *</label>
                  <input
                    type="text"
                    required
                    value={badgeName}
                    onChange={(e) => setBadgeName(e.target.value)}
                    placeholder="e.g. Certified Carpenter Pro"
                    className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-on-surface font-bold mb-1">AI Trust Score Bonus</label>
                  <input
                    type="number"
                    value={trustScoreBonus}
                    onChange={(e) => setTrustScoreBonus(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Quiz Builder */}
              <div className="space-y-3 pt-3 border-t border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                    <HelpCircle size={15} className="text-primary" /> Skill Quiz Questions ({quizQuestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1 rounded-xl bg-primary-container/40 text-primary font-bold hover:bg-primary/10 transition cursor-pointer"
                  >
                    + Add Question
                  </button>
                </div>

                {quizQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-3.5 rounded-2xl border border-outline-variant bg-surface-container-low space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-primary">Q{qIdx + 1}.</span>
                      <input
                        type="text"
                        required
                        value={q.question}
                        onChange={(e) => handleQuestionChange(qIdx, "question", e.target.value)}
                        placeholder="Enter quiz question..."
                        className="flex-1 h-9 px-3 rounded-xl border border-outline-variant bg-surface text-xs font-semibold outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctAnswerIndex === optIdx}
                            onChange={() => handleQuestionChange(qIdx, "correctAnswerIndex", optIdx)}
                          />
                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="w-full h-8 px-2.5 rounded-lg border border-outline-variant/80 bg-surface text-[11px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-2xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-primary text-on-primary font-bold hover:opacity-90 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {submitting ? "Publishing Course…" : "Publish Certification Course ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ISSUE DIRECT CERTIFICATE TO EMPLOYEE ── */}
      {showIssueCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-outline-variant bg-surface text-on-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-primary" />
                <h3 className="text-base font-bold">Issue Skill Certificate to Employee</h3>
              </div>
              <button onClick={() => setShowIssueCertModal(false)} className="p-1.5 rounded-full hover:bg-surface-container-high cursor-pointer font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueDirectCertificate} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-on-surface font-bold mb-1">Select Member Employee / Provider *</label>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-bold text-on-surface outline-none focus:border-primary"
                >
                  {providers.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.userId?.name || 'Worker'} ({p.skills?.join(', ') || 'Member'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-on-surface font-bold mb-1">Certificate Title *</label>
                <input
                  type="text"
                  required
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  placeholder="e.g. Master Plumbing & Sanitation Technician Level 1"
                  className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-semibold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-on-surface font-bold mb-1">Verified Badge Name *</label>
                <input
                  type="text"
                  required
                  value={certBadgeName}
                  onChange={(e) => setCertBadgeName(e.target.value)}
                  placeholder="e.g. PACS Certified Plumber Specialist"
                  className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-semibold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-on-surface font-bold mb-1">Skill Category</label>
                <select
                  value={certCategory}
                  onChange={(e) => setCertCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest text-xs font-bold text-on-surface outline-none focus:border-primary"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-primary-container/30 border border-primary/20 text-on-surface-variant text-[11.5px] leading-relaxed">
                🛡️ <strong>PACS Verification Notice:</strong> Issuing this certificate will automatically bind the credential to the employee's profile, generate a unique PACS Certificate ID, and boost their AI Trust Score by +15.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowIssueCertModal(false)}
                  className="px-4 py-2 rounded-2xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-primary text-on-primary font-bold hover:opacity-90 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {submitting ? "Issuing Certificate…" : "Issue Certificate to Employee ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
