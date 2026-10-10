"use client";

import * as PolarisIcons from "@shopify/polaris-icons";
import type { ComponentType, SVGProps } from "react";

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function themedIcon(Icon: IconComponent): IconComponent {
  return function ThemedIcon(props) {
    return <Icon fill="currentColor" aria-hidden="true" {...props} />;
  };
}

export const TextIcon = themedIcon(PolarisIcons.TextIcon);
export const NoteIcon = themedIcon(PolarisIcons.NoteIcon);
export const HashtagIcon = themedIcon(PolarisIcons.HashtagIcon);
export const SelectIcon = themedIcon(PolarisIcons.SelectIcon);
export const ListBulletedIcon = themedIcon(PolarisIcons.ListBulletedIcon);
export const CheckboxIcon = themedIcon(PolarisIcons.CheckboxIcon);
export const DuplicateIcon = themedIcon(PolarisIcons.DuplicateIcon);
export const DeleteIcon = themedIcon(PolarisIcons.DeleteIcon);
export const ChevronUpIcon = themedIcon(PolarisIcons.ChevronUpIcon);
export const ChevronDownIcon = themedIcon(PolarisIcons.ChevronDownIcon);
export const PlusIcon = themedIcon(PolarisIcons.PlusIcon);
export const EditIcon = themedIcon(PolarisIcons.EditIcon);
export const SettingsIcon = themedIcon(PolarisIcons.SettingsIcon);
export const ViewIcon = themedIcon(PolarisIcons.ViewIcon);
export const SendIcon = themedIcon(PolarisIcons.SendIcon);
export const UploadIcon = themedIcon(PolarisIcons.UploadIcon);
export const ShareIcon = themedIcon(PolarisIcons.ShareIcon);
export const SearchIcon = themedIcon(PolarisIcons.SearchIcon);
export const StatusActiveIcon = themedIcon(PolarisIcons.StatusActiveIcon);
export const AlertTriangleIcon = themedIcon(PolarisIcons.AlertTriangleIcon);
export const UndoIcon = themedIcon(PolarisIcons.UndoIcon);
export const SaveIcon = themedIcon(PolarisIcons.SaveIcon);
export const ExternalIcon = themedIcon(PolarisIcons.ExternalIcon);
export const CheckIcon = themedIcon(PolarisIcons.CheckIcon);
export const ArrowLeftIcon = themedIcon(PolarisIcons.ArrowLeftIcon);
export const ArrowRightIcon = themedIcon(PolarisIcons.ArrowRightIcon);
export const MenuIcon = themedIcon(PolarisIcons.MenuIcon);
export const MobileIcon = themedIcon(PolarisIcons.MobileIcon);
export const DesktopIcon = themedIcon(PolarisIcons.DesktopIcon);
