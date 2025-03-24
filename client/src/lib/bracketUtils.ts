import { BracketMatch } from "@shared/schema";

/**
 * Creates a single elimination tournament bracket with proper bye distribution
 * @param participants List of participants
 * @param seedType Method for seeding (random, ordered, or as-entered)
 * @returns An array of rounds, each containing matches
 */
export function createBracket(
  participants: string[],
  seedType: "random" | "ordered" | "as-entered"
): BracketMatch[][] {
  // Make a copy of participants array
  let seededParticipants = [...participants];

  // Apply seeding based on the selected option
  if (seedType === "random") {
    // Randomize the order
    seededParticipants = shuffleArray(seededParticipants);
  } else if (seedType === "as-entered") {
    // Use the original order as entered by the user
    // No need to modify seededParticipants as it's already in the original order
  } else {
    // "ordered" - already handled by default, participants are ordered by seed
  }
  
  // Hardcoded brackets for specific participant counts
  if (seededParticipants.length === 6) {
    return createSixPlayerBracket(seededParticipants);
  }
  
  if (seededParticipants.length === 5) {
    return createFivePlayerBracket(seededParticipants);
  }
  
  if (seededParticipants.length === 7) {
    return createSevenPlayerBracket(seededParticipants);
  }

  // Calculate the nearest power of 2 greater than or equal to participants length
  const participantCount = seededParticipants.length;
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(participantCount)));
  
  // Calculate number of byes needed to fill the bracket
  const numByes = nextPowerOfTwo - participantCount;
  
  // Create a new array with participants and byes properly distributed
  const pairs = createPairsWithByes(seededParticipants, numByes);
  
  // Calculate the number of rounds needed
  const numRounds = Math.log2(nextPowerOfTwo);
  
  // Create bracket data structure
  const bracket: BracketMatch[][] = Array(numRounds)
    .fill(null)
    .map(() => []);
  
  // First round: fill in participants according to seeding with byes
  const firstRoundMatchCount = nextPowerOfTwo / 2;
  
  for (let i = 0; i < firstRoundMatchCount; i++) {
    const matchId = `match-r1-${i + 1}`;
    const nextMatchId = i % 2 === 0 ? `match-r2-${Math.floor(i / 2) + 1}` : `match-r2-${Math.floor(i / 2) + 1}`;
    
    // Get participants for this match from the seeded array with byes
    const pair = pairs[i];
    const participant1 = pair[0];
    const participant2 = pair[1];
    
    // If one participant is marked with (bye), the other advances automatically
    let winner = null;
    if (participant1 && participant2 && participant2.endsWith("(bye)")) {
      winner = participant1;
    } else if (participant1 && participant2 && participant1.endsWith("(bye)")) {
      winner = participant2;
    }
    
    const match: BracketMatch = {
      id: matchId,
      participants: [participant1, participant2],
      winner,
      nextMatchId: numRounds > 1 ? nextMatchId : null,
      position: i,
    };
    
    bracket[0].push(match);
  }
  
  // Generate subsequent rounds with matches based on previous rounds
  for (let round = 1; round < numRounds; round++) {
    const matchesInRound = Math.pow(2, numRounds - 1 - round);
    
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = `match-r${round + 1}-${i + 1}`;
      const nextMatchId = round < numRounds - 1 ? `match-r${round + 2}-${Math.floor(i / 2) + 1}` : null;
      
      // Find the corresponding matches from the previous round
      const prevRoundMatchIndices = [i * 2, i * 2 + 1].map(idx => 
        idx < bracket[round - 1].length ? idx : -1
      ).filter(idx => idx !== -1);
      
      // Get winners from previous round matches if available
      const participants: [string | null, string | null] = [null, null];
      
      prevRoundMatchIndices.forEach((matchIdx, idx) => {
        if (matchIdx >= 0 && bracket[round - 1][matchIdx].winner) {
          participants[idx] = bracket[round - 1][matchIdx].winner;
        }
      });
      
      const match: BracketMatch = {
        id: matchId,
        participants,
        winner: null,
        nextMatchId,
        position: i,
      };
      
      bracket[round].push(match);
    }
  }
  
  return bracket;
}

/**
 * Creates a bracket specifically for 6 player tournaments
 */
