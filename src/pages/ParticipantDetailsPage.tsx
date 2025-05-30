import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useTournamentStore } from "@/store/useTournamentStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Trophy, XCircle } from "lucide-react";

interface MatchSummary {
  matchId: string;
  roundNumber: number;
  matchNumber: number;
  opponent: string;
  result: "win" | "loss";
  score?: string;
  method?: string;
}

const ParticipantDetailsPage = () => {
  const [, params] = useRoute<{ name: string }>("/participant/:name");
  const [, setLocation] = useLocation();
  const participantName = params?.name ? decodeURIComponent(params.name) : "";
  
  const { bracketData, matchResults } = useTournamentStore();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    pointsScored: 0,
    pointsConceded: 0,
  });
  
  useEffect(() => {
    if (!bracketData || !matchResults || !participantName) return;
    
    // Find all matches involving this participant
    const participantMatches: MatchSummary[] = [];
    let wins = 0;
    let losses = 0;
    let pointsScored = 0;
    let pointsConceded = 0;
    
    // Iterate through all matches in the bracket
    bracketData.forEach((round, roundIndex) => {
      round.forEach((match, matchIndex) => {
        // Calculate sequential match number
        const matchNumber = roundIndex * round.length + matchIndex + 1;
        
        if (match.participants.includes(participantName)) {
          const matchResult = matchResults[match.id];
          
          // Skip matches that haven't been scored
          if (!matchResult || !matchResult.completed) return;
          
          // Determine if participant won or lost
          const isWin = matchResult.winner === participantName;
          
          // Determine the opponent
          const opponent = match.participants[0] === participantName ? 
            match.participants[1] : match.participants[0];
            
          // Calculate scores
          let scoreText = "N/A";
          let methodText = "N/A";
          
          if (matchResult.rounds.length > 0) {
            // Sum up points across rounds
            let participantTotalScore = 0;
            let opponentTotalScore = 0;
            
            matchResult.rounds.forEach(round => {
              const isPlayer1 = match.participants[0] === participantName;
              
              if (round.player1Score !== null && round.player2Score !== null) {
                if (isPlayer1) {
                  participantTotalScore += round.player1Score;
                  opponentTotalScore += round.player2Score;
                } else {
                  participantTotalScore += round.player2Score;
                  opponentTotalScore += round.player1Score;
                }
              }
              
              // Get the win method from the final round
              if (round.winMethod) {
                methodText = round.winMethod;
              }
            });
            
            scoreText = `${participantTotalScore}-${opponentTotalScore}`;
            
            pointsScored += participantTotalScore;
            pointsConceded += opponentTotalScore;
          }
          
          participantMatches.push({
            matchId: match.id,
            roundNumber: roundIndex + 1,
            matchNumber,
            opponent: opponent || "BYE",
            result: isWin ? "win" : "loss",
            score: scoreText,
            method: methodText
          });
          
          if (isWin) wins++;
          else losses++;
        }
      });
    });
    
    setMatches(participantMatches);
    setStats({
      wins,
      losses,
      matchesPlayed: wins + losses,
      pointsScored,
      pointsConceded
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
    <div className="container py-8 space-y-8">    <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{participantName}</h1>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Match #</TableHead>
                      <TableHead>Round</TableHead>
                      <TableHead>Opponent</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Win Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map((match) => (
                      <TableRow key={match.matchId}>
                        <TableCell>M{match.matchNumber}</TableCell>
                        <TableCell>Round {match.roundNumber}</TableCell>
                        <TableCell>{match.opponent}</TableCell>
                        <TableCell>
                          {match.result === "win" ? (
                            <div className="flex items-center text-green-600 font-medium">
                              <Trophy className="mr-2 h-4 w-4" /> Win
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600 font-medium">
                              <XCircle className="mr-2 h-4 w-4" /> Loss
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{match.score}</TableCell>
                        <TableCell>{match.method}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
