import { Link } from 'react-router-dom';
import {
  Search, MapPin, BadgeCheck, ShieldCheck, Zap,
  Wrench, GraduationCap, Sparkles, HeartPulse, LayoutGrid,
  ArrowRight, Users, CalendarCheck, Star, Handshake, ChevronRight, ArrowUpRight
} from 'lucide-react';

const HERO_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ-dpYJMEXWGjKVWEtlFNYAPrFrGMUncXsN08msvogjefS62LwnCQ1bUeItkSrlQSZYpq5JrB8qKHNifnjbW0rHcNkbQY9x_gnoxQqWcWi-cqXBPtYQcopyEOxc1pQc4HyPUfW753FHhzpHa1Q7iqyfvjr5CMRSKmil9ODYutUqHafvNbhWSptBy9GXzM09Au9PHyKYYpeMrAayssGeRytpEpRtDvUHzfHKsko5gpP7qzGC8T3jA';

const SMALL_CATS = [
  { Icon: GraduationCap, label: 'Education & Tutoring', sub: 'Home tutors, Coaching & Skill Training', count: '120+ Tutors' },
  { Icon: Sparkles,      label: 'Cleaning & Sanitization', sub: 'Deep cleaning, Laundry & Housekeeping', count: '95+ Verified' },
  { Icon: HeartPulse,    label: 'Caregiving & Nursing', sub: 'Elder care, Patient care & Assistance', count: '80+ Specialists' },
  { Icon: LayoutGrid,    label: 'Explore 50+ Services', sub: 'View full cooperative service directory', count: '50+ Categories' },
];

const STATS = [
  { value: '12,000+', label: 'Verified Providers',   Icon: Users },
  { value: '3 Lakh+', label: 'Bookings Completed',   Icon: CalendarCheck },
  { value: '480+',    label: 'Cooperatives',          Icon: Handshake },
  { value: '4.8★',   label: 'Average Rating',        Icon: Star },
];

const FEATURES = [
  { Icon: BadgeCheck,  title: 'Cooperative Verified',    desc: 'Every provider is background-checked and endorsed by a registered cooperative society before they can take bookings.' },
  { Icon: ShieldCheck, title: 'Secure & Fair Payments',  desc: 'Razorpay-powered escrow holds funds safely. Providers earn more; households pay less — zero hidden fees.' },
  { Icon: Zap,         title: 'Emergency Booking',       desc: 'Need help right now? Our emergency dispatch connects you with the nearest available provider in minutes.' },
];

