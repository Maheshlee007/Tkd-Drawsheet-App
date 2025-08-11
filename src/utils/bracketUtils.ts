// Shared utilities for bracket functionality between Canvas and DOM implementations
import { BracketMatch } from '@shared/schema';
import { MatchResult, WinMethod } from '@/store/useTournamentStore';

// Color schemes for different match states and win methods
export const MATCH_COLORS = {
  // Match completion states
  NOT_STARTED: {
    background: "#ffffff", // Clean white
    border: "#e2e8f0",
    text: "#1f2937",
    bgClass: "bg-white",
    borderClass: "border-slate-200",
    textClass: "text-gray-900"
  },
  IN_PROGRESS: {
    background: "#fef3c7", // Light yellow
    border: "#f59e0b",
    text: "#1f2937",
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-400", 
    textClass: "text-gray-900"
  },
  COMPLETED: {
    background: "#f0fdf4", // Very light green
    border: "#22c55e",
    text: "#1f2937",
    bgClass: "bg-green-50",
    borderClass: "border-green-500",
    textClass: "text-gray-900"
  },

  // Win method colors
  PTF: {
    // Points to Finish
    background: "#eff6ff",
    border: "#3b82f6",
    text: "#1f2937",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-500",
    textClass: "text-gray-900"
  },
  PTG: {
    // Points Gap
    background: "#f0fdf4",
    border: "#22c55e", 
    text: "#1f2937",
    bgClass: "bg-green-50",
    borderClass: "border-green-500",
    textClass: "text-gray-900"
  },
  DSQ: {
    // Disqualification
    background: "#fef2f2",
    border: "#ef4444",
    text: "#1f2937",
    bgClass: "bg-red-50",
    borderClass: "border-red-500",
    textClass: "text-gray-900"
  },
  PUN: {
    // Punitive Declaration
    background: "#fef3c7",
    border: "#f59e0b",
    text: "#1f2937",
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-500",
    textClass: "text-gray-900"
  },
  RSC: {
    // Referee Stops Contest
    background: "#fff7ed",
    border: "#f97316",
    text: "#1f2937",
    bgClass: "bg-orange-50",
    borderClass: "border-orange-500",
    textClass: "text-gray-900"
  },
  WDR: {
    // Withdrawal
    background: "#eef2ff",
    border: "#6366f1",
    text: "#1f2937",
    bgClass: "bg-indigo-50",
    borderClass: "border-indigo-500",
    textClass: "text-gray-900"
  },
  DQB: {
    // Disqualification for Behavior
    background: "#fecaca",
    border: "#dc2626",
    text: "#1f2937",
    bgClass: "bg-red-100",
    borderClass: "border-red-600",
    textClass: "text-gray-900"
  },
  DQBOTH: {
    // Both Disqualified
    background: "#f9fafb",
    border: "#6b7280",
    text: "#1f2937",
    bgClass: "bg-gray-50",
    borderClass: "border-gray-500",
    textClass: "text-gray-900"
  }
};

// Standard participant colors (consistent across implementations)
export const PARTICIPANT_COLORS = {
  TOP: {
    background: "#eff6ff", // Light blue background
    border: "#3b82f6",     // Blue border
    text: "#1f2937",       // Normal dark text
    bgClass: "bg-blue-50",
    borderClass: "border-l-4 border-blue-400",
    textClass: "text-gray-900"
  },
  BOTTOM: {
    background: "#fff1f2", // Light red background
    border: "#f43f5e",     // Red border  
    text: "#1f2937",       // Normal dark text
    bgClass: "bg-red-50",
    borderClass: "border-l-4 border-red-400",
    textClass: "text-gray-900"
  },
  BYE: {
    background: "#f3f4f6",
    border: "#10b981",
    text: "#6b7280",
    bgClass: "bg-gray-100",
    borderClass: "border-l-4 border-green-400",
    textClass: "text-gray-500"
  }
};

/**
 * Get match color scheme based on state and win method
 * Returns both hex colors for Canvas and CSS classes for DOM
 */
