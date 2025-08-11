import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  BellRing, 
  Swords, 
  Trophy, 
  CheckCircle, 
  PlusCircle, 
  Info, 
  Clock,
  Users,
  Calendar,
  TrendingUp,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Archive,
  Eye,
  Filter,
  Search,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useTournamentStore, MatchResult } from "@/store/useTournamentStore";
import { BracketMatch } from "@shared/schema";
import { navigate } from 'wouter/use-browser-location';

// Enhanced FeedItem interface with lifecycle status
interface FeedItem {
  id: string;
  timestamp: Date;
  type: 'match_active' | 'match_completed' | 'tournament_start' | 'tournament_progress';
  message: string;
  priority: 'low' | 'medium' | 'high';
  status: 'live' | 'recent' | 'archived';
  matchId?: string;
  details?: {
    matchId?: string;
    participants?: string[];
    winner?: string;
    finalScore?: string;
    roundsPlayed?: number;
    totalParticipants?: number;
    totalMatches?: number;
    completedMatches?: number;
    progressPercent?: number;
    status?: string;
  };
}

// Grouped feed items for better organization
interface GroupedFeedItem {
  groupId: string;
  groupType: 'match' | 'tournament';
  title: string;
  timestamp: Date;
  status: 'live' | 'recent' | 'archived';
  items: FeedItem[];
  isExpanded?: boolean;
}

// Next match interface for the scrolling banner
interface NextMatch {
  id: string;
  participants: [string | null, string | null];
  round: number;
  position: number;
  estimatedTime?: string;
}



// Enhanced helper functions
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

const getTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "1 day ago";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return formatDate(date);
};

const getFeedItemStyle = (type: FeedItem['type'], priority: FeedItem['priority']) : { 
  icon: JSX.Element; 
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; 
  badgeLabel: string;
  borderColor: string;
} => {
  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500', 
    low: 'border-l-blue-500'
  };

  switch (type) {
    case 'tournament_start':
      return { 
        icon: <Trophy className="h-5 w-5 text-yellow-600" />, 
        badgeVariant: 'default', 
        badgeLabel: 'Tournament Started',
        borderColor: priorityColors[priority]
      };
    case 'tournament_progress':
      return { 
        icon: <TrendingUp className="h-5 w-5 text-purple-500" />, 
        badgeVariant: 'outline', 
        badgeLabel: 'Progress Update',
        borderColor: priorityColors[priority]
      };
    case 'match_active':
      return { 
        icon: <Swords className="h-5 w-5 text-blue-500" />, 
        badgeVariant: 'destructive', 
        badgeLabel: 'Live Match',
        borderColor: priorityColors[priority]
      };
    case 'match_completed':
      return { 
        icon: <Trophy className="h-5 w-5 text-green-500" />, 
        badgeVariant: 'default', 
        badgeLabel: 'Match Completed',
        borderColor: priorityColors[priority]
      };
    default:
      return { 
        icon: <BellRing className="h-5 w-5 text-gray-500" />, 
        badgeVariant: 'secondary', 
        badgeLabel: 'Update',
        borderColor: priorityColors[priority]
      };
  }
};

