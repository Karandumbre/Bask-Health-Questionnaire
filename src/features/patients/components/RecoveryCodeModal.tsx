"use client";

import { Text } from "@/components/ui/text";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogHeader, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/lib/hooks/use-clipboard";
import { Spinner } from "@/components/ui/spinner";
import { CheckIcon, KeyIcon } from "@/components/ui/icons";

interface RecoveryCodeModalProps {
  recoveryCode: string;
  saving?: boolean;
  saveError?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RecoveryCodeModal({
  recoveryCode,
  saving = false,
  saveError = null,
  isOpen,
  onClose,
}: RecoveryCodeModalProps) {
  const { copied, copying, copyError, copy } = useClipboard();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      titleId="recovery-title"
      className="space-y-4 max-w-md"
    >
      <DialogHeader
        align="center"
        className="pt-2"
        titleId="recovery-title"
        title="Save Your Session Recovery Code"
        description="Need to finish later or switch devices? Use this recovery code to restore your incomplete progress at any time."
        icon={
          <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-2">
            <KeyIcon className="h-5 w-5" />
          </div>
        }
      />

      {/* Recovery Code Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center">
        <span className="block mb-1">
          <Text variant="caption" tone="subtle" uppercase weight="bold">
            One-Time Recovery Code
          </Text>
        </span>
        <span className="select-all">
          <Text variant="heading" tone="primary" mono weight="bold">
            {recoveryCode || APP_MESSAGES.RECOVERY_CODE_UNAVAILABLE}
          </Text>
        </span>
      </div>

      {saving && (
        <div className="flex items-center gap-2">
          <Spinner />
          <Text role="status" as="p" variant="small" tone="inherit">
            {APP_MESSAGES.SAVING}
          </Text>
        </div>
      )}
      {saveError && <Alert>{saveError}</Alert>}
      {copyError && <Alert>{copyError}</Alert>}
      <DialogActions className="flex-col pt-1">
        <Button
          type="button"
          disabled={!recoveryCode}
          loading={copying}
          loadingLabel={APP_MESSAGES.COPYING}
          onClick={() => void copy(recoveryCode)}
          variant="secondary"
          size="md"
          fullWidth
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4 text-emerald-600" />
              <Text variant="inherit" tone="success" weight="semibold">
                Copied to Clipboard
              </Text>
            </>
          ) : (
            <Text variant="inherit">Copy Recovery Code</Text>
          )}
        </Button>

        <Button
          type="button"
          onClick={onClose}
          variant="primary"
          size="md"
          fullWidth
        >
          I&apos;ve Saved My Code — Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
