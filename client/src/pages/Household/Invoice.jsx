import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

export default function Invoice() {
  const { bookingId } = useParams();
  const { t } = useTranslation();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;
  if (!invoice) return <p className="font-body-md text-on-surface-variant">Invoice not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("invoices")}</h1>

      <div className="card-lg flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-headline-md text-headline-md text-on-surface">{invoice.invoiceNumber}</p>
            <p className="font-body-md text-sm text-on-surface-variant">
              {new Date(invoice.generatedAt).toLocaleString()}
            </p>
          </div>
          <span className="status-pill bg-secondary-container text-on-secondary-container">Paid</span>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="font-heading text-sm font-semibold text-on-surface-variant">
              <th className="py-2">Description</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, i) => (
              <tr key={i} className="border-t border-outline-variant font-body-md text-on-surface">
                <td className="py-2">{it.description}</td>
                <td className="py-2">{it.qty}</td>
                <td className="py-2">₹{it.rate}</td>
                <td className="py-2 text-right">₹{it.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-1 border-t border-outline-variant pt-3">
          <div className="flex justify-between font-body-md text-sm text-on-surface-variant">
            <span>Tax</span>
            <span>₹{invoice.tax}</span>
          </div>
          <div className="flex justify-between font-headline text-lg font-bold text-on-surface">
            <span>Total</span>
            <span>₹{invoice.total}</span>
          </div>
        </div>

        <button className="btn-secondary w-full" onClick={() => window.print()}>
          <span className="material-symbols-outlined mr-1 text-[18px]">download</span>
          Download
        </button>
      </div>
    </div>
  );
}
