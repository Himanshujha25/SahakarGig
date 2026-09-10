import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import {
  GraduationCap, Plus, Video, HelpCircle, Award, CheckCircle2,
  Trash2, LoaderCircle, Sparkles, BookOpen
} from "lucide-react";

export default function AdminCertifications() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setLoading(true);
    try {
      const { data } = await api.get("/certifications");
      setCourses(data.courses || []);
    } catch (err) {
      console.error("Fetch courses error:", err);
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !category || !badgeName) {
      alert("Please fill in course title, category, and badge name");
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

      setShowModal(false);
      // Reset form
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setBadgeName("");
      setQuizQuestions([{ question: "", options: ["", "", "", ""], correctAnswerIndex: 0 }]);
      fetchCourses();
    } catch (err) {
      console.error("Create course error:", err);
      alert(err.response?.data?.error || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-md">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Cooperative Skill Certifications &amp; Video Quiz Portal</h1>
            <p className="text-xs text-on-surface-variant">Create niche training video modules &amp; verify provider skills</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Niche Video Certification</span>
        </button>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-on-surface-variant">
          <LoaderCircle size={24} className="animate-spin text-primary mx-auto mb-2" />
          <span>Loading Certification Courses…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div key={course._id} className="p-5 rounded-2xl border border-outline-variant bg-surface space-y-3 shadow-xs hover:border-primary transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container/40 text-on-primary-container text-[10.5px] font-bold border border-primary/20">
                    {course.category}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    +{course.trustScoreBonus || 10} Trust Pts
                  </span>
                </div>

                <h3 className="font-bold text-base text-on-surface line-clamp-1">{course.title}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2">{course.description || "Niche skill video course."}</p>

                <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs">
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
                <span className="text-[11px] font-medium text-on-surface-variant">By {course.createdByName || 'Cooperative'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-outline-variant bg-surface text-on-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Video size={20} className="text-primary" />
                <h3 className="text-base font-bold">Create Niche Video Certification Course</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-surface-container-high cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-bold mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Master Carpentry & Door Lock Installation"
                    className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-bold mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (!badgeName) setBadgeName(`Master ${e.target.value} Level 1`);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold outline-none focus:border-primary"
                  >
                    {['Carpentry', 'Electrical', 'Plumbing', 'AC Repair', 'Cook', 'Cleaner', 'Gardener', 'Tutor', 'Caregiver', 'Driver', 'Renewable Energy', 'Professionalism'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of what gig workers will learn in this video course..."
                  className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-bold mb-1">Training Video URL</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/embed/..."
                    className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-bold mb-1">Badge Name *</label>
                  <input
                    type="text"
                    required
                    value={badgeName}
                    onChange={(e) => setBadgeName(e.target.value)}
                    placeholder="e.g. Certified Carpenter Pro"
                    className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-bold mb-1">AI Trust Score Bonus</label>
                  <input
                    type="number"
                    value={trustScoreBonus}
                    onChange={(e) => setTrustScoreBonus(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Quiz Builder */}
              <div className="space-y-3 pt-2 border-t border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-primary" /> Skill Quiz Questions ({quizQuestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high text-primary font-bold hover:bg-primary/10"
                  >
                    + Add Question
                  </button>
                </div>

                {quizQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-3 rounded-xl border border-outline-variant bg-surface-container-low space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">Q{qIdx + 1}.</span>
                      <input
                        type="text"
                        required
                        value={q.question}
                        onChange={(e) => handleQuestionChange(qIdx, "question", e.target.value)}
                        placeholder="Enter quiz question..."
                        className="flex-1 h-9 px-2.5 rounded-lg border border-outline-variant bg-surface text-xs font-semibold outline-none"
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
                            className="w-full h-8 px-2 rounded-md border border-outline-variant/80 bg-surface text-[11px]"
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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {submitting ? "Publishing Course…" : "Publish Certification Course ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
