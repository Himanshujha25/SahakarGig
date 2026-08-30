import { useEffect, useRef } from "react";

export default function HeroVideoBackground() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.loop = true;

    const playVideo = () => {
      video.play().catch(() => {});
    };

    playVideo();

    // Unbreakable loop handlers
    const handleEnded = () => {
      video.currentTime = 0;
      playVideo();
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("pause", playVideo);

    // Watchdog timer: checks every 800ms and immediately resumes playback if paused/ended
    const loopCheck = setInterval(() => {
      if (video.paused || video.ended) {
        if (video.ended || (video.duration && video.currentTime >= video.duration - 0.2)) {
          video.currentTime = 0;
        }
        playVideo();
      }
    }, 800);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || 650);

    // Theme-aware accent color (reads the active primary token)
    const primary =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-primary")
        .trim() || "#1e6b65";
    const hexToRgba = (hex, a) => {
      const h = hex.replace("#", "");
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || 650;
    };
    window.addEventListener("resize", handleResize);

    // Particle nodes for interconnected cooperative gig network
    const particles = [];
    const particleCount = 35;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: hexToRgba(primary, i % 2 === 0 ? 0.9 : 0.45),
        alpha: Math.random() * 0.4 + 0.2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connecting network lines
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = hexToRgba(primary, (1 - dist / 120) * 0.22);
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = p1.alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("pause", playVideo);
      clearInterval(loopCheck);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* ── CONTINUOUS UNINTERRUPTED LOOPING HD MP4 VIDEO ── */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover opacity-50 dark:opacity-40 filter saturate-125 contrast-105 scale-105"
      >
        <source src="/12098511-hd_1920_1080_50fps.mp4" type="video/mp4" />
      </video>

      {/* ── BRAND GRADIENT MASKS (Theme-Synced Glassmorphism) ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/65 via-white/40 to-white/95 dark:from-[#131313]/75 dark:via-[#131313]/45 dark:to-[#131313]/95 backdrop-blur-[1px]" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-primary/20 via-primary/15 to-transparent rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[400px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />

      {/* ── 60FPS INTERACTIVE CANVAS NETWORK NODES ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-10" />
    </div>
  );
}
