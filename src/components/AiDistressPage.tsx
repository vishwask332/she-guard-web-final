import React, { useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Lock,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import type { DistressAnalysisResult } from "../types/sheguard";

interface AiDistressPageProps {
  isOnline: boolean;
  onSuggestOpenSos: (note: string) => void;
}

const SAMPLE_PROMPTS = [
  {
    label: "Routine Update",
    text: "Just boarded the 7:40 PM metro, reaching home in 25 minutes. Everything looks normal.",
  },
  {
    label: "Uneasy Commute",
    text: "Someone has been following me for two blocks after leaving the bus stop and I feel very scared.",
  },
  {
    label: "Urgent Situation",
    text: "The cab driver changed route and locked the doors, won't let me get out, please help!",
  },
];

export function AiDistressPage({ isOnline, onSuggestOpenSos }: AiDistressPageProps) {
  const [inputText, setInputText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DistressAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setErrorMsg("Please enter or paste text you want analyzed.");
      return;
    }
    if (!isOnline) {
      setErrorMsg(
        "Internet connectivity is required for AI text analysis. Remember that Manual SOS works offline at any time."
      );
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/analyze-distress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Analysis failed. Please try again.");
      }
      setResult(data as DistressAnalysisResult);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "AI service could not be reached. Manual SOS remains available."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const levelStyles = {
    none: {
      container: "bg-[#F8F4FC] border-[#DDD6FE]",
      labelColor: "text-[#5B21B6]",
      labelText: "No Distress Signals Detected",
      icon: CheckCircle2,
    },
    low: {
      container: "bg-[#FDF2F7] border-[#FBCFE8]",
      labelColor: "text-[#9D174D]",
      labelText: "Low Caution Signal",
      icon: BrainCircuit,
    },
    moderate: {
      container: "bg-[#FFFBEB] border-[#FDE68A]",
      labelColor: "text-[#92400E]",
      labelText: "Moderate Distress Warning",
      icon: AlertTriangle,
    },
    high: {
      container: "bg-[#FEF2F2] border-[#FECACA]",
      labelColor: "text-[#B91C1C]",
      labelText: "High Distress / Emergency Language Detected",
      icon: ShieldAlert,
    },
  };

  const activeStyle = result ? levelStyles[result.distressLevel] : null;
  const ResultIcon = activeStyle?.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1E122B]">AI Distress Text Check</h2>
        <p className="text-sm text-[#5B4B6B] mt-1">
          Analyze text you voluntarily enter here for signs of distress, fear, or emergency urgency.
        </p>
      </div>

      {/* Explicit Privacy & Control Safeguards */}
      <div className="rounded-2xl bg-[#F8F4FC] border border-[#EAE2F0] p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#6D28D9] shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-[#4A3B5C] space-y-1">
          <p className="font-semibold text-[#1E122B]">Strict Privacy & Manual Control</p>
          <p>
            SHE-GUARD never accesses WhatsApp, SMS inboxes, or other private messages. AI only
            evaluates text you explicitly type or paste below, and will{" "}
            <strong>never automatically send an SOS</strong> based on AI predictions.
          </p>
        </div>
      </div>

      {!isOnline && (
        <div className="rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] p-4 flex items-start gap-3 text-sm text-[#92400E]">
          <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            You are currently offline. AI text analysis requires an internet connection, while
            Manual SOS in the top bar remains active.
          </p>
        </div>
      )}

      <form
        onSubmit={handleAnalyze}
        className="bg-white border border-[#EAE2F0] rounded-3xl p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="distress-text-input" className="text-sm font-semibold text-[#1E122B]">
            Enter or Paste Message / Situation Text
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {SAMPLE_PROMPTS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setInputText(sample.text);
                  setResult(null);
                  setErrorMsg(null);
                }}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-[#FDF2F7] hover:bg-[#FCE7F3] text-xs font-medium text-[#9D174D] cursor-pointer whitespace-nowrap"
              >
                Sample: {sample.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          id="distress-text-input"
          rows={5}
          maxLength={2000}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or paste a message you want checked for distress or emergency urgency..."
          className="w-full rounded-2xl border border-[#DDD6FE] bg-[#FDFBFE] p-4 text-sm text-[#1E122B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-[#6B5B7B] tabular-nums">
            {inputText.length}/2000 characters
          </span>
          <button
            type="submit"
            disabled={analyzing || !isOnline}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>{analyzing ? "Analyzing Text..." : "Analyze Text"}</span>
          </button>
        </div>
      </form>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-4 text-sm text-[#B91C1C]"
        >
          {errorMsg}
        </div>
      )}

      {result && activeStyle && ResultIcon && (
        <div className={`rounded-3xl border p-6 space-y-4 ${activeStyle.container}`}>
          <div className="flex items-start gap-3">
            <ResultIcon className={`w-6 h-6 shrink-0 mt-0.5 ${activeStyle.labelColor}`} />
            <div>
              <h3 className={`text-lg font-bold ${activeStyle.labelColor}`}>
                {activeStyle.labelText}
              </h3>
              <p className="text-sm text-[#1E122B] mt-1 leading-relaxed">{result.summary}</p>
            </div>
          </div>

          {result.detectedSignals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#4A3B5C] mb-1.5">Observed Language Cues</p>
              <p className="text-sm text-[#1E122B]">
                {result.detectedSignals.join(" · ")}
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-black/10">
            <p className="text-xs font-semibold text-[#4A3B5C]">Recommended Next Step</p>
            <p className="text-sm text-[#1E122B] mt-1">{result.recommendedAction}</p>
          </div>

          {result.suggestSosConfirmation && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#7F1D1D]">
                AI suggests considering SOS—only you decide whether to confirm an alert.
              </p>
              <button
                type="button"
                onClick={() =>
                  onSuggestOpenSos(
                    `SOS triggered after distress text check: ${inputText.trim().slice(0, 200)}`
                  )
                }
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Review & Activate SOS</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
