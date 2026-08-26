import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LogOut, User, Mail, Shield } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "HH";

  return (
    <div className="w-full px-6 pt-8 pb-10 space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
          style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
          Profile
        </h1>
        <p className="text-[14px] text-on-surface-variant mt-0.5">Your household account details.</p>
      </div>

      {/* Avatar card */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-[22px] font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[18px] font-bold text-on-surface truncate">{user?.name || "Household"}</p>
          <p className="text-[13px] text-on-surface-variant truncate">{user?.email}</p>
          <span className="mt-1.5 inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e]">
            Household
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden">
        {[
          { Icon: User,   label: "Full Name",  value: user?.name  || "—" },
          { Icon: Mail,   label: "Email",      value: user?.email || "—" },
          { Icon: Shield, label: "Role",       value: "Household" },
        ].map(({ Icon, label, value }, i, arr) => (
          <div key={label}
            className={`flex items-center gap-4 px-6 py-4 ${i < arr.length - 1 ? "border-b border-outline-variant/40" : ""}`}>
            <div className="w-8 h-8 rounded-xl bg-[#e8edff] flex items-center justify-center shrink-0">
              <Icon size={15} className="text-[#00288e]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.06em]">{label}</p>
              <p className="text-[14px] font-semibold text-on-surface truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={() => { logout(); navigate("/login"); }}
        className="h-10 inline-flex items-center gap-2 px-5 rounded-xl border border-error/30 text-error text-[13px] font-semibold hover:bg-error hover:text-white transition-all duration-200">
        <LogOut size={15} strokeWidth={2} />
        Sign Out
      </button>
    </div>
  );
}
