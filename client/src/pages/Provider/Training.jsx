import { useState } from "react";
import {
  GraduationCap, Award, Play, CheckCircle2,
  Clock, Shield, BookOpen, Sparkles, ChevronRight,
  Printer, X, Star, FileText, Check
} from "lucide-react";

const COURSES = [
  {
    id: "elec-101",
    title: "Residential Electrical Safety & BIS Standards",
    category: "Electrical",
    duration: "25 mins",
    modules: 4,
    rating: 4.9,
    badge: "Certified Electrician Level 1",
    description: "Learn essential safety protocols for circuit breakers, earthing inspection, short-circuit troubleshooting, and BIS electrical norms.",
    completed: true,
    certificateNo: "CERT-ELEC-2026-8819",
    lessons: [
      { title: "Personal Protective Equipment (PPE) & Voltage Testers", duration: "6 mins", done: true },
      { title: "MCB & RCCB Tripping Diagnostic Procedures", duration: "8 mins", done: true },
      { title: "Household Earthing Resistance Verification", duration: "6 mins", done: true },
      { title: "Emergency Shock Response & Fire Safety", duration: "5 mins", done: true },
    ]
  },
  {
    id: "plumb-201",
    title: "Hydro-Jetting & Modern P-Trap Plumbing",
    category: "Plumbing",
    duration: "30 mins",
    modules: 5,
    rating: 4.8,
    badge: "Master Plumber Pro",
    description: "Advanced pipe blockage clearing techniques using electric hydro-jetters, CPVC heat-fusion joints, and leak detection cameras.",
    completed: false,
    lessons: [
      { title: "Concealed Pipe Ultrasonic Leak Detection", duration: "7 mins", done: true },
      { title: "CPVC & PPR Solvent Heat Welding Standards", duration: "8 mins", done: true },
      { title: "High-Pressure Drain Jetting Safety", duration: "6 mins", done: false },
      { title: "Water Pressure Booster Pump Installation", duration: "9 mins", done: false },
    ]
  },
  {
    id: "coop-301",
    title: "Cooperative Member Ethics & Household Etiquette",
    category: "Professionalism",
    duration: "15 mins",
    modules: 3,
    rating: 5.0,
    badge: "5-Star Trust Ambassador",
    description: "Best practices for respectful customer communication, OTP job verification, dispute resolution, and cooperative values.",
    completed: true,
    certificateNo: "CERT-ETIQ-2026-9021",
    lessons: [
      { title: "Punctuality, Doorstep Greeting & ID Badge Presentation", duration: "5 mins", done: true },
      { title: "Clear Pricing & Escrow OTP Completion Protocol", duration: "5 mins", done: true },
      { title: "Handling Customer Disputes & Support Escalation", duration: "5 mins", done: true },
    ]
  },
  {
    id: "solar-401",
    title: "PM Surya Ghar: Solar Rooftop PV Maintenance",
    category: "Renewable Energy",
    duration: "40 mins",
    modules: 6,
    rating: 4.9,
    badge: "Govt Solar Technician",
    description: "Govt aligned curriculum for residential solar inverter servicing, panel cleaning protocols, and grid-tie net-metering tests.",
    completed: false,
    lessons: [
      { title: "Solar Inverter Fault Codes & Firmware Setup", duration: "10 mins", done: false },
      { title: "Micro-Inverter String Testing & Voc Calculations", duration: "12 mins", done: false },
      { title: "Rooftop Fall Protection & OSHA Harnessing", duration: "8 mins", done: false },
      { title: "Bi-directional Net-Metering Commissioning", duration: "10 mins", done: false },
    ]
  }
];

