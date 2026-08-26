import Icon from "./Icon";

export default function AuthShell({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-surface-container-lowest font-body-md selection:bg-primary-container selection:text-on-primary-container antialiased">
      {/* Left Brand Hero Pane (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen relative bg-gradient-to-br from-[#00174e] via-[#00288e] to-[#00103a] p-12 xl:p-16 flex-col justify-between overflow-hidden text-white shrink-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-container/40 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-secondary-container/25 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <Icon name="handshake" className="text-[26px] text-white" />
            </div>
            <span className="font-heading text-2xl font-bold tracking-tight text-white">SahakarGig</span>
          </div>
          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-primary-fixed">
            SIH 2026 • PS 26089
          </span>
        </div>

        <div className="relative z-10 my-auto py-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-container/20 text-secondary-fixed text-xs font-semibold mb-5 border border-secondary-fixed/25 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></span>
            Cooperative Trust &amp; Governance Platform
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight text-white mb-5">
            {title}
          </h1>
          <p className="text-white/80 text-base xl:text-lg leading-relaxed mb-8 max-w-lg">{subtitle}</p>

          <div className="space-y-3.5 max-w-lg">
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
                <Icon name="verified" className=" text-secondary-fixed text-[20px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">100% KYC &amp; Police Verification</p>
                <p className="text-xs text-white/70">Cooperative vetted profiles with biometric identity</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-tertiary-container/40 flex items-center justify-center shrink-0">
                <Icon name="security" className=" text-tertiary-fixed text-[20px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Escrow Protection &amp; Welfare Fund</p>
                <p className="text-xs text-white/70">Guaranteed payouts and cooperative healthcare corpus</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-primary-container/50 flex items-center justify-center shrink-0">
                <Icon name="bolt" className=" text-primary-fixed text-[20px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Live GPS Tracking &amp; Instant Dispatch</p>
                <p className="text-xs text-white/70">Hyperlocal real-time booking updates via Socket.io</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/75">
          <span className="font-medium">© SahakarGig · SIH 2026 · PS 26089</span>
          <span className="text-[11px] font-semibold text-white/60">Cooperative-first platform</span>
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-16 xl:p-20 bg-surface-container-lowest overflow-y-auto">
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
              <Icon name="handshake" className="text-[20px]" />
            </div>
            <span className="font-heading text-xl font-bold text-primary">SahakarGig</span>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">SIH 2026</span>
        </div>

        <div className="w-full max-w-[440px] mx-auto my-auto py-4">{children}</div>

        <div className="pt-6 lg:hidden border-t border-outline-variant/30 text-center text-[11px] text-outline flex items-center justify-center gap-4">
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