import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { 
  ArrowLeft, Phone, MapPin, Navigation, 
  AlertCircle, Send, Zap, User, Key, Check, ExternalLink, MessageSquare
} from "lucide-react";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState("");
  const [messages, setMessages] = useState([]);
  const [otpError, setOtpError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/bookings/${id}`);
      setBooking(data);
      setMessages(data.chat || []);
    } catch (err) {
      console.error("Failed to load booking details:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    socket.on('booking:updated', (b) => {
      const incoming = b?.booking || b;
      if (incoming?._id?.toString() === id || incoming?._id === id) {
        setBooking(incoming);
        setMessages(incoming.chat || []);
      }
    });
    socket.on('booking:chat', ({ bookingId, message }) => {
      if (bookingId?.toString() === id) setMessages(prev => [...prev, message]);
    });
    return () => {
      socket.off('booking:updated');
      socket.off('booking:chat');
    };
  }, [load, id]);

  const isActive = booking && ['accepted', 'in-progress'].includes(booking.status);
  useEffect(() => {
    if (!isActive || !navigator.geolocation) return;
    if (!socket.connected) socket.connect();
    let watchId = null;
    let lastPos = null;

    const emitPos = () => {
      if (lastPos && socket.connected) {
        socket.emit('provider:location_update', {
          bookingId: id,
          lat: lastPos.coords.latitude,
          lng: lastPos.coords.longitude,
        });
      }
    };

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => { lastPos = pos; emitPos(); },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    } catch {}

    const tick = setInterval(emitPos, 8000);
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(tick);
    };
  }, [id, isActive]);

  async function accept() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/accept`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function markInProgress() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'in-progress' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    setOtpError(null);
    try {
      await api.patch(`/bookings/${id}/status`, { status: "completed" });
      await load();
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to complete job");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/cancel`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function sendChat(customText) {
    const textToSend = customText || chat;
    if (!textToSend || !textToSend.trim()) return;
    try {
      const { data } = await api.post(`/bookings/${id}/chat`, { message: textToSend });
      setMessages(data.chat || []);
      if (!customText) setChat("");
    } catch {}
  }

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 py-12 space-y-6">
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-8 space-y-4">
          <div className="h-6 w-1/3 rounded bg-slate-100" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-24 w-full rounded bg-slate-50" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="w-full max-w-md mx-auto my-16 p-8 text-center rounded-xl border border-slate-200 bg-white space-y-4">
        <AlertCircle size={40} className="mx-auto text-slate-400" />
        <h2 className="text-base font-semibold text-slate-900">Job Record Not Found</h2>
        <p className="text-xs text-slate-500">The requested job reference could not be located in the ledger.</p>
        <button
          onClick={() => navigate("/provider")}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors"
        >
          Back to Job Queue
        </button>
      </div>
    );
  }

  const b = booking;
  const isEmergency = b.isEmergency || false;

  return (
    <div className="w-full max-w-5xl mx-auto px-6 pt-8 pb-20 space-y-6 text-slate-900">

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/provider")}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Back to Job Queue"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Job Details
            </h1>
            <p className="text-xs text-slate-500">Reference #{b._id?.substring(0, 10) || "89412"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 capitalize">
            {b.status}
          </span>
          {isEmergency && (
            <span className="text-xs font-semibold px-3 py-1 rounded bg-slate-900 text-white">
              Emergency Request
            </span>
          )}
        </div>
      </div>

      {/* Main Details Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        
        {/* Customer Header Info */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {b.householdId?.name || "Anita Sharma"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Service: <span className="font-semibold text-slate-800">{b.targetCategory || b.service || "General Repair"}</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium uppercase">Offered Rate</p>
            <p className="text-2xl font-bold text-slate-900">₹{b.price} <span className="text-xs font-normal text-slate-500">/ hr</span></p>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Customer Phone</p>
            <p className="text-sm font-semibold text-slate-900 font-mono">{b.householdId?.phone || "9811000004"}</p>
            <a
              href={`tel:${b.householdId?.phone || "9811000004"}`}
              className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium underline pt-1"
            >
              <Phone size={12} /> Call Customer
            </a>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Service Location</p>
            <p className="text-xs font-medium text-slate-800">{b.locationText || b.address || "Street 3, Noida, UP"}</p>
            {b.coordinates ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${b.coordinates.lat},${b.coordinates.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium underline pt-1"
              >
                <Navigation size={12} /> Open Maps Navigation <ExternalLink size={10} />
              </a>
            ) : (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.locationText || b.address || "Noida")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium underline pt-1"
              >
                <Navigation size={12} /> Open Maps Navigation <ExternalLink size={10} />
              </a>
            )}
          </div>

        </div>

      </div>

      {/* Grid: Actions & Communication */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Actions */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
              Actions
            </h3>

            {otpError && (
              <div className="p-3 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                {otpError}
              </div>
            )}

            {b.status === "requested" && (
              <div className="space-y-2">
                <button
                  disabled={busy}
                  onClick={accept}
                  className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Accept Job Request
                </button>

                <button
                  disabled={busy}
                  onClick={cancel}
                  className="w-full py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition-colors cursor-pointer"
                >
                  Decline Job
                </button>
              </div>
            )}

            {b.status === "accepted" && (
              <button
                disabled={busy}
                onClick={markInProgress}
                className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Mark In-Progress (On Site)
              </button>
            )}

            {b.status === "in-progress" && (
              <button
                disabled={busy}
                onClick={complete}
                className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Complete Job & Release Payout
              </button>
            )}

            {b.status === "completed" && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
                <p className="text-xs font-bold text-slate-900">Job Completed</p>
                <p className="text-[11px] text-slate-500">Funds have been added to your wallet balance.</p>
              </div>
            )}

            {(b.status === "accepted" || b.status === "in-progress") && (
              <button
                disabled={busy}
                onClick={cancel}
                className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel Job
              </button>
            )}

          </div>
        </div>

        {/* Right Column: Customer Messages */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between min-h-[360px]">
          <div className="space-y-3 flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
              Messages
            </h3>

            {/* Quick Text Options */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "On my way",
                "Arrived at location",
                "Job completed"
              ].map((txt) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => sendChat(txt)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {txt}
                </button>
              ))}
            </div>

            {/* Message List */}
            <div className="flex-1 max-h-56 overflow-y-auto space-y-2 p-2 rounded bg-slate-50 border border-slate-100 my-1">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No messages recorded.</p>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.from === "provider" || m.from === "You" ? "items-end" : "items-start"}`}
                  >
                    <div className={`p-2.5 rounded-lg max-w-[85%] text-xs ${m.from === "provider" || m.from === "You" ? "bg-slate-900 text-white" : "bg-white text-slate-800 border border-slate-200"}`}>
                      <p>{m.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type message..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={() => sendChat()}
              className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Send
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}