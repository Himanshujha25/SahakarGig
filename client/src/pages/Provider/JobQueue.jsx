import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useTranslation } from "react-i18next";

const statusPillClass = {
  requested: "bg-surface-container-high text-on-surface-variant",
  accepted: "bg-primary-fixed-dim text-primary",
  completed: "bg-secondary-container text-on-secondary-container",
  cancelled: "bg-error-container text-on-error-container",
  disputed: "bg-tertiary-container text-on-tertiary-container",
};

export default function JobQueue() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/bookings/provider/mine");
      setBookings(r.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function accept(id) {
    await api.patch(`/bookings/${id}/accept`);
    load();
  }
  async function reject(id) {
    await api.patch(`/bookings/${id}/cancel`);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("bookings")}</h1>

      {loading && <p className="font-body-md text-on-surface-variant">Loading…</p>}
      {!loading && bookings.length === 0 && (
        <div className="card flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-outline">inbox</span>
          <span className="font-body-md">No jobs yet.</span>
        </div>
      )}

      {bookings.map((b) => {
        const emergency = b.isEmergency;
        return (
          <div
            key={b._id}
            onClick={() => navigate(`/provider/job/${b._id}`)}
            className={`card cursor-pointer transition-shadow hover:shadow-[0_4px_12px_rgba(0,40,142,0.10)] ${
              emergency ? "border-l-4 border-l-error" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-heading text-base font-bold text-on-surface">
                    {b.householdId?.name || "Household"}
                  </p>
                  {emergency && (
                    <span className="status-pill bg-error-container text-on-error-container">
                      {t("emergency")}
                    </span>
                  )}
                </div>
                <p className="font-body-md text-sm text-on-surface-variant">{b.service}</p>
                {b.scheduledTime && (
                  <p className="font-body-md text-xs text-on-surface-variant">
                    {new Date(b.scheduledTime).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`status-pill ${
                    statusPillClass[b.status] || "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {b.status}
                </span>
                {typeof b.price === "number" && (
                  <span className="font-heading text-sm font-bold text-primary">₹{b.price}</span>
                )}
              </div>
            </div>

            {b.status === "requested" && (
              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn-primary flex-1"
                  onClick={() => accept(b._id)}
                >
                  {t("accept")}
                </button>
                <button
                  className="btn-danger flex-1"
                  onClick={() => reject(b._id)}
                >
                  {t("reject")}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
