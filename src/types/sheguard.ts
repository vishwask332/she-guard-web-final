export type DistressLevel = "none" | "low" | "moderate" | "high";

export type TriggerSource = "manual_sos" | "journey_missed_checkin";

export type SosStatus = "recorded" | "resolved";

export type JourneyStatus = "active" | "checkin_missed" | "completed" | "escalated";

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  bloodGroup?: string;
  medicalNotes?: string;
  homeAddress?: string;
  emergencyMessage?: string;
  platform: "web" | "android";
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SosAlert {
  id: string;
  userId: string;
  dateLabel: string;
  timeLabel: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  locationAvailable: boolean;
  mapsUrl: string;
  locationSummary: string;
  triggerSource: TriggerSource;
  status: SosStatus;
  message: string;
  contactedCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  pendingOfflineSync?: boolean;
}

export interface JourneySession {
  id: string;
  userId: string;
  title: string;
  destination: string;
  expectedArrivalAt: string;
  checkInIntervalMinutes: number;
  nextCheckInAt: string;
  lastCheckInAt: string;
  missedCheckInCount: number;
  status: JourneyStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DistressAnalysisResult {
  distressLevel: DistressLevel;
  detectedSignals: string[];
  summary: string;
  recommendedAction: string;
  suggestSosConfirmation: boolean;
}

export interface GpsCaptureResult {
  available: boolean;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  mapsUrl: string;
  summary: string;
  permissionState: "granted" | "denied" | "prompt" | "unavailable" | "error";
  errorMessage?: string;
}

export type AppRoute =
  | "dashboard"
  | "contacts"
  | "journey"
  | "ai-check"
  | "history"
  | "profile";
