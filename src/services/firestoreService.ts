import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { truncateText } from "../lib/safetyUtils";
import type {
  JourneySession,
  SosAlert,
  TrustedContact,
  UserProfile,
} from "../types/sheguard";

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const initialProfile: UserProfile = {
      uid: user.uid,
      fullName: truncateText(user.displayName || user.email?.split("@")[0] || "SHE-GUARD User", 100),
      email: truncateText(user.email || "user@example.com", 150),
      phoneNumber: truncateText(user.phoneNumber || "", 32),
      bloodGroup: "",
      medicalNotes: "",
      homeAddress: "",
      emergencyMessage:
        "Emergency SOS from SHE-GUARD: I need help right away. Please check my location link and call me.",
      platform: "web",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, initialProfile);
    return initialProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<
      UserProfile,
      | "fullName"
      | "email"
      | "phoneNumber"
      | "bloodGroup"
      | "medicalNotes"
      | "homeAddress"
      | "emergencyMessage"
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, "users", uid);
  try {
    await updateDoc(ref, {
      fullName: truncateText(updates.fullName || "SHE-GUARD User", 100),
      email: truncateText(updates.email || "", 150),
      phoneNumber: truncateText(updates.phoneNumber || "", 32),
      bloodGroup: truncateText(updates.bloodGroup || "", 16),
      medicalNotes: truncateText(updates.medicalNotes || "", 500),
      homeAddress: truncateText(updates.homeAddress || "", 250),
      emergencyMessage: truncateText(updates.emergencyMessage || "", 300),
      platform: "web",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeTrustedContacts(
  uid: string,
  onData: (contacts: TrustedContact[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/trustedContacts`;
  const q = query(collection(db, "users", uid, "trustedContacts"), where("userId", "==", uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => d.data() as TrustedContact);
      rows.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveTrustedContact(
  uid: string,
  contact: Omit<TrustedContact, "userId" | "createdAt" | "updatedAt">,
  isEdit: boolean
): Promise<void> {
  const path = `users/${uid}/trustedContacts/${contact.id}`;
  const ref = doc(db, "users", uid, "trustedContacts", contact.id);
  const safePriority = Math.min(10, Math.max(1, Math.round(Number(contact.priority) || 1)));
  try {
    if (isEdit) {
      await updateDoc(ref, {
        name: truncateText(contact.name, 80),
        phone: truncateText(contact.phone, 32),
        relationship: truncateText(contact.relationship, 60),
        priority: safePriority,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: contact.id,
        userId: uid,
        name: truncateText(contact.name, 80),
        phone: truncateText(contact.phone, 32),
        relationship: truncateText(contact.relationship, 60),
        priority: safePriority,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteTrustedContact(uid: string, contactId: string): Promise<void> {
  const path = `users/${uid}/trustedContacts/${contactId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "trustedContacts", contactId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeSosAlerts(
  uid: string,
  onData: (alerts: SosAlert[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/sosAlerts`;
  const q = query(collection(db, "users", uid, "sosAlerts"), where("userId", "==", uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => d.data() as SosAlert);
      rows.sort((a, b) => {
        const aSec = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
        const bSec = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
        return bSec - aSec;
      });
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createSosAlert(uid: string, alert: Omit<SosAlert, "userId" | "createdAt" | "updatedAt">): Promise<void> {
  const path = `users/${uid}/sosAlerts/${alert.id}`;
  const ref = doc(db, "users", uid, "sosAlerts", alert.id);
  try {
    await setDoc(ref, {
      id: alert.id,
      userId: uid,
      dateLabel: truncateText(alert.dateLabel, 40),
      timeLabel: truncateText(alert.timeLabel, 40),
      latitude: Math.min(90, Math.max(-90, Number(alert.latitude) || 0)),
      longitude: Math.min(180, Math.max(-180, Number(alert.longitude) || 0)),
      accuracyMeters: Math.min(1000000, Math.max(0, Math.round(Number(alert.accuracyMeters) || 0))),
      locationAvailable: Boolean(alert.locationAvailable),
      mapsUrl: truncateText(alert.mapsUrl, 300),
      locationSummary: truncateText(alert.locationSummary || "Location unavailable", 200),
      triggerSource: alert.triggerSource,
      status: "recorded",
      message: truncateText(alert.message, 300),
      contactedCount: Math.min(50, Math.max(0, Math.round(Number(alert.contactedCount) || 0))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function resolveSosAlert(uid: string, alertId: string): Promise<void> {
  const path = `users/${uid}/sosAlerts/${alertId}`;
  try {
    await updateDoc(doc(db, "users", uid, "sosAlerts", alertId), {
      status: "resolved",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSosAlert(uid: string, alertId: string): Promise<void> {
  const path = `users/${uid}/sosAlerts/${alertId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "sosAlerts", alertId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeJourneys(
  uid: string,
  onData: (journeys: JourneySession[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/journeys`;
  const q = query(collection(db, "users", uid, "journeys"), where("userId", "==", uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => d.data() as JourneySession);
      rows.sort((a, b) => {
        const aSec = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
        const bSec = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
        return bSec - aSec;
      });
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function startJourneySession(
  uid: string,
  journey: Omit<JourneySession, "userId" | "createdAt" | "updatedAt">
): Promise<void> {
  const path = `users/${uid}/journeys/${journey.id}`;
  try {
    await setDoc(doc(db, "users", uid, "journeys", journey.id), {
      id: journey.id,
      userId: uid,
      title: truncateText(journey.title, 100),
      destination: truncateText(journey.destination, 200),
      expectedArrivalAt: truncateText(journey.expectedArrivalAt, 40),
      checkInIntervalMinutes: Math.min(240, Math.max(5, Math.round(journey.checkInIntervalMinutes))),
      nextCheckInAt: truncateText(journey.nextCheckInAt, 40),
      lastCheckInAt: truncateText(journey.lastCheckInAt, 40),
      missedCheckInCount: 0,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function checkInJourneySession(
  uid: string,
  journeyId: string,
  intervalMinutes: number
): Promise<void> {
  const path = `users/${uid}/journeys/${journeyId}`;
  const now = new Date();
  const next = new Date(now.getTime() + intervalMinutes * 60 * 1000);
  try {
    await updateDoc(doc(db, "users", uid, "journeys", journeyId), {
      status: "active",
      lastCheckInAt: now.toISOString(),
      nextCheckInAt: next.toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markJourneyMissedCheckIn(
  uid: string,
  journeyId: string,
  nextMissedCount: number
): Promise<void> {
  const path = `users/${uid}/journeys/${journeyId}`;
  try {
    await updateDoc(doc(db, "users", uid, "journeys", journeyId), {
      status: "checkin_missed",
      missedCheckInCount: Math.min(1000, Math.max(1, nextMissedCount)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function completeJourneySession(
  uid: string,
  journeyId: string,
  finalStatus: "completed" | "escalated"
): Promise<void> {
  const path = `users/${uid}/journeys/${journeyId}`;
  try {
    await updateDoc(doc(db, "users", uid, "journeys", journeyId), {
      status: finalStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