const LiveFeedPage = () => {
  const { 
    bracketData, 
    matchResults, 
    tournamentName, 
    tournamentStarted,
    participantCount 
  } = useTournamentStore();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedFeedItem[]>([]);
  const [nextMatches, setNextMatches] = useState<NextMatch[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('live');
  // Memoized round calculation - only recalculates when bracket or match data changes
  const roundInfo = useMemo(() => {
    if (!bracketData) return { currentActiveRound: 1, roundStatus: {}, upcomingMatches: [] };
    
    let currentActiveRound = 1;
    const roundStatus: Record<number, 'upcoming' | 'active' | 'completed'> = {};
    
    // First pass: identify completed rounds
    for (let roundIndex = 0; roundIndex < bracketData.length; roundIndex++) {
      const roundNumber = roundIndex + 1;
      const round = bracketData[roundIndex];
      
      // Count all playable matches in this round (excluding bye matches and null participants)
      const playableMatches = round.filter(match => {
        const p1 = match.participants[0];
        const p2 = match.participants[1];
        
        // Must have both participants and neither can be a bye
        return p1 && p2 && p1 !== "(bye)" && p2 !== "(bye)";
      });        // Count completed matches with fallback for bracket auto-winners
      const completedMatches = playableMatches.filter(match => {
        const isRealMatch = match.participants[0] && 
                           match.participants[1] && 
                           match.participants[0] !== "(bye)" && 
                           match.participants[1] !== "(bye)";
        
        const matchResult = matchResults[match.id];
        const hasMatchResults = matchResult?.completed && matchResult.winner;
        const hasBracketWinner = match.winner && match.winner !== "NO_WINNER";
        
        if (isRealMatch) {
          // For real matches, prefer match results but fallback to bracket winner
          // This handles cases where bracket logic auto-sets winners
          if (hasMatchResults) {
            return true; // Properly completed with match results
          } else if (hasBracketWinner) {
            // Fallback: bracket has winner but no match results
            // Consider this as "needs completion" rather than "completed"
            console.log('Fallback detected - bracket winner without match results:', {
              matchId: match.id,
              participants: match.participants,
              bracketWinner: match.winner,
              hasMatchResults
            });
            return false; // Treat as incomplete to force proper scoring
          }
          return false;
        } else {
          // For bye matches, bracket winner is sufficient
          return hasBracketWinner;
        }
      });
        // Calculate completion rate
      let completionRate = 0;
      if (playableMatches.length > 0) {
        completionRate = completedMatches.length / playableMatches.length;
      } else {
        // Check if this round has potential matches but participants aren't set yet
        const hasMatchesWithNullParticipants = round.some(match => 
          !match.participants[0] || !match.participants[1]
        );
        
        if (hasMatchesWithNullParticipants) {
          // Round hasn't started yet - participants not propagated
          completionRate = 0;
        } else {
          // No playable matches (all byes) - consider completed
          completionRate = 1;
        }
      }
      
      if (completionRate === 1) {
        // Round is fully completed
        roundStatus[roundNumber] = 'completed';
      } else if (completionRate > 0) {
        // Round is partially completed - this should be active
        roundStatus[roundNumber] = 'active';
        currentActiveRound = roundNumber;
      } else {
        // Round hasn't started yet
        roundStatus[roundNumber] = 'upcoming';
      }
    }
      // Second pass: determine the current active round
    // Start from the latest completed round and find the next round with matches to play
    let foundActiveRound = false;
    for (let roundIndex = 0; roundIndex < bracketData.length; roundIndex++) {
      const roundNumber = roundIndex + 1;
      
      if (roundStatus[roundNumber] === 'active') {
        // Already marked as active due to partial completion
        foundActiveRound = true;
        currentActiveRound = roundNumber;
        break;
      } else if (roundStatus[roundNumber] === 'upcoming') {
        // First upcoming round becomes active if no partially completed round exists
        if (!foundActiveRound) {
          const round = bracketData[roundIndex];
          const hasPlayableMatches = round.some(match => {
            const p1 = match.participants[0];
            const p2 = match.participants[1];
            return p1 && p2 && p1 !== "(bye)" && p2 !== "(bye)" && !match.winner;
          });
          
          if (hasPlayableMatches) {
            roundStatus[roundNumber] = 'active';
            currentActiveRound = roundNumber;
            foundActiveRound = true;
            break;
          }
        }
      }
    }
    
    // If no active round found, check if we need to advance to the next round
    if (!foundActiveRound) {
      // Find the last completed round and see if we can advance
      let lastCompletedRound = 0;
      for (let roundIndex = 0; roundIndex < bracketData.length; roundIndex++) {
        const roundNumber = roundIndex + 1;
        if (roundStatus[roundNumber] === 'completed') {
          lastCompletedRound = roundNumber;
        } else {
          break;
        }
      }
        // Try to advance to the next round
      const nextRoundNumber = lastCompletedRound + 1;
      if (nextRoundNumber <= bracketData.length) {
        const nextRound = bracketData[nextRoundNumber - 1];
        
        // Check if the next round has playable matches OR if all previous rounds are completed
        // (meaning participants should be propagated soon)
        const hasPlayableMatches = nextRound.some(match => {
          const p1 = match.participants[0];
          const p2 = match.participants[1];
          return p1 && p2 && p1 !== "(bye)" && p2 !== "(bye)";
        });
        
        // Also check if next round should be active based on completed previous rounds
        const shouldBeActive = lastCompletedRound > 0 && lastCompletedRound === nextRoundNumber - 1;        
        console.log('Next Round Check:', {
          nextRoundNumber,
          hasPlayableMatches,
          shouldBeActive
        });
        if (hasPlayableMatches) {
          roundStatus[nextRoundNumber] = 'active';
          currentActiveRound = nextRoundNumber;
          foundActiveRound = true;
        } else if (shouldBeActive) {
          // Even if previous round is complete, only mark as active if participants are propagated
          // For now, mark as upcoming until participants are available
          roundStatus[nextRoundNumber] = 'upcoming';        }
      }
    }

    // If no active round was found, set currentActiveRound to the most recent completed round
    if (!foundActiveRound) {
      let mostRecentCompletedRound = 0;
      for (let roundNumber = 1; roundNumber <= bracketData.length; roundNumber++) {
        if (roundStatus[roundNumber] === 'completed') {
          mostRecentCompletedRound = roundNumber;
        }
      }
      if (mostRecentCompletedRound > 0) {
        currentActiveRound = mostRecentCompletedRound;
      }    }    // Debug logging to help track round progression (can be removed in production)
    console.log('Round Status Debug:', {
      currentActiveRound,
      roundStatus
    });

    // Ensure all rounds have a status
    for (let roundNumber = 1; roundNumber <= bracketData.length; roundNumber++) {
      if (!roundStatus[roundNumber]) {
        roundStatus[roundNumber] = 'upcoming';
      }
    }
      // Get upcoming matches from current active round
    const upcomingMatches: NextMatch[] = [];
    if (currentActiveRound <= bracketData.length) {
      const currentRoundIndex = currentActiveRound - 1;
      const currentRoundMatches = bracketData[currentRoundIndex];
        currentRoundMatches.forEach((match) => {
        const p1 = match.participants[0];
        const p2 = match.participants[1];
        const isRealMatch = p1 && p2 && p1 !== "(bye)" && p2 !== "(bye)";
        const hasMatchResults = matchResults[match.id]?.completed;
        const hasBracketWinner = match.winner && match.winner !== "NO_WINNER";
        
        if (isRealMatch) {
          // Include matches that:
          // 1. Don't have proper match results completion, OR
          // 2. Have bracket winner but no match results (auto-winner fallback case)
          const needsCompletion = !hasMatchResults;
          const isAutoWinnerCase = hasBracketWinner && !hasMatchResults;
          
          if (needsCompletion) {
            upcomingMatches.push({
              id: match.id,
              participants: match.participants,
              round: currentActiveRound,
              position: match.position,
              estimatedTime: isAutoWinnerCase 
                ? `Round ${currentActiveRound} - Match ${match.position + 1} (Needs Scoring)`
                : `Round ${currentActiveRound} - Match ${match.position + 1}`
            });
          }
        }
      });
      // If no upcoming matches found but this round should be active, 
      // it might be a participant propagation issue (only for truly active rounds)
      if (upcomingMatches.length === 0 && 
          roundStatus[currentActiveRound] === 'active' && 
          currentActiveRound > 1) {
        console.log('No upcoming matches found for active round - possible participant propagation issue', {
          currentActiveRound,
          currentRoundMatches: currentRoundMatches.map(m => ({
            id: m.id,
            participants: m.participants,
            winner: m.winner,
            hasNullParticipants: m.participants.includes(null)
          }))
        });
      }
    }
    
    return {
      currentActiveRound,
      roundStatus,
      upcomingMatches: upcomingMatches.sort((a, b) => a.position - b.position)
    };
  }, [bracketData, matchResults]);// Improved categorization with auto-archiving to prevent noise
  const categorizeItems = (items: FeedItem[]): FeedItem[] => {
    const now = Date.now();
    
    // First pass: categorize by time
    const categorized = items.map(item => {
      const itemAge = now - item.timestamp.getTime();
      const ageInMinutes = itemAge / (1000 * 60);

      // Live: Current ongoing matches and very recent events (0-2 minutes)
      if (item.status === 'live' || 
          (item.type === 'match_active' && ageInMinutes < 30) ||
          ageInMinutes < 2) {
        return { ...item, status: 'live' as const };
      }
      
      // Recent: Recently completed matches and events (2-30 minutes)
      else if ((item.type === 'match_completed' && ageInMinutes < 30) ||
               (ageInMinutes >= 2 && ageInMinutes < 30)) {
        return { ...item, status: 'recent' as const };
      }
      
      // Archive: Everything older than 30 minutes
      else {
        return { ...item, status: 'archived' as const };
      }
    });

    // Second pass: enforce limits and auto-archive excess items
    const liveItems = categorized.filter(item => item.status === 'live').slice(0, 5);
    const recentItems = categorized.filter(item => item.status === 'recent').slice(0, 5);
    const archivedItems = categorized.filter(item => item.status === 'archived');

    // Move excess items to archive
    const excessLive = categorized.filter(item => item.status === 'live').slice(5)
      .map(item => ({ ...item, status: 'archived' as const }));
    const excessRecent = categorized.filter(item => item.status === 'recent').slice(5)
      .map(item => ({ ...item, status: 'archived' as const }));

    return [
      ...liveItems,
      ...recentItems,
      ...archivedItems,
      ...excessLive,
      ...excessRecent
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };
  // Group items by match with auto-archiving enforcement
  const groupItemsByMatch = (items: FeedItem[]): GroupedFeedItem[] => {
    const groups: { [key: string]: GroupedFeedItem } = {};
    
    items.forEach(item => {
      const groupKey = item.matchId || item.type;
      
      if (!groups[groupKey]) {
        // Determine group type and title
        let groupType: 'match' | 'tournament' = 'tournament';
        let title = 'Tournament Updates';
        
        if (item.matchId && item.details?.participants) {
          groupType = 'match';
          title = `${item.details.participants.join(' vs ')}`;
        } else if (item.type === 'tournament_progress') {
          groupType = 'tournament';
          title = 'Tournament Progress';
        }
        
        groups[groupKey] = {
          groupId: groupKey,
          groupType,
          title,
          timestamp: item.timestamp,
          status: item.status,
          items: [],
          isExpanded: item.status === 'live'
        };
      }
      
      groups[groupKey].items.push(item);
      // Update group status to most recent item status
      if (item.status === 'live') {
        groups[groupKey].status = 'live';
      } else if (item.status === 'recent' && groups[groupKey].status !== 'live') {
        groups[groupKey].status = 'recent';
      }
    });
    
    const sortedGroups = Object.values(groups).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Enforce limits on grouped items
    const liveGroups = sortedGroups.filter(g => g.status === 'live').slice(0, 5);
    const recentGroups = sortedGroups.filter(g => g.status === 'recent').slice(0, 5);
    const archivedGroups = sortedGroups.filter(g => g.status === 'archived');
    
    // Auto-archive excess groups
    const excessLiveGroups = sortedGroups.filter(g => g.status === 'live').slice(5)
      .map(group => ({ ...group, status: 'archived' as const }));
    const excessRecentGroups = sortedGroups.filter(g => g.status === 'recent').slice(5)
      .map(group => ({ ...group, status: 'archived' as const }));
    
    return [
      ...liveGroups,
      ...recentGroups,
      ...archivedGroups,
      ...excessLiveGroups,
      ...excessRecentGroups
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };  // Generate clean feed items - only essential events
  const generateFeedItems = (): FeedItem[] => {
    const items: FeedItem[] = [];
    
    if (!bracketData || !matchResults) return items;

    // Process ALL match results - show key status changes regardless of timing
    Object.values(matchResults).forEach((match: MatchResult) => {
      const matchStart = new Date(match.history[0]?.timestamp || Date.now());
      const isOngoing = match.history.length > 0 && !match.completed;
      const isRecentlyCompleted = match.completed && 
        (Date.now() - matchStart.getTime()) < 1000 * 60 * 30; // 30 minutes

      // Show ongoing matches with live status
      if (isOngoing) {
        items.push({
          id: `match-live-${match.matchId}`,
          timestamp: matchStart,
          type: 'match_active',
          message: `${match.player1} vs ${match.player2}`,
          priority: 'high',
          status: 'live',
          matchId: match.matchId,
          details: {
            matchId: match.matchId,
            participants: [match.player1, match.player2],
            status: 'In Progress'
          }
        });
      }

      // Show ALL completed matches (not just recent ones) - for archive
      if (match.completed && match.winner) {
        const winnerRounds = match.rounds.reduce((count, round) => 
          count + (round.winner === match.player1 ? 1 : 0), 0);
        const loserRounds = match.rounds.length - winnerRounds;
        const finalScore = match.player1 === match.winner ? 
          `${winnerRounds}-${loserRounds}` : `${loserRounds}-${winnerRounds}`;
        
        const completionTime = new Date(matchStart.getTime() + (match.rounds.length * 1000 * 60 * 8)); // Estimate completion
        
        items.push({
          id: `match-completed-${match.matchId}`,
          timestamp: completionTime,
          type: 'match_completed',
          message: `${match.winner} defeats ${match.player1 === match.winner ? match.player2 : match.player1}`,
          priority: 'high',
          status: isRecentlyCompleted ? 'recent' : 'archived', // Auto-categorize based on timing
          matchId: match.matchId,
          details: {
            matchId: match.matchId,
            participants: [match.player1, match.player2],
            winner: match.winner,
            finalScore,
            roundsPlayed: match.rounds.length
          }
        });
      }
    });

    // Add tournament milestone events
    if (tournamentStarted) {
      const totalMatches = Object.keys(matchResults).length;
      const completedMatches = Object.values(matchResults).filter(m => m.completed).length;
      
      // Tournament start (archived)
      if (totalMatches > 0) {
        items.push({
          id: 'tournament-started',
          timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
          type: 'tournament_start',
          message: `🏆 ${tournamentName} tournament commenced`,
          priority: 'high',
          status: 'archived',
          details: {
            totalParticipants: participantCount,
            totalMatches
          }
        });
      }

      // Progress milestone (if tournament is active)
      if (completedMatches > 0 && completedMatches < totalMatches) {
        const progressPercent = Math.round((completedMatches / totalMatches) * 100);
        if (progressPercent >= 25 && progressPercent % 25 === 0) { // Show at 25%, 50%, 75%
          items.push({
            id: `tournament-progress-${progressPercent}`,
            timestamp: new Date(Date.now() - 1000 * 60 * (90 - progressPercent)), // Progress over time
            type: 'tournament_progress',
            message: `🎯 Tournament ${progressPercent}% complete`,
            priority: 'medium',
            status: 'archived',
            details: {
              completedMatches,
              totalMatches,
              progressPercent
            }
          });
        }
      }
    }

    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };  // Generate next matches using optimized round info
  const generateNextMatches = (): NextMatch[] => {
    return roundInfo.upcomingMatches;
  };
  // Auto refresh functionality
  useEffect(() => {
    const refreshData = () => {
      const rawItems = generateFeedItems();
      const categorizedItems = categorizeItems(rawItems);
      setFeedItems(categorizedItems);
      setGroupedItems(groupItemsByMatch(categorizedItems));
      setNextMatches(generateNextMatches());
      setLastRefresh(new Date());
    };

    refreshData(); // Initial load

    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [bracketData, matchResults, autoRefresh, refreshInterval]);

  const manualRefresh = () => {
    const rawItems = generateFeedItems();
    const categorizedItems = categorizeItems(rawItems);
    setFeedItems(categorizedItems);
    setGroupedItems(groupItemsByMatch(categorizedItems));
    setNextMatches(generateNextMatches());
    setLastRefresh(new Date());
  };

  // Filter items based on search and tab
  const getFilteredItems = (status: string) => {
    const filtered = groupedItems.filter(group => {
      const matchesStatus = status === 'all' || group.status === status;
      const matchesSearch = searchTerm === '' || 
        group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.items.some(item => item.message.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
    return filtered;
  };

  const getTabCounts = () => {
    return {
      live: groupedItems.filter(g => g.status === 'live').length,
      recent: groupedItems.filter(g => g.status === 'recent').length,
      archived: groupedItems.filter(g => g.status === 'archived').length,
      all: groupedItems.length
    };
  };  const tabCounts = getTabCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">      {/* Next Matches Scrolling Banner - Round-based */}
      {nextMatches.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="relative overflow-hidden py-3">
            <div className="animate-scroll whitespace-nowrap">
              <span className="inline-flex items-center space-x-8">
                <span className="font-semibold flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {nextMatches.length > 0 && `ROUND ${nextMatches[0].round} MATCHES:`}
                </span>
                {nextMatches.map((match, index) => (
                  <span key={match.id} className="inline-flex items-center space-x-2">
                    <Swords className="h-4 w-4" />
                    <span>
                      {match.participants[0]} vs {match.participants[1]} 
                      <span className="text-blue-200 ml-2">(Match {match.position})</span>
                    </span>
                    {index < nextMatches.length - 1 && (
                      <span className="text-blue-200 mx-4">•</span>
                    )}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <BellRing className="h-8 w-8 text-white" />
                </div>
                Live Tournament Feed
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Real-time updates from {tournamentName || 'Tournament'}
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="auto-refresh" className="text-sm">
                    Auto-refresh ({refreshInterval}s)
                  </Label>
                </div>
                
                <Button
                  onClick={manualRefresh}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {getTimeAgo(lastRefresh)}
              </div>
            </div>
          </div>
            {/* Tournament Stats */}
          {bracketData && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {participantCount}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Participants</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Trophy className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {Object.values(matchResults).filter(m => m.completed).length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Completed Matches</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {nextMatches.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Upcoming Matches</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Play className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    Round {roundInfo.currentActiveRound}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {roundInfo.roundStatus[roundInfo.currentActiveRound] === 'active' ? 'Active' : 
                     roundInfo.roundStatus[roundInfo.currentActiveRound] === 'completed' ? 'Completed' : 'Upcoming'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search matches, participants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Filter className="h-4 w-4" />
              <span>Showing {getFilteredItems(activeTab).length} groups</span>
            </div>
          </div>
        </div>

        {/* Tabbed Feed Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6 pb-0">              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="live" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Live 
                  {/* (5 max) */}
                  {tabCounts.live > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                      {tabCounts.live}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent
                   {/* (5 max) */}
                  {tabCounts.recent > 0 && (
                    <Badge variant="secondary" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                      {tabCounts.recent}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="archived" className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Archive
                  {tabCounts.archived > 0 && (
                    <Badge variant="outline" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                      {tabCounts.archived}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Upcoming
                  {nextMatches.length > 0 && (
                    <Badge variant="outline" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                      {nextMatches.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>            {/* Tab Contents */}
            <TabsContent value="live" className="p-6">
              <LiveFeedContent items={getFilteredItems('live')} />
            </TabsContent>

            <TabsContent value="recent" className="p-6">
              <RecentFeedContent items={getFilteredItems('recent')} />
            </TabsContent>

            <TabsContent value="archived" className="p-6">
              <ArchivedFeedContent items={getFilteredItems('archived')} />
            </TabsContent>

            <TabsContent value="upcoming" className="p-6">
              <UpcomingMatchesContent matches={nextMatches} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );

  // Component for Live Feed Content (most active)
  function LiveFeedContent({ items }: { items: GroupedFeedItem[] }) {
    if (items.length === 0) {
      return (        <div className="text-center py-12">
          <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Live Activity</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Live events will appear here (max 5 items)
          </p>
        </div>
      );
    }    return (
      <div className="space-y-4">
        {/* Show limit warning when at capacity */}
        {items.length === 5 && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
              <Zap className="h-4 w-4" />
              <span>
                Live feed at capacity (5/5). New live events will move older items to Recent.
              </span>
            </div>
          </div>
        )}
        
        {items.map((group) => (
          <div key={group.groupId} className="relative">
            {/* Live indicator */}
            <div className="absolute -left-2 top-3 w-4 h-4 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            
            <div className="ml-6 border-l-2 border-red-500 pl-6 pb-6">
              <TimelineGroupItem group={group} isLive={true} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Component for Recent Feed Content
  function RecentFeedContent({ items }: { items: GroupedFeedItem[] }) {
    if (items.length === 0) {
      return (        <div className="text-center py-12">
          <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Recent Activity</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Recent events will appear here (max 5 items, older items auto-archived)
          </p>
        </div>
      );
    }    return (
      <div className="space-y-4">
        {/* Show limit warning when at capacity */}
        {items.length === 5 && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <Clock className="h-4 w-4" />
              <span>
                Recent feed at capacity (5/5). New recent events will move older items to Archive.
              </span>
            </div>
          </div>
        )}
        
        {items.map((group, index) => (
          <div key={group.groupId} className="relative">
            <div className="absolute -left-2 top-3 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            
            <div className="ml-6 border-l-2 border-gray-200 dark:border-gray-600 pl-6 pb-6 last:border-l-0">
              <TimelineGroupItem group={group} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  // Component for Archived Feed Content
  function ArchivedFeedContent({ items }: { items: GroupedFeedItem[] }) {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Archived Events</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Older tournament events and auto-archived items will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Info banner about auto-archiving */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <Info className="h-4 w-4" />
            <span>
              Items are automatically archived when Live or Recent tabs exceed 5 events to keep the feed clean.
            </span>
          </div>
        </div>
        
        {items.map((group) => (
          <div key={group.groupId} className="relative">
            <div className="absolute -left-2 top-3 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            
            <div className="ml-6 border-l-2 border-gray-200 dark:border-gray-600 pl-6 pb-6 last:border-l-0">
              <TimelineGroupItem group={group} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  // Component for Upcoming Matches
  function UpcomingMatchesContent({ matches }: { matches: NextMatch[] }) {
    if (matches.length === 0) {
      return (
        <div className="text-center py-12">
          <Eye className="h-16 w-16 text-gray-300 mx-auto mb-4" />          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Upcoming Matches</h3>
          <p className="text-gray-500 dark:text-gray-400">
            All matches in the current round are either in progress or completed.<br/>
            Next round matches will appear when current round finishes.
          </p>
        </div>
      );
    }

    const currentRound = matches[0]?.round;

    return (
      <div className="space-y-4">
        {/* Round Header */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Round {currentRound} Matches
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {matches.length} matches ready to start
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
              Current Round
            </Badge>
          </div>
        </div>

        {/* Matches Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match, index) => (
            <Card key={match.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Round {match.round}
                  </Badge>
                  <span className="text-xs text-gray-500">Match {match.position}</span>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Swords className="h-5 w-5 text-blue-500" />
                  {match.participants[0]} vs {match.participants[1]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Ready to start</span>
                  <Button variant="outline" size="sm" onClick={() => navigate('/view')}>
                    <Play className="h-4 w-4 mr-1" />
                    Start Match
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Reusable Timeline Group Item Component
  function TimelineGroupItem({ group, isLive = false }: { group: GroupedFeedItem; isLive?: boolean }) {
    const [isExpanded, setIsExpanded] = useState(group.isExpanded || isLive);
    
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border ${isLive ? 'border-red-200 bg-red-50 dark:bg-red-950' : 'border-gray-200 dark:border-gray-700'} p-4`}>
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${group.groupType === 'match' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-purple-100 dark:bg-purple-900'}`}>
              {group.groupType === 'match' ? (
                <Swords className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              ) : (
                <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{group.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {group.items.length} events • {getTimeAgo(group.timestamp)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                LIVE
              </Badge>
            )}
            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3">
            {group.items.map((item) => {
              const style = getFeedItemStyle(item.type, item.priority);
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0">{style.icon}</div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={style.badgeVariant} className="text-xs">
                        {style.badgeLabel}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getTimeAgo(item.timestamp)}
                      </span>
                    </div>                    {item.details && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        {item.details.finalScore && <div><strong>Final Score:</strong> {item.details.finalScore}</div>}
                        {item.details.roundsPlayed && <div><strong>Rounds Played:</strong> {item.details.roundsPlayed}</div>}
                        {item.details.winner && <div><strong>Winner:</strong> <span className="text-green-600 dark:text-green-400 font-semibold">{item.details.winner}</span></div>}
                        {item.details.status && <div><strong>Status:</strong> <span className="text-blue-600 dark:text-blue-400">{item.details.status}</span></div>}
                        {item.details.progressPercent && <div><strong>Progress:</strong> {item.details.progressPercent}%</div>}
                        {item.details.totalParticipants && <div><strong>Participants:</strong> {item.details.totalParticipants}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

};

export default LiveFeedPage; // This line is preserved