export default function Training() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(false);
  const [activeCertModal, setActiveCertModal] = useState(false);
  const [courses, setCourses] = useState(COURSES);

  function handleStartLesson(course) {
    setSelectedCourse(course);
    setActiveVideoModal(true);
  }

  function handleViewCertificate(course) {
    setSelectedCourse(course);
    setActiveCertModal(true);
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-6 text-slate-900 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00288e] flex items-center justify-center text-white shrink-0 shadow-md">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Sahakar Academy &amp; Skill Certifications
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ministry of Cooperation &amp; NSDC Aligned Free Upskilling for Cooperative Gig Workers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <Award size={14} />
            <span>2 Badges Earned</span>
          </span>
        </div>
      </div>

      {/* ── 4 KPI Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Courses</p>
          <p className="text-xl font-black text-slate-900">{courses.length}</p>
          <p className="text-[11px] text-slate-500 font-medium">Free Lifetime Access</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Modules</p>
          <p className="text-xl font-black text-[#00288e]">2 Courses</p>
          <p className="text-[11px] text-emerald-700 font-bold">100% Pass Rate</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trust Score Boost</p>
          <p className="text-xl font-black text-emerald-700">+15 Pts</p>
          <p className="text-[11px] text-slate-500 font-medium">Priority in Dispatch</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Skill Certifications</p>
          <p className="text-xl font-black text-slate-900">2 Verified</p>
          <p className="text-[11px] text-slate-500 font-medium">QR Scannable Passes</p>
        </div>
      </div>

      {/* ── Course Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {courses.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-[#00288e] transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#00288e] font-bold text-[10.5px] border border-blue-200">
                  {c.category}
                </span>
                {c.completed ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10.5px] border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Certified ✓
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10.5px] border border-amber-200 flex items-center gap-1">
                    <Clock size={12} /> In Progress
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{c.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <Clock size={13} className="text-slate-400" /> {c.duration}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <BookOpen size={13} className="text-slate-400" /> {c.modules} Lessons
                  </span>
                </div>
                <span className="font-bold text-[#00288e] text-xs">⭐ {c.rating}</span>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-700">Course Syllabus &amp; Progress:</p>
                <div className="space-y-1.5">
                  {c.lessons.slice(0, 2).map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[240px] flex items-center gap-1.5">
                        {l.done ? <Check size={12} className="text-emerald-600 shrink-0" /> : <Play size={10} className="text-slate-400 shrink-0" />}
                        {l.title}
                      </span>
                      <span className="text-slate-400 shrink-0">{l.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                <Award size={13} className="text-[#00288e]" />
                <span>{c.badge}</span>
              </span>

              {c.completed ? (
                <button
                  onClick={() => handleViewCertificate(c)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <Printer size={13} className="text-[#00288e]" />
                  <span>View Certificate</span>
                </button>
              ) : (
                <button
                  onClick={() => handleStartLesson(c)}
                  className="px-4 py-1.5 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  <Play size={12} fill="white" />
                  <span>Resume Course</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL 1: INTERACTIVE LESSON SIMULATOR ── */}
      {activeVideoModal && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setActiveVideoModal(false)}>
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 lg:p-8 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedCourse.title}</h2>
                <p className="text-xs text-slate-500">Lesson 3: Advanced Hydro-Jetting Safety</p>
              </div>
              <button onClick={() => setActiveVideoModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Video Mockup Player */}
            <div className="w-full h-64 rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden shadow-inner">
              <div className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all">
                <Play size={28} fill="white" className="ml-1" />
              </div>
              <p className="text-xs text-slate-300 mt-3 font-semibold">Interactive Video Tutorial (HD 1080p)</p>
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400">
                <span>04:15 / 09:30</span>
                <span>HD • SahakarGig Certified Video</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-[#00288e]">Key Learning Objective:</p>
              <p className="text-[11px]">Always inspect pipe pressure tolerances before operating high-pressure electric drain jetters to prevent joint ruptures.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setActiveVideoModal(false)}
                className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert("Lesson marked complete! +5 Trust points earned.");
                  setActiveVideoModal(false);
                }}
                className="px-6 py-2 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer text-xs"
              >
                Mark Lesson Complete ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: OFFICIAL DIGITAL SKILL CERTIFICATE ── */}
      {activeCertModal && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setActiveCertModal(false)}>
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Official Skill Certification</h2>
              <button onClick={() => setActiveCertModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 rounded-2xl border-2 border-[#00288e]/20 bg-slate-50 space-y-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#00288e] text-white flex items-center justify-center font-bold shadow-md">
                  <Award size={22} />
                </div>
              </div>

              <div>
                <h3 className="font-black text-slate-900 text-lg tracking-tight">SAHAKARGIG SKILL CERTIFICATION</h3>
                <p className="text-xs text-slate-500 font-medium">National Cooperative Workforce Development Directorate</p>
              </div>

              <div className="py-2">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">This Certifies That</p>
                <h4 className="text-xl font-bold text-slate-900 mt-1">Ramesh Kumar</h4>
                <p className="text-xs text-slate-600 mt-1">Has successfully completed the professional curriculum for:</p>
                <p className="text-sm font-black text-[#00288e] mt-1">{selectedCourse.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-left text-xs max-w-md mx-auto">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Credential ID</span>
                  <p className="font-mono font-bold text-slate-900">{selectedCourse.certificateNo || "CERT-2026-991"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Issued On</span>
                  <p className="font-bold text-slate-900">{new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setActiveCertModal(false)}
                className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
