import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import LangToggle from "./LangToggle";

// Default high-resolution cooperative imagery
const DEFAULT_HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBqd8zsjxsBCPLstNY3rkhVc0f0-xjt0cXpHTsYV3jdaOlLQMvM2o-eaojR97WW3B3yXkJjNM6lXaTVCKOmu5ZOEoQ-zdNyfpOaesnbzqw95q_el-1LbiU7Pow12erD6-NNlOWM89u0WfWjAVlR8AwZCxhT4yCsY5zFk2If2sscr4CQRLQWFQ4ZkIPn7EEXn94mfnJ32Fu3RuNCdpIZqT_f5jeuG-6VPImhDey89SdyWQ5iHh6Iyw";

export default function AuthShell({
  children,
  title,
  subtitle,
  back,
  backLabel,
  heroImage = DEFAULT_HERO_IMAGE,
  badgeText = "Verified Platform",
}) {
  const { t } = useTranslation();

  const paneFeatures = [
    {
      icon: "verified",
      title: t('kycVerifyTitle', "100% KYC & Police Verification"),
      desc: t('kycVerifyDesc', "Identity-verified cooperative workforce"),
    },
    {
      icon: "security",
      title: t('escrowWelfareTitle', "Escrow Protection & Welfare Fund"),
      desc: t('escrowWelfareDesc', "Automated social security on every booking"),
    },
    {
      icon: "bolt",
      title: t('gpsDispatchTitle', "Live GPS Tracking & Instant Dispatch"),
      desc: t('gpsDispatchDesc', "Real-time dispatch with transparent pricing"),
    },
  ];

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
        </div>

        {/* Middle Hero Content & Features */}
        <div className="relative z-10 my-auto py-4 xl:py-6 max-w-lg">
          <h1 className="font-heading text-2xl sm:text-3xl xl:text-[38px] font-extrabold tracking-tight leading-[1.15] text-white mb-3 drop-shadow-sm">
            {title || t('empoweringCommunities', "Empowering Communities, Elevating Work.")}
          </h1>

          <p className="text-white/85 text-xs sm:text-sm xl:text-[15px] leading-relaxed mb-5 max-w-md font-normal">
            {subtitle || t('joinCoopSubtitle', "Connect, work, and build wealth in a verified, community-governed ecosystem.")}
          </p>

          {/* Feature Benefit Cards */}
          <div className="space-y-2.5 max-w-md">
            {paneFeatures.map((item) => (
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
          <span className="font-medium">© {new Date().getFullYear()} SahakarGig</span>
          <span className="text-[11px] font-medium text-white/60">
            {t('coopFirstPlatform', "Cooperative-first platform")}
          </span>
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="w-full lg:w-1/2 min-h-screen lg:h-full flex flex-col p-4 sm:p-6 lg:px-8 lg:py-4 xl:px-10 xl:py-6 bg-surface-container-lowest overflow-y-auto lg:overflow-y-auto">
        {/* Top Navigation Bar */}
        <div className="w-full max-w-[480px] mx-auto flex items-center justify-between min-h-[36px] mb-2 pb-1.5 border-b border-outline-variant/40 shrink-0">
          {back ? (
            <Link
              to={back}
              className="group inline-flex items-center gap-2 w-fit cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary group-hover:shadow-[0_2px_8px_rgba(30,107,101,0.35)] transition-all duration-200 shrink-0">
                <Icon
                  name="arrow_back"
                  className="text-[14px]"
                />
              </span>
              <span className="text-[12px] font-semibold text-on-surface-variant group-hover:text-primary transition-colors inline sm:inline">
                {backLabel || t('backToHome', "Back to Home")}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {/* Right side Language Toggle inside Auth Shell */}
          <div className="flex items-center gap-2">
            <div className="lg:hidden flex items-center gap-1.5 mr-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shadow-xs shrink-0">
                <Icon name="handshake" className="text-[12px] text-on-primary-fixed" />
              </div>
              <span className="font-heading font-bold text-on-surface text-xs">SahakarGig</span>
            </div>
            <LangToggle />
          </div>
        </div>

        {/* Central Form Container */}
        <div className="w-full max-w-[480px] mx-auto my-auto py-1">
          {children}
        </div>

        {/* Footer on Mobile */}
        <div className="pt-5 lg:hidden mt-auto shrink-0">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-outline-variant to-transparent mb-4" />
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <a href="#" className="text-[11.5px] font-medium text-on-surface-variant hover:text-primary transition-colors duration-200">
                {t('privacyPolicyLink', 'Privacy Policy')}
              </a>
              <span className="w-1 h-1 rounded-full bg-outline" />
              <a href="#" className="text-[11.5px] font-medium text-on-surface-variant hover:text-primary transition-colors duration-200">
                {t('termsOfServiceLink', 'Terms of Service')}
              </a>
              <span className="w-1 h-1 rounded-full bg-outline" />
              <a href="#" className="text-[11.5px] font-medium text-on-surface-variant hover:text-primary transition-colors duration-200">
                {t('supportCenterLink', 'Support Center')}
              </a>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/70">
              <span className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shadow-[0_2px_8px_rgba(30,107,101,0.3)]">
                <Icon name="handshake" className="text-[11px] text-on-primary-fixed" />
              </span>
              <span>© {new Date().getFullYear()} SahakarGig · {t('coopFirstPlatform', "Cooperative-first platform")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
