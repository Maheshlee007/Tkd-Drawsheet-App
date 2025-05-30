import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTournamentStore, MatchResult, WinMethod } from "@/store/useTournamentStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Trophy, XCircle, Info, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";

const ParticipantsPage = () => {  const [, navigate] = useLocation();
  const { bracketData, participantCount, tournamentName, matchResults } = useTournamentStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  
  // If no bracket data exists, redirect to home
  useEffect(() => {
    if (!bracketData) {
      navigate("/");
    }
  }, [bracketData, navigate]);
  
  if (!bracketData) {
    return null; // Will redirect in useEffect
  }
  
  // Extract all unique participants from the bracket data
  const getAllParticipants = () => {
    const participants = new Set<string>();
    
    bracketData.forEach(round => {
      round.forEach(match => {
        if (match.participants[0] && match.participants[0] !== "(bye)") {
          participants.add(match.participants[0]);
        }
        if (match.participants[1] && match.participants[1] !== "(bye)") {
          participants.add(match.participants[1]);
        }
      });
    });
    
    return Array.from(participants);
  };
    // Count wins and losses for each participant and get detailed match history
  const getParticipantStats = (participantName: string) => {
    let wins = 0;
    let losses = 0;
    let matches: MatchResult[] = [];
    
    // Check regular bracket for wins/losses
    bracketData.forEach(round => {
      round.forEach(match => {
        // Count wins
        if (match.winner === participantName) {
          wins++;
        }
        
        // Count losses
        if ((match.participants[0] === participantName || match.participants[1] === participantName) && 
            match.winner && match.winner !== participantName) {
          losses++;
        }
      });
    });
    
    // Get detailed matches from matchResults
    Object.values(matchResults).forEach(match => {
      if (match.player1 === participantName || match.player2 === participantName) {
        matches.push(match);
      }
    });
    
    return { wins, losses, matches };
  };
    // Function to get win method label and color
  const getWinMethodInfo = (method: WinMethod | null) => {
    const methodMap: Record<WinMethod, {label: string, color: string}> = {
      'PTF': { label: 'Win by Final Score', color: 'bg-blue-100 text-blue-800' },
      'PTG': { label: 'Win by Point Gap', color: 'bg-green-100 text-green-800' },
      'DSQ': { label: 'Win by Disqualification', color: 'bg-red-100 text-red-800' },
      'PUN': { label: 'Win by Punitive Declaration', color: 'bg-amber-100 text-amber-800' },
      'RSC': { label: 'Referee Stops Contest', color: 'bg-purple-100 text-purple-800' },
      'WDR': { label: 'Win by Withdrawal', color: 'bg-slate-100 text-slate-800' },
      'DQB': { label: 'DQ for Unsportsmanlike Behavior', color: 'bg-rose-100 text-rose-800' }
    };
    
    return method ? methodMap[method] : { label: 'Undecided', color: 'bg-slate-100 text-slate-800' };
  };

  // Get all participants and their stats
  const participants = getAllParticipants().map(name => ({
    name,
    ...getParticipantStats(name)
  }));
  
  // Filter participants based on search
  const filteredParticipants = participants.filter(participant => 
    participant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Participants</h1>
          <p className="text-muted-foreground mt-1">
            {tournamentName} • {participants.length} participants
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search participants..."
              className="pl-8 w-full md:w-[260px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button className="shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Participant
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[160px]">Wins</TableHead>
              <TableHead className="w-[160px]">Losses</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((participant) => (
                <TableRow key={participant.name}>
                  <TableCell className="font-medium">{participant.name}</TableCell>
                  <TableCell>
                    {participant.wins > 0 ? (
                      <div className="flex items-center">
                        <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
                        {participant.wins}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">0</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {participant.losses > 0 ? (
                      <div className="flex items-center">
                        <XCircle className="mr-2 h-4 w-4 text-red-500" />
                        {participant.losses}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">0</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/participant/${encodeURIComponent(participant.name)}`)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No participants match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ParticipantsPage;