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
          <h1 className="text-sm font-bold text-gray-900 leading-tight truncate">
            {APP_MESSAGES.BASK_HEALTH_INTAKE_STUDIO}
          </h1>
          <p className="text-caption text-gray-500 truncate">
            {workspaceName ?? APP_MESSAGES.LOADING}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <span className="text-xs text-gray-600 hidden sm:inline truncate max-w-xs">
          {userEmail}
        </span>
        <Button
          loading={isLoggingOut}
          loadingLabel={APP_MESSAGES.SIGNING_OUT}
          onClick={handleLogout}
          disabled={isMutating}
          className="text-xs text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          {APP_MESSAGES.SIGN_OUT}
        </Button>
      </div>
    </header>
  );
}
