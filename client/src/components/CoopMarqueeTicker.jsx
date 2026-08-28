import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

export default function CoopMarqueeTicker() {
  const [activeDurationMsg, setActiveDurationMsg] = useState(null);

  const defaultGovtItems = [
    "🏛️ MINISTRY OF COOPERATION: e-Shram ID IN-ES-0000000123 verified on Govt. Portal Records.",
    "🛡️ WELFARE PROTECTION: PMSBY Insurance Coverage active for all registered SahakarGig Cooperative Workers.",
    "⚡ DISPATCH INCENTIVE: Karol Bagh Zone emergency requests receiving +₹100 bonus payout today!"
  ];

  function checkMessages() {
    try {
      const stored = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
      const now = Date.now();

      // Find latest message sent by admin that hasn't expired yet
      const activeMsg = stored.find((m) => {
        if (!m.expiresAt) return true; // Permanent broadcast
        return m.expiresAt > now;      // Active timed broadcast
      });

      if (activeMsg) {
        let timeStr = null;
        if (activeMsg.expiresAt) {
          const remainingSecs = Math.max(0, Math.ceil((activeMsg.expiresAt - now) / 1000));
          const remMins = Math.floor(remainingSecs / 60);
          const remSecs = remainingSecs % 60;
          timeStr = remMins > 0 ? `${remMins}m ${remSecs}s` : `${remSecs}s`;
        }

        setActiveDurationMsg({
          title: activeMsg.title,
          body: activeMsg.body,
          sender: activeMsg.sender,
          timeStr: timeStr
        });
      } else {
        setActiveDurationMsg(null);
      }
    } catch {
      setActiveDurationMsg(null);
    }
  }

  useEffect(() => {
    checkMessages();
    const interval = setInterval(checkMessages, 1000);
    window.addEventListener("coop_message_updated", checkMessages);
    window.addEventListener("storage", checkMessages);
    return () => {
      clearInterval(interval);
      window.removeEventListener("coop_message_updated", checkMessages);
      window.removeEventListener("storage", checkMessages);
    };
  }, []);

  return (
    <div className="w-full bg-slate-900 text-white border-b border-slate-800 shadow-sm overflow-hidden text-xs py-2 px-3 flex items-center gap-3 shrink-0">

      {/* Govt & Coop Ticker Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#84cc16] text-slate-950 font-extrabold text-[10.5px] uppercase tracking-wider shrink-0 shadow-xs">
        <Megaphone size={12} className="animate-bounce" />
        <span>GOVT & COOP BULLETIN</span>
      </div>

      {/* Ticker Content */}
      <div className="flex-1 overflow-hidden relative flex items-center">
        {activeDurationMsg ? (
          /* Active Admin Broadcast Message (Continuous Marquee Ticker) */
          <marquee
            behavior="scroll"
            direction="left"
            scrollamount="6"
            className="font-bold text-white flex items-center gap-6 py-0.5 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 mr-10">
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase shrink-0">
                {activeDurationMsg.timeStr ? `TIMED BROADCAST (${activeDurationMsg.timeStr})` : "AGENCY BROADCAST"}
              </span>
              <span className="font-extrabold text-[#84cc16]">{activeDurationMsg.title}:</span>
              <span className="text-slate-100">{activeDurationMsg.body}</span>
            </span>
          </marquee>
        ) : (
          /* Standard Government 3-Item Marquee Ticker */
          <marquee
            behavior="scroll"
            direction="left"
            scrollamount="5"
            className="font-medium text-slate-200 flex items-center gap-8 py-0.5 cursor-pointer"
          >
            {defaultGovtItems.map((item, idx) => (
              <span key={idx} className="inline-block mr-12 text-[11.5px] font-semibold tracking-wide">
                {item}
              </span>
            ))}
          </marquee>
        )}
      </div>

      {/* Active Status Indicator */}
      <div className="hidden sm:flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400 shrink-0 border-l border-slate-800 pl-3">
        <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse" />
        <span>Live Feed</span>
      </div>
    </div>
  );
}
