import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  { value: "PUN", label: "PUN: Win by Punitive Declaration", requiresScore: false },
  { value: "RSC", label: "RSC: Win by Referee Stop the Contest", requiresScore: false },
  { value: "WDR", label: "WDR: Win by Withdrawal", requiresScore: false, matchEnding: true },
  { value: "DQB", label: "DQB: Win by Disqualification for unsportsmanlike behavior", requiresScore: false, matchEnding: true }
];

export function MatchScoringModal({ 
  open, 
  onOpenChange, 
  match, 
  onScoringComplete 
}: MatchScoringModalProps) {
  const internalRoundsPerMatch = useTournamentStore(state => state.internalRoundsPerMatch || 3);
  const matchResults = useTournamentStore(state => state.matchResults || {});
  const existingResult = match ? matchResults[match.matchId] : null;
    // Initialize state based on existing results or create new
  const [activeTab, setActiveTab] = useState("round-1");
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
  });
  
  // Reset rounds when match changes
  useEffect(() => {
    if (match) {
      const matchResult = matchResults[match.matchId];
      if (matchResult) {
        setRounds(matchResult.rounds);
      } else {
        setRounds(Array(internalRoundsPerMatch).fill(null).map(() => ({
          player1Score: null,
          player2Score: null,
          winMethod: null,
          winner: null
        })));
      }
      // Also reset to first tab when match changes
      setActiveTab("round-1");
    }
  }, [match?.matchId, matchResults, internalRoundsPerMatch]);
    // For editing a previous winner or adding comments
  const [changeReason, setChangeReason] = useState("");
  const [showChangeReason, setShowChangeReason] = useState(false);  const [matchComment, setMatchComment] = useState("");
  
  useEffect(() => {
    if (existingResult) {
      if (existingResult.completed) {
        setShowChangeReason(true);
      }
      // Load existing comment if available
      setMatchComment(existingResult.comment || "");
    } else {
      setShowChangeReason(false);
      setMatchComment("");
    }
  }, [existingResult]);
    const handleScoreChange = (roundIndex: number, player: 'player1' | 'player2', value: string) => {
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
          newRounds[roundIndex].winner = null; // Tie
        }
      }
    }
    
    setRounds(newRounds);
  };
    const handleWinMethodChange = (roundIndex: number, method: WinMethod) => {
    if (!match) return;
    
    const newRounds = [...rounds];
    const methodInfo = WIN_METHODS.find(m => m.value === method);
    
    if (!methodInfo) return;
    
    newRounds[roundIndex] = { 
      ...newRounds[roundIndex], 
      winMethod: method,
    };
    
    // If this method doesn't require scores, clear them
    if (!methodInfo.requiresScore) {
      newRounds[roundIndex].player1Score = null;
      newRounds[roundIndex].player2Score = null;
      
      // For RSC, there's no tie option - if no winner is explicitly chosen,
      // we need to prompt the user to select one
      if (method === "RSC" && !newRounds[roundIndex].winner) {
        // Don't set a default winner, but make sure we clear any existing tie state
        if (newRounds[roundIndex].winner === null) {
          // Force the user to select a winner explicitly
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
    setRounds(newRounds);
  };
  
  const determineMatchWinner = (): string | null => {
    if (!match) return null;
    
    const roundsWithWinners = rounds.filter(r => r.winner);
    const player1Wins = roundsWithWinners.filter(r => r.winner === match.player1).length;
    const player2Wins = roundsWithWinners.filter(r => r.winner === match.player2).length;
    
    // Check for match-ending win methods
    const matchEndingWin = rounds.find(r => {
      if (!r.winMethod) return false;
      const methodInfo = WIN_METHODS.find(m => m.value === r.winMethod);
      return methodInfo?.matchEnding && r.winner;
    });
    
    if (matchEndingWin) {
      return matchEndingWin.winner;
    }
    
    // Otherwise determine by majority
    if (player1Wins > internalRoundsPerMatch / 2) return match.player1;
    if (player2Wins > internalRoundsPerMatch / 2) return match.player2;
    
    // Not enough rounds decided yet
    return null;
  };
    const handleSubmit = () => {
    if (!match) return;
    
    const winner = determineMatchWinner();
    
    // Only allow submission if a winner is determined
    if (!winner) {
      alert("Unable to determine a match winner. Please complete scoring for more rounds.");
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
    onOpenChange(false);
  };
  
  if (!match) return null;
  
  // Determine if enough rounds have been scored to determine a winner
  const isSubmittable = determineMatchWinner() !== null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl  h-[500] overflow-y-auto">
        <DialogHeader>          <DialogTitle className="flex items-center">
            Match Scoring: {match.player1} vs {match.player2}
            {existingResult?.completed && (
              <CheckCircle className="ml-2 h-4 w-4 text-green-600" />
            )}
          </DialogTitle>
        </DialogHeader>
        
       
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full ">
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
            <TabsTrigger value="summary" className="flex-1">
              Summary
            </TabsTrigger>
          </TabsList>
          
          {rounds.map((round, roundIndex) => {
            const winMethod = WIN_METHODS.find(m => m.value === round.winMethod);
            const scoreInputDisabled = winMethod && !winMethod.requiresScore;
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
                  </div>
                  
                  {/* Manual winner selection for non-score methods */}
                  {scoreInputDisabled && (
                    <div className="mt-4">
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
                        {roundIndex < 2 && round.winMethod !== "RSC" && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="tie" id={`winner-tie-${roundIndex}`} />
                            <Label htmlFor={`winner-tie-${roundIndex}`}>Tie</Label>
                          </div>
                        )}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
          
          <TabsContent value="summary">
            <div className="space-y-4">
              <h3 className="font-medium">Match Summary</h3>
              
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Round</th>
                      <th className="p-2 text-left">{match.player1}</th>
                      <th className="p-2 text-left">{match.player2}</th>
                      <th className="p-2 text-left">Winner</th>
                      <th className="p-2 text-left">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((round, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">Round {i+1}</td>
                        <td className="p-2">{round.player1Score ?? "-"}</td>
                        <td className="p-2">{round.player2Score ?? "-"}</td>
                        <td className={`p-2 ${round.winner === match.player1 ? "font-medium text-blue-600" : round.winner === match.player2 ? "font-medium text-red-600" : ""}`}>
                          {round.winner ?? "-"}
                        </td>
                        <td className="p-2">{round.winMethod ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>              <div className="bg-muted/50 p-3 rounded-md">
                <h4 className="font-medium">Match Result</h4>
                <p className="mt-1">
                  Winner: <span className="font-medium text-primary">{determineMatchWinner() || "Not yet determined"}</span>
                </p>
                {!isSubmittable && (
                  <p className="text-sm text-yellow-600 mt-2">
                    Not enough rounds completed to determine a winner.
                  </p>
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
                </div>
                  {/* Tiebreaker methods summary - Only show if RSC or PUN are used */}
                {rounds.some(r => r.winMethod === 'RSC' || r.winMethod === 'PUN') && (
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <h5 className="text-sm text-blue-700 font-medium">Special Decision Methods Used:</h5>
                    <ul className="text-sm mt-2 text-blue-800 max-h-[100px] overflow-y-auto pl-4 list-disc">
                      {rounds.some(r => r.winMethod === 'RSC') && (
                        <li className="flex items-center">
                          <span className="mr-1">•</span> RSC: Referee Stop Contest
                        </li>
                      )}
                      {rounds.some(r => r.winMethod === 'PUN') && (
                        <li className="flex items-center">
                          <span className="mr-1">•</span> PUN: Punitive Declaration
                        </li>
                      )}
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
            </div>
          </TabsContent>
        </Tabs>
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
  );
}
