import { Link } from "react-router-dom";
import Icon from "./Icon";

// Default high-resolution cooperative imagery
const DEFAULT_HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBqd8zsjxsBCPLstNY3rkhVc0f0-xjt0cXpHTsYV3jdaOlLQMvM2o-eaojR97WW3B3yXkJjNM6lXaTVCKOmu5ZOEoQ-zdNyfpOaesnbzqw95q_el-1LbiU7Pow12erD6-NNlOWM89u0WfWjAVlR8AwZCxhT4yCsY5zFk2If2sscr4CQRLQWFQ4ZkIPn7EEXn94mfnJ32Fu3RuNCdpIZqT_f5jeuG-6VPImhDey89SdyWQ5iHh6Iyw";

const PANE_FEATURES = [
  {
    icon: "verified",
    title: "100% KYC & Police Verification",
    desc: "Identity-verified cooperative workforce",
  },
  {
    icon: "security",
    title: "Escrow Protection & Welfare Fund",
    desc: "Automated social security on every booking",
  },
  {
    icon: "bolt",
    title: "Live GPS Tracking & Instant Dispatch",
    desc: "Real-time dispatch with transparent pricing",
  },
];

export default function AuthShell({
  children,
  title,
  subtitle,
  back,
  backLabel = "Back to Home",
  heroImage = DEFAULT_HERO_IMAGE,
  badgeText = "Verified Platform",
}) {
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-surface-container-lowest font-body-md selection:bg-primary-container selection:text-on-primary-container antialiased">
      {/* Left Hero Image Pane with SaaS blur effect */}
      <div className="hidden lg:flex lg:w-1/2 h-full relative flex-col justify-between p-8 xl:p-11 2xl:p-14 overflow-hidden shrink-0 select-none">
        {/* Background Image with modern subtle blur & slight zoom */}
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-105 filter blur-[1.5px] brightness-[0.72] transition-transform duration-[20s] ease-linear hover:scale-110"
          style={{ backgroundImage: `url('${heroImage}')` }}
        />
        
        {/* Modern SaaS Gradient Overlays */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#00174e]/95 via-[#00288e]/80 to-[#00103a]/90 backdrop-blur-[1px]" />
        <div className="absolute -top-32 -right-32 z-[2] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 z-[2] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 z-[2] opacity-[0.07] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Icon name="handshake" className="text-[22px] text-white" />
            </div>
            <span className="font-heading text-xl xl:text-2xl font-bold tracking-tight text-white">
              SahakarGig
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {badgeText}
          </span>
        </div>

        {/* Middle Hero Content & Features */}
        <div className="relative z-10 my-auto py-4 xl:py-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-[11.5px] font-semibold mb-3.5 border border-white/15 shadow-xs">
            <Icon name="verified_user" className="text-[15px] text-emerald-400" />
            <span>Cooperative Trust &amp; Governance Platform</span>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl xl:text-[38px] font-extrabold tracking-tight leading-[1.15] text-white mb-3 drop-shadow-sm">
            {title}
          </h1>

          <p className="text-white/85 text-xs sm:text-sm xl:text-[15px] leading-relaxed mb-5 max-w-md font-normal">
            {subtitle}
          </p>

          {/* Feature Benefit Cards */}
          <div className="space-y-2.5 max-w-md">
            {PANE_FEATURES.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/15 hover:bg-white/[0.12] hover:border-white/25 transition-all duration-200 shadow-xs cursor-default group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon name={item.icon} className="text-emerald-300 text-[16px]" />
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
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-white/75">
          <span className="font-medium">© SahakarGig · All rights reserved</span>
          <span className="text-[11px] font-medium text-white/60">
            Cooperative-first platform
          </span>
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="w-full lg:w-1/2 min-h-screen lg:h-full flex flex-col p-5 sm:p-8 lg:p-8 xl:p-10 2xl:p-12 bg-surface-container-lowest overflow-y-auto">
        {/* Top Navigation Bar - Synchronized exact same position across all pages */}
        <div className="w-full max-w-[430px] mx-auto flex items-center justify-between min-h-[36px] mb-2 shrink-0">
          {back ? (
            <Link
              to={back}
              className="inline-flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg text-[13px] font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all duration-200 group w-fit cursor-pointer"
            >
              <Icon
                name="arrow_back"
                className="text-[18px] group-hover:-translate-x-1 transition-transform duration-200 text-outline group-hover:text-primary"
              />
              <span>{backLabel}</span>
            </Link>
          ) : (
            <div />
          )}

          {/* Mobile Header Brand & Status */}
          <div className="lg:hidden flex items-center gap-2">
            <span className="font-heading font-bold text-primary text-sm">SahakarGig</span>
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified
            </span>
          </div>
        </div>

        {/* Central Form Container */}
        <div className="w-full max-w-[430px] mx-auto my-auto py-2">
          {children}
        </div>

        {/* Footer Links on Mobile */}
        <div className="pt-4 lg:hidden border-t border-outline-variant/30 text-center text-[11px] text-outline flex items-center justify-center gap-4 shrink-0">
          <a href="#" className="hover:text-on-surface-variant transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-on-surface-variant transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-on-surface-variant transition-colors">Support Center</a>
        </div>
      </div>
    </div>
  );
}

