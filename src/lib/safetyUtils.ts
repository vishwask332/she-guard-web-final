import type { GpsCaptureResult, SosAlert } from "../types/sheguard";

const OFFLINE_SOS_KEY = "sheguard_offline_sos_queue_v1";

export function generateSafeId(prefix: string): string {
  const raw =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "")
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const combined = `${prefix}_${raw}`.replace(/[^a-zA-Z0-9_-]/g, "");
  return combined.slice(0, 120);
}

export function truncateText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

export function formatSosDateTime(date = new Date()): {
  dateLabel: string;
  timeLabel: string;
} {
  const dateLabel = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return { dateLabel, timeLabel };
}

export function buildSmsHref(phone: string, body: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  const encodedBody = encodeURIComponent(body);
  return `sms:${cleanPhone}?body=${encodedBody}`;
}

export function buildTelHref(phone: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  return `tel:${cleanPhone}`;
}

export async function queryLocationPermissionState(): Promise<
  "granted" | "denied" | "prompt" | "unavailable"
> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "unavailable";
  }
  if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
    return "prompt";
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "prompt";
  }
}

export function captureCurrentGpsLocation(): Promise<GpsCaptureResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({
        available: false,
        latitude: 0,
        longitude: 0,
        accuracyMeters: 0,
        mapsUrl: "",
        summary: "GPS location is not supported in this browser.",
        permissionState: "unavailable",
        errorMessage: "Geolocation API unavailable.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.max(0, Math.round(position.coords.accuracy || 0));
        const mapsUrl = buildGoogleMapsUrl(lat, lng);
        resolve({
          available: true,
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracy,
          mapsUrl,
          summary: `${lat.toFixed(5)}, ${lng.toFixed(5)} (±${accuracy}m)`,
          permissionState: "granted",
        });
      },
      (err) => {
        const isDenied = err.code === err.PERMISSION_DENIED;
        resolve({
          available: false,
          latitude: 0,
          longitude: 0,
          accuracyMeters: 0,
          mapsUrl: "",
          summary: isDenied
            ? "Location permission denied by browser."
            : "Unable to acquire GPS lock right now.",
          permissionState: isDenied ? "denied" : "error",
          errorMessage: err.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      }
    );
  });
}

export function loadOfflineSosQueue(userId: string): SosAlert[] {
  try {
    const raw = localStorage.getItem(OFFLINE_SOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.userId === userId);
  } catch {
    return [];
  }
}

export function saveOfflineSosDraft(alert: SosAlert): void {
  try {
    const raw = localStorage.getItem(OFFLINE_SOS_KEY);
    const existing: SosAlert[] = raw ? JSON.parse(raw) : [];
    const next = [
      { ...alert, pendingOfflineSync: true },
      ...existing.filter((item) => item.id !== alert.id),
    ];
    localStorage.setItem(OFFLINE_SOS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}

export function removeOfflineSosDraft(alertId: string): void {
  try {
    const raw = localStorage.getItem(OFFLINE_SOS_KEY);
    if (!raw) return;
    const existing: SosAlert[] = JSON.parse(raw);
    const next = existing.filter((item) => item.id !== alertId);
    localStorage.setItem(OFFLINE_SOS_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
}

export function formatCountdown(targetIso: string, nowMs = Date.now()): {
  label: string;
  isOverdue: boolean;
  diffMs: number;
} {
  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) {
    return { label: "00:00", isOverdue: false, diffMs: 0 };
  }
  const diffMs = targetMs - nowMs;
  const isOverdue = diffMs < 0;
  const absSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const label =
    hours > 0
      ? `${hours}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  return { label: isOverdue ? `-${label}` : label, isOverdue, diffMs };
}