function createSixPlayerBracket(participants: string[]): BracketMatch[][] {
  // For 6 players, we need a bracket of 8 positions (6 players + 2 byes)
  // Round 1 (4 matches)
  const round1: BracketMatch[] = [
    {
      id: "match-r1-1",
      participants: [participants[0] + "(bye)", ""],
      winner: participants[0],
      nextMatchId: "match-r2-1",
      position: 0
    },
    {
      id: "match-r1-2",
      participants: [participants[1], participants[4]],
      winner: null,
      nextMatchId: "match-r2-1",
      position: 1
    },
    {
      id: "match-r1-3",
      participants: [participants[2], participants[3]],
      winner: null,
      nextMatchId: "match-r2-2",
      position: 2
    },
    {
      id: "match-r1-4",
      participants: [participants[5] + "(bye)", ""],
      winner: participants[5],
      nextMatchId: "match-r2-2",
      position: 3
    }
  ];
  
  // Round 2 (2 matches)
  const round2: BracketMatch[] = [
    {
      id: "match-r2-1",
      participants: [participants[0], null],
      winner: null,
      nextMatchId: "match-r3-1",
      position: 0
    },
    {
      id: "match-r2-2",
      participants: [null, participants[5]],
      winner: null,
      nextMatchId: "match-r3-1",
      position: 1
    }
  ];
  
  // Round 3 (final)
  const round3: BracketMatch[] = [
    {
      id: "match-r3-1",
      participants: [null, null],
      winner: null,
      nextMatchId: null,
      position: 0
    }
  ];
  
  return [round1, round2, round3];
}

/**
 * Creates a bracket specifically for 5 player tournaments
 */
function createFivePlayerBracket(participants: string[]): BracketMatch[][] {
  // For 5 players, we need a bracket of 8 positions (5 players + 3 byes)
  // Round 1 (4 matches)
  const round1: BracketMatch[] = [
    {
      id: "match-r1-1",
      participants: [participants[2] + "(bye)", ""],
      winner: participants[2],
      nextMatchId: "match-r2-1",
      position: 0
    },
    {
      id: "match-r1-2",
      participants: [participants[0] + "(bye)", ""],
      winner: participants[0],
      nextMatchId: "match-r2-1",
      position: 1
    },
    {
      id: "match-r1-3",
      participants: [participants[1], participants[4]],
      winner: null,
      nextMatchId: "match-r2-2",
      position: 2
    },
    {
      id: "match-r1-4",
      participants: [participants[3] + "(bye)", ""],
      winner: participants[3],
      nextMatchId: "match-r2-2",
      position: 3
    }
  ];
  
  // Round 2 (2 matches)
  const round2: BracketMatch[] = [
    {
      id: "match-r2-1",
      participants: [participants[2], participants[0]],
      winner: null,
      nextMatchId: "match-r3-1",
      position: 0
    },
    {
      id: "match-r2-2",
      participants: [null, participants[3]],
      winner: null,
      nextMatchId: "match-r3-1",
      position: 1
    }
  ];
  
  // Round 3 (final)
  const round3: BracketMatch[] = [
    {
      id: "match-r3-1",
      participants: [null, null],
      winner: null,
      nextMatchId: null,
      position: 0
    }
  ];
  
  return [round1, round2, round3];
}

/**
 * Creates a bracket specifically for 7 player tournaments
 */
function createSevenPlayerBracket(participants: string[]): BracketMatch[][] {
  // For 7 players, we need a bracket of 8 positions (7 players + 1 bye)
  // Round 1 (4 matches)
  const round1: BracketMatch[] = [
    {
      id: "match-r1-1",
      participants: [participants[0] + "(bye)", ""],
      winner: participants[0],
      nextMatchId: "match-r2-1",
      position: 0
    },
    {
      id: "match-r1-2",
      participants: [participants[1], participants[6]],
      winner: null,
      nextMatchId: "match-r2-1",
      position: 1
    },
    {
      id: "match-r1-3",
      participants: [participants[2], participants[5]],
      winner: null,
      nextMatchId: "match-r2-2",
      position: 2
    },
    {
      id: "match-r1-4",
      participants: [participants[3], participants[4]],
      winner: null,
      nextMatchId: "match-r2-2",
      position: 3
    }
  ];
  
  // Round 2 (2 matches)
  const round2: BracketMatch[] = [
    {
      id: "match-r2-1",
      participants: [participants[0], null],
      winner: null,
      nextMatchId: "match-r3-1",
      position: 0
    },
    {
      id: "match-r2-2",
      participants: [null, null],
      winner: null,
      nextMatchId: "match-r3-1",
      position: 1
    }
  ];
  
  // Round 3 (final)
  const round3: BracketMatch[] = [
    {
      id: "match-r3-1",
      participants: [null, null],
      winner: null,
      nextMatchId: null,
      position: 0
    }
  ];
  
  return [round1, round2, round3];
}

