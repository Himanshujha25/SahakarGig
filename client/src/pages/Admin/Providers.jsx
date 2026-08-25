import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function Providers() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/providers");
        setItems(data || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("providers")}</h1>
      {items.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">No providers found.</p>
      ) : (
        <div className="card-lg overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="font-heading text-sm text-on-surface-variant">
                <th className="py-2">{t("name")}</th>
                <th className="py-2">Skills</th>
                <th className="py-2">Status</th>
                <th className="py-2">Rate</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id} className="border-t border-outline-variant font-body-md text-on-surface">
                  <td className="py-3 font-heading font-semibold">{p.userId?.name ?? "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {(p.skills || []).map((s) => (
                        <span key={s} className="status-pill bg-surface-container text-on-surface-variant">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">
                    {p.verified ? (
                      <VerifiedBadge label="Verified" />
                    ) : (
                      <span className="status-pill bg-error-container text-on-error-container">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="py-3">₹{p.hourlyRate ?? "—"}/hr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
