import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

export default function Payment() {
  const { bookingId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => {
        if (active) setBooking(res.data);
      })
      .catch(() => {
        if (active) setBooking(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  const pay = async () => {
    setPaying(true);
    try {
      await api.post("/payments/capture", { bookingId });
      navigate(`/household/invoice/${bookingId}`);
    } catch {
      setPaying(false);
    }
  };

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;
  if (!booking) return <p className="font-body-md text-on-surface-variant">Booking not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 font-heading text-sm font-semibold text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back
      </button>

      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("pay")}</h1>

      <div className="card-lg flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-tint text-on-primary">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div>
            <p className="font-headline font-semibold text-on-surface">Secure Payment</p>
            <p className="font-body-md text-sm text-on-surface-variant">Escrow-backed · released on completion</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-y border-outline-variant py-4">
          <div className="flex items-center justify-between">
            <span className="font-body-md text-on-surface-variant">{booking.service}</span>
            <span className="font-heading text-sm font-semibold text-on-surface">
              {booking.providerId?.userId?.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body-md text-on-surface-variant">Amount</span>
            <span className="font-headline text-xl font-bold text-primary">₹{booking.price}</span>
          </div>
        </div>

        <button onClick={pay} className="btn-primary w-full" disabled={paying}>
          {paying ? "Processing…" : `${t("pay")} ₹${booking.price}`}
        </button>
        <p className="text-center font-body-md text-xs text-on-surface-variant">
          Secure mock payment — no real charge.
        </p>
      </div>
    </div>
  );
}
