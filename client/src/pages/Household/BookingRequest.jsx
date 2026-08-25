import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

export default function BookingRequest() {
  const { providerId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [service, setService] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(`/providers/${providerId}`)
      .then((res) => {
        if (active) setProvider(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [providerId]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        providerId,
        service,
        scheduledTime,
        isEmergency,
        price: provider?.hourlyRate || 0,
      });
      navigate(`/household/booking/${data._id}`);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 font-heading text-sm font-semibold text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back
      </button>

      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("book")}</h1>

      {provider && (
        <div className="card flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container font-heading font-bold text-on-primary-container">
            {(provider.userId?.name || "?").charAt(0)}
          </div>
          <div>
            <p className="font-heading font-semibold text-on-surface">{provider.userId?.name}</p>
            <p className="font-body-md text-sm text-on-surface-variant">₹{provider.hourlyRate}/hr</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="card-lg flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block font-heading text-sm font-semibold text-on-surface-variant">Service</span>
          <input
            className="input"
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="e.g. Plumbing repair"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-heading text-sm font-semibold text-on-surface-variant">Scheduled time</span>
          <input
            type="datetime-local"
            className="input"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            required
          />
        </label>

        <label className="flex items-center gap-2 font-heading text-sm font-semibold text-on-surface">
          <input
            type="checkbox"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-error)]"
          />
          <span className="material-symbols-outlined text-error">local_fire_department</span>
          {t("emergency")}
        </label>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Loading…" : t("book")}
        </button>
      </form>
    </div>
  );
}
