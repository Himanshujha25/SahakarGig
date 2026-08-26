import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import Icon from "../../components/Icon";

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
        price: provider?.hourlyRate && provider.hourlyRate > 0 ? provider.hourlyRate : 200,
      });
      // Redirect to Razorpay Checkout for instant secure payment
      navigate(`/household/pay/${data._id}`);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl pt-lg">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary hover:text-primary-container"
      >
        <Icon name="arrow_back" className=" text-[18px]" />
        Back
      </button>

      <h1 className="mb-2 font-heading font-bold tracking-tight text-on-background text-2xl md:text-3xl">{t("book")} Service</h1>
      <p className="mb-6 font-body-md text-on-surface-variant">Send a booking request to a verified provider from your cooperative.</p>

      {provider && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-outline-variant bg-surface p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container font-heading text-lg font-bold text-on-primary-container">
            {(provider.userId?.name || "?").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading font-semibold text-on-surface">{provider.userId?.name}</p>
            <p className="truncate font-body-md text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1 text-secondary">
                <Icon name="verified_user" className=" text-[16px]" />
                Verified
              </span>
              {provider.cooperativeId?.name ? ` · ${provider.cooperativeId.name}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-heading text-lg font-bold text-primary">
              ₹{provider.hourlyRate && provider.hourlyRate > 0 ? provider.hourlyRate : 250}/hr
            </p>
            <p className="font-body-md text-xs text-on-surface-variant">hourly rate</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <label className="block">
          <span className="mb-1.5 block font-heading text-sm font-semibold text-on-surface-variant">Service description</span>
          <input
            className="h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="e.g. Plumbing repair"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-heading text-sm font-semibold text-on-surface-variant">Scheduled time</span>
          <input
            type="datetime-local"
            className="h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            required
          />
        </label>

        <label className="flex items-center gap-3 rounded-lg bg-error-container/40 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-error)]"
          />
          <Icon name="local_fire_department" className=" text-error" />
          <span className="font-heading text-sm font-semibold text-on-error-container">{t("emergency")}</span>
        </label>

        <button type="submit" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-heading font-semibold text-on-primary transition-all hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)] disabled:opacity-60" disabled={submitting}>
          <Icon name="event_available" className=" text-[20px]" />
          {submitting ? "Placing request…" : t("book")}
        </button>
      </form>
    </div>
  );
}