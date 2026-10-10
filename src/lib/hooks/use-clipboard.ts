"use client";
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
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      if (mounted.current)
        setCopyError(
          "Unable to copy. Please select and copy the text manually.",
        );
    }
  };
  return { copied, copyError, copy };
}
