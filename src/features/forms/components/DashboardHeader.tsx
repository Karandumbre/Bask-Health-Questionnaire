import { Text } from "@/components/ui/text";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { Button } from "@/components/ui/button";

export function DashboardHeader({
  workspaceName,
  userEmail,
  handleLogout,
  isMutating = true,
  isLoggingOut = false,
}: {
  workspaceName?: string;
  userEmail?: string | null;
  handleLogout?: () => void;
  isMutating?: boolean;
  isLoggingOut?: boolean;
}) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
          {APP_MESSAGES.BH}
        </div>
        <div className="min-w-0">
          <Text as="h1" variant="body" tone="primary" truncate weight="bold">
            {APP_MESSAGES.BASK_HEALTH_INTAKE_STUDIO}
          </Text>
          <Text as="p" variant="caption" tone="muted" truncate>
            {workspaceName ?? APP_MESSAGES.LOADING}
          </Text>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <span className="hidden sm:inline max-w-xs">
          <Text variant="small" tone="secondary" truncate>
            {userEmail}
          </Text>
        </span>
        <Button
          loading={isLoggingOut}
          loadingLabel={APP_MESSAGES.SIGNING_OUT}
          onClick={handleLogout}
          disabled={isMutating}
          variant="secondary"
          size="sm"
        >
          {APP_MESSAGES.SIGN_OUT}
        </Button>
      </div>
    </header>
  );
}
