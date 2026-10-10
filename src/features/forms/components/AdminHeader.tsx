"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useBuilder } from "../context/builder-context";
import {
  ArrowLeftIcon,
  CheckIcon,
  SaveIcon,
  AlertTriangleIcon,
  ViewIcon,
  EditIcon,
  DesktopIcon,
  MobileIcon,
  SendIcon,
} from "@/components/ui/icons";

export function AdminHeader() {
  const {
    formName,
    draftRevision,
    saveStatus,
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
    <header className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left section: Back button & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/admin/forms"
          onClick={(e) => {
            if (hasUnsavedChanges) {
              if (
                !window.confirm(
                  "You have unsaved changes. Are you sure you want to leave?",
                )
              ) {
                e.preventDefault();
              }
            }
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded hover:bg-gray-100"
          title="Back to Forms Dashboard"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Forms</span>
        </Link>

        <div className="h-4 w-px bg-gray-200" />

        {/* Editable Title */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <Input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="text-sm font-semibold text-gray-900 border border-blue-500 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 min-w-[200px]"
            />
          ) : (
            <Button
              onClick={() => {
                setTempTitle(formName);
                setIsEditingTitle(true);
              }}
              className="group flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate text-left"
              title="Click to rename"
            >
              <span className="truncate max-w-[280px] sm:max-w-[400px]">
                {formName}
              </span>
              <EditIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          )}

          <span className="text-[11px] font-mono text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
            rev {draftRevision}
          </span>
        </div>
      </div>

      {/* Center section: Mode switcher (Editor / Preview) */}
      <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
        <Button
          onClick={() => setMode("editor")}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
            activeMode === "editor"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span>Editor</span>
        </Button>

        <Button
          onClick={() => setMode("preview")}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
            activeMode === "preview"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <ViewIcon className="w-3.5 h-3.5" />
          <span>Patient Preview</span>
        </Button>
      </div>

      {/* Right section: Save Status & Publish Button */}
      <div className="flex items-center gap-3">
        {/* Viewport toggle when in Preview mode */}
        {activeMode === "preview" && (
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md border border-gray-200">
            <Button
              onClick={() => setViewport("desktop")}
              className={`p-1 rounded ${
                previewViewport === "desktop"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
              title="Desktop viewport"
            >
              <DesktopIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setViewport("mobile")}
              className={`p-1 rounded ${
                previewViewport === "mobile"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
              title="Mobile viewport"
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
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">Saved</span>
            </div>
          )}

          {saveStatus === "saving" && (
            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
              <SaveIcon className="w-3.5 h-3.5 animate-pulse text-blue-500" />
              <span className="hidden md:inline">Saving...</span>
            </div>
          )}

          {saveStatus === "editing" && (
            <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block mr-0.5" />
              <span className="hidden md:inline">Unsaved</span>
            </div>
          )}

          {saveStatus === "conflict" && (
            <Button
              onClick={saveNow}
              className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded font-medium hover:bg-amber-100 transition-colors"
            >
              <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Conflict</span>
            </Button>
          )}

          {saveStatus === "failed" && (
            <Button
              onClick={saveNow}
              className="flex items-center gap-1 text-[11px] text-red-700 bg-red-50 border border-red-300 px-2 py-0.5 rounded font-medium hover:bg-red-100 transition-colors"
            >
              <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600" />
              <span>Retry Save</span>
            </Button>
          )}
        </div>

        {/* Publish Action Button */}
        <Button
          onClick={openPublishModal}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all ${
            publishValidationErrors.length === 0
              ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-98"
              : "bg-gray-900 text-white hover:bg-black"
          }`}
        >
          <SendIcon className="w-3.5 h-3.5" />
          <span>Publish</span>
          {publishValidationErrors.length > 0 && (
            <span className="bg-amber-400 text-gray-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-1">
              {publishValidationErrors.length}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
