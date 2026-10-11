"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ROUTES } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";

export interface AdminBackLinkProps {
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function AdminBackLink({ onClick }: AdminBackLinkProps) {
  return (
    <Link
      href={ROUTES.adminForms}
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded hover:bg-gray-100"
      title={APP_MESSAGES.BACK_TO_FORMS_DASHBOARD}
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="hidden sm:inline">{APP_MESSAGES.FORMS}</span>
    </Link>
  );
}
