import { useState, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BracketMatch } from "@shared/schema";
import { useMutation, useQuery, QueryKey } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { createBracket } from "@/lib/bracketUtils";

// Define tournament save structure
interface SavedTournament {
  id: string;
  name: string;
  date: string;
  participantCount: number;
  bracketData: BracketMatch[][];
}

// Define return type for better type safety
interface UseTournamentReturn {
  participantCount: number;
  bracketData: BracketMatch[][] | null;
  isPending: boolean;
  generateBracket: (participants: string[], seedType: "random" | "ordered" | "as-entered") => void;
  updateTournamentMatch: (matchId: string, winnerId: string) => void;
  saveTournament: (name: string) => void;
  loadTournament: (id: string) => void;
  savedTournaments: SavedTournament[];
  syncSavedTournaments: () => void;
  refetchTournaments: () => void;
}

export const useTournament = (): UseTournamentReturn => {
  const [bracketData, setBracketData] = useState<BracketMatch[][] | null>(null);
  const { toast } = useToast();
  const [participantCount, setParticipantCount] = useState(0);
  const [savedTournaments, setSavedTournaments] = useState<SavedTournament[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tournament-history');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const generateBracketMutation = useMutation({
    mutationFn: async ({
      participants,
      seedType,
    }: {
      participants: string[];
      seedType: "random" | "ordered" | "as-entered";
    }) => {
      setParticipantCount(participants.length || 0);
      const newBracketData = createBracket(participants, seedType);
      // Simulate API response or further processing if needed
      return { bracketData: newBracketData, tournamentId: Date.now().toString() }; 
    },
    onSuccess: (data) => {
      setBracketData(data.bracketData);
      toast({
        variant:'success',
        title: "Success",
        description: "Tournament bracket generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate tournament bracket",
      });
    },
  });

  const generateBracket = useCallback(
    (participants: string[], seedType: "random" | "ordered" | "as-entered") => {
      generateBracketMutation.mutate({ participants, seedType });
    },
    [generateBracketMutation]
  );

  const updateTournamentMatch = useCallback(
    (matchId: string, winnerId: string) => {
      if (!bracketData) return;
      const newBracketData = bracketData.map(round => 
        round.map(match => (match.id === matchId ? { ...match, winner: winnerId } : match))
      );

      // Propagate winner to the next match
      let currentMatch = null;
      for (const round of newBracketData) {
        currentMatch = round.find(m => m.id === matchId);
        if (currentMatch) break;
      }

      if (currentMatch && currentMatch.nextMatchId) {
        for (const round of newBracketData) {
          const nextMatchIndex = round.findIndex(m => m.id === currentMatch!.nextMatchId);
          if (nextMatchIndex !== -1) {
            const nextMatch = round[nextMatchIndex];
            const newParticipants = [...nextMatch.participants] as [string | null, string | null];
            const positionInNextMatch = currentMatch.position % 2 === 0 ? 0 : 1;
            newParticipants[positionInNextMatch] = winnerId;
            round[nextMatchIndex] = { ...nextMatch, participants: newParticipants };
            // If the other participant in the next match is a bye, the winner advances automatically
            const otherParticipantIndex = positionInNextMatch === 0 ? 1 : 0;
            if (newParticipants[otherParticipantIndex] === "(bye)") {
                round[nextMatchIndex].winner = winnerId;
                 // Recursively update if this win also completes another match
                updateTournamentMatch(round[nextMatchIndex].id, winnerId);
            }
            break;
          }
        }
      }
      setBracketData(newBracketData);
    },
    [bracketData]
  );

  const saveTournament = useCallback(async (name: string) => {
    if (!bracketData) return;
    const tournamentToSave: SavedTournament = {
      id: Date.now().toString(), // Generate a simple ID for local saving
      name,
      date: new Date().toISOString(),
      participantCount,
      bracketData
    };
    try {
      // Simulate API save or directly save to localStorage for demo
      const currentSaved = JSON.parse(localStorage.getItem('tournament-history') || '[]') as SavedTournament[];
      localStorage.setItem('tournament-history', JSON.stringify([...currentSaved, tournamentToSave]));
      setSavedTournaments([...currentSaved, tournamentToSave]); // Update state
      await queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast({
        title: "Success",
        description: "Tournament saved successfully! (Locally)",
      });
    } catch (error) {
      console.error("Save tournament error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save tournament locally",
      });
    }
  }, [bracketData, participantCount, toast]);

  const loadTournament = useCallback(async (id: string) => {
    try {
      // Simulate API load or directly load from localStorage for demo
      const allSavedTournaments = JSON.parse(localStorage.getItem('tournament-history') || '[]') as SavedTournament[];
      const tournamentToLoad = allSavedTournaments.find(t => t.id === id);

      if (tournamentToLoad && tournamentToLoad.bracketData) {
        setBracketData(tournamentToLoad.bracketData);
        setParticipantCount(tournamentToLoad.participantCount);
        toast({
          title: "Success",
          description: `Tournament "${tournamentToLoad.name}" loaded successfully! (Locally)`,
        });
      } else {
        throw new Error("Tournament not found or data is invalid.");
      }
    } catch (error) {
      console.error("Load tournament error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Failed to load tournament locally",
      });
    }
  }, [toast]);

  const fetchTournamentsFromStorage = async (): Promise<SavedTournament[]> => {
    // Simulate API fetch or directly get from localStorage
    return JSON.parse(localStorage.getItem('tournament-history') || '[]') as SavedTournament[];
  };

  const { data: fetchedTournamentsData, refetch: refetchTournaments } = useQuery<SavedTournament[], Error>({
    queryKey: ["tournaments"] as QueryKey,
    queryFn: fetchTournamentsFromStorage,
    // enabled: false, // Keep enabled to fetch on mount or as needed by useQuery
  });

  const syncSavedTournaments = useCallback(() => {
    if (fetchedTournamentsData) {
      setSavedTournaments(fetchedTournamentsData);
      // localStorage sync is handled by save/load directly for this local example
    }
  }, [fetchedTournamentsData]);

  // Effect to sync when fetched data changes
  useEffect(() => {
    syncSavedTournaments();
  }, [fetchedTournamentsData, syncSavedTournaments]);

  return {
    participantCount,
    bracketData,
    isPending: generateBracketMutation.isPending,
    generateBracket,
    updateTournamentMatch,
    saveTournament,
    loadTournament,
    savedTournaments,
    syncSavedTournaments,
    refetchTournaments, 
  };
};
