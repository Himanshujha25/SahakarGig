import { useState, useEffect } from 'react';
import { Download, X, Handshake, Smartphone } from 'lucide-react';

// Detect iOS — Safari on iOS never fires beforeinstallprompt
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

// Detect if already running as installed PWA (standalone mode)
const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  !!window.navigator.standalone;

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isInStandaloneMode()) return;
    // Don't show if user previously dismissed
    if (localStorage.getItem('sg_pwa_dismissed')) return;

    const ios = isIos();
    setIsIosDevice(ios);

    // iOS: beforeinstallprompt never fires — show banner after short delay
    if (ios) {
      const t = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(t);
    }

    // Android / Desktop: listen for the native install prompt
    const handler = (e) => {
      e.preventDefault(); // suppress browser's own mini-infobar
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Fallback: show after 4 s if the event never fired (dev mode, already prompted, etc.)
    const fallback = setTimeout(() => {
      if (!localStorage.getItem('sg_pwa_dismissed')) setShowBanner(true);
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallback);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Native prompt available — trigger it
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      setDeferredPrompt(null);
    } else {
      // Fallback: guide user to browser / OS install method
      alert(
        isIosDevice
          ? 'Tap the Share button (⬆) in Safari, then "Add to Home Screen".'
          : 'Click the install icon in your browser\'s address bar, or open the browser menu → "Install app".'
      );
    }
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('sg_pwa_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 z-40 max-w-md bg-white border border-[#00288e]/20 rounded-2xl shadow-[0_8px_30px_rgba(0,40,142,0.18)] p-4 flex items-center gap-3 animate-slide-up">
      <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-md">
        <Handshake size={20} strokeWidth={2.5} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
          <Smartphone size={14} />
          {isIosDevice ? 'Add to Home Screen' : 'Install SahakarGig App'}
        </div>
        <p className="text-[12px] text-on-surface-variant leading-snug mt-0.5">
          {isIosDevice
            ? 'Tap Share ⬆ → "Add to Home Screen" for offline access.'
            : 'Add to home screen for 1-tap booking & offline access.'}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          id="pwa-install-btn"
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl border border-primary/25 bg-[#e8edff] text-[#00288e] text-[12px] font-bold hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_3px_10px_rgba(0,40,142,0.18)] flex items-center gap-1 active:scale-[0.98] transition-all duration-200"
        >
          <Download size={13} />
          {isIosDevice ? 'How?' : 'Install'}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-variant/50"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
