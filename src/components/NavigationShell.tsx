import React from "react";
import {
  BrainCircuit,
  Clock3,
  History,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  UserCircle2,
  Users,
  WifiOff,
} from "lucide-react";
import type { AppRoute, UserProfile } from "../types/sheguard";

interface NavigationShellProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onTriggerSos: () => void;
  onLogout: () => void;
  profile: UserProfile | null;
  userEmail: string | null;
  isOnline: boolean;
  offlinePendingCount: number;
  missedJourneyActive: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: AppRoute; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { id: "contacts", label: "Trusted Contacts", shortLabel: "Contacts", icon: Users },
  { id: "journey", label: "Journey Monitor", shortLabel: "Journey", icon: Clock3 },
  { id: "ai-check", label: "AI Distress Check", shortLabel: "AI Check", icon: BrainCircuit },
  { id: "history", label: "SOS History", shortLabel: "History", icon: History },
  { id: "profile", label: "Profile & Sync", shortLabel: "Profile", icon: UserCircle2 },
];

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: "Safety Dashboard",
  contacts: "Trusted Contacts",
  journey: "Journey Monitoring",
  "ai-check": "AI Distress Text Check",
  history: "SOS Alert History",
  profile: "Profile & Firebase Compatibility",
};

export function NavigationShell({
  activeRoute,
  onNavigate,
  onTriggerSos,
  onLogout,
  profile,
  userEmail,
  isOnline,
  offlinePendingCount,
  missedJourneyActive,
  children,
}: NavigationShellProps) {
  const mobileBottomTabs = NAV_ITEMS.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#FDFBFE] text-[#1E122B] flex flex-col md:flex-row">
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-[#EAE2F0] z-30">
        <div className="h-16 px-6 flex items-center border-b border-[#EAE2F0]">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="text-xl font-extrabold tracking-tight text-[#5B21B6] whitespace-nowrap cursor-pointer"
          >
            SHE-GUARD
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#F3E8FF] text-[#5B21B6] font-semibold"
                    : "text-[#4A3B5C] hover:bg-[#F8F4FC] hover:text-[#1E122B]"
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      isActive ? "text-[#6D28D9]" : "text-[#6B5B7B]"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === "journey" && missedJourneyActive && (
                  <span className="text-[11px] font-semibold text-[#DC2626]">Alert</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#EAE2F0] space-y-3">
          <div className="px-2">
            <p className="text-sm font-semibold text-[#1E122B] truncate">
              {profile?.fullName || "SHE-GUARD User"}
            </p>
            <p className="text-xs text-[#5B4B6B] truncate">{userEmail || profile?.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-[#EAE2F0] bg-[#FDFBFE] hover:bg-[#FDF2F7] text-xs font-semibold text-[#4A3B5C] hover:text-[#9D174D] flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 lg:pl-72 flex flex-col min-h-screen">
        {/* Top Bar Contract (3 zones on desktop; compact bar on mobile) */}
        <header className="sticky top-0 z-20 h-14 md:h-16 bg-white/95 backdrop-blur-md border-b border-[#EAE2F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 md:gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <span className="md:hidden text-lg font-extrabold tracking-tight text-[#5B21B6] whitespace-nowrap shrink-0">
              SHE-GUARD
            </span>
            <h1 className="hidden md:block text-base font-semibold text-[#1E122B] truncate">
              {ROUTE_TITLES[activeRoute]}
            </h1>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#5B4B6B]">
            <button
              type="button"
              onClick={() => onNavigate("contacts")}
              className="hover:text-[#1E122B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Contacts
            </button>
            <button
              type="button"
              onClick={() => onNavigate("journey")}
              className="hover:text-[#1E122B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Journey
            </button>
            <button
              type="button"
              onClick={() => onNavigate("ai-check")}
              className="hover:text-[#1E122B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              AI Check
            </button>
            <button
              type="button"
              onClick={() => onNavigate("history")}
              className="hover:text-[#1E122B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              History
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("profile")}
              aria-label="Open Profile"
              className="md:hidden min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-[#5B21B6] hover:bg-[#F8F4FC] cursor-pointer"
            >
              <UserCircle2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onTriggerSos}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Emergency SOS</span>
            </button>
          </div>
        </header>

        {/* Offline / Connectivity Warning Banner (Shown ONLY when offline or offline drafts queued) */}
        {(!isOnline || offlinePendingCount > 0) && (
          <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 text-xs text-[#92400E]">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                {!isOnline
                  ? "Offline mode: Cloud sync and AI text analysis are paused. Manual SOS local logging, SMS, and Call buttons remain active."
                  : `Syncing ${offlinePendingCount} locally queued SOS alert(s) to Cloud Firestore...`}
              </span>
            </div>
          </div>
        )}

        {/* Active Page Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation (h-16 <= 15% mobile height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/95 backdrop-blur-md border-t border-[#EAE2F0] grid grid-cols-5 items-center"
      >
        {mobileBottomTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                isActive ? "text-[#6D28D9] font-semibold" : "text-[#5B4B6B]"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate max-w-[64px]">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
