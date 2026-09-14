import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import { toast } from "../../lib/toast";
import Icon from "../../components/Icon";
import { printOfficialInvoice, downloadPDFInvoice, resolveCoopDetails } from "../../lib/invoicePrinter";
import { useAuth } from "../../context/AuthContext";

export default function Invoice() {
  const { bookingId } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cooperative Admin Edit Modal state
  const [editModal, setEditModal] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [sacCode, setSacCode] = useState('998719');
  const [terms, setTerms] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get(`/payments/invoice/${bookingId}`)
      .then((res) => {
        if (active) {
          setInvoice(res.data);
          setCustomNotes(res.data?.customNotes || '');
          setSacCode(res.data?.sacCode || '998719');
          setTerms(res.data?.terms || 'Payment held in Sahakar Escrow. Released upon OTP verification.');
        }
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

  async function handleSaveCoopEdit(e) {
    e.preventDefault();
    if (!invoice?._id) return;
    setSavingEdit(true);
    setEditSuccess('');
    try {
      const { data } = await api.patch(`/payments/invoice/${invoice._id}`, {
        customNotes,
        sacCode,
        terms,
      });
      setInvoice(data.invoice);
      setEditSuccess("Invoice terms and custom notes updated successfully!");
      setTimeout(() => {
        setEditSuccess('');
        setEditModal(false);
      }, 1500);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update invoice. Only Cooperative Admins can edit member invoices.");
    } finally {
      setSavingEdit(false);
    }
  }

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
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="animate-pulse rounded-2xl border border-outline-variant bg-surface p-6">
          <div className="mb-4 h-5 w-1/3 rounded bg-surface-variant"></div>
          <div className="mb-3 h-4 w-2/3 rounded bg-surface-variant"></div>
          <div className="h-4 w-1/2 rounded bg-surface-variant"></div>
        </div>
      </div>
    );

  if (!invoice) return <p className="p-8 font-body-md text-on-surface-variant text-center">Official Tax Invoice not found for this booking.</p>;

  const coop = resolveCoopDetails(invoice);
  const coopName = coop.name;
  const coopReg = coop.regId;
  const workerName = invoice.providerId?.userId?.name || "Verified Cooperative Gig Worker";

  const total = Number(invoice.total || 0);
  const baseRate = Math.round(total * 0.94);
  const welfareCess = Math.max(2, Math.round(total * 0.01));
  const gstTax = Math.round(total * 0.05);

  const mockBookingObj = {
    _id: bookingId,
    createdAt: invoice.generatedAt,
    price: total,
    service: invoice.items?.[0]?.description || "Gig Labor Service",
    paymentStatus: "paid",
    cooperativeId: invoice.cooperativeId || invoice.providerId?.cooperativeId,
    providerId: invoice.providerId,
    householdId: invoice.householdId,
    sacCode: invoice.sacCode || '998719',
    customNotes: invoice.customNotes,
  };

  const isCoopAdmin = user?.role === 'Cooperative Admin';

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-on-surface text-2xl md:text-3xl" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Official Tax Invoice
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Issued by {coopName} (PACS Reg: {coopReg})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCoopAdmin && (
            <button
              onClick={() => setEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary/30 bg-primary-container/40 text-primary font-bold text-[12.5px] hover:bg-primary hover:text-on-primary transition cursor-pointer"
            >
              <Icon name="edit" className="text-[16px]" />
              Edit Invoice Notes
            </button>
          )}
          <button
            onClick={() => downloadPDFInvoice(mockBookingObj, invoice.householdId)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-[13px] shadow-xs hover:shadow-md transition cursor-pointer"
          >
            <Icon name="download" className="text-[18px]" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-xs">
        {/* Invoice Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary p-6 text-on-primary">
          <div className="flex items-center gap-3.5">
            <img
              src={coop.logoUrl || "/icon-512.png"}
              alt={coopName}
              className="w-12 h-12 rounded-xl bg-white p-1 object-contain"
            />
            <div>
              <p className="font-extrabold text-lg tracking-tight">{invoice.invoiceNumber || `INV-${bookingId.slice(-6).toUpperCase()}`}</p>
              <p className="text-sm opacity-90">{new Date(invoice.generatedAt).toLocaleString('en-IN')}</p>
              <p className="text-xs opacity-80 mt-0.5">Worker: {workerName} &middot; {coopName}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold border border-white/30">
            <Icon name="check_circle" className="text-[16px]" />
            Escrow Released ✓
          </span>
        </div>

        {/* Institutional & Worker Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-surface-container-lowest border-b border-outline-variant/60">
          <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface space-y-1 text-[12.5px]">
            <p className="text-[10px] font-extrabold uppercase text-primary tracking-wider">Issuer (Cooperative Society)</p>
            <p className="font-bold text-on-surface text-[13.5px]">{coopName}</p>
            <p className="text-on-surface-variant"><strong>PACS Reg:</strong> {coopReg}</p>
            <p className="text-on-surface-variant"><strong>District:</strong> {coop.district}</p>
            <p className="text-primary font-semibold text-[11px] pt-1">Affiliated with Ministry of Cooperation, Govt. of India</p>
          </div>
          <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface space-y-1 text-[12.5px]">
            <p className="text-[10px] font-extrabold uppercase text-primary tracking-wider">Service Professional</p>
            <p className="font-bold text-on-surface text-[13.5px]">{workerName}</p>
            <p className="text-on-surface-variant"><strong>e-Shram UAN:</strong> <span className="font-mono font-bold text-primary">E-SHRAM-UAN-{bookingId.slice(0, 10).toUpperCase()}</span></p>
            <p className="text-emerald-600 font-semibold text-[11px] pt-1">⭐ 4.9 Verified PACS Trust Rating</p>
          </div>
        </div>

        {/* Custom Cooperative Admin Notes if present */}
        {invoice.customNotes && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-[12.5px] font-medium">
            <p className="text-[10.5px] font-extrabold uppercase text-amber-700 tracking-wider">PACS Cooperative Custom Note</p>
            <p className="mt-0.5">{invoice.customNotes}</p>
          </div>
        )}

        {/* Items Table */}
        <div className="p-5 md:p-6">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant font-bold uppercase text-[11px] tracking-wider">
                <th className="py-2.5">Description</th>
                <th className="py-2.5 text-center">SAC Code</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-center">Rate</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {(invoice.items || []).map((it, i) => (
                <tr key={i} className="text-on-surface font-medium">
                  <td className="py-3 font-semibold">{it.description}</td>
                  <td className="py-3 text-center font-mono text-[12px]">{invoice.sacCode || '998719'}</td>
                  <td className="py-3 text-center">{it.qty}</td>
                  <td className="py-3 text-center">₹{it.rate}</td>
                  <td className="py-3 text-right font-bold">₹{it.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Breakdown */}
          <div className="mt-4 flex flex-col gap-2 border-t border-outline-variant pt-4 text-[13px] text-on-surface-variant">
            <div className="flex justify-between">
              <span>Base Service Fare</span>
              <span>₹{baseRate}</span>
            </div>
            <div className="flex justify-between">
              <span>PACS Worker Welfare Fund (1%)</span>
              <span>₹{welfareCess}</span>
            </div>
            <div className="flex justify-between">
              <span>GST & Statutory Taxes (5%)</span>
              <span>₹{gstTax}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold text-on-surface pt-2 border-t border-outline-variant/60">
              <span>Total Paid Amount</span>
              <span className="text-primary">₹{total}</span>
            </div>
          </div>

          {/* DYNAMIC STAMP & SIGNATURE PREVIEW */}
          <div className="mt-6 p-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest flex items-center justify-between gap-4 flex-wrap">
            <div className="text-[11px] text-on-surface-variant">
              <p className="font-bold text-on-surface">Authenticated by {coopName}</p>
              <p className="text-[10px]">Secretary: {coop.secretaryName || "R. K. Sharma"}</p>
            </div>
            <div className="flex items-center gap-4">
              {coop.stampUrl ? (
                <img src={coop.stampUrl} alt="PACS Stamp" className="h-14 max-w-[100px] object-contain rotate-[-4deg]" />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary text-primary flex flex-col items-center justify-center text-[7.5px] font-black rotate-[-6deg] text-center">
                  SAHAKAR<br/>VERIFIED<br/>PACS
                </div>
              )}
              <div className="text-center border-t border-primary pt-1 w-28">
                {coop.signatureUrl ? (
                  <img src={coop.signatureUrl} alt="Signature" className="h-9 max-w-[100px] object-contain mx-auto" />
                ) : (
                  <p className="font-serif italic text-primary font-bold text-[13px]">{coop.secretaryName || "R. K. Sharma"}</p>
                )}
                <p className="text-[9px] font-bold text-on-surface">Authorized Signatory</p>
              </div>
            </div>
          </div>

          <button
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-on-primary font-bold text-[14px] hover:shadow-lg transition cursor-pointer"
            onClick={() => downloadPDFInvoice(mockBookingObj, invoice.householdId)}
          >
            <Icon name="download" className="text-[20px]" />
            Download PDF Official Invoice
          </button>
        </div>
      </div>

      {/* Cooperative Admin Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-surface border border-outline-variant rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h3 className="font-extrabold text-[16px] text-on-surface">Edit Invoice Notes & Terms (Cooperative Admin)</h3>
              <button onClick={() => setEditModal(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer font-bold">✕</button>
            </div>

            {editSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
                {editSuccess}
              </div>
            )}

            <form onSubmit={handleSaveCoopEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">SAC / HSN Code</label>
                <input
                  type="text"
                  value={sacCode}
                  onChange={(e) => setSacCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs font-mono font-bold text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">Cooperative Custom Note / Tax Exemption Notice</label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Approved by PACS Managing Committee. Section 80P Tax Exempted."
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">Invoice Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container-low transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? "Saving Changes..." : "Save Invoice Terms"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Section */}
      <div className="mt-4 rounded-2xl border border-outline-variant bg-surface p-5 md:p-6 shadow-xs">
        <h2 className="mb-3 font-bold text-base text-on-surface">Rate your service experience</h2>
        {reviewed ? (
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <Icon name="check_circle" className="text-[20px]" />
            <span>Review submitted. Thank you for supporting your local cooperative!</span>
          </div>
        ) : (
          <form onSubmit={submitReview} className="flex flex-col gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)}
                  className={`text-2xl transition-colors cursor-pointer ${s <= rating ? 'text-amber-400' : 'text-on-surface-variant/30'}`}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="h-20 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your feedback for the provider and cooperative society..."
            />
            <button type="submit" disabled={!rating || submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-on-primary disabled:opacity-50 hover:shadow-md transition cursor-pointer">
              <Icon name="star" className="text-[18px]" />
              Submit Review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}