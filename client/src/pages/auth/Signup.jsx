import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import AuthShell from "../../components/AuthShell";
import Field from "../../components/Field";

const ROLES = ["Household", "Provider", "Cooperative Admin"];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", role: "Household",
    cooperativeId: "",
  });
  const [coops, setCoops] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (form.role === "Provider") {
      api.get("/providers/cooperatives").then((r) => setCoops(r.data)).catch(() => setCoops([]));
    }
  }, [form.role]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const payload = {
      name: form.name, email: form.email, phone: form.phone,
      password: form.password, role: form.role,
    };
    if (form.role === "Provider") payload.cooperativeId = form.cooperativeId;
    try {
      const u = await signup(payload);
      if (u.role === "Household") navigate("/household");
      else if (u.role === "Provider") navigate("/provider");
      else navigate("/admin");
    } catch (e) {
      setErr(e.response?.data?.message || "Signup failed");
    }
  }

  return (
    <AuthShell
      title="Join the Cooperative Network"
      subtitle="Households find trusted help; providers earn fair, verified wages."
    >
      <div className="mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">{t("signup")}</h2>
        <p className="font-body-md text-on-surface-variant">Create your account in a few steps.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {err && (
          <p className="rounded-lg bg-error-container px-3 py-2 font-body-md text-sm text-on-error-container">
            {err}
          </p>
        )}

        <Field label={t("name")} icon="person" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
        <Field label={t("email")} icon="mail" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@mail.com" />
        <Field label={t("phone")} icon="call" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 9XXXXXXXXX" />
        <Field label={t("password")} icon="lock" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />

        <div>
          <span className="mb-1 block font-heading text-sm font-semibold text-on-surface-variant">{t("role")}</span>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => set("role", r)}
                className={`rounded-lg border px-2 py-2 font-heading text-xs font-semibold transition-colors ${
                  form.role === r
                    ? "border-primary bg-primary-fixed-dim text-primary"
                    : "border-outline-variant text-on-surface-variant hover:border-primary"
                }`}
              >
                {t(r === "Household" ? "household" : r === "Provider" ? "provider" : "coopAdmin")}
              </button>
            ))}
          </div>
        </div>

        {form.role === "Provider" && (
          <label className="block">
            <span className="mb-1 block font-heading text-sm font-semibold text-on-surface-variant">{t("selectCoop")}</span>
            <select className="input" value={form.cooperativeId} onChange={(e) => set("cooperativeId", e.target.value)}>
              <option value="">-- {t("selectCoop")} --</option>
              {coops.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}

        {form.role === "Cooperative Admin" && (
          <p className="rounded-lg border border-outline-variant bg-surface-container-low p-3 font-body-md text-sm text-on-surface-variant">
            Registering a cooperative? Use the{" "}
            <Link to="/coop-signup" className="font-semibold text-primary">dedicated form</Link> for a smoother setup.
          </p>
        )}

        <button type="submit" className="btn-primary w-full">{t("signup")}</button>
      </form>

      <p className="mt-6 text-center font-body-md text-on-surface-variant">
        {t("login")}?{" "}
        <Link to="/login" className="font-semibold text-primary">{t("login")}</Link>
      </p>
    </AuthShell>
  );
}
