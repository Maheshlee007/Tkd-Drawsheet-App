import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useTournamentStore } from "@/store/useTournamentStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Edit2, Save, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface RoundDetail {
  roundNumber: number;
  participantScore: number | null;
  opponentScore: number | null;
  winMethod?: string | null; // Allow null
  notes?: string;
}

interface MatchSummary {
  matchId: string;
  roundNumber: number; // Tournament round
  matchNumber: number; // Sequential match number
  opponent: string;
  result: "win" | "loss";
  score?: string; // Overall score string
  method?: string; // Overall win method
  roundsPlayed: number;
  detailedRounds: RoundDetail[]; // Details for each round played in the match
}

const ParticipantDetailsPage = () => {
  const [, params] = useRoute<{ name: string }>("/participant/:name");
  const [, setLocation] = useLocation();
  const participantName = params?.name ? decodeURIComponent(params.name) : "";
  
  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(participantName);
  
  const { bracketData, matchResults, updateParticipantName } = useTournamentStore();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    pointsScored: 0,
    pointsConceded: 0,
  });
  // Update editedName when participantName changes
  useEffect(() => {
    setEditedName(participantName);
  }, [participantName]);

  // Handle name save
  const handleSaveName = () => {
    if (!editedName.trim()) {
      return;
    }
    
    const result = updateParticipantName(participantName, editedName.trim());
    
    if (result.success) {
      setIsEditingName(false);
      // Update URL to reflect new name
      setLocation(`/participant/${encodeURIComponent(editedName.trim())}`);
    }
  };

  // Handle name cancel
  const handleCancelEdit = () => {
    setEditedName(participantName);
    setIsEditingName(false);
  };

  // Handle Enter key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  useEffect(() => {
    if (!bracketData || !matchResults || !participantName) return;
    
    const participantMatches: MatchSummary[] = [];
    let wins = 0;
    let losses = 0;
    let totalPointsScoredOverall = 0;
    let totalPointsConcededOverall = 0;
    
    bracketData.forEach((round, roundIndex) => {
      round.forEach((match, matchIndexInOriginalRound) => {
        const matchNumber = participantMatches.length + 1;

        if (match.participants.includes(participantName)) {
          const matchResult = matchResults[match.id];
          
          if (!matchResult || !matchResult.completed) return;
          
          const isWin = matchResult.winner === participantName;
          const isMutualDQ = matchResult.winner === "NO_WINNER";
          
          const opponent = match.participants[0] === participantName ? 
            match.participants[1] : match.participants[0];
            
          let overallScoreText = "N/A";
          let overallMethodText = "N/A";
          const detailedRounds: RoundDetail[] = [];
          let matchParticipantTotalScore = 0;
          let matchOpponentTotalScore = 0;
          
          if (matchResult.rounds.length > 0) {
            matchResult.rounds.forEach((roundDetail, rdIndex) => {
              const isPlayer1 = match.participants[0] === participantName;
              
              let pScore: number | null = null;
              let oScore: number | null = null;

              if (roundDetail.player1Score !== null && roundDetail.player2Score !== null) {
                if (isPlayer1) {
                  pScore = roundDetail.player1Score;
                  oScore = roundDetail.player2Score;
                } else {
                  pScore = roundDetail.player2Score;
                  oScore = roundDetail.player1Score;
                }
                matchParticipantTotalScore += pScore;
                matchOpponentTotalScore += oScore;
              }
              
              detailedRounds.push({
                roundNumber: rdIndex + 1,
                participantScore: pScore,
                opponentScore: oScore,
                winMethod: roundDetail.winMethod, // This can be null
                notes: roundDetail.winMethodReason // Using winMethodReason as notes
              });

              if (rdIndex === matchResult.rounds.length - 1 && roundDetail.winMethod) {
                overallMethodText = roundDetail.winMethod; 
              }
            });
            
            overallScoreText = `${matchParticipantTotalScore}-${matchOpponentTotalScore}`;
            totalPointsScoredOverall += matchParticipantTotalScore;
            totalPointsConcededOverall += matchOpponentTotalScore;
          }
          
          // Consolidate overallMethodText determination
          if (overallMethodText === "N/A") {
            if (matchResult.matchLevelDecision?.method && matchResult.matchLevelDecision.method !== 'EXTRA_ROUND') {
              overallMethodText = matchResult.matchLevelDecision.method;
            } else if (matchResult.rounds.length > 0) {
              // Fallback to last round's method if no matchLevelDecision method
              const lastRound = matchResult.rounds[matchResult.rounds.length - 1];
              if (lastRound.winMethod) {
                overallMethodText = lastRound.winMethod;
              }
            }
          }

          participantMatches.push({
            matchId: match.id,
            roundNumber: roundIndex + 1,
            matchNumber: matchNumber,
            opponent: opponent || "BYE",
            result: isMutualDQ ? "loss" : (isWin ? "win" : "loss"),
            score: isMutualDQ ? "DQ-DQ" : overallScoreText,
            method: isMutualDQ ? "DQBOTH" : overallMethodText,
            roundsPlayed: matchResult.rounds.length,
            detailedRounds
          });
          
          if (isWin) wins++;
          else losses++;
        }
      });
    });
    
    setMatches(participantMatches.sort((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber));
    setStats({
      wins,
      losses,
      matchesPlayed: wins + losses,
      pointsScored: totalPointsScoredOverall,
      pointsConceded: totalPointsConcededOverall
    });
  }, [bracketData, matchResults, participantName]);
  
  if (!participantName) {
    return (
      <div className="container py-8">      <h1 className="text-2xl font-bold">Participant not found</h1>
        <Button onClick={() => setLocation("/participants")} className="mt-4">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Participants
        </Button>
      </div>
    );
  }
    return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="text-3xl font-bold h-12 px-3"
                autoFocus
                onBlur={() => {
                  // Don't auto-cancel on blur, let user decide
                }}
              />
              <Button 
                onClick={handleSaveName} 
                size="sm"
                disabled={!editedName.trim() || editedName.trim() === participantName}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleCancelEdit} 
                size="sm" 
                variant="outline"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{participantName}</h1>
              <Button 
                onClick={() => setIsEditingName(true)} 
                size="sm" 
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <Button onClick={() => setLocation("/participants")} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Participants
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Matches</CardTitle>
            <CardDescription>Total matches played</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.matchesPlayed}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Wins</CardTitle>
            <CardDescription>Total wins</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.wins}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Losses</CardTitle>
            <CardDescription>Total losses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.losses}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Win Rate</CardTitle>
            <CardDescription>Win percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.matchesPlayed > 0
                ? `${Math.round((stats.wins / stats.matchesPlayed) * 100)}%`
                : "N/A"
              }
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="matches" className="w-full">
        <TabsList>
          <TabsTrigger value="matches">Match History</TabsTrigger>
          <TabsTrigger value="stats">Detailed Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Match History</CardTitle>
              <CardDescription>
                All matches played by {participantName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {matches.map((match) => (
                    <AccordionItem value={match.matchId} key={match.matchId}>
                      <AccordionTrigger className="hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3 rounded-md">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col text-left">
                            <span className="font-semibold">
                              Match vs {match.opponent}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              Tournament Round {match.roundNumber} - Overall: {match.score} ({match.method})
                            </span>
                          </div>
                          <span className={`font-bold text-lg ${match.result === "win" ? "text-green-600" : "text-red-600"}`}>
                            {match.result === "win" ? "WIN" : "LOSS"}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 pb-4 px-4 border-t dark:border-slate-700">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-md mb-2">Match Summary:</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm pl-2">
                              <p><strong>Opponent:</strong></p><p>{match.opponent}</p>
                              <p><strong>Result:</strong></p><p><span className={match.result === "win" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{match.result === "win" ? "Win" : "Loss"}</span></p>
                              <p><strong>Overall Score:</strong></p><p>{match.score}</p>
                              <p><strong>Win Method:</strong></p><p>{match.method}</p>
                              <p><strong>Rounds Played:</strong></p><p>{match.roundsPlayed}</p>
                            </div>
                          </div>

                          {match.detailedRounds.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-md mt-3 mb-2">Round Details:</h4>
                              <ul className="space-y-2 pl-2">
                                {match.detailedRounds.map((rd, index) => (
                                  <li key={index} className="text-sm border-b border-slate-200 dark:border-slate-700 pb-2 last:border-b-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">Round {rd.roundNumber}:</span>
                                      <span>
                                        {rd.participantScore !== null ? `${rd.participantScore} - ${rd.opponentScore}` : 'N/A'}
                                      </span>
                                    </div>
                                    {rd.winMethod && <p className="text-xs text-slate-500 dark:text-slate-400">Method: {rd.winMethod}</p>}
                                    {rd.notes && <p className="text-xs text-slate-500 dark:text-slate-400">Notes: {rd.notes}</p>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No matches found for this participant.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Performance Statistics</CardTitle>
              <CardDescription>
                Detailed statistics for {participantName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Scoring</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Points Scored:</span>
                      <span className="font-medium">{stats.pointsScored}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Points Conceded:</span>
                      <span className="font-medium">{stats.pointsConceded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Points Difference:</span>
                      <span className={`font-medium ${stats.pointsScored - stats.pointsConceded > 0 ? 'text-green-600' : stats.pointsScored - stats.pointsConceded < 0 ? 'text-red-600' : ''}`}>
                        {stats.pointsScored - stats.pointsConceded}
                      </span>
                    </div>
                    {stats.matchesPlayed > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Average Points Per Match:</span>
                          <span className="font-medium">{(stats.pointsScored / stats.matchesPlayed).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Average Points Conceded:</span>
                          <span className="font-medium">{(stats.pointsConceded / stats.matchesPlayed).toFixed(1)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Match Performance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Win-Loss Record:</span>
                      <span className="font-medium">{stats.wins}-{stats.losses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Win Rate:</span>
                      <span className="font-medium">
                        {stats.matchesPlayed > 0
                          ? `${Math.round((stats.wins / stats.matchesPlayed) * 100)}%`
                          : "N/A"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParticipantDetailsPage;