/**
 * Creates pairs of participants with byes correctly distributed
 * @param participants List of participants
 * @param numByes Number of byes needed
 * @returns Array of pairs, each containing two participants or byes
 */
function createPairsWithByes(
  participants: string[],
  numByes: number
): [string, string][] {
  const n = participants.length;
  
  // Handle the case where we have no byes
  if (numByes === 0) {
    const result: [string, string][] = [];
    for (let i = 0; i < n/2; i++) {
      result.push([participants[i], participants[n-1-i]]);
    }
    return result;
  }
  
  // For a 6-player tournament (with byes at specific positions)
  if (n === 6 && numByes === 2) {
    // For 6 players, we need a bracket of 8 positions (6 players + 2 byes)
    // According to specification:
    // - A receives bye in first round
    // - F receives bye in fourth match
    return [
      [participants[0] + "(bye)", ""],       // A gets a bye
      [participants[1], participants[4]],    // B vs E
      [participants[2], participants[3]],    // C vs D  
      [participants[5] + "(bye)", ""]        // F gets a bye
    ];
  }
  
  // For a 5-player tournament (with byes at specific positions)
  if (n === 5 && numByes === 3) {
    // For 5 players, we need a bracket of 8 positions (5 players + 3 byes)
    // According to the standard bye distribution:
    // - C gets a bye in upper half (last seed in upper half)
    // - A gets a bye in upper half (first seed in upper half)
    // - D gets a bye in lower half (first seed in lower half)
    return [
      [participants[2] + "(bye)", ""],       // C gets a bye (last in upper half) 
      [participants[0] + "(bye)", ""],       // A gets a bye (first in upper half)
      [participants[1], participants[4]],    // B vs E
      [participants[3] + "(bye)", ""]        // D gets a bye (first in lower half)
    ];
  }
  
  // For 7 players, we need a bracket of 8 positions (7 players + 1 bye)
  if (n === 7 && numByes === 1) {
    // For 7 players, the bye goes to the highest seed (A)
    return [
      [participants[0] + "(bye)", ""],       // A gets a bye
      [participants[1], participants[6]],    // B vs G
      [participants[2], participants[5]],    // C vs F
      [participants[3], participants[4]]     // D vs E
    ];
  }
  
  // For larger tournaments or different numbers
  const totalPositions = n + numByes;
  const numPairs = totalPositions / 2;
  const result: [string, string][] = [];
  
  // Create a copy of participants for manipulation
  const participantsCopy = [...participants];
  
  // Create total bracket positions
  const positions: (string | null)[] = Array(totalPositions).fill(null);
  
  // Determine bye distribution for odd/even participant counts
  const byePositions: number[] = [];
  
  if (n % 2 === 0) { // Even number of participants
    // For even count, distribute byes equally in top and bottom half
    distributeByesForEvenCount(byePositions, numByes, totalPositions);
  } else { // Odd number of participants
    // For odd count, upper half gets ceiling, lower half gets floor
    distributeByesForOddCount(byePositions, numByes, totalPositions);
  }
  
  // Mark bye positions
  byePositions.forEach(pos => {
    positions[pos] = "(bye)";
  });
  
  // Fill in participants in non-bye positions
  let participantIndex = 0;
  for (let i = 0; i < totalPositions; i++) {
    if (positions[i] === null) {
      positions[i] = participantsCopy[participantIndex++];
    }
  }
  
  // Create pairs
  for (let i = 0; i < numPairs; i++) {
    const pos1 = i;
    const pos2 = totalPositions - 1 - i;
    
    let p1 = positions[pos1];
    let p2 = positions[pos2];
    
    // If a position is marked as bye, add it as NAME(bye)
    if (p1 === "(bye)" && p2 !== "(bye)" && p2 !== null) {
      p1 = p2 + "(bye)";
      p2 = "";
    } else if (p2 === "(bye)" && p1 !== "(bye)" && p1 !== null) {
      p2 = p1 + "(bye)";
      p1 = "";
    }
    
    // Add the pair
    result.push([p1 || "", p2 || ""]);
  }
  
  return result;
}

