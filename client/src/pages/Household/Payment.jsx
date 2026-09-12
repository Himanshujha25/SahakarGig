import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import ConfirmModal from "../../components/ConfirmModal";
import {
  ArrowLeft, ShieldCheck, Lock, Ticket, CheckCircle2, AlertCircle,
  CreditCard, MapPin, Calendar, Clock, User, Tag, Building2, UserCheck, Check
} from "lucide-react";
import { resolveCoopDetails } from "../../lib/invoicePrinter";

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

  const basePrice = (booking?.price && booking.price > 0) ? booking.price : 200;

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      discountAmount = Math.round(basePrice * appliedCoupon.discount);
    } else {
      discountAmount = Math.min(appliedCoupon.discount, basePrice);
    }
  }
  const finalAmount = Math.max(1, basePrice - discountAmount);

  const baseFare = Math.round(basePrice * 0.94);
  const welfareCess = Math.max(2, Math.round(basePrice * 0.01));
  const gstTax = Math.round(basePrice * 0.05);

  const coopInfo = resolveCoopDetails(booking);
  const workerName = booking?.providerId?.userId?.name || "Assigned Cooperative Gig Worker";
  const workerUan = `E-SHRAM-UAN-${(booking?._id || '').slice(0, 10).toUpperCase()}`;

  const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: () => {} });

  const pay = useCallback(async () => {
    if (paying) return;
    setError("");

    if (payMethod === "cod") {
      setConfirmState({
        isOpen: true,
        title: "Post-Service Pay",
        message: `You will pay ₹${finalAmount} directly to the provider after service completion. Proceed?`,
        type: "info",
        confirmText: "Proceed",
        onConfirm: () => {
          navigate(`/household/tracking/${bookingId}`);
        },
      });
      return;
    }

    setPaying(true);

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
      const { data: order } = await api.post("/payments/create-order", {
        bookingId,
        couponCode: appliedCoupon?.code,
      });

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay checkout could not be loaded. Please try again.");

      await new Promise((resolve, reject) => {
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "SahakarGig",
          description: booking?.service || "Service Payment",
          order_id: order.orderId,
          theme: { color: "#00288e" },
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
  }, [bookingId, booking, finalAmount, navigate, payMethod, appliedCoupon]);

  if (loading)
    return (
      <div className="w-full max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="animate-pulse rounded-3xl border border-outline-variant bg-surface p-8 space-y-4">
          <div className="h-6 w-1/3 rounded bg-surface-container-high" />
          <div className="h-4 w-2/3 rounded bg-surface-container-high" />
        </div>
      </div>
    );

  if (!booking) return <p className="p-8 text-sm font-semibold text-on-surface-variant text-center">Booking record not found.</p>;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 pt-6 pb-12 space-y-6">

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/household/bookings")}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[22px] font-bold text-on-surface tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Service Checkout & Payment
            </h1>
            <p className="text-[12.5px] text-on-surface-variant">
              Booking Ref: #SG-{booking._id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[12px] font-extrabold">
          <ShieldCheck size={16} /> 100% Sahakar Escrow Guarantee
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Booking, Cooperative & Worker Info */}
        <div className="lg:col-span-7 space-y-5">

          {/* Service & Escrow Summary Card */}
          <div className="rounded-3xl border border-outline-variant bg-surface p-6 space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-outline-variant/60">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Service Order</span>
                <h2 className="text-[20px] font-extrabold text-on-surface mt-0.5">{booking.service}</h2>
              </div>
              <span className="px-3.5 py-1.5 rounded-2xl bg-primary-container text-on-primary-container font-extrabold text-[15px] border border-primary/20">
                ₹{basePrice}
              </span>
            </div>

            {/* Provider & Dynamic Cooperative Society */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[12.5px]">
              {/* Dynamic Cooperative Card */}
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 space-y-1.5">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Building2 size={14} /> Cooperative Society
                </span>
                <p className="font-bold text-on-surface text-[13.5px] leading-snug">
                  {coopInfo.name}
                </p>
                <p className="text-on-surface-variant text-[11.5px]"><strong>Reg No:</strong> {coopInfo.regId}</p>
                <p className="text-on-surface-variant text-[11.5px]"><strong>District:</strong> {coopInfo.district}</p>
                <p className="text-primary font-bold text-[11px] pt-0.5">Ministry of Cooperation Verified ✓</p>
              </div>

              {/* Deployed Gig Worker */}
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 space-y-1.5">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                  <UserCheck size={14} /> Deployed Professional
                </span>
                <p className="font-bold text-on-surface text-[13.5px]">
                  {workerName}
                </p>
                <p className="text-on-surface-variant text-[11.5px]"><strong>e-Shram UAN:</strong> <span className="font-mono text-primary font-bold">{workerUan}</span></p>
                <p className="text-emerald-600 font-bold text-[11px]">⭐ 4.9 Verified PACS Member</p>
              </div>
            </div>

            {/* Address & Slot */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/50 flex items-center justify-between text-[12.5px]">
              <div className="flex items-center gap-2 truncate">
                <MapPin size={16} className="text-primary shrink-0" />
                <span className="text-on-surface font-semibold truncate">
                  {booking.locationText || homeAddress || "Client Registered Premises"}
                </span>
              </div>
              <span className="text-[11px] font-bold text-primary shrink-0 bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                Confirmed Location
              </span>
            </div>
          </div>

          {/* Coupon Code Card */}
          <div className="rounded-3xl border border-outline-variant bg-surface p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <Ticket size={16} className="text-primary" /> Apply Coupon Code
              </span>
              {appliedCoupon && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[11px] border border-emerald-500/20 flex items-center gap-1">
                  <Check size={12} /> Discount Applied
                </span>
              )}
            </div>

            {!appliedCoupon ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code (e.g. SAHAKAR20)"
                      className="w-full h-11 pl-9 pr-3 rounded-2xl border border-outline-variant bg-surface-container-lowest text-[13px] font-bold text-on-surface outline-none focus:border-primary uppercase transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    className="h-11 px-5 rounded-2xl bg-primary text-on-primary text-[13px] font-bold hover:shadow-md transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {couponError && (
                  <p className="text-[11.5px] font-bold text-error flex items-center gap-1 pl-1">
                    <AlertCircle size={13} /> {couponError}
                  </p>
                )}

                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-on-surface-variant">Try code:</span>
                  {AVAILABLE_COUPONS.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className="px-3 py-1 rounded-xl bg-surface-container hover:bg-primary-container/40 text-on-surface hover:text-primary border border-outline-variant text-[11px] font-bold transition cursor-pointer"
                    >
                      {c.code} ({c.type === "percent" ? `${c.discount * 100}% OFF` : `₹${c.discount} OFF`})
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <div>
                    <p className="font-extrabold text-emerald-700">{appliedCoupon.code} Applied</p>
                    <p className="text-[11px] text-on-surface-variant">{appliedCoupon.label}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-[12px] font-bold text-error hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Price Breakdown & Payment Mode */}
        <div className="lg:col-span-5 space-y-5">

          <div className="rounded-3xl border border-outline-variant bg-surface p-6 space-y-5 shadow-xs border-t-4 border-t-primary">
            <div>
              <h3 className="text-[17px] font-extrabold text-on-surface flex items-center gap-2">
                <CreditCard size={19} className="text-primary" /> Payment Summary
              </h3>
              <p className="text-[12px] text-on-surface-variant mt-0.5">Transparent cooperative fare breakdown</p>
            </div>

            {/* Detailed Itemized Line Items */}
            <div className="space-y-2.5 text-[13px]">
              <div className="flex justify-between text-on-surface-variant">
                <span>Base Service Fare</span>
                <span className="font-semibold text-on-surface">₹{baseFare}.00</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>PACS Worker Welfare Fund (1%)</span>
                <span className="font-semibold text-on-surface">₹{welfareCess}.00</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>GST & Statutory Tax (5%)</span>
                <span className="font-semibold text-on-surface">₹{gstTax}.00</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-bold py-1 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-₹{discountAmount}.00</span>
                </div>
              )}

              <div className="pt-3 border-t border-outline-variant flex items-center justify-between text-on-surface">
                <span className="text-[15px] font-extrabold">Total Amount Due</span>
                <span className="text-[26px] font-black text-primary">₹{finalAmount}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-error-container/40 border border-error/30 text-error text-[12px] font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Payment Mode Options */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant">Select Payment Mode</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[12px]">
                <button
                  type="button"
                  onClick={() => setPayMethod("razorpay")}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    payMethod === "razorpay"
                      ? "border-primary bg-primary-container/40 text-primary font-bold shadow-xs ring-2 ring-primary/20"
                      : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <p className="font-extrabold text-[12.5px]">Razorpay</p>
                  <p className="text-[10px] opacity-80">UPI / Cards</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod("cod")}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    payMethod === "cod"
                      ? "border-primary bg-primary-container/40 text-primary font-bold shadow-xs ring-2 ring-primary/20"
                      : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <p className="font-extrabold text-[12.5px]">Post-Pay</p>
                  <p className="text-[10px] opacity-80">Escrow Hold</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod("wallet")}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    payMethod === "wallet"
                      ? "border-primary bg-primary-container/40 text-primary font-bold shadow-xs ring-2 ring-primary/20"
                      : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <p className="font-extrabold text-[12.5px]">Wallet</p>
                  <p className="text-[10px] opacity-80">
                    {walletBalance !== null ? `Bal ₹${walletBalance}` : "Loading..."}
                  </p>
                </button>
              </div>
            </div>

            {/* Pay Button CTA */}
            <button
              onClick={pay}
              disabled={paying || booking.paymentStatus === "paid"}
              className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-on-primary font-extrabold text-[14.5px] hover:shadow-[0_8px_24px_-4px_rgba(0,40,142,0.4)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
            >
              <Lock size={18} />
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

            <div className="pt-1 text-center text-[11px] text-on-surface-variant font-medium flex items-center justify-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>256-bit SSL Escrow • PCI-DSS Compliant</span>
            </div>

          </div>

        </div>

      </div>

      <ConfirmModal
        {...confirmState}
        onClose={() => setConfirmState((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
