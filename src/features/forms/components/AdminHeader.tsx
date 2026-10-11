"use client";
import { Text } from "@/components/ui/text";
import { ROUTES } from "@/lib/constants/application";

import { APP_MESSAGES } from "@/lib/constants/messages";

import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useBuilder } from "../context/builder-context";
import {
  CheckIcon,
  AlertTriangleIcon,
  ViewIcon,
  EditIcon,
  DesktopIcon,
  MobileIcon,
  SendIcon,
} from "@/components/ui/icons";
import { AdminBackLink } from "./AdminBackLink";

export function AdminHeader() {
  const {
    formId,
    formName,
    draftRevision,
    saveStatus,
    saveError,
    activeMode,
    previewViewport,
    updateFormMeta,
    saveNow,
    setMode,
    setViewport,
    openPublishModal,
    publishValidationErrors,
    hasUnsavedChanges,
  } = useBuilder();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(formName);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim() && tempTitle !== formName) {
      updateFormMeta({ title: tempTitle.trim() });
    } else {
      setTempTitle(formName);
    }
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    } else if (e.key === "Escape") {
      setIsEditingTitle(false);
      setTempTitle(formName);
    }
  };

  return (
    <>
      <header className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between sticky top-0 z-30 select-none">
        {/* Left section: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <AdminBackLink
            onClick={(e) => {
              if (hasUnsavedChanges) {
                if (
                  !window.confirm(
                    APP_MESSAGES.YOU_HAVE_UNSAVED_CHANGES_ARE_YOU_SURE_YOU_WANT,
                  )
                ) {
                  e.preventDefault();
                }
              }
            }}
          />

          <div className="h-4 w-px bg-gray-200" />

          {/* Editable Title */}
          <div className="flex items-center gap-2 min-w-0">
            {isEditingTitle ? (
              <Input
                type="text"
                aria-label={APP_MESSAGES.FORM_TITLE}
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="text-sm font-semibold text-gray-900 border border-blue-500 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 min-w-title-min"
              />
            ) : (
              <Button
                onClick={() => {
                  setTempTitle(formName);
                  setIsEditingTitle(true);
                }}
                title={APP_MESSAGES.CLICK_TO_RENAME}
                variant="link"
                tone="primary"
                size="sm"
              >
                <span className="truncate max-w-title-edit sm:max-w-title-max">
                  {formName}
                </span>
                <EditIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            )}

            <Badge tone="mono" className="bg-gray-50 text-gray-400">
              {APP_MESSAGES.REV} {draftRevision}
            </Badge>
          </div>
        </div>

        {/* Center section: Mode switcher (Editor / Preview) */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <Button
            onClick={() => setMode("editor")}
            selected={activeMode === "editor"}
            variant="segment"
            tone="neutral"
            size="sm"
          >
            <Text variant="inherit">{APP_MESSAGES.EDITOR}</Text>
          </Button>

          <Button
            onClick={() => setMode("preview")}
            selected={activeMode === "preview"}
            variant="segment"
            tone="neutral"
            size="sm"
          >
            <ViewIcon className="w-3.5 h-3.5" />
            <Text variant="inherit">{APP_MESSAGES.PATIENT_PREVIEW}</Text>
          </Button>

          <Link
            href={ROUTES.formResponses(formId)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 transition-all hover:bg-white/60"
          >
            <Text variant="inherit">Responses</Text>
          </Link>
        </div>

        {/* Right section: Save Status & Publish Button */}
        <div className="flex items-center gap-3">
          {/* Viewport toggle when in Preview mode */}
          {activeMode === "preview" && (
            <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md border border-gray-200">
              <Button
                onClick={() => setViewport("desktop")}
                title={APP_MESSAGES.DESKTOP_VIEWPORT}
                selected={previewViewport === "desktop"}
                variant="segment"
                tone="neutral"
                size="icon-sm"
              >
                <DesktopIcon className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setViewport("mobile")}
                title={APP_MESSAGES.MOBILE_VIEWPORT}
                selected={previewViewport === "mobile"}
                variant="segment"
                tone="neutral"
                size="icon-sm"
              >
                <MobileIcon className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Autosave Indicator */}
          <div
            className="flex items-center gap-1.5"
            role="status"
            aria-live="polite"
          >
            {saveStatus === "saved" && (
              <div className="flex items-center gap-1 text-caption text-emerald-600 font-medium">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden md:inline">{APP_MESSAGES.SAVED}</span>
              </div>
            )}

            {saveStatus === "saving" && (
              <div className="flex items-center gap-1 text-caption text-blue-600 font-medium">
                <Spinner className="text-blue-500" />
                <span className="hidden md:inline">{APP_MESSAGES.SAVING}</span>
              </div>
            )}

            {saveStatus === "editing" && (
              <div className="flex items-center gap-1 text-caption text-gray-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block mr-0.5" />
                <span className="hidden md:inline">{APP_MESSAGES.UNSAVED}</span>
              </div>
            )}

            {saveStatus === "conflict" && (
              <Button
                onClick={saveNow}
                variant="secondary"
                tone="warning"
                size="xs"
              >
                <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
                <Text variant="inherit">{APP_MESSAGES.CONFLICT}</Text>
              </Button>
            )}

            {saveStatus === "failed" && (
              <Button
                onClick={saveNow}
                variant="secondary"
                tone="danger"
                size="xs"
              >
                <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600" />
                <Text variant="inherit">{APP_MESSAGES.RETRY_SAVE}</Text>
              </Button>
            )}
          </div>

          {/* Publish Action Button */}
          <Button
            onClick={openPublishModal}
            tone={publishValidationErrors.length === 0 ? "primary" : "neutral"}
            variant="primary"
            size="sm"
          >
            <SendIcon className="w-3.5 h-3.5" />
            <Text variant="inherit">{APP_MESSAGES.PUBLISH}</Text>
            {publishValidationErrors.length > 0 && (
              <span className="bg-amber-400 px-1.5 py-0.2 rounded-full ml-1">
                <Text variant="micro" tone="primary" weight="bold">
                  {publishValidationErrors.length}
                </Text>
              </span>
            )}
          </Button>
        </div>
      </header>
      {saveError && (
        <Alert className="mx-4 my-2">
          {saveError}
          <span className="ml-2 inline-flex">
            <Button
              onClick={() => void saveNow()}
              loading={saveStatus === "saving"}
              loadingLabel={APP_MESSAGES.SAVING}
              disabled={saveStatus === "conflict"}
              variant="link"
              tone="primary"
              size="sm"
            >
              {APP_MESSAGES.RETRY_SAVE}
            </Button>
          </span>
        </Alert>
      )}
    </>
  );
}
