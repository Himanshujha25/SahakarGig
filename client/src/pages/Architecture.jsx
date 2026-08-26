import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, ShieldCheck, Network, Handshake, PieChart, AlertTriangle, 
  Cpu, Database, Server, Zap, Layers, CheckCircle2, Mic, Activity, Globe, Lock
} from 'lucide-react';

export default function Architecture() {
  const [activeTab, setActiveTab] = useState('topology');

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0d1c2e] font-sans p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* LEFT PANEL: Sleek Stitch Hero Card (Matching Login Page) */}
        <div className="lg:col-span-4 bg-[#00288e] text-white rounded-[24px] p-7 sm:p-9 flex flex-col justify-between lg:min-h-[750px] shadow-2xl relative overflow-hidden">
          {/* Subtle Background Radial Overlay */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            {/* Header / Brand */}
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 font-bold text-[20px] tracking-tight text-white hover:opacity-90 transition-opacity">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <ShieldCheck size={20} className="text-white" />
                </div>
                <span style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>SahakarGig</span>
              </Link>
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-blue-100 uppercase tracking-wider">
                PS 26089
              </span>
            </div>

            {/* Hero Title */}
            <div className="space-y-3 pt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#92f5a4] text-[#003919] text-[12px] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#006d30] animate-pulse" /> Production System Architecture
              </span>
              <h1 className="text-[28px] sm:text-[34px] font-extrabold text-white leading-tight tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                Institutional Precision &amp; Scalable Engineering.
              </h1>
              <p className="text-[14px] text-blue-100/90 leading-relaxed">
                A cooperative-owned intelligent workforce marketplace connecting verified local workers with households while ensuring transparent wage distribution and integrated social security.
              </p>
            </div>

            {/* Key Architectural Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <Handshake size={18} className="text-[#92f5a4] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[13px] font-bold text-white">NLCF Apex Federation Grounding</h4>
                  <p className="text-[11px] text-blue-100/80">Aligned with Ministry of Cooperation 2024–25 Report</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <Network size={18} className="text-[#a8b8ff] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[13px] font-bold text-white">Microservices &amp; Async WebSocket</h4>
                  <p className="text-[11px] text-blue-100/80">Real-time emergency dispatch &amp; live tracking</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <PieChart size={18} className="text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[13px] font-bold text-white">Configurable Fair Wage Engine</h4>
                  <p className="text-[11px] text-blue-100/80">75% Worker, 10% Coop, 5% Welfare, 10% Admin</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Back Link */}
          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white hover:text-blue-200 transition-colors">
              <ArrowLeft size={16} /> Back to Platform
            </Link>
            <span className="text-[11px] text-blue-200/60 font-mono">v2.4.0 (Production)</span>
          </div>
        </div>

        {/* RIGHT PANEL: High-End Interactive Architecture Workspace */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Navigation Bar / Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/60 pb-3">
            <button
              onClick={() => setActiveTab('topology')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                activeTab === 'topology'
                  ? 'bg-[#00288e] text-white shadow-md'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <Network size={16} /> System Topology
            </button>

            <button
              onClick={() => setActiveTab('institutional')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                activeTab === 'institutional'
                  ? 'bg-[#00288e] text-white shadow-md'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <Handshake size={16} /> NLCF Grounding
            </button>

            <button
              onClick={() => setActiveTab('fairwage')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                activeTab === 'fairwage'
                  ? 'bg-[#00288e] text-white shadow-md'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <PieChart size={16} /> Fair Wage Engine
            </button>

            <button
              onClick={() => setActiveTab('ai_sos')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                activeTab === 'ai_sos'
                  ? 'bg-[#00288e] text-white shadow-md'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <Zap size={16} /> AI &amp; SOS Dispatch
            </button>
          </div>

          {/* TAB 1: SYSTEM TOPOLOGY */}
          {activeTab === 'topology' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                    <Layers className="text-primary" size={20} /> High-Availability Microservices Stack
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-[#e6f9ec] text-[#006d30] text-[12px] font-bold">
                    ✓ Verified 100% Uptime
                  </span>
                </div>

                {/* Structured Interactive Component Viewer */}
                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00288e] text-white flex items-center justify-center font-bold text-[14px]">
                        API
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-on-surface">API Gateway &amp; Auth Proxy</h4>
                        <p className="text-[12px] text-on-surface-variant">Express.js + Rate Limiter + Socket.io Relay</p>
                      </div>
                    </div>
                    <span className="text-[12px] font-mono font-semibold text-primary">Port 5000 / HTTPS</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-surface border border-outline-variant space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[13px] text-on-surface">
                        <Server size={15} className="text-primary" /> Booking Service
                      </div>
                      <p className="text-[11px] text-on-surface-variant">State Engine, Escrow Lock &amp; Cancellation Handling</p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface border border-outline-variant space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[13px] text-on-surface">
                        <Lock size={15} className="text-secondary" /> User Service
                      </div>
                      <p className="text-[11px] text-on-surface-variant">3-Tier RBAC, JWT Auth &amp; KYC Verification</p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface border border-outline-variant space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[13px] text-on-surface">
                        <Cpu size={15} className="text-[#6b4200]" /> Matching Engine
                      </div>
                      <p className="text-[11px] text-on-surface-variant">Geospatial Haversine &amp; TrustScore Ranking</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#e8edff] text-[#00288e] font-bold text-[13px] flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Database size={15} /> MongoDB Atlas</span>
                      <span className="text-[11px] bg-white/70 px-2 py-0.5 rounded">Replication</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#e6f9ec] text-[#006d30] font-bold text-[13px] flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Zap size={15} /> Redis In-Memory</span>
                      <span className="text-[11px] bg-white/70 px-2 py-0.5 rounded">Cache &amp; PubSub</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#fff3e0] text-[#6b4200] font-bold text-[13px] flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Globe size={15} /> Razorpay API</span>
                      <span className="text-[11px] bg-white/70 px-2 py-0.5 rounded">Payout Escrow</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NLCF GROUNDING */}
          {activeTab === 'institutional' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-primary">
                  <Handshake size={22} strokeWidth={2.5} />
                  <h3 className="text-[18px] font-bold text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                    Institutional Grounding in National Apex Bodies
                  </h3>
                </div>

                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  The Ministry of Cooperation 2024–25 Annual Report explicitly recognizes the <strong>National Labour Cooperative Federation of India (NLCF)</strong> as the national apex federation representing labor cooperatives across India.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Tier 1</span>
                    <h4 className="text-[14px] font-bold text-on-surface">Federation Admin</h4>
                    <p className="text-[12px] text-on-surface-variant">National governance, policy oversight, and cross-cooperative analytics.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">Tier 2</span>
                    <h4 className="text-[14px] font-bold text-on-surface">Cooperative Admin</h4>
                    <p className="text-[12px] text-on-surface-variant">District society management, commission rate configuration, worker onboarding.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b4200]">Tier 3</span>
                    <h4 className="text-[14px] font-bold text-on-surface">Gig Provider &amp; Household</h4>
                    <p className="text-[12px] text-on-surface-variant">Direct service booking, instant digital payouts, e-Shram welfare protection.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FAIR WAGE ENGINE */}
          {activeTab === 'fairwage' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-5 shadow-sm">
                <div>
                  <h3 className="text-[18px] font-bold text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                    Transparent Cooperative Revenue &amp; Wage Distribution Engine
                  </h3>
                  <p className="text-[13px] text-on-surface-variant mt-1">
                    Unlike commercial aggregators that charge up to 30% platform commissions, SahakarGig enforces a transparent cooperative distribution formula.
                  </p>
                </div>

                {/* Formula Visual Card */}
                <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-4">
                  <div className="text-[13px] font-bold text-on-surface flex items-center justify-between">
                    <span>Standard Transaction Breakdown (Customer Pays ₹1,000)</span>
                    <span className="text-primary font-bold">100% Transparent</span>
                  </div>

                  <div className="space-y-2 text-[13px]">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#e8edff] text-[#00288e] font-bold">
                      <span>Worker Fair Wage (75%)</span>
                      <span>₹750.00</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#e6f9ec] text-[#006d30] font-bold">
                      <span>Cooperative Society Reserve (10%)</span>
                      <span>₹100.00</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#fff3e0] text-[#6b4200] font-bold">
                      <span>Worker Welfare &amp; Insurance Fund (5%)</span>
                      <span>₹50.00</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-outline-variant text-on-surface font-bold">
                      <span>Platform Maintenance (10%)</span>
                      <span>₹100.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI & SOS DISPATCH */}
          {activeTab === 'ai_sos' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-5 shadow-sm">
                <div>
                  <h3 className="text-[18px] font-bold text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                    Multilingual Voice Intent &amp; 24x7 Emergency SOS Dispatch
                  </h3>
                  <p className="text-[13px] text-on-surface-variant mt-1">
                    Powered by Web Speech API Vernacular Speech-to-Text and automated emergency dispatch priority queues.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-[14px]">
                      <Mic size={18} /> Vernacular Speech Parsing
                    </div>
                    <p className="text-[12px] text-on-surface-variant">
                      Customer speaks in Hindi/Regional language ("Mere ghar mein pipe leak ho raha hai"). AI classifies intent: <strong>Plumbing (Priority: High)</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-2">
                    <div className="flex items-center gap-2 text-error font-bold text-[14px]">
                      <AlertTriangle size={18} /> Emergency SOS Dispatch
                    </div>
                    <p className="text-[12px] text-on-surface-variant">
                      Instant 1-tap dispatch for Gas Leaks, Electrical Failures, and Lockouts with real-time socket tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
