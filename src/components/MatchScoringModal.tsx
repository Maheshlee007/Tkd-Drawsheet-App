import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useTournamentStore } from "@/store/useTournamentStore";
import { MatchResult, RoundResult, WinMethod } from "@/store/useTournamentStore";

interface MatchInfo {
  matchId: string;
  player1: string;
  player2: string;
}

interface MatchScoringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchInfo | null;
  onScoringComplete: (result: MatchResult) => void;
}

const WIN_METHODS = [
  { value: "PTF", label: "PTF: Win by Final Score", requiresScore: true },
  { value: "PTG", label: "PTG: Win by Point Gap", requiresScore: true },
  { value: "DSQ", label: "DSQ: Win by Disqualification", requiresScore: false, matchEnding: true },
  { value: "PUN", label: "PUN: Win by Punitive Declaration", requiresScore: false, allowsScore: true }, // PUN allows but doesn't require scores
  { value: "RSC", label: "RSC: Win by Referee Stop the Contest", requiresScore: false },
  { value: "WDR", label: "WDR: Win by Withdrawal", requiresScore: false, matchEnding: true },
  { value: "DQB", label: "DQB: Win by Disqualification for unsportsmanlike behavior", requiresScore: false, matchEnding: true },
  { value: "DQBOTH", label: "DQBOTH: Both Players Disqualified", requiresScore: false, matchEnding: true, noWinner: true }
];

// Taekwondo-specific default reasons for PUN decisions
const PUN_DEFAULT_REASONS = [
  "Superior technique and precision throughout the match",
  "More aggressive and effective attacks",
  "Better control and tactical awareness", 
  "Higher quality scoring techniques",
  "More dynamic and varied attack combinations",
  "Better defensive skills and counter-attacks",
  "Superior high kicking techniques",
  "More consistent performance across all rounds",
  "Better ring management and positioning",
  "More effective use of distance and timing",
  "Other (specify custom reason)"
] as const;

// Taekwondo-specific default reasons for RSC decisions  
const RSC_DEFAULT_REASONS = [
  "Safety concern - risk of injury to competitor",
  "Medical timeout exceeded - competitor unable to continue",
  "Competitor showing signs of concussion or head injury",
  "Excessive contact causing injury", 
  "Equipment malfunction creating unsafe conditions",
  "Competitor appears unable to defend themselves effectively",
  "Doctor's recommendation to stop the contest",
  "Venue safety issue requiring immediate stoppage",
  "Other safety-related concern (specify)"
] as const;