/**
 * Distributes byes for even number of participants
 * Byes are distributed equally in top and bottom halves
 */
function distributeByesForEvenCount(
  byePositions: number[],
  numByes: number,
  totalPositions: number
): void {
  const halfByes = numByes / 2;
  const halfSize = totalPositions / 2;
  
  // For tournaments with less than 8 participants
  if (totalPositions <= 8) {
    // Upper half: first seed, then last seed
    distributeByesInHalfForSmallEven(byePositions, halfByes, 0, halfSize - 1, true);
    
    // Lower half: last seed, then first seed
    distributeByesInHalfForSmallEven(byePositions, halfByes, halfSize, totalPositions - 1, false);
  } else {
    // For larger tournaments: different pattern
    // Upper half: last seed, top first, last, top second...
    distributeByesInHalfForLargeEven(byePositions, halfByes, 0, halfSize - 1, true);
    
    // Lower half: first seed, last, top LH second...
    distributeByesInHalfForLargeEven(byePositions, halfByes, halfSize, totalPositions - 1, false);
  }
}

/**
 * Distributes byes for odd number of participants
 * Upper half gets ceiling(numByes/2), lower half gets floor(numByes/2)
 */
function distributeByesForOddCount(
  byePositions: number[],
  numByes: number,
  totalPositions: number
): void {
  const upperByes = Math.ceil(numByes / 2);
  const lowerByes = Math.floor(numByes / 2);
  const halfSize = totalPositions / 2;
  
  // For odd tournaments, the pattern is different from even ones
  // Upper half: last seed, first seed, second-to-last...
  distributeByesInHalfForOdd(byePositions, upperByes, 0, halfSize - 1, true);
  
  // Lower half: first seed, last seed, second seed...
  distributeByesInHalfForOdd(byePositions, lowerByes, halfSize, totalPositions - 1, false);
}

/**
 * Distributes byes within a half of the bracket for small even tournaments (<=8)
 */
function distributeByesInHalfForSmallEven(
  byePositions: number[],
  numByes: number,
  start: number,
  end: number,
  isUpperHalf: boolean
): void {
  if (numByes <= 0) return;
  
  // Array of positions in order of receiving byes
  const positionOrder: number[] = [];
  
  if (isUpperHalf) {
    // Upper half for small even tournaments: first seed, then last seed
    positionOrder.push(start); // First seed
    positionOrder.push(end);   // Last seed
    // Add more if needed (alternating)
    for (let i = 1; i < (end - start + 1) / 2; i++) {
      positionOrder.push(start + i);
      positionOrder.push(end - i);
    }
  } else {
    // Lower half for small even tournaments: last seed, then first seed
    positionOrder.push(end);   // Last seed
    positionOrder.push(start); // First seed
    // Add more if needed (alternating)
    for (let i = 1; i < (end - start + 1) / 2; i++) {
      positionOrder.push(end - i);
      positionOrder.push(start + i);
    }
  }
  
  // Assign bye positions according to the order
  for (let i = 0; i < numByes; i++) {
    byePositions.push(positionOrder[i]);
  }
}

/**
 * Distributes byes within a half of the bracket for large even tournaments (>8)
 */
