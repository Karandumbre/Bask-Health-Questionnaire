import { APP_MESSAGES } from "@/lib/constants/messages";
import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_MESSAGES.INTAKE_STUDIO_BASK_HEALTH,
  description: APP_MESSAGES.CLINICAL_FORM_AUTHORING_AND_PATIENT_INTAKE_ENGINE,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
