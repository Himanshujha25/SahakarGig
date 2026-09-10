import { useState, useEffect } from "react";
import api from "../../lib/api";
import {
  GraduationCap, Award, Play, CheckCircle2,
  Clock, Shield, BookOpen, Sparkles, ChevronRight,
  Printer, X, Star, FileText, Check, HelpCircle, LoaderCircle
} from "lucide-react";

export default function Training() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(false);
  const [activeCertModal, setActiveCertModal] = useState(false);
  const [activeQuizModal, setActiveQuizModal] = useState(false);

  // Quiz State
  const [answers, setAnswers] = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

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

  function handleStartLesson(course) {
    setSelectedCourse(course);
    setActiveVideoModal(true);
  }

  function handleOpenQuiz(course) {
    setSelectedCourse(course);
    setAnswers({});
    setQuizResult(null);
    setActiveQuizModal(true);
  }

  function handleViewCertificate(course) {
    setSelectedCourse(course);
    setActiveCertModal(true);
  }

  async function handleSubmitQuiz() {
    if (!selectedCourse) return;
    setSubmittingQuiz(true);
    try {
      const formattedAnswers = (selectedCourse.quiz || []).map((_, idx) => answers[idx] ?? -1);
      const { data } = await api.post(`/certifications/${selectedCourse._id}/submit-quiz`, {
        answers: formattedAnswers,
      });
      setQuizResult(data);
      if (data.passed) {
        fetchCourses(); // refresh completed status
      }
    } catch (err) {
      console.error("Quiz submission error:", err);
    } finally {
      setSubmittingQuiz(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-6 text-on-surface font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold shrink-0 shadow-md">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Sahakar Academy &amp; Cooperative Skill Certifications
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Ministry of Cooperation &amp; NSDC Aligned Skill Videos &amp; Verified Badges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <Award size={14} />
            <span>Certified by Cooperative</span>
          </span>
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant shadow-2xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Available Courses</p>
          <p className="text-xl font-black text-on-surface">{courses.length}</p>
          <p className="text-[11px] text-on-surface-variant font-medium">Free Video Access</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant shadow-2xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Pass Rate</p>
          <p className="text-xl font-black text-primary">80%+ Required</p>
          <p className="text-[11px] text-emerald-700 font-bold">Instant Certification</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant shadow-2xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">AI Trust Score Boost</p>
          <p className="text-xl font-black text-emerald-700">+10 to +35 Pts</p>
          <p className="text-[11px] text-on-surface-variant font-medium">Priority Broadcasts</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant shadow-2xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Official Badge</p>
          <p className="text-xl font-black text-on-surface">Verified Skill</p>
          <p className="text-[11px] text-on-surface-variant font-medium">Displayed on Profile</p>
        </div>
      </div>

      {/* ── Course Grid ── */}
      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-on-surface-variant">
          <LoaderCircle size={24} className="animate-spin text-primary mx-auto mb-2" />
          <span>Loading Cooperative Skill Certification Courses…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map((c) => (
            <div
              key={c._id}
              className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-primary transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container/40 text-on-primary-container font-bold text-[10.5px] border border-primary/20">
                    {c.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10.5px] border border-emerald-200 flex items-center gap-1">
                    <Award size={12} /> +{c.trustScoreBonus || 10} Trust Pts
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-on-surface text-base">{c.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{c.description || "Niche skill video course certified by Cooperative."}</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-on-surface font-medium">
                      <Clock size={13} className="text-primary" /> {c.durationMins || 20} Mins
                    </span>
                    <span className="flex items-center gap-1 text-on-surface font-medium">
                      <HelpCircle size={13} className="text-primary" /> {c.quiz?.length || 0} Quiz Questions
                    </span>
                  </div>
                  <span className="font-bold text-primary text-xs">Certified by {c.createdByName || 'Cooperative'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-on-surface-variant font-bold flex items-center gap-1">
                  <Award size={13} className="text-primary" />
                  <span>{c.badgeName}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartLesson(c)}
                    className="px-3.5 py-1.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container-high text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
                  >
                    <Play size={12} className="text-primary" />
                    <span>Watch Video</span>
                  </button>

                  <button
                    onClick={() => handleOpenQuiz(c)}
                    className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5 hover:opacity-90"
                  >
                    <HelpCircle size={13} />
                    <span>Take Quiz</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL 1: VIDEO PLAYER ── */}
      {activeVideoModal && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setActiveVideoModal(false)}>
          <div className="w-full max-w-2xl bg-surface text-on-surface rounded-3xl p-6 lg:p-8 space-y-4 border border-outline-variant shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h2 className="text-base font-bold">{selectedCourse.title}</h2>
                <p className="text-xs text-on-surface-variant">Certified Video Module by {selectedCourse.createdByName || 'Cooperative'}</p>
              </div>
              <button onClick={() => setActiveVideoModal(false)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Video Player */}
            <div className="w-full h-64 rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden shadow-inner">
              {selectedCourse.videoUrl ? (
                <iframe
                  src={selectedCourse.videoUrl}
                  title={selectedCourse.title}
                  className="w-full h-full rounded-2xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Play size={40} className="mx-auto text-primary animate-pulse" />
                  <p className="text-xs font-bold">Interactive Niche Skill Video Tutorial (HD 1080p)</p>
                  <p className="text-[11px] text-slate-400">Cooperative certified trade guidelines & safety demonstration</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant">
              <button
                onClick={() => setActiveVideoModal(false)}
                className="px-4 py-2 rounded-full border border-outline-variant font-bold text-xs"
              >
                Close Video
              </button>
              <button
                onClick={() => {
                  setActiveVideoModal(false);
                  handleOpenQuiz(selectedCourse);
                }}
                className="px-6 py-2 rounded-full bg-primary text-on-primary font-bold hover:opacity-90 shadow-md cursor-pointer text-xs flex items-center gap-1.5"
              >
                <span>Proceed to Quiz</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: QUIZ ENGINE ── */}
      {activeQuizModal && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setActiveQuizModal(false)}>
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-surface text-on-surface rounded-3xl p-6 lg:p-8 space-y-4 border border-outline-variant shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h2 className="text-base font-bold">{selectedCourse.title} — Skill Test</h2>
                <p className="text-xs text-on-surface-variant">Pass score: {selectedCourse.passingPercentage || 80}% to earn badge</p>
              </div>
              <button onClick={() => setActiveQuizModal(false)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Quiz Result View */}
            {quizResult ? (
              <div className="space-y-4 text-center py-4 animate-fadeIn">
                {quizResult.passed ? (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-600 animate-bounce" />
                    <h3 className="text-lg font-black text-emerald-900">Passed with {quizResult.scorePercent}% Score!</h3>
                    <p className="text-xs text-emerald-800">{quizResult.message}</p>
                    <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-emerald-900">
                      Earned Badge: {quizResult.badgeName} (+{quizResult.trustScoreBoost} Trust Pts)
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <HelpCircle size={48} className="mx-auto text-amber-600" />
                    <h3 className="text-lg font-black text-amber-900">Score: {quizResult.scorePercent}%</h3>
                    <p className="text-xs text-amber-800">{quizResult.message}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveQuizModal(false)}
                  className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold text-xs hover:opacity-90 shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Quiz Questions List */
              <div className="space-y-4">
                {(selectedCourse.quiz || []).map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low space-y-2 text-xs">
                    <p className="font-bold text-on-surface text-sm">
                      Q{qIdx + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            answers[qIdx] === optIdx
                              ? "border-primary bg-primary-container/30 font-bold text-on-surface"
                              : "border-outline-variant/60 bg-surface hover:bg-surface-container-high"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${qIdx}`}
                            checked={answers[qIdx] === optIdx}
                            onChange={() => setAnswers({ ...answers, [qIdx]: optIdx })}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
                  <button
                    onClick={() => setActiveQuizModal(false)}
                    className="px-4 py-2 rounded-full border border-outline-variant font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submittingQuiz}
                    className="px-6 py-2 rounded-full bg-primary text-on-primary font-bold hover:opacity-90 shadow-md text-xs disabled:opacity-50"
                  >
                    {submittingQuiz ? "Submitting Quiz…" : "Submit Answers ✓"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
