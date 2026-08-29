import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import {
  ArrowLeft, ShieldCheck, Lock, Ticket, CheckCircle2, AlertCircle,
  CreditCard, Sparkles, MapPin, Calendar, Clock, User, Tag, Zap, ChevronRight
} from "lucide-react";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById("rzp-script")) return resolve(true);
    const s = document.createElement("script");
    s.id = "rzp-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const AVAILABLE_COUPONS = [
  { code: "SAHAKAR20", discount: 0.20, type: "percent", label: "20% OFF — Cooperative Special" },
  { code: "FIRSTGIG", discount: 50, type: "fixed", label: "₹50 OFF — First Service Offer" },
  { code: "COOP50", discount: 50, type: "fixed", label: "₹50 OFF — Community Pass" },
];

export default function Payment() {
  const { bookingId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // Payment method selection
  const [payMethod, setPayMethod] = useState("razorpay");
  const [walletBalance, setWalletBalance] = useState(null);
  const [homeAddress, setHomeAddress] = useState("");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/bookings/${bookingId}`)
      .then((r) => { if (active) setBooking(r.data); })
      .catch(() => { if (active) setBooking(null); })
      .finally(() => { if (active) setLoading(false); });
    api.get("/wallet")
      .then((r) => { if (active) setWalletBalance(Number(r.data.balance) || 0); })
      .catch(() => { if (active) setWalletBalance(0); });
    api.get("/auth/me")
      .then((r) => {
        if (active) {
          const d = r.data || {};
          setHomeAddress(d.address || d.addresses?.find((a) => a.isPrimary)?.address || "");
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [bookingId]);

  function handleApplyCoupon(codeToApply) {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    setCouponError("");
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }
    const match = AVAILABLE_COUPONS.find(c => c.code === code);
    if (match) {
      setAppliedCoupon(match);
      setCouponCode(match.code);
    } else {
      setCouponError("Invalid coupon code. Try SAHAKAR20 or FIRSTGIG");
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  }

  // Price calculations — server is the source of truth; this mirrors it for display.
  const basePrice = (booking?.price && booking.price > 0) ? booking.price : 0;

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      discountAmount = Math.round(basePrice * appliedCoupon.discount);
    } else {
      discountAmount = Math.min(appliedCoupon.discount, basePrice);
    }
  }
  const finalAmount = Math.max(1, basePrice - discountAmount);

  const pay = useCallback(async () => {
    setError("");
    setPaying(true);

    // Post-Service Pay (COD): no upfront gateway — keep payment pending until
    // the household settles after the job is completed (Tracking prompts then).
    if (payMethod === "cod") {
      setPaying(false);
      if (!window.confirm(`Post-Service Pay: sambhalke, job complete hone ke baad pay karein ₹${finalAmount}. Continue?`)) return;
      navigate(`/household/booking/${bookingId}`);
      return;
    }

    // Instant wallet payment — server deducts balance & releases the payment.
    if (payMethod === "wallet") {
      try {
        const { data } = await api.post("/payments/wallet-pay", {
          bookingId,
          couponCode: appliedCoupon?.code,
        });
        setWalletBalance(data.walletBalance);
        navigate(`/household/invoice/${bookingId}`);
        return;
      } catch (err) {
        if (err?.response?.status === 402) {
          setError(`${err.response.data.message} Top up from Wallet page.`);
        } else {
          setError(err?.response?.data?.message || "Wallet payment failed. Please try again.");
        }
        setPaying(false);
        return;
      }
    }

    try {
      // Step 1 — create order on backend
      const { data: order } = await api.post("/payments/create-order", {
        bookingId,
        couponCode: appliedCoupon?.code,
      });

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay checkout could not be loaded. Please try again.");

      // Step 2 — open Razorpay checkout
      await new Promise((resolve, reject) => {
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "SahakarGig",
          description: booking?.service || "Service Payment",
          order_id: order.orderId,
          theme: { color: "#1e6b65" },
          prefill: {},
          handler: async (response) => {
            try {
              await api.post("/payments/verify", {
                bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              resolve();
            } catch (err) {
              reject(new Error(err?.response?.data?.message || "Payment verification failed"));
            }
          },
          modal: {
            ondismiss: () => reject(new Error("cancelled")),
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp) => {
          reject(new Error(resp.error?.description || "Payment failed"));
        });
        rzp.open();
      });

      navigate(`/household/invoice/${bookingId}`);
    } catch (err) {
      if (err.message !== "cancelled") setError(err.message || "Payment failed. Please try again.");
      setPaying(false);
    }
  }, [bookingId, booking, finalAmount, navigate, payMethod]);

  if (loading)
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        <div className="animate-pulse rounded-[28px] border border-outline-variant bg-surface p-6">
          <div className="mb-4 h-6 w-1/3 rounded bg-surface-container-high" />
          <div className="h-4 w-2/3 rounded bg-surface-container-high" />
        </div>
      </div>
    );

  if (!booking) return <p className="p-8 text-sm font-semibold text-on-surface-variant/80 text-center">Booking record not found.</p>;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-6 space-y-4">

      {/* ── Top Compact Header Bar ── */}
      <div className="flex items-center justify-between gap-4 border-b border-outline-variant/60 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e6b65] hover:text-[#145e58] transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Back to Bookings</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="orvia-badge-lime">
            <ShieldCheck size={13} /> Escrow Protected
          </span>
          <span className="text-xs text-on-surface-variant/70 font-medium">100% Refund Guarantee</span>
        </div>
      </div>

      {/* ── 2-Column Responsive Grid (No Scroll Design) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── Left Column (7 cols): Detailed Order Summary & Coupon Code ── */}
        <div className="lg:col-span-7 space-y-4">

          {/* Booking Details Card */}
          <div className="orvia-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1e6b65]">Confirmed Booking</span>
                <h2 className="text-xl font-extrabold text-on-surface leading-snug">{booking.service}</h2>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#e6f4f1] text-[#145e58] flex items-center justify-center font-bold text-sm shadow-sm">
                ₹{basePrice}
              </div>
            </div>

            {/* Provider & Schedule Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-1">
                <span className="text-on-surface-variant/70 font-semibold flex items-center gap-1">
                  <User size={13} className="text-[#1e6b65]" /> Provider
                </span>
                <p className="font-bold text-on-surface truncate">
                  {booking.providerId?.userId?.name || "Assigned Expert"}
                </p>
                <span className="text-[11px] text-[#4d7c0f] font-bold">✓ Verified Provider</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-1">
                <span className="text-on-surface-variant/70 font-semibold flex items-center gap-1">
                  <Calendar size={13} className="text-[#1e6b65]" /> Schedule
                </span>
                <p className="font-bold text-on-surface truncate">
                  {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <span className="text-[11px] text-on-surface-variant/80 font-medium flex items-center gap-1">
                  <Clock size={11} /> Flexible Arrival
                </span>
              </div>
            </div>

            {/* Service Location */}
            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin size={15} className="text-[#1e6b65] shrink-0" />
                <span className="text-on-surface-variant font-medium truncate">
                  {booking.address || homeAddress || "Address on file"}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#1e6b65] shrink-0">Confirmed</span>
            </div>
          </div>

          {/* ── Coupon Code Section ── */}
          <div className="orvia-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <Ticket size={15} className="text-[#1e6b65]" /> Apply Coupon Code
              </span>
              {appliedCoupon && (
                <span className="orvia-badge-lime">
                  <CheckCircle2 size={12} /> Discount Applied
                </span>
              )}
            </div>

            {/* Input & Apply Button */}
            {!appliedCoupon ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code (e.g. SAHAKAR20)"
                      className="w-full h-10 pl-9 pr-3 rounded-full border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface uppercase transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    className="h-10 px-5 rounded-full bg-[#00288e] text-white text-xs font-bold hover:bg-[#173bab] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {couponError && (
                  <p className="text-[11px] font-bold text-error flex items-center gap-1 pl-2">
                    <AlertCircle size={13} /> {couponError}
                  </p>
                )}

                {/* Pre-Loaded Quick Coupons Chips */}
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-on-surface-variant/70">Try code:</span>
                  {AVAILABLE_COUPONS.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className="px-2.5 py-1 rounded-full bg-surface-container-high hover:bg-[#e6f4f1] text-on-surface hover:text-[#145e58] border border-outline-variant text-[11px] font-extrabold transition-all cursor-pointer"
                    >
                      {c.code} ({c.type === "percent" ? `${c.discount * 100}% OFF` : `₹${c.discount} OFF`})
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Applied Coupon Banner */
              <div className="p-3 rounded-2xl bg-[#f7fee7] border border-[#d9f99d] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#65a30d]" />
                  <div>
                    <p className="font-extrabold text-[#4d7c0f]">{appliedCoupon.code} Applied</p>
                    <p className="text-[11px] text-on-surface-variant">{appliedCoupon.label}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs font-bold text-error hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ── Right Column (5 cols): Detailed Price Breakdown & Checkout CTA ── */}
        <div className="lg:col-span-5 space-y-4">

          <div className="orvia-card p-5 space-y-4 shadow-md border-[#1e6b65]/20">
            <div className="pb-3 border-b border-outline-variant/60">
              <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                <CreditCard size={18} className="text-[#1e6b65]" /> Payment Summary
              </h3>
              <p className="text-xs text-on-surface-variant/70 font-medium">Transparent cooperative breakdown</p>
            </div>

            {/* Detailed Itemized Line Items */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="flex items-center gap-1">
                  Base Service Charges <ShieldCheck size={12} className="text-[#65a30d]" />
                </span>
                <span className="font-bold text-on-surface">₹{basePrice}.00</span>
              </div>

              {/* Discount Line */}
              {appliedCoupon && (
                <div className="flex items-center justify-between text-[#4d7c0f] font-bold py-1 px-2 rounded-lg bg-[#f7fee7]">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-₹{discountAmount}.00</span>
                </div>
              )}

              {/* Final Amount Due Line */}
              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-on-surface">
                <span className="text-sm font-extrabold">Total Amount Due</span>
                <span className="text-2xl font-black text-[#1e6b65]">₹{finalAmount}</span>
              </div>
            </div>

            {/* Error Message if any */}
            {error && (
              <div className="p-3 rounded-2xl bg-error-container/30 border border-error/30 text-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Select Payment Mode</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPayMethod("razorpay")}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    payMethod === "razorpay"
                      ? "border-[#1e6b65] bg-[#e6f4f1] text-[#145e58] font-bold shadow-xs"
                      : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <p className="font-extrabold text-xs">Razorpay Online</p>
                  <p className="text-[10px] text-on-surface-variant/70">UPI / Cards / NetBank</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod("cod")}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    payMethod === "cod"
                      ? "border-[#1e6b65] bg-[#e6f4f1] text-[#145e58] font-bold shadow-xs"
                      : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <p className="font-extrabold text-xs">Post-Service Pay</p>
                  <p className="text-[10px] text-on-surface-variant/70">Escrow Hold after Job</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod("wallet")}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    payMethod === "wallet"
                      ? "border-[#1e6b65] bg-[#e6f4f1] text-[#145e58] font-bold shadow-xs"
                      : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <p className="font-extrabold text-xs">Pay from Wallet</p>
                  <p className={`text-[10px] ${walletBalance >= finalAmount ? "text-[#4d7c0f]" : "text-on-surface-variant/70"}`}>
                    {walletBalance !== null ? `Balance ₹${walletBalance}` : "Balance loading…"}
                  </p>
                </button>
              </div>
            </div>

            {/* Pay Button CTA */}
            <button
              onClick={pay}
              disabled={paying || booking.paymentStatus === "paid"}
              className="orvia-btn-primary w-full justify-center py-3.5 text-sm cursor-pointer disabled:opacity-60"
            >
              <Lock size={17} />
              <span>
                {booking.paymentStatus === "paid"
                  ? "Already Paid ✓"
                  : paying
                  ? "Processing Order…"
                  : payMethod === "cod"
                  ? `Confirm Post-Service Pay ₹${finalAmount}`
                  : payMethod === "wallet"
                  ? `Pay ₹${finalAmount} from Wallet`
                  : `Pay ₹${finalAmount} Now`}
              </span>
            </button>

            {/* Security Footer Note */}
            <div className="pt-2 text-center text-[11px] text-on-surface-variant/70 font-medium flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-[#65a30d]" />
              <span>256-bit SSL Escrow • PCI-DSS Compliant</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

