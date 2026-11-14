import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Clock3,
  ExternalLink,
  History,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import {
  buildSmsHref,
  buildTelHref,
  captureCurrentGpsLocation,
  formatCountdown,
  queryLocationPermissionState,
} from "../lib/safetyUtils";
import type {
  AppRoute,
  GpsCaptureResult,
  JourneySession,
  SosAlert,
  TrustedContact,
  UserProfile,
} from "../types/sheguard";

interface DashboardPageProps {
  profile: UserProfile | null;
  contacts: TrustedContact[];
  alerts: SosAlert[];
  activeJourney: JourneySession | null;
  onTriggerSos: () => void;
  onNavigate: (route: AppRoute) => void;
}

export function DashboardPage({
  profile,
  contacts,
  alerts,
  activeJourney,
  onTriggerSos,
  onNavigate,
}: DashboardPageProps) {
  const [permissionState, setPermissionState] = useState<string>("prompt");
  const [quickGps, setQuickGps] = useState<GpsCaptureResult | null>(null);
  const [checkingGps, setCheckingGps] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    queryLocationPermissionState().then(setPermissionState);
  }, []);

  useEffect(() => {
    if (!activeJourney) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeJourney]);

  const handleCheckLocation = async () => {
    setCheckingGps(true);
    const res = await captureCurrentGpsLocation();
    setQuickGps(res);
    setPermissionState(res.permissionState);
    setCheckingGps(false);
  };

  const journeyCountdown = activeJourney
    ? formatCountdown(activeJourney.nextCheckInAt, nowMs)
    : null;
  const isMissed =
    activeJourney?.status === "checkin_missed" || Boolean(journeyCountdown?.isOverdue);

  const quickSmsMessage = `${
    profile?.emergencyMessage || "Checking in from SHE-GUARD."
  }${quickGps?.mapsUrl ? ` Location: ${quickGps.mapsUrl}` : ""}`;

  return (
    <div className="space-y-8">
      {/* Missed Journey Warning Banner if active */}
      {activeJourney && isMissed && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-[#991B1B]">
                Missed Safety Confirmation — {activeJourney.title}
              </h2>
              <p className="text-sm text-[#7F1D1D] mt-0.5">
                Your scheduled safety check-in for destination{" "}
                <strong>{activeJourney.destination}</strong> is overdue. Confirm you are safe or
                notify trusted contacts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("journey")}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#FECACA] text-sm font-semibold text-[#991B1B] hover:bg-[#FEE2E2] cursor-pointer whitespace-nowrap"
            >
              Open Journey Monitor
            </button>
            <button
              type="button"
              onClick={onTriggerSos}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold cursor-pointer whitespace-nowrap"
            >
              Activate SOS
            </button>
          </div>
        </div>
      )}

      {/* Dominant Focal Anchor: Primary SOS Hero + Location Readiness */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-[#EAE2F0] rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5B4B6B]">
              <span>Welcome, {profile?.fullName || "SHE-GUARD User"}</span>
              <span aria-hidden="true">·</span>
              <span>Manual SOS operates independently of AI</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1E122B] [text-wrap:balance]">
              Immediate Emergency Response
            </h2>
            <p className="mt-2 text-sm text-[#4A3B5C] max-w-xl leading-relaxed">
              Press the red SOS button to capture your GPS coordinates, generate a Google Maps link,
              save a permanent alert log, and message or call your trusted contacts after confirmation.
            </p>
          </div>

          <div className="my-8 flex flex-col sm:flex-row items-center gap-6">
            <button
              type="button"
              onClick={onTriggerSos}
              className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white flex flex-col items-center justify-center gap-2 shadow-lg shadow-[#DC2626]/20 transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FCA5A5]"
            >
              <ShieldAlert className="w-11 h-11" />
              <span className="text-2xl font-extrabold tracking-tight">SOS</span>
              <span className="text-xs font-medium text-white/90">Tap for Help</span>
            </button>

            <div className="space-y-3 text-sm text-[#4A3B5C]">
              <p className="font-semibold text-[#1E122B]">What happens when you press SOS:</p>
              <ul className="space-y-2 text-xs sm:text-sm text-[#5B4B6B]">
                <li>1. Asks for your confirmation before recording an alert.</li>
                <li>2. Captures GPS coordinates and creates a Google Maps link.</li>
                <li>3. Opens one-tap SMS and Call links for your trusted contacts.</li>
              </ul>
            </div>
          </div>

          {/* Location Permission & Quick Check */}
          <div className="pt-5 border-t border-[#EAE2F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-[#5B4B6B]">
              <MapPin className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
              <div>
                {quickGps?.available ? (
                  <div className="space-y-0.5">
                    <p className="font-medium text-[#1E122B] font-mono tabular-nums">
                      GPS ready: {quickGps.summary}
                    </p>
                    <a
                      href={quickGps.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#6D28D9] font-medium hover:underline"
                    >
                      <span>View on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p>
                    Location access: <strong className="text-[#1E122B]">{permissionState}</strong>
                    {quickGps?.errorMessage ? ` — ${quickGps.summary}` : ""}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCheckLocation}
              disabled={checkingGps}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F8F4FC] hover:bg-[#EDE9FE] text-xs font-semibold text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {checkingGps ? "Requesting GPS..." : "Test GPS Permission"}
            </button>
          </div>
        </div>

        {/* Right Column: Safety Readiness & Journey Shortcut */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Active Journey Card */}
          <div className="bg-[#F8F4FC] border border-[#EAE2F0] rounded-3xl p-6 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-[#1E122B] flex items-center gap-2">
                  <Clock3 className="w-5 h-5 text-[#6D28D9]" />
                  <span>Journey Monitoring</span>
                </h3>
                <span className="text-xs font-medium text-[#5B21B6]">
                  {activeJourney ? (isMissed ? "Missed Check-In" : "Active") : "Idle"}
                </span>
              </div>

              {activeJourney ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-base font-semibold text-[#1E122B]">
                      {activeJourney.title}
                    </p>
                    <p className="text-xs text-[#5B4B6B]">
                      Destination: {activeJourney.destination}
                    </p>
                  </div>
                  <div className="bg-white border border-[#EAE2F0] rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#5B4B6B]">Next Safety Check-In</p>
                      <p
                        className={`text-2xl font-bold font-mono tabular-nums ${
                          isMissed ? "text-[#DC2626]" : "text-[#5B21B6]"
                        }`}
                      >
                        {journeyCountdown?.label}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate("journey")}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Check In
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#4A3B5C] leading-relaxed">
                  Travelling alone or commuting late? Set your destination, expected arrival time,
                  and safety check-in reminders.
                </p>
              )}
            </div>

            {!activeJourney && (
              <button
                type="button"
                onClick={() => onNavigate("journey")}
                className="mt-5 w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Start a Monitored Journey
              </button>
            )}
          </div>

          {/* AI Distress Text Check Shortcut */}
          <div className="bg-[#FDF2F7] border border-[#FBCFE8] rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#1E122B] flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-[#DB2777]" />
                <span>AI Distress Text Check</span>
              </h3>
              <p className="mt-2 text-sm text-[#4A3B5C] leading-relaxed">
                Voluntarily paste or type a concerning message to check for distress cues. Never
                reads private chats or sends SOS automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("ai-check")}
              className="mt-5 w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-[#FCE7F3] border border-[#FBCFE8] text-sm font-semibold text-[#9D174D] transition-colors cursor-pointer"
            >
              Open AI Distress Check
            </button>
          </div>
        </div>
      </section>

      {/* Summary Metrics Strip (Single Clean Row) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate("contacts")}
          className="text-left bg-white border border-[#EAE2F0] hover:border-[#C4B5FD] rounded-2xl p-5 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#5B4B6B]">
            <span>Trusted Contacts</span>
            <Users className="w-4 h-4 text-[#6D28D9]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#1E122B] tabular-nums">{contacts.length}</p>
          <p className="mt-1 text-xs text-[#5B4B6B]">Ready for SMS & Call outreach</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("history")}
          className="text-left bg-white border border-[#EAE2F0] hover:border-[#C4B5FD] rounded-2xl p-5 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#5B4B6B]">
            <span>Permanent SOS Records</span>
            <History className="w-4 h-4 text-[#DB2777]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#1E122B] tabular-nums">{alerts.length}</p>
          <p className="mt-1 text-xs text-[#5B4B6B]">
            {alerts.length > 0
              ? `Latest: ${alerts[0].dateLabel}`
              : "No SOS alerts recorded"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("profile")}
          className="text-left bg-white border border-[#EAE2F0] hover:border-[#C4B5FD] rounded-2xl p-5 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#5B4B6B]">
            <span>Emergency Profile</span>
            <MapPin className="w-4 h-4 text-[#6D28D9]" />
          </div>
          <p className="mt-2 text-lg font-bold text-[#1E122B] truncate">
            {profile?.phoneNumber ? profile.phoneNumber : "Add Phone Number"}
          </p>
          <p className="mt-1 text-xs text-[#5B4B6B] truncate">
            {profile?.bloodGroup ? `Blood Group: ${profile.bloodGroup}` : "Update medical notes"}
          </p>
        </button>
      </section>

      {/* Quick Trusted Contacts Strip */}
      <section className="bg-white border border-[#EAE2F0] rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE2F0]">
          <div>
            <h3 className="text-lg font-bold text-[#1E122B]">Quick Contact Outreach</h3>
            <p className="text-xs text-[#5B4B6B]">
              Reach your priority trusted contacts directly via SMS or Phone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("contacts")}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F8F4FC] hover:bg-[#EDE9FE] text-xs font-semibold text-[#5B21B6] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Manage Contacts</span>
          </button>
        </div>

        {contacts.length > 0 ? (
          <div className="divide-y divide-[#EAE2F0]">
            {contacts.slice(0, 4).map((contact) => (
              <div
                key={contact.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1E122B]">{contact.name}</p>
                  <p className="text-xs text-[#5B4B6B] font-mono tabular-nums">
                    {contact.relationship || "Trusted Contact"} · {contact.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={buildSmsHref(contact.phone, quickSmsMessage)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F8F4FC] hover:bg-[#EDE9FE] text-xs font-semibold text-[#5B21B6] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>SMS</span>
                  </a>
                  <a
                    href={buildTelHref(contact.phone)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-[#5B4B6B]">
              You haven&apos;t added any trusted contacts yet.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("contacts")}
              className="mt-3 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold cursor-pointer"
            >
              Add First Trusted Contact
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
