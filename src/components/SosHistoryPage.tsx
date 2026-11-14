import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  History,
  MapPin,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { deleteSosAlert, resolveSosAlert } from "../services/firestoreService";
import type { SosAlert } from "../types/sheguard";

interface SosHistoryPageProps {
  userId: string;
  alerts: SosAlert[];
  offlineAlerts: SosAlert[];
  isOnline: boolean;
}

export function SosHistoryPage({
  userId,
  alerts,
  offlineAlerts,
  isOnline,
}: SosHistoryPageProps) {
  const [filter, setFilter] = useState<"all" | "recorded" | "resolved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const combinedAlerts = useMemo(() => {
    const map = new Map<string, SosAlert>();
    offlineAlerts.forEach((a) => map.set(a.id, { ...a, pendingOfflineSync: true }));
    alerts.forEach((a) => map.set(a.id, a));
    return Array.from(map.values());
  }, [alerts, offlineAlerts]);

  const filteredAlerts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return combinedAlerts.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.dateLabel.toLowerCase().includes(q) ||
        item.timeLabel.toLowerCase().includes(q) ||
        item.locationSummary.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q)
      );
    });
  }, [combinedAlerts, filter, searchTerm]);

  const handleMarkResolved = async (alertId: string) => {
    setBusyId(alertId);
    setErrorMsg(null);
    try {
      await resolveSosAlert(userId, alertId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not update alert status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleExplicitDelete = async (alertId: string) => {
    setBusyId(alertId);
    setErrorMsg(null);
    try {
      await deleteSosAlert(userId, alertId);
      setConfirmDeleteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not delete alert record.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E122B]">Permanent SOS Alert History</h2>
          <p className="text-sm text-[#5B4B6B] mt-1">
            SOS records are preserved permanently unless you explicitly choose to remove an entry.
          </p>
        </div>

        {/* Status Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-[#F8F4FC] border border-[#EAE2F0] rounded-xl self-start sm:self-auto">
          {(["all", "recorded", "resolved"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                filter === tab
                  ? "bg-white text-[#5B21B6] shadow-xs"
                  : "text-[#5B4B6B] hover:text-[#1E122B]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6B5B7B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search SOS records by date, coordinates, or message..."
          className="w-full min-h-[44px] pl-11 pr-4 py-2.5 rounded-xl border border-[#EAE2F0] bg-white text-sm text-[#1E122B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
        />
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-4 text-sm text-[#B91C1C]"
        >
          {errorMsg}
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-white border border-[#EAE2F0] rounded-3xl overflow-hidden">
        {filteredAlerts.length > 0 ? (
          <div className="divide-y divide-[#EAE2F0]">
            {filteredAlerts.map((alert) => {
              const isResolved = alert.status === "resolved";
              return (
                <div key={alert.id} className="p-5 sm:p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5B4B6B] tabular-nums">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          isResolved ? "text-[#15803D]" : "text-[#DC2626]"
                        }`}
                      >
                        {isResolved ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <ShieldAlert className="w-4 h-4" />
                        )}
                        <span>
                          {alert.pendingOfflineSync
                            ? "Pending Offline Sync"
                            : isResolved
                            ? "Resolved (Marked Safe)"
                            : "Recorded SOS"}
                        </span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{alert.dateLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{alert.timeLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {alert.triggerSource === "journey_missed_checkin"
                          ? "From Journey Check-In"
                          : "Manual SOS"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isResolved && !alert.pendingOfflineSync && (
                        <button
                          type="button"
                          onClick={() => handleMarkResolved(alert.id)}
                          disabled={busyId === alert.id || !isOnline}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#F8F4FC] hover:bg-[#EDE9FE] text-xs font-semibold text-[#5B21B6] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          Mark Safe / Resolved
                        </button>
                      )}

                      {!alert.pendingOfflineSync &&
                        (confirmDeleteId === alert.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExplicitDelete(alert.id)}
                              disabled={busyId === alert.id}
                              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#EAE2F0] text-xs font-medium text-[#5B4B6B] cursor-pointer whitespace-nowrap"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(alert.id)}
                            aria-label="Delete SOS record"
                            className="min-h-[38px] min-w-[38px] px-2.5 py-1.5 rounded-xl border border-[#EAE2F0] hover:bg-[#FEF2F2] hover:text-[#DC2626] text-[#5B4B6B] inline-flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ))}
                    </div>
                  </div>

                  <p className="text-sm text-[#1E122B]">{alert.message}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#5B4B6B]">
                    <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                      <MapPin className="w-3.5 h-3.5 text-[#6D28D9]" />
                      <span>{alert.locationSummary}</span>
                    </span>
                    {alert.mapsUrl && (
                      <a
                        href={alert.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#6D28D9] hover:underline"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F8F4FC] text-[#6D28D9] flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1E122B]">No SOS records match your filter</h3>
            <p className="text-sm text-[#5B4B6B]">
              Any SOS alert you confirm will be permanently stored here with its date, time, GPS
              location, and Google Maps link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
