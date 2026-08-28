import { useState, useEffect } from 'react';
import { Download, X, Handshake, Smartphone } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent standard browser prompt banner
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user hasn't dismissed before in localStorage
      const dismissed = localStorage.getItem('sg_pwa_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('sg_pwa_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-20 left-4 right-4 sm:left-auto sm:right-6 z-40 max-w-md bg-white border border-[#00288e]/20 rounded-2xl shadow-[0_8px_30px_rgba(0,40,142,0.18)] p-4 flex items-center gap-3 animate-slide-up">
      <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-md">
        <Handshake size={20} strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
          <Smartphone size={14} /> Install SahakarGig App
        </div>
        <p className="text-[12px] text-on-surface-variant leading-snug mt-0.5 truncate">
          Add to your home screen for fast 1-tap booking & offline access.
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl border border-primary/25 bg-[#e8edff] text-[#00288e] text-[12px] font-bold hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_3px_10px_rgba(0,40,142,0.18)] flex items-center gap-1 active:scale-[0.98] transition-all duration-200"
        >
          <Download size={13} /> Install
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
