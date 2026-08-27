import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, ShieldCheck, Network, Handshake, PieChart, AlertTriangle, 
  Cpu, Database, Server, Zap, Layers, CheckCircle2, Mic, Activity, Globe, Lock,
  FileCheck, Landmark, Wallet, PhoneCall, Radio, Check
} from 'lucide-react';

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBqd8zsjxsBCPLstNY3rkhVc0f0-xjt0cXpHTsYV3jdaOlLQMvM2o-eaojR97WW3B3yXkJjNM6lXaTVCKOmu5ZOEoQ-zdNyfpOaesnbzqw95q_el-1LbiU7Pow12erD6-NNlOWM89u0WfWjAVlR8AwZCxhT4yCsY5zFk2If2sscr4CQRLQWFQ4ZkIPn7EEXn94mfnJ32Fu3RuNCdpIZqT_f5jeuG-6VPImhDey89SdyWQ5iHh6Iyw";

const ARCH_HIGHLIGHTS = [
  {
    icon: Handshake,
    title: 'NLCF Apex Federation Grounding',
    desc: 'Aligned with Ministry of Cooperation 2024–25 Report',
  },
  {
    icon: Network,
    title: 'Microservices & Async WebSocket',
    desc: 'Real-time emergency dispatch & live tracking engine',
  },
  {
    icon: PieChart,
    title: 'Transparent Fair Wage Formula',
    desc: '75% Worker, 10% Society, 5% Welfare, 10% Maintenance',
  },
];

