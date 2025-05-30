import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTournamentStore } from "@/store/useTournamentStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LegendProps, Legend } from "recharts";
import { Award, Clock, Users, Check, X, BarChart2 } from "lucide-react";

const StatisticsPage = () => {
  const [, navigate] = useLocation();
  const { bracketData, tournamentName, participantCount } = useTournamentStore();
  
  // If no bracket data exists, redirect to home
  useEffect(() => {
    if (!bracketData) {
      navigate("/");
    }
  }, [bracketData, navigate]);
  
  if (!bracketData) {
    return null; // Will redirect in useEffect
  }
  
  // Calculate overall tournament statistics
  const calculateTournamentStats = () => {
    let totalMatches = 0;
    let completedMatches = 0;
    let rounds = bracketData.length;
    
    // Calculate total and completed matches
    bracketData.forEach(round => {
      totalMatches += round.length;
      round.forEach(match => {
        if (match.winner) {
          completedMatches++;
        }
      });
    });
    
    // Calculate tournament progress percentage
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
  
  // Calculate participant performance statistics
  const calculateParticipantStats = () => {
    // Create a map to track individual participant stats
    const stats = new Map();
    
    // Initialize stats for each participant
    const allParticipants = new Set();
    bracketData.forEach(round => {
      round.forEach(match => {
        match.participants.forEach(participant => {
          if (participant && participant !== "(bye)") {
            allParticipants.add(participant);
          }
        });
      });
    });
    
    // Initialize participant records
    allParticipants.forEach(participant => {
      stats.set(participant, {
        name: participant,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        winPercentage: 0
      });
    });
    
    // Calculate wins and losses
    bracketData.forEach(round => {
      round.forEach(match => {
        // Skip incomplete matches
        if (!match.winner) return;
        
        // Process participants
        match.participants.forEach(participant => {
          if (participant && participant !== "(bye)") {
            const record = stats.get(participant);
            
            if (match.winner === participant) {
              record.wins += 1;
            } else {
              record.losses += 1;
            }
            
            record.matchesPlayed = record.wins + record.losses;
            record.winPercentage = record.matchesPlayed > 0 
              ? Math.round((record.wins / record.matchesPlayed) * 100) 
              : 0;
            
            stats.set(participant, record);
          }
        });
      });
    });
    
    // Convert map to array sorted by wins (descending)
    return Array.from(stats.values()).sort((a, b) => b.wins - a.wins);
  };
  
  // Calculate statistics by round
  const calculateRoundStats = () => {
    const roundStats = [];
    
    bracketData.forEach((round, index) => {
      let totalMatches = round.length;
      let completedMatches = 0;
      
      round.forEach(match => {
        if (match.winner) {
          completedMatches++;
        }
      });
      
      roundStats.push({
        name: `Round ${index + 1}`,
        matches: totalMatches,
        completed: completedMatches,
        progress: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
      });
    });
    
    return roundStats;
  };
  
  const tournamentStats = calculateTournamentStats();
  const participantStats = calculateParticipantStats();
  const roundStats = calculateRoundStats();
  
  // Find the tournament winner (if the tournament is complete)
  const findWinner = () => {
    // The winner would be the winner of the last match in the last round
    if (bracketData.length > 0) {
      const finalRound = bracketData[bracketData.length - 1];
      if (finalRound.length > 0 && finalRound[0].winner) {
        return finalRound[0].winner;
      }
    }
    return null;
  };
  
  const tournamentWinner = findWinner();
  
  // Custom legend for charts
  const renderLegend = (props: LegendProps) => {
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
      <div>
        <h1 className="text-2xl font-bold">{tournamentName} Statistics</h1>
        <p className="text-muted-foreground mt-1">
          Tournament overview and performance metrics
        </p>
      </div>
      
      {/* Overview Cards */}
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
      
      {/* Tournament Winner (if available) */}
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
      
      {/* Round Progress Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Round Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roundStats}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, name === 'completed' ? 'Completed' : 'Total']} />
                <Legend content={renderLegend} />
                <Bar dataKey="completed" name="Completed" fill="#4f46e5" />
                <Bar dataKey="matches" name="Total Matches" fill="#e5e7eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Participant Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Participant Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                  <th className="h-12 px-4 text-center align-middle font-medium">Wins</th>
                  <th className="h-12 px-4 text-center align-middle font-medium">Losses</th>
                  <th className="h-12 px-4 text-center align-middle font-medium">Win %</th>
                </tr>
              </thead>
              <tbody>
                {participantStats.slice(0, 10).map((participant, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-4 align-middle font-medium">{participant.name}</td>
                    <td className="p-4 align-middle text-center">
                      <div className="flex items-center justify-center">
                        <Check className="mr-1 h-4 w-4 text-green-500" />
                        {participant.wins}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-center">
                      <div className="flex items-center justify-center">
                        <X className="mr-1 h-4 w-4 text-red-500" />
                        {participant.losses}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${participant.winPercentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs mt-1">{participant.winPercentage}%</div>
                    </td>
                  </tr>
                ))}
                
                {participantStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="h-24 text-center">
                      No participant data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsPage;