import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import AuthShell from "../../components/AuthShell";
import Field from "../../components/Field";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const u = await login(email, password);
      if (u.role === "Household") navigate("/household");
      else if (u.role === "Provider") navigate("/provider");
      else navigate("/admin");
    } catch (e) {
      setErr(e.response?.data?.message || "Login failed");
    }
  }

  return (
    <AuthShell
      title="Trusted Cooperative Services"
      subtitle="Connect with verified local professionals backed by your community."
    >
      <div className="mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">{t("login")}</h2>
        <p className="font-body-md text-on-surface-variant">Welcome back. Please sign in to continue.</p>
      </div>

      <form onSubmit={submit} className="flex w-full flex-col gap-4">
        {err && (
          <p className="rounded-lg bg-error-container px-3 py-2 font-body-md text-sm text-on-error-container">
            {err}
          </p>
        )}
        <Field
          label={t("email")}
          icon="mail"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={t("password")}
          icon="lock"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 font-heading text-base font-semibold text-on-primary transition-shadow hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)]"
        >
          {t("login")}
        </button>
      </form>

      <p className="mt-6 text-center font-body-md text-on-surface-variant">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-primary">
          {t("signup")}
        </Link>{" "}
        ·{" "}
        <Link to="/coop-signup" className="font-semibold text-primary">
          Register a Cooperative
        </Link>
      </p>
    </AuthShell>
  );
}
