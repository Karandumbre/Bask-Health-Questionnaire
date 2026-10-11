"use client";
import { COMPONENT_STYLES } from "@/design-system/component-styles";

import { useEffect, useRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { Button } from "./button";
import { XIcon } from "./icons";

/** Native modal semantics include focus trapping and an inert background. */
export function Dialog({
  open,
  onClose,
  titleId,
  children,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  titleId: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog
        .querySelector<HTMLElement>('[data-autofocus="true"], [autofocus]')
        ?.focus();
    }
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={twMerge(COMPONENT_STYLES.dialog, className)}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (control) =>
            control.tabIndex >= 0 && control.getClientRects().length > 0,
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose?.();
      }}
    >
      {children}
    </dialog>
  );
}

export function DialogHeader({
  titleId,
  title,
  description,
  onClose,
  closeLabel = "Close",
  disabled = false,
}: {
  titleId: string;
  title: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 id={titleId} className="text-base font-bold text-gray-900">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {onClose && (
        <Button
          type="button"
          disabled={disabled}
          onClick={onClose}
          aria-label={closeLabel}
          className="text-gray-400 hover:text-gray-600 text-sm font-medium p-1"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function DialogActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={twMerge("flex justify-end gap-2 pt-2", className)}>
      {children}
    </div>
  );
}
