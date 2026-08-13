import { cn } from '@/lib/utils';

/** Tournament statuses considered "active" for the green indicator dot. */
export function isTournamentActive(status?: string | null): boolean {
  return status === 'registration_open' || status === 'in_progress';
}

interface TournamentSelectItemProps {
  name: string;
  status?: string | null;
  /** Count shown as a muted suffix; omitted when not a number. */
  count?: number | null;
  /** Suffix label for the count, e.g. "players" or "staff". */
  countLabel?: string;
}

/**
 * Shared content for tournament dropdown entries: a colored status dot
 * (green when the tournament is active), the tournament name, and an
 * optional muted count suffix. Render inside a shadcn <SelectItem>.
 */
export function TournamentSelectItem({ name, status, count, countLabel = 'players' }: TournamentSelectItemProps) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'h-2 w-2 rounded-full shrink-0',
          isTournamentActive(status) ? 'bg-green-500' : 'bg-gray-300'
        )}
      />
      <span className="truncate">{name}</span>
      {typeof count === 'number' && (
        <span className="text-xs text-muted-foreground shrink-0">
          {count} {countLabel}
        </span>
      )}
    </span>
  );
}
