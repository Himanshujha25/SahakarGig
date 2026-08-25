export default function AuthShell({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary-container p-xl lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-on-primary/15 font-heading text-2xl font-bold text-on-primary">
            S
          </div>
          <span className="font-display-lg text-headline-md font-bold text-on-primary">SahakarGig</span>
        </div>

        <div>
          <h1 className="mb-md max-w-md font-headline-lg text-headline-lg text-on-primary">{title}</h1>
          <p className="mb-xl max-w-md font-body-lg text-body-lg text-primary-fixed">{subtitle}</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-2 font-label-sm text-label-sm text-on-primary">
              <span className="material-symbols-outlined text-secondary-container">verified</span>
              Verified by your community cooperative
            </li>
            <li className="flex items-center gap-2 font-label-sm text-label-sm text-on-primary">
              <span className="material-symbols-outlined text-secondary-container">gpp_good</span>
              Secure, escrow-backed payments
            </li>
            <li className="flex items-center gap-2 font-label-sm text-label-sm text-on-primary">
              <span className="material-symbols-outlined text-secondary-container">group</span>
              Community growth &amp; fair wages
            </li>
          </ul>
        </div>

        <p className="font-label-sm text-label-sm text-primary-fixed-dim">© SahakarGig · SIH PS 26089</p>
      </div>

      {/* Form side */}
      <div className="flex min-w-0 flex-1 items-center justify-center px-6 py-10">
        <div className="w-full" style={{ maxWidth: 448 }}>
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-heading text-xl font-bold text-on-primary">
              S
            </div>
            <span className="font-heading text-xl font-bold text-primary">SahakarGig</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
