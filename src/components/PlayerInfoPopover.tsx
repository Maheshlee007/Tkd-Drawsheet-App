import { useState } from 'react';
import { Info, MapPin, GraduationCap, UserCog, Trophy, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { playerHistoryService } from '@/services/playerHistoryService';

interface PlayerInfoPopoverProps {
  playerId: string;
  playerName: string;
}

interface PlayerDetail {
  full_name: string;
  player_code: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  state: string | null;
  city: string | null;
  school_college: string | null;
  weight_kg: number;
  age_category: string;
  weight_category: string;
  belt_color: string;
  club_name: string | null;
  club_city: string | null;
  coach_full_name: string | null;
  coach_phone: string | null;
  coach_belt_level: string | null;
  identity_school: string | null;
  identity_city: string | null;
  identity_state: string | null;
}

export function PlayerInfoPopover({ playerId, playerName }: PlayerInfoPopoverProps) {
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadDetail = async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const res = await playerHistoryService.getPlayerDetail(playerId);
      setDetail(res.data as PlayerDetail);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
    setLoading(false);
  };

  const school = detail?.school_college || detail?.identity_school || null;
  const city = detail?.city || detail?.identity_city || detail?.club_city || null;
  const state = detail?.state || detail?.identity_state || null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={loadDetail}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          title={`Details for ${playerName}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground">No details available</p>
        ) : (
          <div className="space-y-2.5">
            <div>
              <p className="font-semibold text-sm">{detail.full_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{detail.player_code}</p>
            </div>

            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">{detail.belt_color} Belt</Badge>
              <Badge variant="secondary" className="text-xs">{detail.age_category}</Badge>
              <Badge variant="secondary" className="text-xs">{detail.weight_category}</Badge>
            </div>

            {(city || state) && (
              <div className="flex items-start gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>{[city, state].filter(Boolean).join(', ')}</span>
              </div>
            )}

            {school && (
              <div className="flex items-start gap-1.5 text-xs">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>{school}</span>
              </div>
            )}

            {detail.coach_full_name && (
              <div className="flex items-start gap-1.5 text-xs">
                <UserCog className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <span>{detail.coach_full_name}</span>
                  {detail.coach_belt_level && (
                    <span className="text-muted-foreground"> ({detail.coach_belt_level})</span>
                  )}
                </div>
              </div>
            )}

            {detail.club_name && (
              <div className="flex items-start gap-1.5 text-xs">
                <Trophy className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>{detail.club_name}</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-1 border-t">
              {detail.weight_kg}kg · {detail.gender} · {detail.phone}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
