import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

function statusClass(status) {
  switch (status) {
    case "accepted":
      return "bg-primary-fixed-dim text-primary";
    case "disputed":
    case "cancelled":
      return "bg-error-container text-on-error-container";
    case "completed":
      return "bg-secondary-container text-on-secondary-container";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
}

export default function Bookings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get("/bookings/household/mine")
      .then((res) => {
        if (active) setBookings(res.data || []);
      })
      .catch(() => {
        if (active) setBookings([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("bookings")}</h1>
        <button
          onClick={() => navigate("/household")}
          className="flex items-center gap-1 font-heading text-sm font-semibold text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New
        </button>
      </div>

      {loading ? (
        <p className="font-body-md text-on-surface-variant">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="card flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-outline">event_available</span>
          <span className="font-body-md">No bookings yet.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <button
              key={b._id}
              onClick={() => navigate(`/household/booking/${b._id}`)}
              className="card flex items-center justify-between text-left transition-shadow hover:shadow-[0_4px_12px_rgba(0,40,142,0.10)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm font-bold text-on-surface">{b.service}</p>
                  {b.isEmergency && (
                    <span className="status-pill bg-error-container text-on-error-container">
                      {t("emergency")}
                    </span>
                  )}
                </div>
                <p className="font-body-md text-sm text-on-surface-variant">
                  {b.providerId?.userId?.name || "Provider"} · ₹{b.price}
                </p>
              </div>
              <span className={`status-pill ${statusClass(b.status)}`}>{b.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
