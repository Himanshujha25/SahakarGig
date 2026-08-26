import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import Icon from "../../components/Icon";

export default function Invoice() {
  const { bookingId } = useParams();
  const { t } = useTranslation();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(`/payments/invoice/${bookingId}`)
      .then((res) => {
        if (active) setInvoice(res.data);
      })
      .catch(() => {
        if (active) setInvoice(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  async function submitReview(e) {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    try {
      await api.post('/reviews', { bookingId, rating, comment });
      setReviewed(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="mx-auto w-full max-w-3xl pt-lg">
        <div className="animate-pulse rounded-xl border border-outline-variant bg-surface p-6">
          <div className="mb-4 h-5 w-1/3 rounded bg-surface-variant"></div>
          <div className="mb-3 h-4 w-2/3 rounded bg-surface-variant"></div>
          <div className="h-4 w-1/2 rounded bg-surface-variant"></div>
        </div>
      </div>
    );
  if (!invoice) return <p className="pt-lg font-body-md text-on-surface-variant">Invoice not found.</p>;

  return (
    <div className="mx-auto w-full max-w-2xl pt-lg">
      <h1 className="mb-2 font-heading font-bold tracking-tight text-on-background text-2xl md:text-3xl">{t("invoices")}</h1>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
        {/* Invoice header */}
        <div className="flex items-center justify-between gap-4 bg-primary p-6 text-on-primary">
          <div>
            <p className="font-heading text-lg font-bold">{invoice.invoiceNumber}</p>
            <p className="font-body-md text-sm opacity-90">{new Date(invoice.generatedAt).toLocaleString()}</p>
            {invoice.providerId?.userId?.name && (
              <p className="font-body-md text-sm opacity-80 mt-0.5">Provider: {invoice.providerId.userId.name}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 font-label-sm text-label-sm font-semibold">
            <Icon name="check_circle" className=" text-[16px]" />
            Paid
          </span>
        </div>

        {/* Items */}
        <div className="overflow-x-auto p-5 md:p-6">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="font-heading text-sm font-semibold text-on-surface-variant">
                <th className="py-2.5 uppercase tracking-wider">Description</th>
                <th className="py-2.5 text-center uppercase tracking-wider">Qty</th>
                <th className="py-2.5 text-center uppercase tracking-wider">Rate</th>
                <th className="py-2.5 text-right uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((it, i) => (
                <tr key={i} className="border-t border-outline-variant font-body-md text-on-surface">
                  <td className="py-3">{it.description}</td>
                  <td className="py-3 text-center">{it.qty}</td>
                  <td className="py-3 text-center">₹{it.rate}</td>
                  <td className="py-3 text-right font-medium">₹{it.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex flex-col gap-2 border-t border-outline-variant pt-4">
            <div className="flex justify-between font-body-md text-on-surface-variant">
              <span>Tax</span>
              <span>₹{invoice.tax}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-on-surface">
              <span>Total</span>
              <span className="text-primary">₹{invoice.total}</span>
            </div>
          </div>

          <button className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary font-heading font-semibold text-primary transition-colors hover:bg-primary-fixed-dim/40" onClick={() => window.print()}>
            <Icon name="download" className=" text-[20px]" />
            Download Invoice
          </button>
        </div>
      </div>

      {/* Review section */}
      <div className="mt-4 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <h2 className="mb-3 font-heading text-base font-semibold text-on-surface">Rate your experience</h2>
        {reviewed ? (
          <div className="flex items-center gap-2 text-secondary">
            <Icon name="check_circle" className="text-[20px]" />
            <span className="font-heading text-sm font-semibold">Review submitted. Thank you!</span>
          </div>
        ) : (
          <form onSubmit={submitReview} className="flex flex-col gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)}
                  className={`text-2xl transition-colors ${s <= rating ? 'text-amber-400' : 'text-on-surface-variant/30'}`}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="h-20 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your feedback (optional)…"
            />
            <button type="submit" disabled={!rating || submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-heading font-semibold text-on-primary disabled:opacity-50 hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)]">
              <Icon name="star" className="text-[18px]" />
              Submit Review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}