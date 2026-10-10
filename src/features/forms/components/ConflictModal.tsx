"use client";

import { useState } from "react";
import { useBuilder } from "../context/builder-context";
import { AlertTriangleIcon, UndoIcon, SaveIcon, CheckIcon } from "@/components/ui/icons";

export function ConflictModal() {
  const {
    conflictDetails,
    definition,
    resolveConflictReload,
    resolveConflictForce,
  } = useBuilder();

  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!conflictDetails) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(definition, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReload = async () => {
    setIsProcessing(true);
    try {
      await resolveConflictReload();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceOverwrite = async () => {
    setIsProcessing(true);
    try {
      await resolveConflictForce();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden p-6 space-y-4">
        {/* Warning Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Revision Conflict (HTTP 409)
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Another administrator committed changes to this draft while you were editing.
              To prevent accidental overwrites, your changes have been held safely in your browser.
            </p>
          </div>
        </div>

        {/* Revision Comparison Pill */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Your Revision</span>
            <span className="font-bold text-gray-800">rev {conflictDetails.localRevision}</span>
          </div>
          <div className="text-gray-300">➔</div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Server Revision</span>
            <span className="font-bold text-amber-600">rev {conflictDetails.serverRevision}</span>
          </div>
        </div>

        {/* Copy Backup Option */}
        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
          <div className="text-xs text-blue-900">
            <p className="font-semibold">Prevent Data Loss</p>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Copy your local questions to clipboard before reloading.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium bg-white text-blue-700 border border-blue-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-blue-50 transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <span>Copy JSON</span>
            )}
          </button>
        </div>

        {/* Resolution Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleReload}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <UndoIcon className="w-4 h-4 text-gray-500" />
            <span>Discard & Reload Server</span>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleForceOverwrite}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <SaveIcon className="w-4 h-4" />
            <span>Keep Mine (Force Update)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
