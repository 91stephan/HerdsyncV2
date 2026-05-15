import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";

export function SyncStatusBar() {
  const { stats, isSyncing, isOnline, lastSyncedAt, triggerSync } = useOfflineSync();

  const hasPending   = stats.pending > 0;
  const hasConflicts = stats.conflict > 0;
  const hasFailed    = stats.failed > 0;

  if (stats.total === 0 && isOnline) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border",
        !isOnline
          ? "bg-orange-50 border-orange-200 text-orange-700"
          : hasFailed || hasConflicts
          ? "bg-red-50 border-red-200 text-red-700"
          : hasPending
          ? "bg-yellow-50 border-yellow-200 text-yellow-700"
          : "bg-green-50 border-green-200 text-green-700"
      )}
    >
      {/* Online / offline indicator */}
      {isOnline ? (
        <Wifi className="h-4 w-4 shrink-0" />
      ) : (
        <WifiOff className="h-4 w-4 shrink-0" />
      )}

      {/* Status label */}
      <span className="hidden sm:inline">
        {!isOnline
          ? "Offline — data queued locally"
          : hasFailed
          ? "Sync errors"
          : hasConflicts
          ? "Conflicts need review"
          : hasPending
          ? `${stats.pending} record${stats.pending !== 1 ? "s" : ""} pending sync`
          : "All synced"}
      </span>

      {/* Badges */}
      {hasPending && (
        <Badge variant="outline" className="ml-1 text-xs border-yellow-400 text-yellow-700">
          <Clock className="h-3 w-3 mr-1" />
          {stats.pending}
        </Badge>
      )}
      {hasConflicts && (
        <Badge variant="outline" className="text-xs border-red-400 text-red-700">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {stats.conflict}
        </Badge>
      )}
      {!hasPending && !hasConflicts && isOnline && (
        <CheckCircle className="h-4 w-4 text-green-500" />
      )}

      {/* Manual sync trigger */}
      {isOnline && (hasPending || hasFailed) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 ml-1"
              onClick={triggerSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
              <span className="sr-only">Sync now</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSyncing ? "Syncing…" : "Push pending records to server"}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Last synced timestamp */}
      {lastSyncedAt && isOnline && (
        <span className="hidden md:inline text-xs opacity-60 ml-1">
          Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
