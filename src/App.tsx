import React, { useEffect, useMemo, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { DashboardPage } from "./components/DashboardPage";
import { TrustedContactsPage } from "./components/TrustedContactsPage";
import { JourneyMonitorPage } from "./components/JourneyMonitorPage";
import { AiDistressPage } from "./components/AiDistressPage";
import { SosHistoryPage } from "./components/SosHistoryPage";
import { ProfilePage } from "./components/ProfilePage";
import { NavigationShell } from "./components/NavigationShell";
import { SosConfirmationModal } from "./components/SosConfirmationModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { loadOfflineSosQueue, removeOfflineSosDraft } from "./lib/safetyUtils";
import {
  createSosAlert,
  subscribeJourneys,
  subscribeSosAlerts,
  subscribeTrustedContacts,
} from "./services/firestoreService";
import type {
  AppRoute,
  JourneySession,
  SosAlert,
  TriggerSource,
  TrustedContact,
} from "./types/sheguard";

function SheGuardWorkspace() {
  const { user, profile, authReady, isVerified, logout } = useAuth();
  const [activeRoute, setActiveRoute] = useState<AppRoute>("dashboard");
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [journeys, setJourneys] = useState<JourneySession[]>([]);
  const [offlineAlerts, setOfflineAlerts] = useState<SosAlert[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // SOS confirmation modal state
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosTriggerSource, setSosTriggerSource] = useState<TriggerSource>("manual_sos");
  const [sosInitialNote, setSosInitialNote] = useState<string | undefined>(undefined);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Load offline SOS queue for this user and sync when online
  useEffect(() => {
    if (!user || !isVerified) {
      setOfflineAlerts([]);
      return;
    }
    const queue = loadOfflineSosQueue(user.uid);
    setOfflineAlerts(queue);

    if (isOnline && queue.length > 0) {
      queue.forEach(async (draft) => {
        try {
          await createSosAlert(user.uid, draft);
          removeOfflineSosDraft(draft.id);
          setOfflineAlerts((prev) => prev.filter((item) => item.id !== draft.id));
        } catch (err) {
          console.error("Failed to sync offline SOS draft:", err);
        }
      });
    }
  }, [user, isVerified, isOnline]);

  // Subscribe to Firestore collections only once auth is ready & email is verified
  useEffect(() => {
    if (!authReady || !user || !isVerified) {
      setContacts([]);
      setAlerts([]);
      setJourneys([]);
      return;
    }

    const unsubContacts = subscribeTrustedContacts(user.uid, setContacts, (err) =>
      console.error("Contacts sync error:", err)
    );
    const unsubAlerts = subscribeSosAlerts(user.uid, setAlerts, (err) =>
      console.error("SOS alerts sync error:", err)
    );
    const unsubJourneys = subscribeJourneys(user.uid, setJourneys, (err) =>
      console.error("Journeys sync error:", err)
    );

    return () => {
      unsubContacts();
      unsubAlerts();
      unsubJourneys();
    };
  }, [authReady, user, isVerified]);

  const activeJourney = useMemo(
    () =>
      journeys.find((j) => j.status === "active" || j.status === "checkin_missed") || null,
    [journeys]
  );

  const missedJourneyActive = useMemo(() => {
    if (!activeJourney) return false;
    if (activeJourney.status === "checkin_missed") return true;
    const nextMs = new Date(activeJourney.nextCheckInAt).getTime();
    return !Number.isNaN(nextMs) && Date.now() > nextMs;
  }, [activeJourney]);

  const openSosModal = (source: TriggerSource = "manual_sos", note?: string) => {
    setSosTriggerSource(source);
    setSosInitialNote(note);
    setSosModalOpen(true);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FDFBFE] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-xl font-extrabold text-[#5B21B6]">SHE-GUARD</p>
          <p className="text-sm text-[#5B4B6B]">Loading your safety dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !isVerified) {
    return <AuthScreen />;
  }

  return (
    <>
      <NavigationShell
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        onTriggerSos={() => openSosModal("manual_sos")}
        onLogout={logout}
        profile={profile}
        userEmail={user.email}
        isOnline={isOnline}
        offlinePendingCount={offlineAlerts.length}
        missedJourneyActive={missedJourneyActive}
      >
        {activeRoute === "dashboard" && (
          <DashboardPage
            profile={profile}
            contacts={contacts}
            alerts={alerts}
            activeJourney={activeJourney}
            onTriggerSos={() => openSosModal("manual_sos")}
            onNavigate={setActiveRoute}
          />
        )}

        {activeRoute === "contacts" && (
          <TrustedContactsPage
            userId={user.uid}
            profile={profile}
            contacts={contacts}
            isOnline={isOnline}
          />
        )}

        {activeRoute === "journey" && (
          <JourneyMonitorPage
            userId={user.uid}
            journeys={journeys}
            activeJourney={activeJourney}
            contacts={contacts}
            isOnline={isOnline}
            onTriggerSosFromJourney={(note) => openSosModal("journey_missed_checkin", note)}
          />
        )}

        {activeRoute === "ai-check" && (
          <AiDistressPage
            isOnline={isOnline}
            onSuggestOpenSos={(note) => openSosModal("manual_sos", note)}
          />
        )}

        {activeRoute === "history" && (
          <SosHistoryPage
            userId={user.uid}
            alerts={alerts}
            offlineAlerts={offlineAlerts}
            isOnline={isOnline}
          />
        )}

        {activeRoute === "profile" && (
          <ProfilePage
            userId={user.uid}
            userEmail={user.email}
            profile={profile}
            isOnline={isOnline}
            onLogout={logout}
          />
        )}
      </NavigationShell>

      <SosConfirmationModal
        open={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        userId={user.uid}
        profile={profile}
        contacts={contacts}
        isOnline={isOnline}
        triggerSource={sosTriggerSource}
        initialNote={sosInitialNote}
        onAlertRecorded={(savedAlert, savedOffline) => {
          if (savedOffline) {
            setOfflineAlerts((prev) => [
              { ...savedAlert, pendingOfflineSync: true },
              ...prev.filter((item) => item.id !== savedAlert.id),
            ]);
          }
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SheGuardWorkspace />
    </AuthProvider>
  );
}