const HOW = [
  { n: '01', title: 'Search a Service',  desc: 'Browse by category or search for exactly what you need in your locality.' },
  { n: '02', title: 'Book Instantly',    desc: 'Pick a verified provider, choose a time slot, and confirm your booking.' },
  { n: '03', title: 'Track Live',        desc: 'Follow your provider in real-time via Socket.io-powered live status updates.' },
  { n: '04', title: 'Pay & Review',      desc: 'Pay securely after the job is done and leave a review for the community.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] text-[#0d1c2e] antialiased">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-white/80 border-b border-[#e8edff]" style={{boxShadow:'0 1px 0 0 #e8edff, 0 4px 24px rgba(0,40,142,0.06)'}}>
        <div className="w-full px-4 sm:px-8 h-[66px] flex items-center justify-between gap-4 sm:gap-8">

          {/* Logo — far left edge */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-[#00288e] flex items-center justify-center group-hover:shadow-[0_4px_14px_rgba(0,40,142,0.45)] group-hover:scale-105 transition-all duration-300">
              <Handshake size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[18px] font-bold tracking-[-0.02em] text-[#0d1c2e]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Sahakar<span className="text-[#00288e]">Gig</span>
            </span>
          </Link>

          {/* Nav — center */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              ['#services', 'Services'],
              ['#how', 'How it Works'],
              ['#about', 'Why Us'],
              ['/architecture', 'System Architecture'],
            ].map(([href, label]) => (
              href.startsWith('/') ? (
                <Link key={label} to={href}
                  className="px-4 py-2 rounded-lg text-[14px] font-medium text-[#444653] hover:text-[#00288e] hover:bg-[#f0f4ff] transition-all duration-200">
                  {label}
                </Link>
              ) : (
                <a key={label} href={href}
                  className="px-4 py-2 rounded-lg text-[14px] font-medium text-[#444653] hover:text-[#00288e] hover:bg-[#f0f4ff] transition-all duration-200">
                  {label}
                </a>
              )
            ))}
          </nav>

          {/* Auth — far right edge */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/login"
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[13px] sm:text-[14px] font-semibold text-[#444653] hover:text-[#00288e] hover:bg-[#f0f4ff] transition-all duration-200">
              Sign In
            </Link>
            <Link to="/signup"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[13px] sm:text-[14px] font-semibold bg-[#00288e] text-white hover:bg-[#173bab] transition-all duration-200 shadow-sm">
              Sign Up <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">

        {/* ── HERO — centered, exactly like Stitch ── */}
        <section className="relative pt-20 pb-16 px-6 flex flex-col items-center text-center overflow-hidden">
          {/* subtle radial bg */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(0,40,142,0.08),transparent)]" />

          {/* pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e8edff] border border-[#00288e]/20 text-[#00288e] text-[13px] font-bold mb-6">
            <Zap size={13} /> Cooperative Gig Platform · SIH 2026
          </div>

          {/* headline */}
          <h1
            className="text-[32px] sm:text-[48px] md:text-[64px] font-bold tracking-[-0.025em] leading-[1.1] sm:leading-[1.06] text-[#0d1c2e] max-w-3xl mb-5"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Find Trusted{' '}
            <span className="text-[#00288e]">Cooperative</span>{' '}
            Services
          </h1>

          {/* subtitle */}
          <p className="text-[18px] leading-[1.7] text-[#444653] max-w-xl mb-10">
            Connect directly with verified local professionals backed by your community cooperative.
            Reliable, safe, and empowering for everyone.
          </p>

          {/* search bar */}
          <div className="w-full max-w-[720px] flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 border border-[#c4c5d5] shadow-[0_4px_32px_rgba(0,40,142,0.10)] hover:shadow-[0_8px_40px_rgba(0,40,142,0.15)] hover:border-[#00288e]/30 transition-all duration-300 mb-6">
            <div className="flex-1 flex items-center gap-2.5 bg-[#f8f9ff] rounded-xl px-4 py-3 border border-[#c4c5d5]/50 focus-within:border-[#00288e]/60 focus-within:bg-white transition-all duration-200">
              <Search size={17} className="text-[#00288e] shrink-0" />
              <input
                className="w-full bg-transparent border-none outline-none text-[15px] text-[#0d1c2e] placeholder:text-[#757684]"
                placeholder="What service do you need? (e.g. Plumbing, Tutor)" />
            </div>
            <div className="flex-1 flex items-center gap-2.5 bg-[#f8f9ff] rounded-xl px-4 py-3 border border-[#c4c5d5]/50 focus-within:border-[#00288e]/60 focus-within:bg-white transition-all duration-200">
              <MapPin size={17} className="text-[#00288e] shrink-0" />
              <input
                className="w-full bg-transparent border-none outline-none text-[15px] text-[#0d1c2e] placeholder:text-[#757684]"
                placeholder="Your Location" />
            </div>
            <button className="flex items-center justify-center gap-2 bg-[#00288e] text-white text-[14px] font-bold px-8 py-3 rounded-xl hover:bg-[#173bab] hover:shadow-[0_4px_16px_rgba(0,40,142,0.35)] hover:scale-[1.03] transition-all duration-300 whitespace-nowrap">
              <Search size={16} /> Search
            </button>
          </div>

          {/* trust pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { Icon: BadgeCheck,  label: 'Verified by Cooperative', bg: 'bg-[#e6f9ec]', tc: 'text-[#006d30]' },
              { Icon: ShieldCheck, label: 'Secure Payments',         bg: 'bg-[#e8edff]', tc: 'text-[#00288e]' },
              { Icon: Zap,         label: 'Emergency Booking',       bg: 'bg-[#fff3e0]', tc: 'text-[#6b4200]' },
            ].map(({ Icon, label, bg, tc }) => (
              <span key={label} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bg} ${tc} text-[13px] font-semibold`}>
                <Icon size={14} /> {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── CATEGORY BENTO — exactly like Stitch ── */}
        <section id="services" className="max-w-[1280px] mx-auto px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[12px] font-bold text-[#00288e] uppercase tracking-[0.12em] mb-1.5">What We Offer</p>
              <h2 className="text-[32px] font-bold tracking-tight text-[#0d1c2e]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                Browse by Category
              </h2>
            </div>
            <Link to="/signup" className="hidden md:flex items-center gap-1.5 text-[14px] font-bold text-[#00288e] hover:text-[#173bab] transition-colors group">
              View all <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          {/* Bento grid: big card left (col-span-2 row-span-2) + 4 small cards right */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Large image card — col-span-2 row-span-2 */}
            <div className="col-span-2 row-span-2 group relative overflow-hidden rounded-2xl border border-[#c4c5d5]/40 bg-white cursor-pointer min-h-[320px] md:min-h-[380px] shadow-sm hover:shadow-[0_12px_40px_rgba(0,40,142,0.14)] transition-all duration-400">
              <img
                src={HERO_IMG}
                alt="Home Maintenance"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-600 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1c2e]/70 via-[#0d1c2e]/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="text-[22px] font-bold text-white mb-1" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  Home Maintenance
                </h3>
                <p className="text-[14px] text-white/75">Electricians, Plumbers, Carpenters</p>
              </div>
            </div>

            {/* 4 small cards — Shadcn / Linear SaaS Style */}
            {SMALL_CATS.map(({ Icon, label, sub, count }) => (
              <Link
                key={label}
                to="/signup"
                className="group relative overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface p-5 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,40,142,0.12)] hover:-translate-y-1 hover:border-primary/40 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-surface-container-low border border-outline-variant/40 text-primary flex items-center justify-center group-hover:bg-[#00288e] group-hover:text-white group-hover:border-[#00288e] transition-all duration-300 shadow-sm">
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <ArrowUpRight size={18} className="text-outline-variant group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                </div>

                <div className="mt-6 text-left">
                  <h4 className="text-[15px] font-bold text-on-surface group-hover:text-primary transition-colors leading-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                    {label}
                  </h4>
                  <p className="text-[12px] text-on-surface-variant/80 mt-1 line-clamp-2 leading-relaxed">
                    {sub}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-[11px] font-bold text-primary">
                  <span>{count}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">Book Now →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <section className="bg-[#00288e]">
          <div className="max-w-[1280px] mx-auto px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label, Icon }) => (
              <div key={label} className="flex flex-col items-center text-center group">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 group-hover:scale-110 group-hover:border-white/20 transition-all duration-300">
                  <Icon size={24} className="text-white" strokeWidth={1.75} />
                </div>
                <p className="text-[34px] font-bold text-white leading-none tracking-tight">{value}</p>
                <p className="text-[13px] text-white/55 mt-2 font-medium tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="bg-[#eff4ff] py-24">
          <div className="max-w-[1280px] mx-auto px-8">
            <div className="text-center mb-14">
              <p className="text-[12px] font-bold text-[#00288e] uppercase tracking-[0.12em] mb-2">Simple Process</p>
              <h2 className="text-[36px] font-bold tracking-tight text-[#0d1c2e]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                How SahakarGig Works
              </h2>
              <p className="text-[16px] text-[#444653] mt-3 max-w-lg mx-auto">From search to service completion in four easy steps.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {HOW.map(({ n, title, desc }, i) => (
                <div key={n}
                  className="group relative bg-white rounded-2xl border border-[#c4c5d5]/50 p-7 hover:shadow-[0_8px_32px_rgba(0,40,142,0.10)] hover:-translate-y-1.5 hover:border-[#00288e]/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-[#e8edff] flex items-center justify-center mb-5 group-hover:bg-[#00288e] transition-colors duration-300">
                    <span className="text-[13px] font-bold text-[#00288e] group-hover:text-white transition-colors duration-300">{n}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#0d1c2e] mb-2">{title}</h3>
                  <p className="text-[14px] text-[#444653] leading-relaxed">{desc}</p>
                  {i < 3 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#e8edff] border border-[#c4c5d5]/50 items-center justify-center">
                      <ChevronRight size={13} className="text-[#00288e]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="about" className="max-w-[1280px] mx-auto px-8 py-24">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-[#00288e] uppercase tracking-[0.12em] mb-2">Why Choose Us</p>
            <h2 className="text-[36px] font-bold tracking-tight text-[#0d1c2e]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Built on Trust &amp; Community
            </h2>
            <p className="text-[16px] text-[#444653] mt-3 max-w-xl mx-auto">
              A cooperative-owned platform where every stakeholder wins.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title}
                className="group relative overflow-hidden rounded-2xl border border-[#c4c5d5]/50 bg-white p-8 hover:shadow-[0_12px_40px_rgba(0,40,142,0.12)] hover:-translate-y-2 hover:border-[#00288e]/20 transition-all duration-300">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#00288e]/3 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-[#00288e]/8 transition-colors duration-400 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low border border-outline-variant/40 text-primary flex items-center justify-center mb-6 group-hover:bg-[#00288e] group-hover:text-white group-hover:border-[#00288e] transition-all duration-300 shadow-sm">
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0d1c2e] mb-3">{title}</h3>
                  <p className="text-[15px] text-[#444653] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>


      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-[#c4c5d5]/40">
        <div className="max-w-[1280px] mx-auto px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-5 group w-fit">
                <div className="w-9 h-9 rounded-xl bg-[#00288e] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Handshake size={18} className="text-white" />
                </div>
                <span className="text-[19px] font-bold text-[#00288e]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>SahakarGig</span>
              </Link>
              <p className="text-[14px] text-[#444653] leading-relaxed max-w-[260px]">
                A cooperative-owned marketplace connecting households with verified local service providers.
              </p>
              <p className="text-[12px] text-[#757684] mt-5 font-medium">SIH 2026 · Problem Statement 26089</p>
            </div>
            {[
              { title: 'Platform', links: ['Find Services', 'My Bookings', 'Become Provider', 'Emergency Booking'] },
              { title: 'Company',  links: ['About Us', 'Contact', 'Blog', 'Careers'] },
              { title: 'Legal',    links: ['Privacy Policy', 'Terms of Service', 'Help Center'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-[12px] font-bold text-[#0d1c2e] uppercase tracking-[0.1em] mb-5">{title}</h4>
                <ul className="space-y-3">
                  {links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-[14px] text-[#444653] hover:text-[#00288e] transition-colors duration-200">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[#c4c5d5]/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[13px] text-[#757684]">© 2026 SahakarGig. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {['Twitter', 'LinkedIn', 'Facebook'].map((s) => (
                <a key={s} href="#" className="text-[13px] text-[#757684] hover:text-[#00288e] transition-colors duration-200">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
