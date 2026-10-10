"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

/** Native modal semantics include focus trapping and an inert background. */
export function Dialog({ open, onClose, titleId, children, className }: {
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
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={twMerge("m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-xs", className)}
      onCancel={(event) => { event.preventDefault(); onClose?.(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        )).filter((control) => control.tabIndex >= 0 && control.getClientRects().length > 0);
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
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose?.();
      }}
    >
      {children}
    </dialog>
  );
}
