"use client";
import { APPLICATION } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { useEffect, useRef, useState } from "react";

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const copy = async (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setCopied(false);
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      if (!mounted.current) return;
      setCopied(true);
      timer.current = setTimeout(
        () => setCopied(false),
        APPLICATION.clipboardFeedbackMs,
      );
    } catch {
      if (mounted.current)
        setCopyError(
          APP_MESSAGES.UNABLE_TO_COPY_PLEASE_SELECT_AND_COPY_THE_TEXT,
        );
    }
  };
  return { copied, copyError, copy };
}