export function getMatchColors(match: BracketMatch, matchResults: Record<string, MatchResult>) {
  const matchResult = matchResults[match.id];
  
  // Check if match is completed and has a specific win method
  if (matchResult && matchResult.completed && matchResult.rounds.length > 0) {
    // Find the decisive round (last round with a win method)
    const decisiveRound = [...matchResult.rounds].reverse().find(round => 
      round.winMethod && round.winner
    );
    
    if (decisiveRound && decisiveRound.winMethod) {
      const colors = MATCH_COLORS[decisiveRound.winMethod] || MATCH_COLORS.COMPLETED;
      const isPunitive = decisiveRound.winMethod === 'PUN';
      
      return {
        match: colors,
        matchBackground: colors.background,
        matchBorder: colors.border,
        matchBackgroundClass: colors.bgClass,
        matchBorderClass: colors.borderClass,
        winnerParticipant: {
          background: PARTICIPANT_COLORS.TOP.background,
          border: isPunitive ? "#f59e0b" : PARTICIPANT_COLORS.TOP.border, // Special border for PUN
          text: PARTICIPANT_COLORS.TOP.text,
          bgClass: PARTICIPANT_COLORS.TOP.bgClass,
          borderClass: isPunitive ? "border-l-4 border-yellow-500" : PARTICIPANT_COLORS.TOP.borderClass,
          textClass: PARTICIPANT_COLORS.TOP.textClass,
          isWinner: true
        },
        loserParticipant: {
          background: PARTICIPANT_COLORS.BOTTOM.background,
          border: isPunitive ? "#f59e0b" : PARTICIPANT_COLORS.BOTTOM.border, // Special border for PUN
          text: PARTICIPANT_COLORS.BOTTOM.text,
          bgClass: PARTICIPANT_COLORS.BOTTOM.bgClass,
          borderClass: isPunitive ? "border-l-4 border-yellow-500" : PARTICIPANT_COLORS.BOTTOM.borderClass,
          textClass: PARTICIPANT_COLORS.BOTTOM.textClass,
          isLoser: true
        }
      };
    }
  }
  
  // For all other cases (not started, in progress, completed without special win method)
  return {
    match: MATCH_COLORS.NOT_STARTED,
    matchBackground: MATCH_COLORS.NOT_STARTED.background,
    matchBorder: MATCH_COLORS.NOT_STARTED.border,
    matchBackgroundClass: MATCH_COLORS.NOT_STARTED.bgClass,
    matchBorderClass: MATCH_COLORS.NOT_STARTED.borderClass,
    winnerParticipant: PARTICIPANT_COLORS.TOP,
    loserParticipant: PARTICIPANT_COLORS.BOTTOM
  };
}

/**
 * Check if a participant is disqualified based on match results
 */
export function isParticipantDisqualified(
  participant: string,
  match: BracketMatch,
  matchResults: Record<string, MatchResult>
): boolean {
  const matchResult = matchResults[match.id];
  
  if (!matchResult || !matchResult.completed || matchResult.rounds.length === 0) {
    return false;
  }
  
  // Find the decisive round with disqualification
  const decisiveRound = [...matchResult.rounds].reverse().find(round => 
    round.winMethod && round.winner
  );
  
  if (!decisiveRound || !decisiveRound.winMethod) {
    return false;
  }
  
  const isDisqualificationMethod = ['DSQ', 'DQB', 'DQBOTH'].includes(decisiveRound.winMethod);
  
  if (!isDisqualificationMethod) {
    return false;
  }
  
  if (decisiveRound.winMethod === 'DQBOTH') {
    // Both players disqualified
    return true;
  }
  
  // Single disqualification - the disqualified player is the one who is NOT the winner
  return participant !== decisiveRound.winner;
}

/**
 * Get participant colors for Canvas rendering
 */
export function getParticipantColors(
  participant: string | null,
  isTop: boolean,
  hasOpponentBye: boolean,
  match: BracketMatch,
  matchResults: Record<string, MatchResult>
): {
  background: string;
  border: string;
  text: string;
  isWinner?: boolean;
  isLoser?: boolean;
  isDisqualified?: boolean;
} {
  if (participant === "(bye)") {
    return PARTICIPANT_COLORS.BYE;
  }
  
  if (hasOpponentBye) {
    return {
      background: "#f0fdf4", // Light green for bye winner
      border: "#10b981",     // Green border
      text: "#1f2937"
    };
  }
  
  // Enhanced color-coding based on match results
  const matchColors = getMatchColors(match, matchResults);
  const matchResult = matchResults[match.id];
  
  // Check if this participant is the winner
  const isWinner = match.winner === participant;
  
  // Check for disqualification
  const isDisqualified = participant ? isParticipantDisqualified(participant, match, matchResults) : false;
  
  if (matchResult && matchResult.completed && matchResult.rounds.length > 0) {
    const baseColors = isTop ? matchColors.winnerParticipant : matchColors.loserParticipant;
    
    return {
      background: baseColors.background,
      border: baseColors.border,
      text: baseColors.text,
      isWinner: isWinner,
      isLoser: !isWinner,
      isDisqualified: isDisqualified
    };
  }
  
  // Fallback to standard colors
  return isTop ? PARTICIPANT_COLORS.TOP : PARTICIPANT_COLORS.BOTTOM;
}

/**
 * Get participant CSS classes for DOM rendering
 */
