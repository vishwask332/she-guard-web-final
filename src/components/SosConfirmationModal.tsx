import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Share2,
  ShieldAlert,
  WifiOff,
  X,
} from "lucide-react";
import {
  buildSmsHref,
  buildTelHref,
  captureCurrentGpsLocation,
  formatSosDateTime,
  generateSafeId,
  saveOfflineSosDraft,
  truncateText,
} from "../lib/safetyUtils";
import { createSosAlert } from "../services/firestoreService";
import type {
  GpsCaptureResult,
  SosAlert,
  TriggerSource,
  TrustedContact,
  UserProfile,
} from "../types/sheguard";

interface SosConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  profile: UserProfile | null;
  contacts: TrustedContact[];
  isOnline: boolean;
  triggerSource: TriggerSource;
  initialNote?: string;
  onAlertRecorded?: (alert: SosAlert, savedOffline: boolean) => void;
}

export function SosConfirmationModal({
  open,
  onClose,
  userId,
  profile,
  contacts,
  isOnline,
  triggerSource,
  initialNote,
  onAlertRecorded,
}: SosConfirmationModalProps) {
  const [step, setStep] = useState<"confirm" | "recorded">("confirm");
  const [gps, setGps] = useState<GpsCaptureResult | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recordedAlert, setRecordedAlert] = useState<SosAlert | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchLocation = async () => {
    setCapturingGps(true);
    const result = await captureCurrentGpsLocation();
    setGps(result);
    setCapturingGps(false);
  };

  useEffect(() => {
    if (!open) return;
    setStep("confirm");
    setRecordedAlert(null);
    setSavedOffline(false);
    setCopied(false);
    setSubmitError(null);
    setCustomMessage(
      initialNote ||
        profile?.emergencyMessage ||
        "Emergency SOS from SHE-GUARD: I need immediate assistance. Please check my location link and call me."
    );
    fetchLocation();
  }, [open, initialNote, profile?.emergencyMessage]);

  if (!open) return null;

  const handleConfirmSos = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const now = new Date();
    const { dateLabel, timeLabel } = formatSosDateTime(now);
    const alertId = generateSafeId("sos");
    const safeMsg = truncateText(
      customMessage || "Emergency SOS triggered from SHE-GUARD.",
      300
    );

    const payload: SosAlert = {
      id: alertId,
      userId,
      dateLabel,
      timeLabel,
      latitude: gps?.available ? gps.latitude : 0,
      longitude: gps?.available ? gps.longitude : 0,
      accuracyMeters: gps?.available ? gps.accuracyMeters : 0,
      locationAvailable: Boolean(gps?.available),
      mapsUrl: gps?.mapsUrl || "",
      locationSummary: gps?.summary || "Location permission not granted",
      triggerSource,
      status: "recorded",
      message: safeMsg,
      contactedCount: contacts.length,
    };

    try {
      if (!isOnline) {
        saveOfflineSosDraft(payload);
        setRecordedAlert({ ...payload, pendingOfflineSync: true });
        setSavedOffline(true);
        setStep("recorded");
        onAlertRecorded?.(payload, true);
      } else {
        await createSosAlert(userId, payload);
        setRecordedAlert(payload);
        setSavedOffline(false);
        setStep("recorded");
        onAlertRecorded?.(payload, false);
      }
    } catch (err) {
      // Fall back to offline local vault so the SOS record is never lost
      saveOfflineSosDraft(payload);
      setRecordedAlert({ ...payload, pendingOfflineSync: true });
      setSavedOffline(true);
      setStep("recorded");
      setSubmitError(
        "Cloud sync was interrupted, so this SOS alert was safely queued on your device and will sync automatically when online."
      );
      console.error("SOS Firestore write fallback:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const fullSmsText = recordedAlert
    ? `${recordedAlert.message}${
        recordedAlert.mapsUrl ? ` My GPS location: ${recordedAlert.mapsUrl}` : ""
      }`
    : "";

  const handleCopyLocation = async () => {
    if (!recordedAlert?.mapsUrl) return;
    try {
      await navigator.clipboard.writeText(fullSmsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked
    }
  };

  const handleNativeShare = async () => {
    if (!recordedAlert || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "SHE-GUARD Emergency SOS",
        text: fullSmsText,
        url: recordedAlert.mapsUrl || undefined,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1E122B]/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-modal-title"
    >
      <div className="w-full sm:max-w-xl bg-white border border-[#EAE2F0] rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EAE2F0]">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                step === "confirm"
                  ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                  : "bg-[#F8F4FC] text-[#6D28D9] border border-[#DDD6FE]"
              }`}
            >
              {step === "confirm" ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 id="sos-modal-title" className="text-xl font-bold text-[#1E122B]">
                {step === "confirm"
                  ? "Confirm Emergency SOS"
                  : "SOS Recorded — Contact Trusted People"}
              </h2>
              <p className="text-xs text-[#5B4B6B] mt-0.5">
                {step === "confirm"
                  ? "Review your GPS location and message before recording the alert."
                  : "Use the SMS or Call buttons below to send help requests from your device."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close SOS dialog"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#5B4B6B] hover:bg-[#F8F4FC] hover:text-[#1E122B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "confirm" ? (
          <div className="mt-5 space-y-5">
            {!isOnline && (
              <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3.5 flex items-start gap-3 text-sm text-[#92400E]">
                <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Internet connection unavailable</p>
                  <p className="text-xs mt-0.5">
                    You can still record this SOS locally and launch your phone&apos;s SMS or Call
                    app immediately.
                  </p>
                </div>
              </div>
            )}

            {/* GPS Capture Panel */}
            <div className="rounded-2xl bg-[#F8F4FC] border border-[#EAE2F0] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#6D28D9] shrink-0" />
                  <span className="text-sm font-semibold text-[#1E122B]">
                    GPS Location Permission & Capture
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchLocation}
                  disabled={capturingGps}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white border border-[#DDD6FE] text-xs font-medium text-[#5B21B6] hover:bg-[#EDE9FE] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${capturingGps ? "animate-spin" : ""}`} />
                  {capturingGps ? "Locating..." : "Refresh GPS"}
                </button>
              </div>

              <div className="mt-3 text-sm">
                {capturingGps && !gps && (
                  <p className="text-[#5B4B6B]">
                    Requesting browser location permission and acquiring GPS coordinates...
                  </p>
                )}
                {gps?.available && (
                  <div className="space-y-1.5">
                    <p className="font-mono text-xs text-[#1E122B] tabular-nums">
                      Coordinates: {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)} (±
                      {gps.accuracyMeters}m accuracy)
                    </p>
                    <a
                      href={gps.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6D28D9] hover:underline"
                    >
                      <span>Preview Google Maps Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {gps && !gps.available && (
                  <p className="text-xs text-[#9D174D]">
                    {gps.summary} You can still confirm SOS and notify trusted contacts without GPS
                    coordinates, or allow location permission in your browser settings and tap
                    Refresh GPS.
                  </p>
                )}
              </div>
            </div>

            {/* Emergency Message */}
            <div>
              <label
                htmlFor="sos-custom-msg"
                className="block text-sm font-semibold text-[#1E122B] mb-1.5"
              >
                Emergency Message
              </label>
              <textarea
                id="sos-custom-msg"
                rows={3}
                maxLength={300}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] p-3 text-sm text-[#1E122B] focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
              />
              <p className="text-xs text-[#6B5B7B] mt-1 tabular-nums">
                {customMessage.length}/300 characters
              </p>
            </div>

            {/* Trusted Contacts Preview */}
            <div className="text-xs text-[#5B4B6B] bg-[#FDF2F7] border border-[#FBCFE8] rounded-xl p-3.5">
              {contacts.length > 0 ? (
                <p>
                  <strong className="text-[#9D174D]">{contacts.length} trusted contact(s)</strong>{" "}
                  ready for one-tap SMS and Call outreach immediately after confirmation.
                </p>
              ) : (
                <p>
                  No trusted contacts saved yet. After confirming, you can copy your SOS message
                  or call local emergency services directly.
                </p>
              )}
            </div>

            {/* Confirmation Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[48px] px-5 py-3 rounded-xl border border-[#EAE2F0] bg-white hover:bg-[#F8F4FC] text-sm font-semibold text-[#4A3B5C] transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSos}
                disabled={submitting}
                className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{submitting ? "Recording SOS..." : "Confirm & Record SOS Alert"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {submitError && (
              <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3.5 text-xs text-[#92400E]">
                {submitError}
              </div>
            )}

            <div className="rounded-2xl bg-[#F8F4FC] border border-[#EAE2F0] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#5B4B6B] tabular-nums">
                <span className="font-semibold text-[#1E122B]">
                  {savedOffline ? "Saved Offline (Pending Cloud Sync)" : "Saved to SOS History"}
                </span>
                <span aria-hidden="true">·</span>
                <span>{recordedAlert?.dateLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{recordedAlert?.timeLabel}</span>
              </div>
              <p className="text-sm text-[#1E122B]">{recordedAlert?.message}</p>
              {recordedAlert?.mapsUrl ? (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={recordedAlert.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D28D9] hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Open Google Maps Location</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLocation}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9D174D] hover:underline cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? "Copied SOS + Map Link" : "Copy SOS + Map Link"}</span>
                  </button>
                  {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B21B6] hover:underline cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share via Device</span>
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#6B5B7B]">{recordedAlert?.locationSummary}</p>
              )}
            </div>

            {contacts.length > 0 && (
              <a
                href={buildSmsHref(contacts[0].phone, fullSmsText)}
                className="w-full min-h-[54px] px-5 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-bold inline-flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Open SMS to {contacts[0].name}</span>
              </a>
            )}

            {/* Honest Delivery Notice */}
            <div className="rounded-xl bg-[#FDF2F7] border border-[#FBCFE8] p-3.5 text-xs text-[#831843] leading-relaxed">
              <strong>Important Safety Notice:</strong> Your SOS record has been saved to your
              history, not automatically transmitted to emergency responders. Tap an SMS or Call
              button below to launch your phone&apos;s messaging or dialer app, and dial local
              emergency services (e.g., 112 / 911 / 100) if you are in immediate danger.
            </div>

            {/* Trusted Contacts Outreach List */}
            <div>
              <h3 className="text-sm font-semibold text-[#1E122B] mb-2.5">
                Notify Trusted Contacts
              </h3>
              {contacts.length > 0 ? (
                <div className="divide-y divide-[#EAE2F0] border border-[#EAE2F0] rounded-2xl overflow-hidden">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#1E122B]">{contact.name}</p>
                        <p className="text-xs text-[#5B4B6B] font-mono tabular-nums">
                          {contact.relationship || "Trusted Contact"} · {contact.phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={buildSmsHref(contact.phone, fullSmsText)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send SMS</span>
                        </a>
                        <a
                          href={buildTelHref(contact.phone)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
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
                  Add trusted contacts on the Contacts page to enable one-tap SMS and Call buttons
                  here.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#1E122B] hover:bg-[#312042] text-white text-sm font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
