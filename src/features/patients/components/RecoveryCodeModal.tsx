"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/lib/hooks/use-clipboard";
import { CheckIcon } from "@/components/ui/icons";

interface RecoveryCodeModalProps {
  recoveryCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RecoveryCodeModal({
  recoveryCode,
  isOpen,
  onClose,
}: RecoveryCodeModalProps) {
  const { copied, copy } = useClipboard();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      titleId="recovery-title"
      className="space-y-4 max-w-md"
    >
      <div className="text-center space-y-1.5 pt-2">
        <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-2">
          🔑
        </div>
        <h2 id="recovery-title" className="text-base font-bold text-gray-900">
          Save Your Session Recovery Code
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
          Need to finish later or switch devices? Use this recovery code to
          restore your incomplete progress at any time.
        </p>
      </div>

      {/* Recovery Code Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center">
        <span className="text-caption font-bold text-gray-400 uppercase tracking-widest block mb-1">
          One-Time Recovery Code
        </span>
        <span className="font-mono text-base sm:text-lg font-bold text-gray-900 tracking-wider select-all">
          {recoveryCode}
        </span>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          type="button"
          onClick={() => copy(recoveryCode)}
          variant="secondary"
          className="w-full flex items-center justify-center gap-1.5 py-2.5"
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">
                Copied to Clipboard
              </span>
            </>
          ) : (
            <span>Copy Recovery Code</span>
          )}
        </Button>

        <Button
          type="button"
          onClick={onClose}
          variant="primary"
          className="w-full py-2.5 font-semibold"
        >
          I&apos;ve Saved My Code — Continue
        </Button>
      </div>
    </Dialog>
  );
}
