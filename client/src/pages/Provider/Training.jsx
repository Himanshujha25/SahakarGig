import { useState, useEffect } from "react";
import api from "../../lib/api";
import { toast } from "../../lib/toast";
import {
  GraduationCap, Award, Play, CheckCircle2,
  Clock, Shield, BookOpen, Sparkles, ChevronRight,
  Printer, X, Star, FileText, Check, HelpCircle, LoaderCircle, Download, Building2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Training() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myCertifications, setMyCertifications] = useState([]);
  const [providerProfile, setProviderProfile] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);

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
      const [cRes, pRes] = await Promise.all([
        api.get("/certifications"),
        api.get("/provider/profile").catch(() => ({ data: null })),
      ]);
      setCourses(cRes.data.courses || []);
      if (pRes.data) {
        setProviderProfile(pRes.data);
        setMyCertifications(pRes.data.completedCertifications || []);
      }
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

  function handleViewCertificate(cert) {
    setSelectedCert(cert);
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
        fetchCourses();
      }
    } catch (err) {
      console.error("Quiz submission error:", err);
    } finally {
      setSubmittingQuiz(false);
    }
  }

  async function downloadCertPDF(cert) {
    if (!cert) return;
    const employeeName = user?.name || providerProfile?.userId?.name || "Member Gig Professional";
    const certNo = cert.certificateNo || `PACS-CERT-${Date.now().toString().slice(-6)}`;
    const certDate = cert.completedAt ? new Date(cert.completedAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const coopName = cert.certifiedBy || providerProfile?.cooperativeId?.name || "Sahakar Gig Labour Society";

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.width = "842px"; // A4 Landscape width
    container.style.background = "#ffffff";
    container.style.padding = "40px";
    container.style.fontFamily = "'Hanken Grotesk', system-ui, sans-serif";

    container.innerHTML = `
      <div style="border: 10px double #00288e; border-radius: 20px; padding: 40px; background: #fafafa; position: relative; color: #0f172a; text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 20px;">
          <img src="/icon-512.png" style="width: 56px; height: 56px; border-radius: 12px;" />
          <div style="text-align: left;">
            <div style="font-size: 24px; font-weight: 900; color: #00288e;">SAHAKARGIG FEDERATION</div>
            <div style="font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">Ministry of Cooperation & NSDC Aligned Skill Directorate</div>
          </div>
        </div>

        <div style="font-size: 26px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px;">
          OFFICIAL SKILL CERTIFICATE
        </div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Certificate No: <strong style="font-family: monospace; color: #00288e;">${certNo}</strong></div>

        <div style="margin: 28px 0; font-size: 15px; color: #334155; line-height: 1.6;">
          This is to certify that member employee
          <div style="font-size: 28px; font-weight: 900; color: #00288e; margin: 12px 0; text-decoration: underline;">
            ${employeeName}
          </div>
          has successfully passed trade competency verification and is awarded the official credential
          <div style="font-size: 20px; font-weight: 800; color: #166534; margin-top: 8px;">
            ⭐ ${cert.badgeName || cert.title} ⭐
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 2px solid #cbd5e1; padding-top: 20px;">
          <div style="text-align: left; font-size: 12px; color: #475569;">
            <strong>Issued By:</strong> ${coopName}<br/>
            <strong>Date of Issue:</strong> ${certDate}<br/>
            <strong>Verification:</strong> PACS Member Verified ✓
          </div>

          <div style="display: flex; align-items: center; gap: 24px;">
            <div style="width: 80px; height: 80px; border: 2.5px dashed #00288e; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: #00288e; transform: rotate(-7deg); background: rgba(0,40,142,0.04);">
              SAHAKAR<br/>VERIFIED<br/>PACS
            </div>
            <div style="width: 150px; text-align: center; border-top: 1.5px solid #00288e; padding-top: 4px;">
              <div style="font-family: cursive, sans-serif; font-size: 18px; font-weight: 800; color: #00288e; transform: rotate(-3deg);">R. K. Sharma</div>
              <div style="font-size: 11px; font-weight: 800; color: #0f172a;">Authorized Signatory</div>
              <div style="font-size: 10px; color: #64748b;">PACS Society Secretary</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Skill-Certificate-${certNo}.pdf`);
    } catch (err) {
      console.error("Certificate PDF error:", err);
      toast.error("Could not generate certificate PDF.");
    } finally {
      document.body.removeChild(container);
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

      {/* ── MY EARNED PACS CERTIFICATES SECTION ── */}
      {myCertifications.length > 0 && (
        <div className="p-5 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary-container/30 via-surface to-surface space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-primary tracking-wider flex items-center gap-1.5">
              <Award size={16} /> My Earned PACS Skill Credentials ({myCertifications.length})
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-[11px] border border-emerald-500/20">
              Employee Verified ✓
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {myCertifications.map((cert, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-outline-variant bg-surface space-y-2.5 shadow-2xs hover:border-primary transition">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-primary uppercase font-mono">{cert.certificateNo || 'PACS-CERT'}</span>
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ⭐ {cert.scorePercent || 100}% Score
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-[14px] text-on-surface leading-snug">{cert.badgeName || cert.title}</h4>
                  <p className="text-[11.5px] text-on-surface-variant mt-0.5">Issued by {cert.certifiedBy || "Cooperative Society"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleViewCertificate(cert)}
                  className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-on-primary text-[12px] font-bold hover:shadow-md transition cursor-pointer"
                >
                  <Award size={14} /> View &amp; Download PACS Certificate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* ── MODAL 1: CERTIFICATE DISPLAY ── */}
      {activeCertModal && selectedCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-surface border border-outline-variant rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-primary" />
                <h3 className="text-base font-extrabold">Verified PACS Skill Certificate</h3>
              </div>
              <button onClick={() => setActiveCertModal(false)} className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high font-bold cursor-pointer">
                ✕
              </button>
            </div>

            {/* Certificate Preview Card */}
            <div className="p-6 rounded-2xl border-4 border-double border-primary/30 bg-surface-container-lowest text-center space-y-3">
              <img src="/icon-512.png" alt="Logo" className="w-12 h-12 rounded-xl mx-auto" />
              <div>
                <p className="text-[10px] font-extrabold uppercase text-primary tracking-widest">SahakarGig Cooperative Federation</p>
                <h2 className="text-[18px] font-extrabold text-on-surface uppercase tracking-tight mt-1">Official Skill Certificate</h2>
                <p className="text-[11px] font-mono text-on-surface-variant">No: {selectedCert.certificateNo || 'PACS-CERT-8842'}</p>
              </div>

              <div className="py-2 text-[13px] text-on-surface-variant">
                This certifies that employee <strong>{user?.name || providerProfile?.userId?.name || "Member Worker"}</strong> has passed trade competency verification for:
                <p className="text-[16px] font-extrabold text-emerald-600 mt-1">⭐ {selectedCert.badgeName || selectedCert.title} ⭐</p>
              </div>

              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-[11px] text-on-surface-variant">
                <div className="text-left">
                  <p><strong>Issued By:</strong> {selectedCert.certifiedBy || "Cooperative Society"}</p>
                  <p><strong>Date:</strong> {selectedCert.completedAt ? new Date(selectedCert.completedAt).toLocaleDateString('en-IN') : '2026-09-11'}</p>
                </div>
                <div className="text-right">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary text-primary flex items-center justify-center font-extrabold text-[8px] rotate-[-7deg] ml-auto">
                    PACS VERIFIED
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveCertModal(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-xs hover:bg-surface-container-low cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => downloadCertPDF(selectedCert)}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} /> Download Certificate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: VIDEO PLAYER ── */}
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

      {/* ── MODAL 3: QUIZ ENGINE ── */}
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
