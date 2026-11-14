import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Flag,
  MessageSquare,
  Phone,
  ShieldAlert,
} from "lucide-react";
import {
  buildSmsHref,
  buildTelHref,
  formatCountdown,
  generateSafeId,
} from "../lib/safetyUtils";
import {
  checkInJourneySession,
  completeJourneySession,
  markJourneyMissedCheckIn,
  startJourneySession,
} from "../services/firestoreService";
import type { JourneySession, TrustedContact } from "../types/sheguard";

interface JourneyMonitorPageProps {
  userId: string;
  journeys: JourneySession[];
  activeJourney: JourneySession | null;
  contacts: TrustedContact[];
  isOnline: boolean;
  onTriggerSosFromJourney: (note: string) => void;
}

export function JourneyMonitorPage({
  userId,
  journeys,
  activeJourney,
  contacts,
  isOnline,
  onTriggerSosFromJourney,
}: JourneyMonitorPageProps) {
  const [title, setTitle] = useState("Evening Commute Home");
  const [destination, setDestination] = useState("");
  const [etaMinutes, setEtaMinutes] = useState(45);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const missedTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Automatically detect missed check-in and notify user
  useEffect(() => {
    if (!activeJourney) {
      missedTriggeredRef.current = null;
      return;
    }

    const nextMs = new Date(activeJourney.nextCheckInAt).getTime();
    if (
      activeJourney.status === "active" &&
      !Number.isNaN(nextMs) &&
      nowMs > nextMs &&
      missedTriggeredRef.current !== `${activeJourney.id}_${activeJourney.nextCheckInAt}`
    ) {
      missedTriggeredRef.current = `${activeJourney.id}_${activeJourney.nextCheckInAt}`;
      markJourneyMissedCheckIn(
        userId,
        activeJourney.id,
        (activeJourney.missedCheckInCount || 0) + 1
      ).catch(console.error);

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("SHE-GUARD Safety Check-In Missed", {
          body: `Please confirm you are safe on "${activeJourney.title}" or contact a trusted person.`,
        });
      }
    }
  }, [activeJourney, nowMs, userId]);

  const handleRequestNotifications = async () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const handleStartJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim()) {
      setErrorMsg("Please enter a journey title and destination.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    const now = new Date();
    const expectedArrival = new Date(now.getTime() + etaMinutes * 60 * 1000);
    const nextCheckIn = new Date(now.getTime() + intervalMinutes * 60 * 1000);
    try {
      await startJourneySession(userId, {
        id: generateSafeId("journey"),
        title: title.trim(),
        destination: destination.trim(),
        expectedArrivalAt: expectedArrival.toISOString(),
        checkInIntervalMinutes: intervalMinutes,
        nextCheckInAt: nextCheckIn.toISOString(),
        lastCheckInAt: now.toISOString(),
        missedCheckInCount: 0,
        status: "active",
      });
      setDestination("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not start journey.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!activeJourney) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await checkInJourneySession(
        userId,
        activeJourney.id,
        activeJourney.checkInIntervalMinutes
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to record check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndJourney = async () => {
    if (!activeJourney) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await completeJourneySession(userId, activeJourney.id, "completed");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to end journey.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateMissedForTesting = async () => {
    if (!activeJourney) return;
    setSubmitting(true);
    try {
      await markJourneyMissedCheckIn(
        userId,
        activeJourney.id,
        (activeJourney.missedCheckInCount || 0) + 1
      );
    } finally {
      setSubmitting(false);
    }
  };

  const nextCheckInTimer = activeJourney
    ? formatCountdown(activeJourney.nextCheckInAt, nowMs)
    : null;
  const arrivalTimer = activeJourney
    ? formatCountdown(activeJourney.expectedArrivalAt, nowMs)
    : null;
  const isMissed =
    activeJourney?.status === "checkin_missed" || Boolean(nextCheckInTimer?.isOverdue);

  const pastJourneys = journeys.filter(
    (j) => j.status === "completed" || j.status === "escalated"
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E122B]">Journey Monitoring</h2>
          <p className="text-sm text-[#5B4B6B] mt-1">
            Set an expected arrival time and periodic check-in reminders while travelling.
          </p>
        </div>
        {typeof Notification !== "undefined" && Notification.permission === "default" && (
          <button
            type="button"
            onClick={handleRequestNotifications}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F8F4FC] hover:bg-[#EDE9FE] border border-[#DDD6FE] text-xs font-semibold text-[#5B21B6] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Bell className="w-4 h-4" />
            <span>Enable Reminder Notifications</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]"
        >
          {errorMsg}
        </div>
      )}

      {activeJourney ? (
        <section className="space-y-6">
          {/* Missed Check-In Warning Banner */}
          {isMissed && (
            <div
              role="alert"
              className="rounded-3xl bg-[#FEF2F2] border border-[#FECACA] p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-[#DC2626] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-[#991B1B]">
                    Missed Safety Confirmation
                  </h3>
                  <p className="text-sm text-[#7F1D1D] mt-1">
                    You missed your scheduled safety check-in for{" "}
                    <strong>{activeJourney.title}</strong> ({activeJourney.destination}). Confirm
                    you are safe below, contact a trusted person, or open SOS confirmation.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
                >
                  Confirm I&apos;m Safe Now
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onTriggerSosFromJourney(
                      `Missed safety check-in during journey "${activeJourney.title}" to ${activeJourney.destination}.`
                    )
                  }
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Open SOS Confirmation</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Journey Status Card */}
          <div className="bg-white border border-[#EAE2F0] rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE2F0]">
              <div>
                <p className="text-xs font-medium text-[#5B21B6]">
                  {isMissed ? "Check-In Overdue" : "Active Journey"} · Interval{" "}
                  {activeJourney.checkInIntervalMinutes} min
                </p>
                <h3 className="text-xl font-bold text-[#1E122B] mt-1">{activeJourney.title}</h3>
                <p className="text-sm text-[#5B4B6B]">Destination: {activeJourney.destination}</p>
              </div>
              <button
                type="button"
                onClick={handleEndJourney}
                disabled={submitting}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FDF2F7] hover:bg-[#FCE7F3] border border-[#FBCFE8] text-sm font-semibold text-[#9D174D] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <Flag className="w-4 h-4" />
                <span>End Journey Safely</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#F8F4FC] border border-[#EAE2F0] p-5">
                <p className="text-xs text-[#5B4B6B]">Next Safety Check-In</p>
                <p
                  className={`mt-1 text-3xl font-bold font-mono tabular-nums ${
                    isMissed ? "text-[#DC2626]" : "text-[#5B21B6]"
                  }`}
                >
                  {nextCheckInTimer?.label}
                </p>
                <p className="mt-1 text-xs text-[#6B5B7B] tabular-nums">
                  Scheduled:{" "}
                  {new Date(activeJourney.nextCheckInAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FDFBFE] border border-[#EAE2F0] p-5">
                <p className="text-xs text-[#5B4B6B]">Expected Arrival Countdown</p>
                <p className="mt-1 text-3xl font-bold font-mono tabular-nums text-[#1E122B]">
                  {arrivalTimer?.label}
                </p>
                <p className="mt-1 text-xs text-[#6B5B7B] tabular-nums">
                  ETA:{" "}
                  {new Date(activeJourney.expectedArrivalAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={submitting}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I&apos;m Safe — Check In Now</span>
              </button>

              {!isMissed && (
                <button
                  type="button"
                  onClick={handleSimulateMissedForTesting}
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#EAE2F0] bg-white hover:bg-[#F8F4FC] text-xs font-medium text-[#5B4B6B] cursor-pointer whitespace-nowrap"
                >
                  Preview Missed Check-In Alert
                </button>
              )}
            </div>

            {/* Option to contact trusted people directly */}
            <div className="pt-4 border-t border-[#EAE2F0]">
              <h4 className="text-sm font-semibold text-[#1E122B] mb-3">
                Contact Trusted People About This Journey
              </h4>
              {contacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-2xl border border-[#EAE2F0] p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1E122B] truncate">
                          {contact.name}
                        </p>
                        <p className="text-xs text-[#5B4B6B] font-mono tabular-nums truncate">
                          {contact.phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={buildSmsHref(
                            contact.phone,
                            `SHE-GUARD Journey Update: Travelling to ${activeJourney.destination}. Expected arrival around ${new Date(
                              activeJourney.expectedArrivalAt
                            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                          )}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-[#F8F4FC] text-xs font-semibold text-[#5B21B6] inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>
                        <a
                          href={buildTelHref(contact.phone)}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-[#6D28D9] text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#5B4B6B]">
                  No trusted contacts added yet. Visit Trusted Contacts to add emergency contacts.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <form
          onSubmit={handleStartJourney}
          className="bg-white border border-[#EAE2F0] rounded-3xl p-6 sm:p-8 space-y-5"
        >
          <div className="flex items-center gap-2.5">
            <Clock3 className="w-5 h-5 text-[#6D28D9]" />
            <h3 className="text-lg font-bold text-[#1E122B]">Start a Monitored Journey</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="journey-title"
                className="block text-sm font-medium text-[#1E122B] mb-1.5"
              >
                Journey Label
              </label>
              <input
                id="journey-title"
                type="text"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Late Evening Metro Ride"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label
                htmlFor="journey-dest"
                className="block text-sm font-medium text-[#1E122B] mb-1.5"
              >
                Destination
              </label>
              <input
                id="journey-dest"
                type="text"
                required
                maxLength={200}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g., Indiranagar Apartment"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label
                htmlFor="journey-eta"
                className="block text-sm font-medium text-[#1E122B] mb-1.5"
              >
                Expected Travel Duration
              </label>
              <select
                id="journey-eta"
                value={etaMinutes}
                onChange={(e) => setEtaMinutes(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="journey-interval"
                className="block text-sm font-medium text-[#1E122B] mb-1.5"
              >
                Safety Check-In Reminder Interval
              </label>
              <select
                id="journey-interval"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 60 minutes</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !isOnline}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Starting Journey..." : "Start Journey Monitoring"}
          </button>
        </form>
      )}

      {/* Past Journeys Log */}
      <section className="bg-white border border-[#EAE2F0] rounded-3xl p-6">
        <h3 className="text-lg font-bold text-[#1E122B] pb-4 border-b border-[#EAE2F0]">
          Past Monitored Journeys
        </h3>
        {pastJourneys.length > 0 ? (
          <div className="divide-y divide-[#EAE2F0]">
            {pastJourneys.map((journey) => (
              <div
                key={journey.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1E122B]">{journey.title}</p>
                  <p className="text-xs text-[#5B4B6B]">
                    {journey.destination} · Interval {journey.checkInIntervalMinutes}m · Missed
                    check-ins: {journey.missedCheckInCount}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#5B21B6] capitalize">
                  {journey.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-sm text-[#5B4B6B]">
            Completed journeys will appear here for your personal records.
          </p>
        )}
      </section>
    </div>
  );
}
