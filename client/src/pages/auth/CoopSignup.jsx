import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import AuthShell from "../../components/AuthShell";
import Field from "../../components/Field";

export default function CoopSignup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    coopName: "", coopReg: "", coopRegion: "",
    name: "", email: "", phone: "", password: "",
  });
  const [err, setErr] = useState("");

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const u = await signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: "Cooperative Admin",
        cooperative: {
          name: form.coopName,
          registrationId: form.coopReg,
          region: form.coopRegion,
        },
      });
      if (u.role === "Cooperative Admin") navigate("/admin");
    } catch (e) {
      setErr(e.response?.data?.message || "Cooperative registration failed");
    }
  }

  return (
    <AuthShell
      title="Register Your Cooperative"
      subtitle="Bring your society online and start verifying local service providers."
    >
      <div className="mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">Cooperative Signup</h2>
        <p className="font-body-md text-on-surface-variant">Set up the society and your admin account.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {err && (
          <p className="rounded-lg bg-error-container px-3 py-2 font-body-md text-sm text-on-error-container">{err}</p>
        )}

        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
          <p className="mb-3 font-heading text-sm font-bold text-on-surface">Cooperative details</p>
          <div className="space-y-4">
            <Field label="Cooperative name" icon="apartment" value={form.coopName} onChange={(e) => set("coopName", e.target.value)} placeholder="e.g. Sai Cooperative Society" />
            <Field label="Registration ID" icon="badge" value={form.coopReg} onChange={(e) => set("coopReg", e.target.value)} placeholder="e.g. MSCS/2024/12345" />
            <Field label="Region" icon="location_on" value={form.coopRegion} onChange={(e) => set("coopRegion", e.target.value)} placeholder="e.g. Pune, Maharashtra" />
          </div>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
          <p className="mb-3 font-heading text-sm font-bold text-on-surface">Admin account</p>
          <div className="space-y-4">
            <Field label={t("name")} icon="person" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Admin full name" />
            <Field label={t("email")} icon="mail" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="admin@coop.com" />
            <Field label={t("phone")} icon="call" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 9XXXXXXXXX" />
            <Field label={t("password")} icon="lock" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">{t("signup")}</button>
      </form>

      <p className="mt-6 text-center font-body-md text-on-surface-variant">
        {t("login")}?{" "}
        <Link to="/login" className="font-semibold text-primary">{t("login")}</Link>
      </p>
    </AuthShell>
  );
}
