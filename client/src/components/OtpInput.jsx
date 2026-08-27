import { useRef, useEffect } from "react";

/**
 * 6-digit OTP entry with auto-advance, backspace navigation and paste support.
 * Value is kept as a plain string of digits.
 */
export default function OtpInput({ value, onChange, length = 6, disabled = false }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    // focus first empty box on mount
    const firstEmpty = digits.findIndex((d) => !d);
    if (firstEmpty !== -1 && refs.current[firstEmpty]) refs.current[firstEmpty].focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(next) {
    onChange(next.slice(0, length).replace(/\D/g, ""));
  }

  function handle(i, e) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      // cleared
      const arr = [...digits]; arr[i] = ""; commit(arr.join("")); return;
    }
    if (raw.length > 1) {
      // paste (or fast typing) spread across boxes
      commit((value.slice(0, i) + raw));
      const nextIdx = Math.min(value.slice(0, i).length + raw.length, length - 1);
      refs.current[nextIdx]?.focus();
      return;
    }
    const arr = [...digits];
    arr[i] = raw;
    commit(arr.join(""));
    if (i < length - 1) refs.current[i + 1].focus();
  }

  function keydown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1].focus();
      const arr = [...digits]; arr[i - 1] = ""; commit(arr.join(""));
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1].focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1].focus();
  }

  function paste(e) {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (text) { commit(text); refs.current[Math.min(text.length, length - 1)].focus(); }
  }

  const boxCls =
    "w-11 h-13 sm:w-12 sm:h-14 text-center text-[20px] font-bold rounded-lg border outline-none transition-all " +
    "bg-white text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary focus:border-primary";

  return (
    <div className="flex gap-2 sm:gap-3 justify-center" onPaste={paste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          className={`${boxCls} ${d ? "border-primary/50" : "border-outline-variant"} ${
            disabled ? "opacity-60" : ""
          }`}
          value={d}
          onChange={(e) => handle(i, e)}
          onKeyDown={(e) => keydown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