export default function Architecture() {
  const [activeTab, setActiveTab] = useState('topology');

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-surface-container-lowest font-body-md selection:bg-primary-container selection:text-on-primary-container antialiased">
      
      {/* ── LEFT HERO IMAGE PANE (Synchronized with Login / AuthShell) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-5/12 h-full relative flex-col justify-between p-8 xl:p-10 2xl:p-12 overflow-hidden shrink-0 select-none">
        {/* Background Image with modern blur & zoom */}
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-105 filter blur-[1.5px] brightness-[0.72] transition-transform duration-[20s] ease-linear hover:scale-110"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        />
        
        {/* Modern SaaS Gradient Overlays */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#00174e]/95 via-[#00288e]/80 to-[#00103a]/90 backdrop-blur-[1px]" />
        <div className="absolute -top-32 -right-32 z-[2] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 z-[2] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 z-[2] opacity-[0.07] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Handshake size={20} className="text-white" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-white">
              SahakarGig
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Enterprise Architecture
          </span>
        </div>

        {/* Middle Hero Content */}
        <div className="relative z-10 my-auto py-4 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-[11.5px] font-semibold mb-3.5 border border-white/15 shadow-xs">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Cooperative Trust &amp; Governance Architecture</span>
          </div>

          <h1 className="font-heading text-2xl xl:text-3xl font-extrabold tracking-tight leading-[1.2] text-white mb-3 drop-shadow-sm">
            Institutional Precision &amp; Scalable Engineering.
          </h1>

          <p className="text-white/85 text-xs xl:text-[13.5px] leading-relaxed mb-5 max-w-md font-normal">
            A cooperative-owned workforce marketplace connecting verified local workers with households while ensuring transparent wage distribution and social security.
          </p>

          {/* Feature Benefit Cards */}
          <div className="space-y-2.5 max-w-md">
            {ARCH_HIGHLIGHTS.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/15 hover:bg-white/[0.12] hover:border-white/25 transition-all duration-200 shadow-xs cursor-default group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <IconComp size={16} className="text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-white tracking-tight leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-white/70 truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-white/75">
          <span className="font-medium">© SahakarGig · Production Architecture</span>
          <span className="text-[11px] font-medium text-white/60">
            v2.4.0 (Enterprise)
          </span>
        </div>
      </div>

      {/* ── RIGHT ARCHITECTURE WORKSPACE PANE ── */}
      <div className="w-full lg:w-7/12 xl:w-7/12 min-h-screen lg:h-full flex flex-col p-5 sm:p-8 lg:p-8 xl:p-10 bg-surface-container-lowest overflow-y-auto">
        
        {/* Fixed Top Navigation Bar — Synchronized exact position across all auth pages */}
        <div className="w-full flex items-center justify-between min-h-[36px] mb-4 shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all duration-200 group w-fit cursor-pointer"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-200 text-outline group-hover:text-primary" />
            <span>Back to Home</span>
          </Link>
          <span className="text-[11.5px] font-mono font-medium text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-md border border-outline-variant/40">
            Microservices &amp; Governance
          </span>
        </div>

        {/* Page Title & Intro */}
        <div className="mb-4">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            System Architecture
          </h2>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
            Deep dive into SahakarGig's 3-tier cooperative governance, real-time dispatch, and fair wage engine.
          </p>
        </div>

        {/* Tab Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/60 pb-3 mb-5">
          <button
            onClick={() => setActiveTab('topology')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer ${
              activeTab === 'topology'
                ? 'border border-primary/30 bg-[#e8edff] text-[#00288e] shadow-xs'
                : 'bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <Network size={15} /> System Topology
          </button>

          <button
            onClick={() => setActiveTab('institutional')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer ${
              activeTab === 'institutional'
                ? 'border border-primary/30 bg-[#e8edff] text-[#00288e] shadow-xs'
                : 'bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <Handshake size={15} /> NLCF Grounding
          </button>

          <button
            onClick={() => setActiveTab('fairwage')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer ${
              activeTab === 'fairwage'
                ? 'border border-primary/30 bg-[#e8edff] text-[#00288e] shadow-xs'
                : 'bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <PieChart size={15} /> Fair Wage Engine
          </button>

          <button
            onClick={() => setActiveTab('ai_sos')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer ${
              activeTab === 'ai_sos'
                ? 'border border-primary/30 bg-[#e8edff] text-[#00288e] shadow-xs'
                : 'bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <Zap size={15} /> AI &amp; SOS Dispatch
          </button>
        </div>

        {/* ── TAB 1: SYSTEM TOPOLOGY ── */}
        {activeTab === 'topology' && (
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-2xl border border-outline-variant/70 bg-white space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  <Layers className="text-primary" size={18} /> High-Availability Microservices Stack
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#e6f9ec] text-[#006d30] text-[11.5px] font-bold border border-[#006d30]/20">
                  ✓ Verified 100% Uptime
                </span>
              </div>

              {/* Structured Interactive Component Viewer */}
              <div className="space-y-3 pt-1">
                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-outline-variant/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00288e] text-white flex items-center justify-center font-bold text-[13px] shadow-xs">
                      API
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-bold text-on-surface">API Gateway &amp; Auth Proxy</h4>
                      <p className="text-[12px] text-on-surface-variant">Express.js + Rate Limiter + Socket.io Relay</p>
                    </div>
                  </div>
                  <span className="text-[12px] font-mono font-semibold text-primary">Port 5000 / HTTPS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-outline-variant/70 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-[13px] text-on-surface">
                      <Server size={15} className="text-primary" /> Booking Service
                    </div>
                    <p className="text-[11px] text-on-surface-variant">State Engine, Escrow Lock &amp; Cancellation Handling</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-outline-variant/70 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-[13px] text-on-surface">
                      <Lock size={15} className="text-[#00288e]" /> User Service
                    </div>
                    <p className="text-[11px] text-on-surface-variant">3-Tier RBAC, JWT Auth &amp; KYC Verification</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-outline-variant/70 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-[13px] text-on-surface">
                      <Cpu size={15} className="text-[#6b4200]" /> Matching Engine
                    </div>
                    <p className="text-[11px] text-on-surface-variant">Geospatial Haversine &amp; TrustScore Ranking</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#e8edff] text-[#00288e] font-bold text-[12.5px] flex items-center justify-between border border-primary/20">
                    <span className="flex items-center gap-1.5"><Database size={15} /> MongoDB Atlas</span>
                    <span className="text-[10.5px] bg-white px-2 py-0.5 rounded font-semibold">Replication</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#e6f9ec] text-[#006d30] font-bold text-[12.5px] flex items-center justify-between border border-[#006d30]/20">
                    <span className="flex items-center gap-1.5"><Zap size={15} /> Redis In-Memory</span>
                    <span className="text-[10.5px] bg-white px-2 py-0.5 rounded font-semibold">Cache &amp; PubSub</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#fff3e0] text-[#6b4200] font-bold text-[12.5px] flex items-center justify-between border border-[#6b4200]/20">
                    <span className="flex items-center gap-1.5"><Globe size={15} /> Razorpay API</span>
                    <span className="text-[10.5px] bg-white px-2 py-0.5 rounded font-semibold">Payout Escrow</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: NLCF GROUNDING ── */}
        {activeTab === 'institutional' && (
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-2xl border border-outline-variant/70 bg-white space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-primary">
                <Handshake size={20} strokeWidth={2.5} />
                <h3 className="text-[17px] font-bold text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  Institutional Grounding in National Apex Bodies
                </h3>
              </div>

              <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
                The Ministry of Cooperation 2024–25 Annual Report explicitly recognizes the <strong>National Labour Cooperative Federation of India (NLCF)</strong> as the national apex federation representing labor cooperatives across India.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-outline-variant/50 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Tier 1</span>
                  <h4 className="text-[13.5px] font-bold text-on-surface">Federation Admin</h4>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">National governance, policy oversight, and cross-cooperative analytics.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-outline-variant/50 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#00288e]">Tier 2</span>
                  <h4 className="text-[13.5px] font-bold text-on-surface">Cooperative Admin</h4>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">District society management, commission rate configuration, worker onboarding.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-outline-variant/50 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b4200]">Tier 3</span>
                  <h4 className="text-[13.5px] font-bold text-on-surface">Gig Provider &amp; Household</h4>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">Direct service booking, instant digital payouts, e-Shram welfare protection.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: FAIR WAGE ENGINE ── */}
        {activeTab === 'fairwage' && (
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-2xl border border-outline-variant/70 bg-white space-y-4 shadow-xs">
              <div>
                <h3 className="text-[17px] font-bold text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  Transparent Cooperative Revenue &amp; Wage Distribution Engine
                </h3>
                <p className="text-[13px] text-on-surface-variant mt-1">
                  Unlike commercial aggregators that charge up to 30% platform commissions, SahakarGig enforces a transparent cooperative distribution formula.
                </p>
              </div>

              {/* Formula Visual Card */}
              <div className="p-4 rounded-xl bg-[#f8f9ff] border border-outline-variant/50 space-y-3">
                <div className="text-[13px] font-bold text-on-surface flex items-center justify-between pb-1 border-b border-outline-variant/30">
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

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-outline-variant/70 text-on-surface font-bold">
                    <span>Platform Maintenance (10%)</span>
                    <span>₹100.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: AI & SOS DISPATCH ── */}
        {activeTab === 'ai_sos' && (
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-2xl border border-outline-variant/70 bg-white space-y-4 shadow-xs">
              <div>
                <h3 className="text-[17px] font-bold text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  Multilingual Voice Intent &amp; 24x7 Emergency SOS Dispatch
                </h3>
                <p className="text-[13px] text-on-surface-variant mt-1">
                  Powered by Web Speech API Vernacular Speech-to-Text and automated emergency dispatch priority queues.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-outline-variant/50 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-[13.5px]">
                    <Mic size={17} /> Vernacular Speech Parsing
                  </div>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">
                    Customer speaks in Hindi/Regional language ("Mere ghar mein pipe leak ho raha hai"). AI classifies intent: <strong>Plumbing (Priority: High)</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-outline-variant/50 space-y-2">
                  <div className="flex items-center gap-2 text-error font-bold text-[13.5px]">
                    <AlertTriangle size={17} /> Emergency SOS Dispatch
                  </div>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">
                    Instant 1-tap dispatch for Gas Leaks, Electrical Failures, and Lockouts with real-time socket tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

