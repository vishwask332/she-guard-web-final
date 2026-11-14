import React, { useEffect, useState } from "react";
import { CheckCircle2, Database, Globe, LogOut, Save, UserCircle2 } from "lucide-react";
import {
  activeFirebaseProjectId,
  activeFirestoreDatabaseId,
} from "../lib/firebase";
import { updateUserProfile } from "../services/firestoreService";
import type { UserProfile } from "../types/sheguard";

interface ProfilePageProps {
  userId: string;
  userEmail: string | null;
  profile: UserProfile | null;
  isOnline: boolean;
  onLogout: () => void;
}

export function ProfilePage({
  userId,
  userEmail,
  profile,
  isOnline,
  onLogout,
}: ProfilePageProps) {
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || "");
  const [homeAddress, setHomeAddress] = useState(profile?.homeAddress || "");
  const [medicalNotes, setMedicalNotes] = useState(profile?.medicalNotes || "");
  const [emergencyMessage, setEmergencyMessage] = useState(profile?.emergencyMessage || "");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName || "");
    setPhoneNumber(profile.phoneNumber || "");
    setBloodGroup(profile.bloodGroup || "");
    setHomeAddress(profile.homeAddress || "");
    setMedicalNotes(profile.medicalNotes || "");
    setEmergencyMessage(profile.emergencyMessage || "");
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    setSaving(true);
    setSavedNotice(false);
    setErrorMsg(null);
    try {
      await updateUserProfile(userId, {
        fullName: fullName.trim(),
        email: userEmail || profile?.email || "",
        phoneNumber: phoneNumber.trim(),
        bloodGroup: bloodGroup.trim(),
        homeAddress: homeAddress.trim(),
        medicalNotes: medicalNotes.trim(),
        emergencyMessage: emergencyMessage.trim(),
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E122B]">Emergency Profile & Sync</h2>
          <p className="text-sm text-[#5B4B6B] mt-1">
            Keep your phone number, medical details, and default SOS message up to date.
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-[#EAE2F0] bg-white hover:bg-[#FDF2F7] text-xs font-semibold text-[#9D174D] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Emergency Profile Form */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-[#EAE2F0] rounded-3xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-[#EAE2F0]">
          <UserCircle2 className="w-6 h-6 text-[#6D28D9]" />
          <div>
            <h3 className="text-lg font-bold text-[#1E122B]">Personal & Medical Details</h3>
            <p className="text-xs text-[#5B4B6B]">
              Account: {userEmail || profile?.email} · UID: {userId.slice(0, 12)}...
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3.5 text-sm text-[#B91C1C]"
          >
            {errorMsg}
          </div>
        )}

        {savedNotice && (
          <div className="rounded-xl bg-[#F8F4FC] border border-[#DDD6FE] p-3.5 text-sm text-[#5B21B6] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile saved to Cloud Firestore.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-medium text-[#1E122B] mb-1.5"
            >
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>

          <div>
            <label
              htmlFor="profile-phone"
              className="block text-sm font-medium text-[#1E122B] mb-1.5"
            >
              Phone Number
            </label>
            <input
              id="profile-phone"
              type="tel"
              maxLength={32}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>

          <div>
            <label
              htmlFor="profile-blood"
              className="block text-sm font-medium text-[#1E122B] mb-1.5"
            >
              Blood Group (Optional)
            </label>
            <input
              id="profile-blood"
              type="text"
              maxLength={16}
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="e.g., O+"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>

          <div>
            <label
              htmlFor="profile-address"
              className="block text-sm font-medium text-[#1E122B] mb-1.5"
            >
              Home / Safe Address (Optional)
            </label>
            <input
              id="profile-address"
              type="text"
              maxLength={250}
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              placeholder="Neighborhood or residential address"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="profile-medical"
            className="block text-sm font-medium text-[#1E122B] mb-1.5"
          >
            Allergies or Emergency Medical Notes (Optional)
          </label>
          <textarea
            id="profile-medical"
            rows={2}
            maxLength={500}
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            placeholder="Allergies, medications, or critical conditions"
            className="w-full rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div>
          <label
            htmlFor="profile-sos-msg"
            className="block text-sm font-medium text-[#1E122B] mb-1.5"
          >
            Default SOS Message Template
          </label>
          <textarea
            id="profile-sos-msg"
            rows={2}
            maxLength={300}
            value={emergencyMessage}
            onChange={(e) => setEmergencyMessage(e.target.value)}
            className="w-full rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !isOnline}
          className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save Profile"}</span>
        </button>
      </form>

      {/* Android Firebase Compatibility & Vercel Guide */}
      <section className="bg-[#F8F4FC] border border-[#EAE2F0] rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-[#6D28D9]" />
          <h3 className="text-lg font-bold text-[#1E122B]">
            Android Firebase Compatibility & Web Deployment
          </h3>
        </div>

        <div className="space-y-3 text-sm text-[#4A3B5C] leading-relaxed">
          <p>
            This web app is connected to Firebase Project{" "}
            <code className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-[#EAE2F0]">
              {activeFirebaseProjectId}
            </code>{" "}
            (Database ID:{" "}
            <code className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-[#EAE2F0]">
              {activeFirestoreDatabaseId}
            </code>
            ).
          </p>
          <p>
            To share user accounts and records with your existing <strong>Android SHE-GUARD</strong>{" "}
            app without overwriting Android rules or config:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
            <li>
              <strong>User-Scoped Firestore Paths:</strong> Both apps can read/write under{" "}
              <code className="font-mono text-xs">users/&#123;uid&#125;</code>,{" "}
              <code className="font-mono text-xs">users/&#123;uid&#125;/trustedContacts</code>,{" "}
              <code className="font-mono text-xs">users/&#123;uid&#125;/sosAlerts</code>, and{" "}
              <code className="font-mono text-xs">users/&#123;uid&#125;/journeys</code>.
            </li>
            <li>
              <strong>Connecting Your Existing Android Project:</strong> Add a Web App in your
              Android Firebase Console, copy its Web SDK config into{" "}
              <code className="font-mono text-xs">firebase-applet-config.json</code>, and merge
              rules carefully instead of replacing existing Android rules.
            </li>
            <li>
              <strong>Vercel Deployment:</strong> Deploy this repository on Vercel with{" "}
              <code className="font-mono text-xs">GEMINI_API_KEY</code> added to Vercel Project
              Environment Variables, and add your <code className="font-mono text-xs">*.vercel.app</code>{" "}
              domain to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains.
            </li>
          </ul>
        </div>

        <div className="pt-2 flex items-center gap-2 text-xs text-[#5B4B6B]">
          <Globe className="w-4 h-4 text-[#DB2777] shrink-0" />
          <span>
            Build command: <code className="font-mono">npm run build</code> · Output:{" "}
            <code className="font-mono">dist</code> · Serverless API:{" "}
            <code className="font-mono">/api/ai/analyze-distress</code>
          </span>
        </div>
      </section>
    </div>
  );
}