function distributeByesInHalfForLargeEven(
  byePositions: number[],
  numByes: number,
  start: number,
  end: number,
  isUpperHalf: boolean
): void {
  if (numByes <= 0) return;
  
  // Array of positions in order of receiving byes
  const positionOrder: number[] = [];
  
  if (isUpperHalf) {
    // Upper half: last seed, top first, last, top second...
    positionOrder.push(end);     // Last seed
    positionOrder.push(start);   // Top first seed
    // More complex patterns for larger brackets
    for (let i = 1; i < (end - start + 1) / 2; i++) {
      positionOrder.push(end - i);   // Next last seed
      positionOrder.push(start + i); // Next top seed
    }
  } else {
    // Lower half: first seed, last, top LH second...
    positionOrder.push(start);   // First seed
    positionOrder.push(end);     // Last seed
    // More complex patterns for larger brackets
    for (let i = 1; i < (end - start + 1) / 2; i++) {
      positionOrder.push(start + i); // Next top seed
      positionOrder.push(end - i);   // Next last seed
    }
  }
  
  // Assign bye positions according to the order
  for (let i = 0; i < numByes; i++) {
    byePositions.push(positionOrder[i]);
  }
}

/**
 * Distributes byes within a half of the bracket for odd tournaments
 */
function distributeByesInHalfForOdd(
  byePositions: number[],
  numByes: number,
  start: number,
  end: number,
  isUpperHalf: boolean
): void {
  if (numByes <= 0) return;
  
  // Array of positions in order of receiving byes
  const positionOrder: number[] = [];
  
  if (isUpperHalf) {
    // Upper half for odd tournaments: last seed, then first seed
    positionOrder.push(end);   // Last seed
    positionOrder.push(start); // First seed
    // Add more if needed (alternating)
    for (let i = 1; i < (end - start + 1) / 2; i++) {
      positionOrder.push(end - i);   // Second-to-last seed
      positionOrder.push(start + i); // Second seed
    }
  } else {
    // Lower half for odd tournaments: first seed, then last seed
    positionOrder.push(start); // First seed
    positionOrder.push(end);   // Last seed
    // Add more if needed (alternating)
    for (let i = 1; i < (end - start + 1) / 2; i++) {
      positionOrder.push(start + i); // Second seed
      positionOrder.push(end - i);   // Second-to-last seed
    }
  }
  
  // Assign bye positions according to the order
  for (let i = 0; i < numByes; i++) {
    byePositions.push(positionOrder[i]);
  }
}

/**
 * Shuffles an array using the Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate the positions for bracket connector lines
 */
export function calculateBracketConnectors(
  bracketData: BracketMatch[][],
  containerElement: HTMLDivElement
): Array<{ left: number; top: number; width?: number; height?: number; type: string }> {
  const connectors: Array<{ left: number; top: number; width?: number; height?: number; type: string }> = [];
  
  // Get all match elements
  const matchElements = containerElement.querySelectorAll('.bracket-match');
  
  // Process each round except the final
  for (let roundIndex = 0; roundIndex < bracketData.length - 1; roundIndex++) {
    const currentRound = bracketData[roundIndex];
    
    // For each match in the current round
    for (let matchIndex = 0; matchIndex < currentRound.length; matchIndex++) {
      const match = currentRound[matchIndex];
      if (!match.nextMatchId) continue;
      
      // Find the current match element
      const matchElement = Array.from(matchElements).find(
        (el) => el.getAttribute('data-match-id') === match.id
      );
      
      // Find the next match element
      const nextMatchElement = Array.from(matchElements).find(
        (el) => el.getAttribute('data-match-id') === match.nextMatchId
      );
      
      if (matchElement && nextMatchElement) {
        const matchRect = matchElement.getBoundingClientRect();
        const nextMatchRect = nextMatchElement.getBoundingClientRect();
        const containerRect = containerElement.getBoundingClientRect();
        
        // Calculate relative positions
        const currentX = matchRect.right - containerRect.left;
        const currentY = matchRect.top + matchRect.height / 2 - containerRect.top;
        const nextX = nextMatchRect.left - containerRect.left;
        const nextY = nextMatchRect.top + nextMatchRect.height / 2 - containerRect.top;
        
        // Horizontal line
        connectors.push({
          left: currentX,
          top: currentY,
          width: (nextX - currentX) / 2,
          type: "horizontal",
        });
        
        // Vertical line
        connectors.push({
          left: currentX + (nextX - currentX) / 2,
          top: Math.min(currentY, nextY),
          height: Math.abs(nextY - currentY),
          type: "vertical",
        });
        
        // Horizontal line to next match
        connectors.push({
          left: currentX + (nextX - currentX) / 2,
          top: nextY,
          width: (nextX - currentX) / 2,
          type: "horizontal",
        });
      }
    }
  }
  
  return connectors;
}