export function MatchScoringModal({
  open, 
  onOpenChange, 
  match, 
  onScoringComplete 
}: MatchScoringModalProps) {
  const internalRoundsPerMatch = useTournamentStore(state => state.internalRoundsPerMatch || 3);
  const matchResults = useTournamentStore(state => state.matchResults || {});
  const saveIntermediateMatchState = useTournamentStore(state => state.saveIntermediateMatchState);
  const existingResult = match ? matchResults[match.matchId] : null;  // Initialize state based on existing results or create new
  const [activeTab, setActiveTab] = useState("round-1");
  const [hasAutoSwitchedToDecision, setHasAutoSwitchedToDecision] = useState(false);
  const [lastTieState, setLastTieState] = useState(false); // Track previous tie state
  
  // State for tracking unsaved changes and save dialog
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  
  // State for tracking dropdown selections for default reasons
  const [matchLevelPunReason, setMatchLevelPunReason] = useState<string>("");
  const [matchLevelPunCustomReason, setMatchLevelPunCustomReason] = useState<string>("");
  
  // State for tracking round-level dropdown selections (indexed by round)
  const [roundPunReasons, setRoundPunReasons] = useState<{[key: number]: string}>({});
  const [roundPunCustomReasons, setRoundPunCustomReasons] = useState<{[key: number]: string}>({});
  const [roundRscReasons, setRoundRscReasons] = useState<{[key: number]: string}>({});
  const [roundRscCustomReasons, setRoundRscCustomReasons] = useState<{[key: number]: string}>({});
  
  const [rounds, setRounds] = useState<RoundResult[]>(() => {
    if (existingResult) {
      return existingResult.rounds;
    }
    return Array(internalRoundsPerMatch).fill(null).map(() => ({
      player1Score: null,
      player2Score: null,
      winMethod: null,
      winner: null
    }));
  });  // Reset rounds when match changes
  useEffect(() => {
    if (match) {
      const matchResult = matchResults[match.matchId];
      if (matchResult) {
        setRounds(matchResult.rounds);
      } else {
        // Fresh match - completely reset all states
        setRounds(Array(internalRoundsPerMatch).fill(null).map(() => ({
          player1Score: null,
          player2Score: null,
          winMethod: null,
          winner: null
        })));
        
        // Reset all match states for new matches
        setMatchComment("");
        setMatchLevelDecision({
          method: null,
          winner: null,
          reason: ""
        });
        setShowChangeReason(false);
        setChangeReason("");
        setMatchLevelPunReason("");
        setMatchLevelPunCustomReason("");
        setRoundPunReasons({});
        setRoundPunCustomReasons({});
        setRoundRscReasons({});
        setRoundRscCustomReasons({});
      }
      // Reset to first tab when match changes
      setActiveTab("round-1");
      setHasAutoSwitchedToDecision(false); // Reset auto-switch flag for new match
      setLastTieState(false); // Reset tie state tracking
    }
  }, [match?.matchId, matchResults, internalRoundsPerMatch]);

  // Auto-switch to "Match Decision" tab when match becomes tied (only on transition)
  useEffect(() => {
    if (match) {
      const currentTieState = needsMatchLevelDecision();
      
      // Only auto-switch when tie state changes from false to true
      if (currentTieState && !lastTieState && !hasAutoSwitchedToDecision) {
        setActiveTab("match-decision");
        setHasAutoSwitchedToDecision(true);
      }
      
      // Update the last tie state
      setLastTieState(currentTieState);
      
      // Reset auto-switch flag if match no longer needs a decision
      if (!currentTieState) {
        setHasAutoSwitchedToDecision(false);
      }
    }
  }, [rounds, match, lastTieState, hasAutoSwitchedToDecision]);
    // For editing a previous winner or adding comments
  const [changeReason, setChangeReason] = useState("");
  const [showChangeReason, setShowChangeReason] = useState(false);

  // Match-level decision states
  const [matchLevelDecision, setMatchLevelDecision] = useState<{
    method: 'PUN' | 'EXTRA_ROUND' | null;
    winner: string | null;
    reason: string;
  }>({
    method: null,
    winner: null,
    reason: ""
  });

  const [matchComment, setMatchComment] = useState("");
    useEffect(() => {
    if (existingResult) {
      if (existingResult.completed) {
        setShowChangeReason(true);
      }
      // Load existing comment if available
      setMatchComment(existingResult.comment || "");
      
      // Load existing match-level decision if available
      if (existingResult.matchLevelDecision) {
        setMatchLevelDecision(existingResult.matchLevelDecision);
      }
    } else {
      setShowChangeReason(false);
      setMatchComment("");
      setMatchLevelDecision({
        method: null,
        winner: null,
        reason: ""
      });
    }
  }, [existingResult]);  // Function to save intermediate match state for persistence
  const saveIntermediateState = () => {
    if (!match) return;
    
    // Save current state automatically without marking as completed
    saveIntermediateMatchState(
      match.matchId,
      rounds,
      matchComment,
      matchLevelDecision
    );
  };
  // Track changes to determine if there are unsaved changes
  useEffect(() => {
    if (match) {
      const hasData = rounds.some(round => 
        round.player1Score !== null || 
        round.player2Score !== null || 
        round.winMethod !== null ||
        round.winner !== null
      ) || !!matchComment.trim() || !!matchLevelDecision.method || !!matchLevelDecision.winner || !!matchLevelDecision.reason;
      
      setHasUnsavedChanges(hasData);
    }
  }, [rounds, matchComment, matchLevelDecision, match?.matchId]);const handleScoreChange = (roundIndex: number, player: 'player1' | 'player2', value: string) => {
    if (!match) return;
    
    const newRounds = [...rounds];
    const score = value === "" ? null : parseInt(value);
    newRounds[roundIndex] = { 
      ...newRounds[roundIndex], 
      [`${player}Score`]: score 
    };
    
    const p1Score = newRounds[roundIndex].player1Score;
    const p2Score = newRounds[roundIndex].player2Score;
    
    // Only auto-determine winner if both scores are entered
    if (p1Score !== null && p2Score !== null) {
      // If PUN is already selected, don't change the win method - just keep scores for tie resolution
      if (newRounds[roundIndex].winMethod === "PUN") {
        // Keep PUN method and scores, winner will be selected manually
        // Don't auto-set winner based on scores when PUN is selected
      } else {
        // Auto-apply PTG win if there's a 12+ point gap
        if (p1Score >= p2Score + 12) {
          newRounds[roundIndex].winMethod = "PTG";
          newRounds[roundIndex].winner = match.player1;
        } else if (p2Score >= p1Score + 12) {
          newRounds[roundIndex].winMethod = "PTG";
          newRounds[roundIndex].winner = match.player2;
        } else {
          // Always set PTF as default win method
          newRounds[roundIndex].winMethod = "PTF";
          
          // Determine winner based on score - higher score wins
          if (p1Score > p2Score) {
            newRounds[roundIndex].winner = match.player1;
          } else if (p2Score > p1Score) {
            newRounds[roundIndex].winner = match.player2;
          } else {
            // This is a tie - explicitly mark it as null but highlight it for resolution
            newRounds[roundIndex].winner = null; // Tie
            
            // For ties in the final round (e.g., round 3 of 3) or critical rounds, 
            // auto-suggest PUN for tie resolution
            const isFinalRound = roundIndex === internalRoundsPerMatch - 1;
            const isDecisiveRound = roundIndex === 0 && internalRoundsPerMatch === 1;
              if (isFinalRound || isDecisiveRound) {
              // Keep scoring information but prompt for tie resolution
              // The winner will need to be chosen with PUN or RSC
              newRounds[roundIndex].winMethodReason = "Tie resolution required";
              // Keep PTF method until user explicitly selects PUN or RSC
            }
          }
        }
      }
    }
    
    setRounds(newRounds);
  };const handleWinMethodChange = (roundIndex: number, method: WinMethod) => {
    if (!match) return;
    
    const newRounds = [...rounds];
    const methodInfo = WIN_METHODS.find(m => m.value === method);
    
    if (!methodInfo) return;
    
    newRounds[roundIndex] = { 
      ...newRounds[roundIndex], 
      winMethod: method,
    };
    
    // If this method doesn't require scores, clear them (except for PUN tie resolution)
    if (!methodInfo.requiresScore) {
      // For PUN, preserve the original scores if it's a tie resolution
      const isTieResolution = newRounds[roundIndex].player1Score === newRounds[roundIndex].player2Score &&
                             newRounds[roundIndex].player1Score !== null;
        // For PUN, always preserve tied scores but allow manual scoring too
      if (method === "PUN") {
        // PUN is specifically for judge decisions on ties or special circumstances
        // Keep the winner as null until explicitly selected
        // If this is a tie resolution, we'll preserve the scores but clear the winner
        // until one is explicitly selected
        newRounds[roundIndex].winner = null;
        // Don't clear scores for PUN - allow both score entry and tie resolution
      } else if (!isTieResolution) {
        // For other methods that don't require scores, clear them unless this is tie resolution
        newRounds[roundIndex].player1Score = null;
        newRounds[roundIndex].player2Score = null;
      }
      
      // For RSC, there's no tie option - if no winner is explicitly chosen,
      // we need to prompt the user to select one
      if (method === "RSC" && !newRounds[roundIndex].winner) {
        // RSC cannot result in a tie - force user to select a winner
        newRounds[roundIndex].winner = null;
      }
      
      // For DQBOTH (Both Players Disqualified), set a special winner value
      if (method === "DQBOTH") {
        // Both players are disqualified, no winner advances
        newRounds[roundIndex].winner = "NO_WINNER";
        // Clear scores as they are not relevant for this decision
        newRounds[roundIndex].player1Score = null;
        newRounds[roundIndex].player2Score = null;
      }
    } else if (method === "PTF") {
      // If switching back to PTF and we have scores, reapply the standard winner logic
      const p1Score = newRounds[roundIndex].player1Score;
      const p2Score = newRounds[roundIndex].player2Score;
      
      if (p1Score !== null && p2Score !== null) {
        if (p1Score > p2Score) {
          newRounds[roundIndex].winner = match.player1;
        } else if (p2Score > p1Score) {
          newRounds[roundIndex].winner = match.player2;        } else {
          // It's a tie
          newRounds[roundIndex].winner = null;
        }
      }
    }
    
    setRounds(newRounds);
  };
    const handleRoundWinnerSelect = (roundIndex: number, winner: string) => {
    if (!match) return;
    
    const newRounds = [...rounds];
    newRounds[roundIndex] = { 
      ...newRounds[roundIndex], 
      winner: winner === 'tie' ? null : winner
    };
    
    // If using PUN for tie resolution and a winner is now selected, ensure we keep track of this
    if (newRounds[roundIndex].winMethod === "PUN" && winner !== 'tie') {
      // If no reason is provided yet, add a default one that can be edited
      if (!newRounds[roundIndex].winMethodReason) {
        newRounds[roundIndex].winMethodReason = "Judge's decision for tied match";
      }
    }
    
    // For RSC, ensure a reason is tracked
    if (newRounds[roundIndex].winMethod === "RSC" && winner !== 'tie') {
      if (!newRounds[roundIndex].winMethodReason) {
        newRounds[roundIndex].winMethodReason = "Referee stopped contest";
      }
    }
    
    setRounds(newRounds);
  };
    // Function to add extra round to this specific match
  const addExtraRound = () => {
    setRounds(prev => [...prev, {
      player1Score: null,
      player2Score: null,
      winMethod: null,
      winner: null
    }]);
    // Switch to the new round tab
    setActiveTab(`round-${rounds.length + 1}`);
  };

  // Function to handle match-level PUN decision
  const handleMatchLevelDecision = (method: 'PUN' | 'EXTRA_ROUND', winner?: string, reason?: string) => {
    setMatchLevelDecision({
      method,
      winner: winner || null,
      reason: reason || ""
    });
  };
  // Function to check if match needs tiebreaker decision
  const needsMatchLevelDecision = (): boolean => {
    if (!match) return false;
    
    // Count rounds with clear winners (not tied)
    const roundsWithWinners = rounds.filter(r => r.winner && r.winner !== "NO_WINNER");
    const player1Wins = roundsWithWinners.filter(r => r.winner === match.player1).length;
    const player2Wins = roundsWithWinners.filter(r => r.winner === match.player2).length;
    
    // Count tied rounds (same score, no winner decided)
    const tiedRounds = rounds.filter(r => 
      r.player1Score !== null && 
      r.player2Score !== null && 
      r.player1Score === r.player2Score &&
      !r.winner &&
      (!r.winMethod || r.winMethod === "PTF")
    ).length;
    
    // Count rounds that need completion (no scores entered yet)
    const incompleteRounds = rounds.filter(r => 
      r.player1Score === null || r.player2Score === null
    ).length;
    
    // Only consider decision needed if all rounds have been attempted
    if (incompleteRounds > 0) return false;
    
    const totalRounds = rounds.length;
    const majority = Math.ceil(totalRounds / 2);
    
    // Case 1: Single round match - if tied, need decision
    if (totalRounds === 1) {
      return tiedRounds === 1;
    }
    
    // Case 2 & 3 & beyond: Multiple rounds
    // If neither player has a clear majority and there are tied rounds OR equal wins
    const hasNoMajorityWinner = player1Wins < majority && player2Wins < majority;
    const hasEqualWins = player1Wins === player2Wins;
    
    // Need decision if:
    // - No majority winner AND there are ties, OR
    // - Players have equal wins (whether from ties or 1-1 scenario)
    return hasNoMajorityWinner && (tiedRounds > 0 || hasEqualWins);
  };  const determineMatchWinner = (): string | null => {
    if (!match) return null;
    
    // Check for match-level decision first
    if (matchLevelDecision.method === 'PUN' && matchLevelDecision.winner) {
      return matchLevelDecision.winner;
    }
    
    // Check for match-ending win methods first (highest priority)
    const matchEndingWin = rounds.find(r => {
      if (!r.winMethod) return false;
      const methodInfo = WIN_METHODS.find(m => m.value === r.winMethod);
      return methodInfo?.matchEnding && (r.winner || r.winner === "NO_WINNER");
    });
    
    if (matchEndingWin) {
      return matchEndingWin.winner;
    }
    
    // Count only rounds that have explicit winners (not ties or NO_WINNER)
    const roundsWithWinners = rounds.filter(r => r.winner && r.winner !== "NO_WINNER");
    const player1Wins = roundsWithWinners.filter(r => r.winner === match.player1).length;
    const player2Wins = roundsWithWinners.filter(r => r.winner === match.player2).length;
    
    const totalRounds = rounds.length;
    const majority = Math.ceil(totalRounds / 2);
    
    // Check if either player has majority
    if (player1Wins >= majority) return match.player1;
    if (player2Wins >= majority) return match.player2;
    
    // If no majority and all rounds are complete, check if match-level decision is needed
    const incompleteRounds = rounds.filter(r => 
      r.player1Score === null || r.player2Score === null
    ).length;
    
    // If there are incomplete rounds, no winner yet
    if (incompleteRounds > 0) return null;
    
    // If all rounds complete but no majority winner, and needsMatchLevelDecision() returns true,
    // then we need a match-level decision
    if (needsMatchLevelDecision()) {
      return null; // No winner until match-level decision is made
    }
    
    // This shouldn't happen, but fallback to no winner
    return null;  };const handleSubmit = () => {
    if (!match) return;
    
    // Check for PUN or RSC methods without reasons
    const missingReasons = rounds.some(r => 
      (r.winMethod === "PUN" || r.winMethod === "RSC") && 
      (!r.winMethodReason || r.winMethodReason.trim() === "")
    );
    
    if (missingReasons) {
      alert("Please provide a reason for all PUN (Punitive Declaration) or RSC (Referee Stopped Contest) decisions.");
      return;
    }
    
    // Check for match-level PUN decision without reason
    if (matchLevelDecision.method === 'PUN' && (!matchLevelDecision.reason || matchLevelDecision.reason.trim() === "")) {
      alert("Please provide a reason for the match-level PUN decision.");
      return;
    }
    
    const winner = determineMatchWinner();
    
    // Check if match is tied and needs decision
    if (!winner && needsMatchLevelDecision()) {
      alert("Match is tied! Please either:\n1. Use 'Match-Level PUN' to declare an overall winner\n2. Add an extra round to continue the match");
      return;
    }
    
    // Only allow submission if a winner is determined
    if (!winner) {
      alert("Unable to determine a match winner. Please complete scoring for more rounds or resolve any ties.");
      return;
    }
      const result: MatchResult = {
      matchId: match.matchId,
      player1: match.player1,
      player2: match.player2,
      winner,
      completed: true,
      rounds,
      comment: matchComment.trim() || undefined, // Only include if there's actual content
      matchLevelDecision: matchLevelDecision.method ? matchLevelDecision : undefined,
      history: [
        ...(existingResult?.history || []),
        {
          timestamp: Date.now(),
          action: existingResult ? 'update' : 'create',
          previousWinner: existingResult?.winner || null,
          newWinner: winner,
          reason: showChangeReason ? changeReason : null
        }
      ]
    };
      onScoringComplete(result);
    setHasUnsavedChanges(false); // Mark as saved
    onOpenChange(false);
  };

  // Handle dialog close with unsaved changes check
  const handleDialogClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      // User is trying to close with unsaved changes
      setShowSaveDialog(true);
      setPendingClose(true);
    } else {
      // No unsaved changes or opening the dialog
      onOpenChange(open);
    }
  };

  // Handle save and close
  const handleSaveAndClose = () => {
    saveIntermediateState();
    setHasUnsavedChanges(false);
    setShowSaveDialog(false);
    setPendingClose(false);
    onOpenChange(false);
  };

  // Handle discard and close
  const handleDiscardAndClose = () => {
    setHasUnsavedChanges(false);
    setShowSaveDialog(false);
    setPendingClose(false);
    onOpenChange(false);
  };

  // Handle cancel close
  const handleCancelClose = () => {
    setShowSaveDialog(false);
    setPendingClose(false);
  };
  
  if (!match) return null;
  
  // Determine if enough rounds have been scored to determine a winner
  const isSubmittable = determineMatchWinner() !== null;  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent 
        className="max-w-xl max-h-[90vh] overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isSubmittable && !(showChangeReason && !changeReason)) {
            console.log("Enter key pressed in modal, submitting match data");
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        <style>
          {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          `}
        </style>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            Match Scoring: {match.player1} vs {match.player2}
            {existingResult?.completed && (
              <CheckCircle className="ml-2 h-4 w-4 text-green-600" />
            )}
          </DialogTitle>
        </DialogHeader>          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            // User can always navigate freely - no restrictions
          }} className="max-h-[60vh] overflow-hidden flex flex-col">
          <TabsList className="w-full">
            {rounds.map((_, i) => (
              <TabsTrigger key={i} value={`round-${i+1}`} className="flex-1">
                Round {i+1}
                {rounds[i].winner && (
                  <span className="ml-1 text-xs">
                    ({rounds[i].winner === match.player1 ? '1' : '2'})
                  </span>
                )}
              </TabsTrigger>
            ))}
            {needsMatchLevelDecision() && (
              <TabsTrigger value="match-decision" className="flex-1 bg-yellow-100 text-yellow-800">
                Match Decision
                <span className="ml-1 text-xs">⚠️</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="summary" className="flex-1">
              Summary
            </TabsTrigger>
          </TabsList>
          <div className="overflow-y-auto custom-scrollbar flex-grow">
            {rounds.map((round, roundIndex) => {
            const winMethod = WIN_METHODS.find(m => m.value === round.winMethod);
            // Allow score input for PTF, PTG, and PUN (for tie resolution)
            const scoreInputDisabled = winMethod && !winMethod.requiresScore && !winMethod.allowsScore;
              return (
              <TabsContent key={roundIndex} value={`round-${roundIndex+1}`}>
                <div className="space-y-4">
                  {/* Score Section First */}
                  <div>
                    <div className="mb-1">
                      <h3 className="font-semibold text-sm mb-2">Score</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`player1-round-${roundIndex}`}>{match.player1}</Label>
                          <Input
                            id={`player1-round-${roundIndex}`}
                            type="number"
                            min="0"
                            value={round.player1Score === null ? "" : round.player1Score}
                            onChange={(e) => handleScoreChange(roundIndex, 'player1', e.target.value)}
                            disabled={scoreInputDisabled}
                            autoFocus={true}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`player2-round-${roundIndex}`}>{match.player2}</Label>
                          <Input
                            id={`player2-round-${roundIndex}`}
                            type="number"
                            min="0"
                            value={round.player2Score === null ? "" : round.player2Score}
                            onChange={(e) => handleScoreChange(roundIndex, 'player2', e.target.value)}
                            disabled={scoreInputDisabled}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Winner display based on scores */}
                    {round.player1Score !== null && round.player2Score !== null && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-md border border-slate-200">
                        <h4 className="text-xs text-slate-500">Round Winner:</h4>
                        <div className="font-medium">
                          {round.winner === match.player1 && (
                            <span className="text-blue-600">{match.player1} ({round.player1Score} pts)</span>
                          )}
                          {round.winner === match.player2 && (
                            <span className="text-red-600">{match.player2} ({round.player2Score} pts)</span>
                          )}
                          {!round.winner && <span className="text-slate-600">Tie</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Win Method Section - Below scores */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <Label className="font-semibold">Win Method</Label>
                    <RadioGroup 
                      value={round.winMethod || ""}
                      onValueChange={(value) => handleWinMethodChange(roundIndex, value as WinMethod)}
                      className="grid grid-cols-1 gap-2 mt-2"
                    >
                      {WIN_METHODS.map((method) => (
                        <div key={method.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={method.value} id={`${method.value}-${roundIndex}`} />
                          <Label htmlFor={`${method.value}-${roundIndex}`}>
                            {method.label}
                            {method.matchEnding && (
                              <span className="ml-2 text-xs text-red-500 font-medium">
                                (Match ending)
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>                  {/* Manual winner selection for non-score methods and PUN */}
                  {(scoreInputDisabled || round.winMethod === "PUN") && (
                    <div className="mt-4">
                      {/* Hide winner selection for DQBOTH since no player advances */}
                      {round.winMethod !== "DQBOTH" && (
                        <>
                          <Label>Select Winner</Label>
                          <RadioGroup 
                            value={round.winner || ""}
                            onValueChange={(value) => handleRoundWinnerSelect(roundIndex, value)}
                            className="grid grid-cols-1 gap-2 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value={match.player1} id={`winner-p1-${roundIndex}`} />
                              <Label htmlFor={`winner-p1-${roundIndex}`}>{match.player1}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value={match.player2} id={`winner-p2-${roundIndex}`} />
                              <Label htmlFor={`winner-p2-${roundIndex}`}>{match.player2}</Label>
                            </div>
                            
                            {/* Only allow tie option for PUN */}
                            {(roundIndex < 2 || round.winMethod === "PUN") && round.winMethod !== "RSC" &&round.winMethod !== "DSQ" && (
                              <div className="flex items-center space-x-2">
                                {/* <RadioGroupItem value="tie" id={`winner-tie-${roundIndex}`} />
                                <Label htmlFor={`winner-tie-${roundIndex}`}>Tie</Label> */}
                              </div>
                            )}
                          </RadioGroup>
                        </>
                      )}
                          {/* Special information for PUN decision */}
                        {round.winMethod === "PUN" && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200 text-sm">
                            <p className="text-amber-800">
                              PUN allows judges to decide the winner for tied matches or special circumstances.
                              {round.player1Score !== null && round.player2Score !== null && round.player1Score === round.player2Score && 
                                " This appears to be a tie resolution."
                              }
                            </p>
                            
                            {/* Show tie information if scores are tied */}
                            {round.player1Score !== null && round.player2Score !== null && round.player1Score === round.player2Score && (
                              <p className="text-amber-700 text-xs mt-1 font-medium">
                                Tied Score: {round.player1Score}-{round.player2Score} - Judge must select winner
                              </p>
                            )}
                              {/* Reason field for PUN */}
                            <div className="mt-2 space-y-2">
                              <Label htmlFor={`pun-reason-select-${roundIndex}`} className="text-xs font-medium text-amber-800 block mb-1">
                                Reason for Decision (Required)
                              </Label>
                              
                              <Select
                                value={roundPunReasons[roundIndex] || ""}
                                onValueChange={(value) => {
                                  setRoundPunReasons(prev => ({ ...prev, [roundIndex]: value }));
                                  
                                  if (value !== "Other (specify custom reason)") {
                                    // Use the selected default reason
                                    const newRounds = [...rounds];
                                    newRounds[roundIndex].winMethodReason = value;
                                    setRounds(newRounds);
                                    setRoundPunCustomReasons(prev => ({ ...prev, [roundIndex]: "" }));
                                  } else {
                                    // Use custom reason if available
                                    const newRounds = [...rounds];
                                    newRounds[roundIndex].winMethodReason = roundPunCustomReasons[roundIndex] || "";
                                    setRounds(newRounds);
                                  }
                                }}
                              >
                                <SelectTrigger className="text-xs h-8">
                                  <SelectValue placeholder="Select reason for PUN decision..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {PUN_DEFAULT_REASONS.map((reason) => (
                                    <SelectItem key={reason} value={reason} className="text-xs">
                                      {reason}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Custom reason input - only show when "Other" is selected */}
                              {roundPunReasons[roundIndex] === "Other (specify custom reason)" && (
                                <Input
                                  id={`pun-custom-reason-${roundIndex}`}
                                  type="text"
                                  value={roundPunCustomReasons[roundIndex] || ""}
                                  onChange={(e) => {
                                    setRoundPunCustomReasons(prev => ({ ...prev, [roundIndex]: e.target.value }));
                                    const newRounds = [...rounds];
                                    newRounds[roundIndex].winMethodReason = e.target.value;
                                    setRounds(newRounds);
                                  }}
                                  placeholder="Enter custom reason for PUN decision..."
                                  className="text-xs h-8"
                                />
                              )}
                            </div>
                          </div>
                        )}
                          {/* Special information for RSC decision */}
                        {round.winMethod === "RSC" && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                            <p className="text-blue-800">RSC is used when the referee stops the contest for safety or other reasons.</p>
                              {/* Reason field for RSC */}
                            <div className="mt-2 space-y-2">
                              <Label htmlFor={`rsc-reason-select-${roundIndex}`} className="text-xs font-medium text-blue-800 block mb-1">
                                Reason for Stoppage (Required)
                              </Label>
                              
                              <Select
                                value={roundRscReasons[roundIndex] || ""}
                                onValueChange={(value) => {
                                  setRoundRscReasons(prev => ({ ...prev, [roundIndex]: value }));
                                  
                                  if (value !== "Other safety-related concern (specify)") {
                                    // Use the selected default reason
                                    const newRounds = [...rounds];
                                    newRounds[roundIndex].winMethodReason = value;
                                    setRounds(newRounds);
                                    setRoundRscCustomReasons(prev => ({ ...prev, [roundIndex]: "" }));
                                  } else {
                                    // Use custom reason if available
                                    const newRounds = [...rounds];
                                    newRounds[roundIndex].winMethodReason = roundRscCustomReasons[roundIndex] || "";
                                    setRounds(newRounds);
                                  }
                                }}
                              >
                                <SelectTrigger className="text-xs h-8">
                                  <SelectValue placeholder="Select reason for RSC decision..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {RSC_DEFAULT_REASONS.map((reason) => (
                                    <SelectItem key={reason} value={reason} className="text-xs">
                                      {reason}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Custom reason input - only show when "Other" is selected */}
                              {roundRscReasons[roundIndex] === "Other safety-related concern (specify)" && (
                                <Input
                                  id={`rsc-custom-reason-${roundIndex}`}
                                  type="text"
                                  value={roundRscCustomReasons[roundIndex] || ""}
                                  onChange={(e) => {
                                    setRoundRscCustomReasons(prev => ({ ...prev, [roundIndex]: e.target.value }));
                                    const newRounds = [...rounds];
                                    newRounds[roundIndex].winMethodReason = e.target.value;
                                    setRounds(newRounds);
                                  }}
                                  placeholder="Enter custom reason for RSC decision..."
                                  className="text-xs h-8"
                                />
                              )}
                            </div>
                          </div>
                        )}
                          {/* Special information for DQBOTH decision */}
                        {round.winMethod === "DQBOTH" && (
                          <div className="mt-2 p-2 bg-red-50 rounded border border-red-200 text-sm">
                            <p className="text-red-800 font-medium">⚠️ Both players are disqualified - no player will advance to the next round.</p>
                            <p className="text-red-700 text-xs mt-1">This match will be considered completed with no winner.</p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}            <TabsContent value="match-decision">
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <h3 className="font-medium text-yellow-800 mb-2">⚠️ Match is Tied - Decision Required</h3>
                <p className="text-sm text-yellow-700 mb-2">
                  Both players have won the same number of rounds. You must choose how to resolve this tie:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-4">
                  <p className="text-xs text-blue-700">
                    💡 <strong>Tip:</strong> Click on the Round tabs above to review individual round scores and details before making your decision.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Option 1: Match-Level PUN */}
                  <div className="border rounded-md p-3 bg-white">
                    <h4 className="font-medium mb-2">Option 1: Match-Level PUN Decision</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Judge declares an overall winner based on performance across all rounds
                    </p>
                    
                    <div className="space-y-3">
                      <Label>Select Overall Match Winner</Label>
                      <RadioGroup 
                        value={matchLevelDecision.method === 'PUN' ? matchLevelDecision.winner || "" : ""}
                        onValueChange={(value) => handleMatchLevelDecision('PUN', value)}
                        className="grid grid-cols-1 gap-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={match.player1} id="match-winner-p1" />
                          <Label htmlFor="match-winner-p1">{match.player1}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={match.player2} id="match-winner-p2" />
                          <Label htmlFor="match-winner-p2">{match.player2}</Label>
                        </div>
                      </RadioGroup>
                        {matchLevelDecision.method === 'PUN' && matchLevelDecision.winner && (
                        <div className="mt-3 space-y-3">
                          <Label htmlFor="match-pun-reason-select" className="text-sm font-medium block mb-1">
                            Reason for Match Decision (Required)
                          </Label>
                          
                          <Select
                            value={matchLevelPunReason}
                            onValueChange={(value) => {
                              setMatchLevelPunReason(value);
                              if (value !== "Other (specify custom reason)") {
                                // Use the selected default reason
                                setMatchLevelDecision(prev => ({
                                  ...prev,
                                  reason: value
                                }));
                                setMatchLevelPunCustomReason("");
                              } else {
                                // Clear the decision reason, will be set by custom input
                                setMatchLevelDecision(prev => ({
                                  ...prev,
                                  reason: matchLevelPunCustomReason
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select a reason for PUN decision..." />
                            </SelectTrigger>
                            <SelectContent>
                              {PUN_DEFAULT_REASONS.map((reason) => (
                                <SelectItem key={reason} value={reason} className="text-sm">
                                  {reason}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Custom reason input - only show when "Other" is selected */}
                          {matchLevelPunReason === "Other (specify custom reason)" && (
                            <div className="mt-2">
                              <Label htmlFor="match-pun-custom-reason" className="text-xs font-medium text-gray-700 block mb-1">
                                Custom Reason
                              </Label>
                              <Input
                                id="match-pun-custom-reason"
                                type="text"
                                value={matchLevelPunCustomReason}
                                onChange={(e) => {
                                  setMatchLevelPunCustomReason(e.target.value);
                                  setMatchLevelDecision(prev => ({
                                    ...prev,
                                    reason: e.target.value
                                  }));
                                }}
                                placeholder="Enter custom reason for PUN decision..."
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Option 2: Add Extra Round */}
                  <div className="border rounded-md p-3 bg-white">
                    <h4 className="font-medium mb-2">Option 2: Add Extra Round</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Continue the match with an additional round to determine the winner
                    </p>
                    
                    <Button 
                      onClick={() => {
                        handleMatchLevelDecision('EXTRA_ROUND');
                        addExtraRound();
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Add Round {rounds.length + 1}
                    </Button>
                  </div>
                </div>
                
                {/* Current Match Status */}
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Current Status:</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">{match.player1}:</span> {
                        rounds.filter(r => r.winner === match.player1).length
                      } rounds won
                    </div>
                    <div>
                      <span className="font-medium">{match.player2}:</span> {
                        rounds.filter(r => r.winner === match.player2).length
                      } rounds won
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
            <TabsContent value="summary">
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar scrollbar-hide">
              <h3 className="font-medium">Match Summary</h3>
              
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="p-2 text-left">Round</th>
                      <th className="p-2 text-left">{match.player1}</th>
                      <th className="p-2 text-left">{match.player2}</th>
                      <th className="p-2 text-left">Winner</th>
                      <th className="p-2 text-left">Method</th>
                    </tr>
                  </thead>
                  <tbody>                    {rounds.map((round, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">Round {i+1}</td>
                        <td className="p-2">{round.player1Score ?? "-"}</td>
                        <td className="p-2">{round.player2Score ?? "-"}</td>                        <td className={`p-2 ${
                          round.winner === match.player1 
                            ? "font-medium text-blue-600" 
                            : round.winner === match.player2 
                            ? "font-medium text-red-600" 
                            : (round.player1Score !== null && 
                               round.player2Score !== null && 
                               round.player1Score === round.player2Score)
                            ? "font-medium text-amber-600"
                            : ""
                        }`}>
                          {round.winner 
                            ?? (round.player1Score !== null && 
                                round.player2Score !== null && 
                                round.player1Score === round.player2Score 
                                ? (round.winMethod === "PUN" ? "Tie - PUN Resolution" : "Tie - Needs Resolution")
                                : "-")}
                        </td>
                        <td className="p-2">
                          <div>
                            {round.winMethod ?? 
                              (round.player1Score !== null && 
                               round.player2Score !== null && 
                               round.player1Score === round.player2Score 
                               ? "Tied - Select Resolution" 
                               : "-")}
                          </div>
                          {/* Show reason if PUN or RSC is used */}
                          {(round.winMethod === "PUN" || round.winMethod === "RSC") && round.winMethodReason && (
                            <div className="text-xs italic mt-1 text-gray-600">
                              {round.player1Score !== null && round.player2Score !== null && round.player1Score === round.player2Score && round.winMethod === "PUN" 
                                ? `Tie (${round.player1Score}-${round.player2Score}) resolved: ${round.winMethodReason}`
                                : `Reason: ${round.winMethodReason}`
                              }
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>              <div className="bg-muted/50 p-3 rounded-md">
                <h4 className="font-medium">Match Result</h4>
                <p className="mt-1">
                  Winner: <span className="font-medium text-primary">{determineMatchWinner() || "Not yet determined"}</span>
                </p>
                
                {/* Show match-level decision info */}
                {matchLevelDecision.method === 'PUN' && matchLevelDecision.winner && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Match-Level PUN Decision:</strong> {matchLevelDecision.winner} declared winner
                    </p>
                    {matchLevelDecision.reason && (
                      <p className="text-xs text-yellow-700 mt-1 italic">
                        Reason: {matchLevelDecision.reason}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Show tied match warning */}
                {needsMatchLevelDecision() && !matchLevelDecision.method && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Match is tied - decision required in "Match Decision" tab
                    </p>
                  </div>
                )}
                
                {!isSubmittable && !needsMatchLevelDecision() && (
                  <p className="text-sm text-yellow-600 mt-2">
                    Not enough rounds completed to determine a winner.
                  </p>
                )}                {/* Check for ties that need resolution - only show if there are unresolved tied rounds */}
                {rounds.some(r => 
                  r.player1Score !== null && 
                  r.player2Score !== null && 
                  r.player1Score === r.player2Score && 
                  (!r.winMethod || r.winMethod === "PTF") &&
                  !r.winner
                ) && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                    <h5 className="flex items-center font-medium text-yellow-800">
                      <AlertTriangle className="h-4 w-4 mr-1" /> 
                      Tied Round(s) Detected
                    </h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      You have {rounds.filter(r => 
                        r.player1Score !== null && 
                        r.player2Score !== null && 
                        r.player1Score === r.player2Score && 
                        (!r.winMethod || r.winMethod === "PTF") &&
                        !r.winner
                      ).length} unresolved tied round(s). For tied scores, go to each tied round and:
                    </p>
                    <ul className="text-sm list-disc pl-5 mt-2 text-yellow-800">
                      <li><strong>Select PUN (Punitive Declaration)</strong>: Keeps the tied scores but allows judge to declare winner based on technique, aggression, etc.</li>
                      <li><strong>Select RSC (Referee Stops Contest)</strong>: Used when referee intervention ends the match - requires selecting a winner</li>
                    </ul>
                    <p className="text-xs text-yellow-600 mt-2 italic">
                      Note: For PUN tie resolution, scores will be preserved and displayed as "Tie (5-5) resolved by PUN: high kicks"
                    </p>
                  </div>
                )}

                {/* Match comment field with improved styling */}
                <div className="mt-4">
                  <Label htmlFor="match-comment" className="text-sm font-medium mb-1 block">
                    Match Comment / Decision Notes
                  </Label>
                  <div className="bg-white rounded border border-slate-300 p-0.5 max-w-[500px] mx-auto">
                    <textarea 
                      id="match-comment"
                      className="w-full min-h-[100px] p-2 rounded text-sm resize-y"
                      placeholder="Add any comments about this match, tiebreaker decisions, or other important notes..."
                      value={matchComment}
                      onChange={(e) => setMatchComment(e.target.value)}
                      style={{ maxHeight: "200px", overflowY: "auto" }}
                    />
                  </div>
                </div>                {/* Tiebreaker methods summary - Only show if RSC or PUN are used */}                
                {rounds.some(r => r.winMethod === 'RSC' || r.winMethod === 'PUN') && (
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <h5 className="text-sm text-blue-700 font-medium">Special Decision Methods Used:</h5>
                    <ul className="text-sm mt-2 text-blue-800 max-h-[120px] overflow-y-auto pl-4 list-disc custom-scrollbar">
                      {/* Show RSC decisions with reasons */}
                      {rounds.filter(r => r.winMethod === 'RSC').map((round, idx) => (
                        <li key={`rsc-${idx}`} className="mb-2">
                          <strong>RSC:</strong> Referee Stopped Contest
                          {round.winMethodReason && (
                            <div className="ml-4 text-xs italic mt-0.5 text-gray-600">
                              Reason: {round.winMethodReason}
                            </div>
                          )}
                          {round.winner && (
                            <div className="ml-4 text-xs mt-0.5 text-blue-700">
                              Winner: {round.winner}
                            </div>
                          )}
                        </li>
                      ))}
                      
                      {/* Show PUN decisions with reasons */}
                      {rounds.filter(r => r.winMethod === 'PUN').map((round, idx) => (
                        <li key={`pun-${idx}`} className="mb-2">
                          <strong>PUN:</strong> Punitive Declaration
                          {round.player1Score !== null && round.player2Score !== null && round.player1Score === round.player2Score && (
                            <div className="ml-4 text-xs mt-0.5">
                              Tied match resolution: {round.player1Score}-{round.player2Score}
                            </div>
                          )}
                          {round.winMethodReason && (
                            <div className="ml-4 text-xs italic mt-0.5 text-gray-600">
                              Reason: {round.winMethodReason}
                            </div>
                          )}
                          {round.winner && (
                            <div className="ml-4 text-xs mt-0.5 text-amber-700">
                              Judge selected: {round.winner}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                  {/* Match comments field */}
                {/* <div className="mt-4">
                  <Label htmlFor="match-comment" className="text-sm font-medium">Match Comments / Notes</Label>
                  <textarea
                    id="match-comment"
                    className="w-full min-h-[100px] px-3 py-2 mt-1 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                    placeholder="Add notes about this match (score decisions, tiebreakers, special circumstances)..."
                    value={matchComment}
                    onChange={(e) => setMatchComment(e.target.value)}
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Use this field for any important comments or notes about this match. Especially useful for documenting tiebreaker decisions.
                  </p>
                </div> */}
              </div>
              {showChangeReason && (
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
              <h4 className="font-medium text-yellow-800">Modifying completed match</h4>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Please provide a reason for changing the result of this match:
            </p>
            <Input 
              className="mt-2"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Reason for change..."
              required
            />
          </div>
        )}
            </div>
          </TabsContent>
          </div>
          
        </Tabs>
           <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={!isSubmittable || (showChangeReason && !changeReason)}
          >
            Save Results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Save confirmation dialog */}
    <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved match data. Would you like to save your progress before closing?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDiscardAndClose} className="bg-red-600 hover:bg-red-700">
            Discard Changes
          </AlertDialogAction>
          <AlertDialogAction onClick={handleSaveAndClose}>
            Save & Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