export function getParticipantClasses(
  participant: string | null,
  hasMatchBye: boolean,
  isOpponentBye: boolean,
  isTop: boolean,
  match?: BracketMatch,
  matchResults?: Record<string, MatchResult>
): string {
  if (participant === "(bye)") {
    return "border-l-4 border-green-400 bg-gray-100 text-gray-500";
  }

  if (isOpponentBye) {
    return "border-l-4 border-green-400 bg-green-50";
  }

  // Enhanced color-coding based on match results
  if (match && matchResults) {
    const matchColors = getMatchColors(match, matchResults);
    const matchResult = matchResults[match.id];
    
    // Check if this participant is the winner
    const isWinner = match.winner === participant;
    
    // Check for disqualification
    const isDisqualified = participant ? isParticipantDisqualified(participant, match, matchResults) : false;
    
    if (matchResult && matchResult.completed && matchResult.rounds.length > 0) {
      const baseColors = isTop ? matchColors.winnerParticipant : matchColors.loserParticipant;
      
      // Build class string with color coding
      let classString = `${baseColors.borderClass} ${baseColors.bgClass} ${baseColors.textClass}`;
      
      // Add disqualification indicator if needed
      if (isDisqualified) {
        classString += " relative";
      }
      
      return classString;
    }
  }

  // Fallback to normal participant styling (blue for top, red for bottom)
  return isTop
    ? "border-l-4 border-blue-400 bg-blue-50"
    : "border-l-4 border-red-400 bg-red-50";
}

/**
 * Check if a match should be highlighted as current
 */
export function isCurrentMatch(matchId: string, currentMatchId: string | null): boolean {
  return currentMatchId === matchId;
}

/**
 * Get match container classes for DOM rendering
 */
export function getMatchContainerClasses(
  match: BracketMatch,
  matchResults: Record<string, MatchResult> | null, // Allow null as per error implication
  currentMatchId: string | null,
  highlightedParticipant: string | null
): string {
  const isCurrentMatchHighlight = isCurrentMatch(match.id, currentMatchId);
  const matchResult = matchResults && matchResults[match.id]; // Safely access matchResult
  
  let classes = "";
  
  if (isCurrentMatchHighlight) {
    classes += "border-blue-500 bg-blue-100 shadow-lg border-2 ";
  } else if (matchResult?.completed) {
    classes += "border-green-300 bg-slate-100 ";
  } else if (matchResult) {
    classes += "border-blue-200 bg-blue-50 ";
  } else {
    classes += "border-slate-200 bg-white ";
  }
  
  // Highlighted participant styling - only apply if this match contains the highlighted participant
  if (highlightedParticipant && 
      (match.participants[0] === highlightedParticipant || 
       match.participants[1] === highlightedParticipant)) {
    classes += "ring-2 ring-purple-500 ";
  }
  
  return classes.trim();
}

/**
 * Calculate match number for display (skipping bye matches)
 */
export function calculateMatchNumber(
  bracketData: BracketMatch[][],
  roundIndex: number,
  matchIndex: number
): number {
  let matchNumber = 0;
  
  // Count all non-bye matches in previous rounds
  for (let i = 0; i < roundIndex; i++) {
    const roundMatches = bracketData[i] || [];
    for (const prevMatch of roundMatches) {
      if (!(prevMatch.participants[0] === "(bye)" || prevMatch.participants[1] === "(bye)")) {
        matchNumber++;
      }
    }
  }
  
  // Count non-bye matches in current round up to current match
  const currentRound = bracketData[roundIndex] || [];
  for (let j = 0; j < matchIndex; j++) {
    const currentMatch = currentRound[j];
    if (!(currentMatch.participants[0] === "(bye)" || currentMatch.participants[1] === "(bye)")) {
      matchNumber++;
    }
  }
  
  // Add 1 for current match (if it's not a bye)
  const match = currentRound[matchIndex];
  if (match && !(match.participants[0] === "(bye)" || match.participants[1] === "(bye)")) {
    matchNumber++;
  }
  
  return matchNumber;
}

/**
 * Check if a match is a bye match
 */
export function isByeMatch(match: BracketMatch): boolean {
  return match.participants[0] === "(bye)" || match.participants[1] === "(bye)";
}

/**
 * Find all matches in a tournament bracket that involve a specific participant
 * This creates a path through the tournament for the participant
 */
export function findParticipantPath(
  bracketData: BracketMatch[][],
  participantName: string
): { roundIndex: number; matchIndex: number; match: BracketMatch }[] {
  if (!participantName || !bracketData || !bracketData.length) return [];

  const path: { roundIndex: number; matchIndex: number; match: BracketMatch }[] = [];

  // Check all rounds and matches
  bracketData.forEach((round, roundIndex) => {
    round.forEach((match, matchIndex) => {
      // Check if this participant is in the match
      if (
        match.participants[0] === participantName ||
        match.participants[1] === participantName
      ) {
        path.push({ roundIndex, matchIndex, match });
      }
    });
  });

  return path;
}
