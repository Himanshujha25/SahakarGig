import { Link } from 'react-router-dom';
import { ArrowLeft, Server, Database, ShieldCheck, Cpu, Zap, Handshake, Network, FileText, Activity } from 'lucide-react';

export default function Architecture() {
  return (
    <div className="min-h-screen bg-background text-on-background p-4 sm:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-5">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-[13px] font-bold text-primary hover:underline mb-2">
            <ArrowLeft size={16} /> Back to SahakarGig Home
          </Link>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            System Architecture &amp; Institutional Grounding
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Official SIH 2026 / Ministry of Cooperation PS 26089 Production System Architecture
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-white text-[13px] font-bold">
          <ShieldCheck size={16} /> NLCF Aligned Ecosystem
        </div>
      </div>

      {/* Institutional Grounding Callout */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-primary-container via-primary/90 to-primary text-white space-y-3 shadow-md">
        <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-on-primary-container">
          <Handshake size={18} /> Institutional Grounding (Ministry Annual Report 2024-25)
        </div>
        <p className="text-[15px] leading-relaxed">
          The Ministry of Cooperation 2024–25 Annual Report explicitly lists the <strong>National Labour Cooperative Federation of India (NLCF)</strong> among national apex federations. SahakarGig is built specifically as a 3-tier governed digital marketplace for NLCF-affiliated primary labour cooperatives.
        </p>
      </div>

      {/* Microservices Architecture Diagram Section */}
      <div className="p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-on-surface flex items-center gap-2">
            <Network className="text-primary" /> Microservices &amp; Infrastructure Topology
          </h2>
          <span className="px-3 py-1 rounded-full bg-[#e8edff] text-[#00288e] text-[12px] font-bold">Production Ready</span>
        </div>

        {/* Visual Architecture Flow Chart */}
        <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-6 text-center">
          {/* Top Client Layer */}
          <div className="p-4 rounded-xl bg-surface border border-outline-variant text-center font-bold text-primary">
            📱 CUSTOMER APP &amp; PROVIDER PWA (Vite + ServiceWorker)
          </div>

          <div className="flex justify-center text-primary">
            <span className="text-[18px]">↓</span>
          </div>

          {/* Gateway Layer */}
          <div className="p-4 rounded-xl bg-primary text-white font-bold text-center shadow-md">
            🌐 API GATEWAY &amp; WEBSOCKET DISPATCH ENGINE (Express + Socket.io)
          </div>

          <div className="flex justify-center text-primary">
            <span className="text-[18px]">↓</span>
          </div>

          {/* Microservices Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface border border-outline-variant text-center space-y-1">
              <div className="font-bold text-on-surface">📋 Booking Service</div>
              <p className="text-[11px] text-on-surface-variant">Escrow &amp; State Management</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-outline-variant text-center space-y-1">
              <div className="font-bold text-on-surface">👤 User Service</div>
              <p className="text-[11px] text-on-surface-variant">3-Tier RBAC &amp; KYC</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-outline-variant text-center space-y-1">
              <div className="font-bold text-on-surface">⚡ Matching Engine</div>
              <p className="text-[11px] text-on-surface-variant">Proximity &amp; Trust Score</p>
            </div>
          </div>

          <div className="flex justify-center text-primary">
            <span className="text-[18px]">↓</span>
          </div>

          {/* Database Layer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-[#e8edff] text-[#00288e] font-bold text-center">
              🍃 MongoDB / PostgreSQL (Primary Store)
            </div>
            <div className="p-3.5 rounded-xl bg-[#e6f9ec] text-[#006d30] font-bold text-center">
              ⚡ Redis Cache &amp; PubSub
            </div>
            <div className="p-3.5 rounded-xl bg-[#fff3e0] text-[#6b4200] font-bold text-center">
              💳 Razorpay Payment Gateway
            </div>
          </div>

          <div className="flex justify-center text-primary">
            <span className="text-[18px]">↓</span>
          </div>

          {/* AI Services Layer */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-secondary/15 via-surface to-secondary/15 border border-secondary/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-lg bg-white font-bold text-secondary text-[13px]">
              🤖 Demand Forecasting AI Service
            </div>
            <div className="p-3 rounded-lg bg-white font-bold text-secondary text-[13px]">
              ⭐ Worker Ranking &amp; TrustScore AI Service
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
