import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTournamentStore, MatchResult } from "@/store/useTournamentStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LegendProps as RechartsLegendProps, Legend } from "recharts"; // Aliased LegendProps
import { Award, Clock, Users, Check, X, BarChart2, Trophy, Medal as MedalIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FinalStandings {
  first: string | null;
  second: string | null;
  third: string | null;
  fourth: string | null;
}

// Define a compatible type for the payload in renderLegend
interface LegendPayloadItem {
  color: string;
  value: string;
  // Add other properties from Recharts payload if needed, e.g., type, id
}

const StatisticsPage = () => {
  const [, navigate] = useLocation();
  const { bracketData, tournamentName, participantCount, matchResults } = useTournamentStore();
  
  useEffect(() => {
    if (!bracketData) {
      navigate("/");
    }
  }, [bracketData, navigate]);
  
  if (!bracketData) {
    return null;
  }
  
  const calculateTournamentStats = () => {
    let totalMatches = 0;
    let completedMatches = 0;
    let rounds = bracketData.length;
    
    bracketData.forEach(round => {
      totalMatches += round.length;
      round.forEach(match => {
        const matchResultStore = matchResults[match.id];
        if (matchResultStore && matchResultStore.completed && matchResultStore.winner) {
          completedMatches++;
        } else if (!matchResultStore && match.winner && match.winner !== "(bye)") { 
          // Fallback for older data or if matchResult not yet populated, ensure winner is not a bye
          completedMatches++;
        }
      });
    });
    
    const progressPercentage = totalMatches > 0 
      ? Math.round((completedMatches / totalMatches) * 100) 
      : 0;
    
    return {
      totalParticipants: participantCount,
      totalMatches,
      completedMatches,
      rounds,
      progressPercentage
    };
  };
  
  const calculateParticipantStats = () => {
    const stats = new Map<string, { name: string; wins: number; losses: number; matchesPlayed: number; winPercentage: number }>();
    const allParticipants = new Set<string>();

    bracketData.forEach(round => {
      round.forEach(match => {
        match.participants.forEach(participant => {
          if (participant && participant !== "(bye)") {
            allParticipants.add(participant);
          }
        });
      });
    });
    
    allParticipants.forEach(participant => {
      stats.set(participant, {
        name: participant,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        winPercentage: 0
      });
    });

    bracketData.forEach(round => {
      round.forEach(match => {
        const matchResultStore = matchResults[match.id];
        const actualWinner = (matchResultStore && matchResultStore.completed) ? matchResultStore.winner : match.winner;

        if (!actualWinner || actualWinner === "(bye)") return; // Skip incomplete matches or matches won by bye

        if (actualWinner === "NO_WINNER") {
          match.participants.forEach(participant => {
            if (participant && participant !== "(bye)") {
              const record = stats.get(participant);
              if (record) {
                record.losses += 1;
                record.matchesPlayed = record.wins + record.losses;
                record.winPercentage = record.matchesPlayed > 0 
                  ? Math.round((record.wins / record.matchesPlayed) * 100) 
                  : 0;
                stats.set(participant, record);
              }
            }
          });
          return;
        }
        
        match.participants.forEach(participant => {
          if (participant && participant !== "(bye)") {
            const record = stats.get(participant);
            if (record) {
              if (actualWinner === participant) {
                record.wins += 1;
              } else {
                // Ensure the other participant is not a bye before assigning a loss
                const opponent = match.participants.find(p => p !== participant);
                if (opponent && opponent !== "(bye)") {
                    record.losses += 1;
                }
              }
              // Only count matches against non-bye opponents for played stats
              const opponent = match.participants.find(p => p !== participant);
              if (opponent && opponent !== "(bye)") {
                record.matchesPlayed = record.wins + record.losses; 
              }

              record.winPercentage = record.matchesPlayed > 0 
                ? Math.round((record.wins / record.matchesPlayed) * 100) 
                : 0;
              stats.set(participant, record);
            }
          }
        });
      });
    });
    
    return Array.from(stats.values()).sort((a, b) => b.wins - a.wins);
  };
  
  const calculateRoundStats = () => {
    const calculatedRoundStats: { name: string; matches: number; completed: number; progress: number }[] = [];
    bracketData.forEach((round, index) => {
      let totalMatchesInRound = round.length;
      let completedMatchesInRound = 0;
      round.forEach(match => {
        const matchResultStore = matchResults[match.id];
        if (matchResultStore && matchResultStore.completed && matchResultStore.winner) {
          completedMatchesInRound++;
        } else if (!matchResultStore && match.winner && match.winner !== "(bye)") {
            completedMatchesInRound++;
        }
      });
      calculatedRoundStats.push({
        name: `Round ${index + 1}`,
        matches: totalMatchesInRound,
        completed: completedMatchesInRound,
        progress: totalMatchesInRound > 0 ? Math.round((completedMatchesInRound / totalMatchesInRound) * 100) : 0
      });
    });
    return calculatedRoundStats;
  };
  
  const tournamentStats = calculateTournamentStats();
  const participantPerformanceStats = calculateParticipantStats(); // Renamed to avoid conflict
  const roundStatsData = calculateRoundStats();
    
  const findWinner = (): string | null => {
    if (bracketData && bracketData.length > 0) {
      const finalRound = bracketData[bracketData.length - 1];
      if (finalRound.length > 0 && finalRound[0] && finalRound[0].id) {
        const finalMatchInBracket = finalRound[0];
        const finalMatchResultStore = matchResults[finalMatchInBracket.id];

        if (finalMatchResultStore && finalMatchResultStore.completed && finalMatchResultStore.winner) {
          if (finalMatchResultStore.winner === "NO_WINNER") {
            return "No Winner - Both Finalists Disqualified";
          }
          return finalMatchResultStore.winner;
        }
      }
    }
    return null;
  };
  
  const tournamentWinner = findWinner();

  const calculateFinalStandings = (): FinalStandings => {
    const standings: FinalStandings = { first: null, second: null, third: null,fourth: null };

    if (!bracketData || bracketData.length === 0) {
      return standings;
    }
     console.log(matchResults);
     
    const finalRoundIndex = bracketData.length - 1;
    const finalRoundBracket = bracketData[finalRoundIndex];

    if (!finalRoundBracket || finalRoundBracket.length === 0 || !finalRoundBracket[0] || !finalRoundBracket[0].id) {
      return standings;
    }

    const finalMatchInBracket = finalRoundBracket[0];
    const finalMatchResultStore = matchResults[finalMatchInBracket.id];

    if (!finalMatchResultStore || !finalMatchResultStore.completed || !finalMatchResultStore.winner) {
      if (finalMatchResultStore && finalMatchResultStore.completed && finalMatchResultStore.winner === "NO_WINNER") {
        standings.first = "No Winner (DQ)";
      }
      return standings;
    }

    if (finalMatchResultStore.winner === "NO_WINNER") {
      standings.first = "No Winner (DQ)";
    } else {
      standings.first = finalMatchResultStore.winner;
      standings.second = finalMatchInBracket.participants.find(p => p && p !== standings.first && p !== "(bye)") || null;
    }

    if (bracketData.length > 1 && standings.first && standings.first !== "No Winner (DQ)") {
      const semiFinalRoundIndex = bracketData.length - 2;
      const semiFinalsBracket = bracketData[semiFinalRoundIndex];

      if (semiFinalsBracket && semiFinalsBracket.length >= 2) {
        const semiFinalLosers: string[] = [];
        semiFinalsBracket.forEach(match => {
          if (match.id) {
            const semiFinalMatchStore = matchResults[match.id];
            if (semiFinalMatchStore && semiFinalMatchStore.completed && semiFinalMatchStore.winner && semiFinalMatchStore.winner !== "NO_WINNER" && semiFinalMatchStore.winner !== "(bye)") {
              const loser = match.participants.find(p => p && p !== semiFinalMatchStore.winner && p !== "(bye)");
              if (loser && loser !== standings.first && loser !== standings.second) {
                semiFinalLosers.push(loser);
              }
            }
          }
        });
        
        const distinctLosers = Array.from(new Set(semiFinalLosers));
        if (distinctLosers.length > 0) {
          standings.third = distinctLosers[0]; 
          standings.fourth = distinctLosers[1] || null; 
        }
      }
    }
    return standings;
  };

  const finalStandings = calculateFinalStandings();
  
  const renderLegend = (props: RechartsLegendProps & { payload?: LegendPayloadItem[] }) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-4 text-xs font-medium mt-2">
        {payload?.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center">
            <div 
              className="w-3 h-3 mr-1" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="pb-4 mb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight">{tournamentName} Statistics</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          An overview of the tournament's progress and participant performance metrics.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tournamentStats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">Total participants</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Matches</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tournamentStats.completedMatches} / {tournamentStats.totalMatches}</div>
            <p className="text-xs text-muted-foreground">Completed matches</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rounds</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tournamentStats.rounds}</div>
            <p className="text-xs text-muted-foreground">Total rounds</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tournamentStats.progressPercentage}%</div>
            <Progress value={tournamentStats.progressPercentage} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>
      
      {tournamentWinner && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-500" />
              Tournament Winner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tournamentWinner}</div>
          </CardContent>
        </Card>
      )}
      
      {(finalStandings.first || finalStandings.second || finalStandings.third || finalStandings?.fourth) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Final Standings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {finalStandings.first && (
              <div className="flex items-center">
                <Trophy className="h-6 w-6 mr-3 text-yellow-400" />
                <div>
                  <p className="font-semibold text-lg">1st Place</p>
                  <p className="text-muted-foreground">{finalStandings.first}</p>
                </div>
              </div>
            )}
            {finalStandings.second && (
              <div className="flex items-center">
                <MedalIcon className="h-6 w-6 mr-3 text-gray-400" />
                <div>
                  <p className="font-semibold text-lg">2nd Place</p>
                  <p className="text-muted-foreground">{finalStandings.second}</p>
                </div>
              </div>
            )}
            {finalStandings.third && (
              <div className="flex items-center">
                <MedalIcon className="h-6 w-6 mr-3 text-orange-400" />
                <div>
                  <p className="font-semibold text-lg">3rd Place</p>
                  <p className="text-muted-foreground">{finalStandings.third}</p>
                </div>
              </div>
            )}
            {finalStandings.fourth && (
              <div className="flex items-center">
                <MedalIcon className="h-6 w-6 mr-3 text-orange-400" />
                <div>
                  <p className="font-semibold text-lg">3rd Place</p>
                  <p className="text-muted-foreground">{finalStandings.fourth}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Round Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roundStatsData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [value as number, '']} /> 
                {/* <Legend content={renderLegend} /> */}
                <Bar dataKey="completed" name="Completed" fill="hsl(var(--primary))" maxBarSize={60} />
                <Bar dataKey="matches" name="Total Matches" fill="hsl(var(--accent))" maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Participant Performance</CardTitle>
          <CardDescription>Top 10 participants by wins.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">Rank</TableHead>
                  <TableHead className="text-left">Name</TableHead>
                  <TableHead className="w-[100px] text-center">Wins</TableHead>
                  <TableHead className="w-[100px] text-center">Losses</TableHead>
                  <TableHead className="w-[150px] text-center">Win %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantPerformanceStats.length > 0 ? (
                  participantPerformanceStats.slice(0, 10).map((participant, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium text-left">{participant.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Check className="mr-1 h-4 w-4 text-green-500" />
                          {participant.wins}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <X className="mr-1 h-4 w-4 text-red-500" />
                          {participant.losses}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div 
                            className="bg-primary h-2.5 rounded-full" 
                            style={{ width: `${participant.winPercentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs mt-1">{participant.winPercentage}%</div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No participant data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsPage;