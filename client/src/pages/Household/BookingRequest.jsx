import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import Icon from "../../components/Icon";

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FREQ_OPTIONS = [
  { value: "daily", label: "Every day", hint: "Daily" },
  { value: "weekly", label: "Every week", hint: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks", hint: "Fornightly" },
  { value: "monthly", label: "Every month", hint: "Monthly" },
];

export default function BookingRequest() {
  const { providerId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [slots, setSlots] = useState(null); // { availabilitySlots, bookings }
  const [service, setService] = useState("");
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  // Recurring booking (auto re-scheduled after each completion)
  const [recurEnabled, setRecurEnabled] = useState(false);
  const [recurFreq, setRecurFreq] = useState("weekly");
  const [recurRepeats, setRecurRepeats] = useState(12);
  // Group / community booking
  const [groupEnabled, setGroupEnabled] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberCount, setGroupMemberCount] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get(`/providers/${providerId}`)
      .then((res) => { if (active) setProvider(res.data); })
      .catch(() => {});
    api
      .get(`/providers/${providerId}/slots`)
      .then((res) => { if (active) setSlots(res.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [providerId]);

  // Next 7 days (starting today) as { date, label, dayNum, key }
  const days = useMemo(() => {
    const out = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      out.push({
        date: x,
        label: i === 0 ? "Today" : DAY_KEYS[x.getDay()],
        dayNum: x.getDate(),
        key: `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`,
      });
    }
    return out;
  }, []);

  // Hours of active bookings, keyed "Y-M-D|H:00" — these slots are NOT available.
  const takenHours = useMemo(() => {
    const s = new Set();
    (slots?.bookings || []).forEach((b) => {
      if (!b.scheduledTime) return;
      const x = new Date(b.scheduledTime);
      s.add(`${x.getFullYear()}-${x.getMonth()}-${x.getDate()}|${x.getHours()}:00`);
    });
    return s;
  }, [slots]);

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  // Candidate hourly slots for the selected day, from the worker's weekly availability.
  const dayHours = useMemo(() => {
    const day = days[selectedDay];
    if (!day) return [];
    const slot = (slots?.availabilitySlots || []).find((s) => s.day === DAY_KEYS[day.date.getDay()]);
    if (!slot || !slot.from || !slot.to) return [];
    const [fh] = slot.from.split(":").map(Number);
    const [th] = slot.to.split(":").map(Number);
    if (Number.isNaN(fh) || Number.isNaN(th)) return [];
    const hours = [];
    for (let h = fh; h < th; h++) hours.push(`${String(h).padStart(2, "0")}:00`);
    return hours.map((h) => {
      const hour = Number(h.split(":")[0]);
      const isPast = day.key === todayKey && hour <= now.getHours();
      const isTaken = takenHours.has(`${day.key}|${h}`);
      return { time: h, available: !isPast && !isTaken };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, slots]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedHour) { setError("Please choose an available time slot."); return; }
    setSubmitting(true);
    try {
      const day = days[selectedDay];
      const hour = Number(selectedHour.split(":")[0]);
      const scheduledTime = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), hour, 0).toISOString();
      const { data } = await api.post("/bookings", {
        providerId,
        service,
        scheduledTime,
        isEmergency,
        price: provider?.hourlyRate && provider.hourlyRate > 0 ? provider.hourlyRate : 0,
        recurrence: recurEnabled
          ? { enabled: true, freq: recurFreq, repeats: recurRepeats }
          : { enabled: false },
        groupBooking: groupEnabled
          ? { enabled: true, groupName, memberCount: groupMemberCount }
          : { enabled: false },
      });
      navigate(`/household/pay/${data._id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not place the booking. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary hover:text-primary-container"
      >
        <Icon name="arrow_back" className=" text-[18px]" />
        Back
      </button>

      <h1 className="mb-2 font-heading font-bold tracking-tight text-on-background text-2xl md:text-3xl">{t("book")} Service</h1>
      <p className="mb-6 font-body-md text-on-surface-variant">Pick a free time slot from the worker's weekly availability.</p>

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

        {/* ── Day picker (next 7 days) ── */}
        <div>
          <span className="mb-2 block font-heading text-sm font-semibold text-on-surface-variant">Pick a day</span>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d, i) => (
              <button
                key={d.key}
                type="button"
                onClick={() => { setSelectedDay(i); setSelectedHour(null); }}
                className={`flex flex-col items-center rounded-xl border px-1 py-2 transition-all duration-200 ${
                  selectedDay === i
                    ? "border-primary bg-primary text-on-primary shadow-[0_3px_10px_rgba(0,0,0,0.25)]"
                    : "border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary/40"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase ${selectedDay === i ? "text-white/80" : "text-on-surface-variant"}`}>{d.label}</span>
                <span className="text-[15px] font-bold">{d.dayNum}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Time slot chips ── */}
        <div>
          <span className="mb-2 block font-heading text-sm font-semibold text-on-surface-variant">
            {days[selectedDay]?.label}, {days[selectedDay]?.date?.getDate()} — Pick a time
          </span>
          {!slots ? (
            <div className="h-16 animate-pulse rounded-xl bg-surface-container-low border border-outline-variant/40" />
          ) : dayHours.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-lowest px-4 py-6 text-center text-[13px] text-on-surface-variant">
              The worker is not available on {days[selectedDay]?.label}. Try another day.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {dayHours.map(({ time, available }) => {
                const selected = selectedHour === time;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedHour(time)}
                    title={available ? `Available at ${time}` : "Not available"}
                    className={`flex flex-col items-center rounded-xl border px-2 py-2.5 transition-all duration-200 ${
                      selected
                        ? "border-primary bg-primary text-on-primary shadow-[0_3px_10px_rgba(0,0,0,0.25)]"
                        : available
                        ? "border-[#006d30]/30 bg-[#e6f9ec] text-[#006d30] hover:border-[#006d30] hover:shadow-[0_2px_8px_rgba(0,109,48,0.18)]"
                        : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant/60 cursor-not-allowed"
                    }`}
                  >
                    <Icon name="schedule" className={` text-[16px] ${selected ? "text-white" : available ? "text-[#006d30]" : "text-on-surface-variant/40"}`} />
                    <span className="mt-0.5 text-[13px] font-bold">{time}</span>
                    <span className={`text-[9px] font-semibold ${selected ? "text-white/85" : available ? "text-[#006d30]/80" : "text-on-surface-variant/50"}`}>
                      {available ? "Available" : "Not avail."}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#006d30]" /> Available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container border border-outline-variant" /> Not available / booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Selected
            </span>
          </div>
        </div>

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

        {/* ── Recurring / subscription booking ── */}
        <div className={`rounded-xl border p-4 transition-all ${recurEnabled ? "border-primary/40 bg-primary-container/20" : "border-outline-variant/60 bg-surface-container-lowest"}`}>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="flex items-center gap-2 font-heading text-sm font-bold text-on-surface">
                <Icon name="repeat" className=" text-[18px] text-primary" />
                Recurring booking
              </p>
              <p className="mt-0.5 font-body-md text-xs text-on-surface-variant">
                Auto-schedules the next visit after each completion. Great for weekly cleaning, tiffin, homecare.
              </p>
            </div>
            <input
              type="checkbox"
              checked={recurEnabled}
              onChange={(e) => setRecurEnabled(e.target.checked)}
              className="h-5 w-5 accent-primary cursor-pointer"
            />
          </label>
          {recurEnabled && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="mb-1.5 block font-heading text-xs font-semibold text-on-surface-variant">Repeat every</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {FREQ_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setRecurFreq(f.value)}
                      title={f.hint}
                      className={`rounded-lg border px-1 py-2 text-center text-[11px] font-bold transition-all ${
                        recurFreq === f.value
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface text-on-surface hover:border-primary/40"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1.5 block font-heading text-xs font-semibold text-on-surface-variant">Total visits</span>
                <select
                  value={recurRepeats}
                  onChange={(e) => setRecurRepeats(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
                >
                  {[2, 4, 6, 8, 12, 16, 24].map((n) => (
                    <option key={n} value={n}>{n} visits</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Group / community booking ── */}
        <div className={`rounded-xl border p-4 transition-all ${groupEnabled ? "border-primary/40 bg-primary-container/20" : "border-outline-variant/60 bg-surface-container-lowest"}`}>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="flex items-center gap-2 font-heading text-sm font-bold text-on-surface">
                <Icon name="people" className=" text-[18px] text-primary" />
                Group / community booking
              </p>
              <p className="mt-0.5 font-body-md text-xs text-on-surface-variant">
                Book for a whole group (society residents, family). Bill scales with member count.
              </p>
            </div>
            <input
              type="checkbox"
              checked={groupEnabled}
              onChange={(e) => setGroupEnabled(e.target.checked)}
              className="h-5 w-5 accent-primary cursor-pointer"
            />
          </label>
          {groupEnabled && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block font-heading text-xs font-semibold text-on-surface-variant">Group name</span>
                <input
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Tower-A Residents"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-heading text-xs font-semibold text-on-surface-variant">Members</span>
                <select
                  value={groupMemberCount}
                  onChange={(e) => setGroupMemberCount(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
                >
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>{n} members</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

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

        {error && (
          <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 font-body-md text-sm text-on-error-container">
            {error}
          </div>
        )}

        <button type="submit" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-heading font-semibold text-on-primary transition-all hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)] disabled:opacity-60" disabled={submitting}>
          <Icon name="event_available" className=" text-[20px]" />
          {submitting ? "Placing request…" : t("book")}
        </button>
      </form>
    </div>
  );
}