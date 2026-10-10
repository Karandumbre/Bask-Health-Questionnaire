"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ROUTES } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { twMerge } from "tailwind-merge";

export interface AdminBackLinkProps {
  href?: string;
  label?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}

export function AdminBackLink({
  href = ROUTES.adminForms,
  label = APP_MESSAGES.FORMS,
  title = APP_MESSAGES.BACK_TO_FORMS_DASHBOARD,
  onClick,
  className,
}: AdminBackLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={twMerge(
        "flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded hover:bg-gray-100",
        className,
      )}
      title={title}
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
