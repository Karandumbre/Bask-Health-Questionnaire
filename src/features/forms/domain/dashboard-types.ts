export interface FormListItem {
  id: string;
  name: string;
  workspaceId: string;
  latestPublishedVersionNumber: number | null;
  publicSlug?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  draftRevision: number | null;
  draftUpdatedAt: string | Date | null;
}
