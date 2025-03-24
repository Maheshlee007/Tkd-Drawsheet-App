import { BracketMatch } from "@shared/schema";

/**
 * Creates a single elimination tournament bracket with proper bye distribution
 * @param participants List of participants
 * @param seedType Method for seeding (random or ordered)
 * @returns An array of rounds, each containing matches
 */
export function createBracket(
  participants: string[],
  seedType: "random" | "ordered"
): BracketMatch[][] {
  // Make a copy of participants array
  let seededParticipants = [...participants];

  // Apply random seeding if specified
  if (seedType === "random") {
    seededParticipants = shuffleArray(seededParticipants);
  }

  // Calculate the nearest power of 2 greater than or equal to participants length
  const participantCount = seededParticipants.length;
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(participantCount)));
  
  // Calculate number of byes needed to fill the bracket
  const numByes = nextPowerOfTwo - participantCount;
  
  // Create a new array with participants and byes properly distributed
  const seededWithByes = distributeByesInBracket(seededParticipants, numByes);
  
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
    const participant1 = seededWithByes[i * 2];
    const participant2 = seededWithByes[i * 2 + 1];
    
    // If one participant is null (bye), the other advances automatically
    let winner = null;
    if (participant1 && !participant2) {
      winner = participant1;
    } else if (!participant1 && participant2) {
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
 * Distributes byes in the bracket according to proper seeding rules
 * @param participants The list of participants
 * @param numByes Number of byes needed
 * @returns Array with participants and nulls (byes) properly distributed
 */
function distributeByesInBracket(
  participants: string[],
  numByes: number
): (string | null)[] {
  const n = participants.length;
  const totalPositions = n + numByes;
  const result: (string | null)[] = Array(totalPositions).fill(null);
  
  // Handle the case where we have no byes
  if (numByes === 0) {
    return participants;
  }
  
  // Determine upper and lower half distribution
  let upperHalfSize, lowerHalfSize;
  let upperByes, lowerByes;
  
  if (n % 2 === 0) { // Even number of participants
    upperHalfSize = n / 2;
    lowerHalfSize = n / 2;
    upperByes = numByes / 2;
    lowerByes = numByes / 2;
  } else { // Odd number of participants
    upperHalfSize = Math.ceil(n / 2);
    lowerHalfSize = Math.floor(n / 2);
    upperByes = Math.ceil(numByes / 2);
    lowerByes = Math.floor(numByes / 2);
  }
  
  // Arrays to track assigned positions for upper and lower halves
  const upperHalfPositions: number[] = [];
  const lowerHalfPositions: number[] = [];
  
  // Create arrays of participants for upper and lower half
  const upperHalf = participants.slice(0, upperHalfSize);
  const lowerHalf = participants.slice(upperHalfSize);
  
  // Assign positions with byes for upper half
  assignByePositions(upperHalfPositions, upperByes, 0, totalPositions / 2 - 1);
  
  // Assign positions with byes for lower half
  assignByePositions(lowerHalfPositions, lowerByes, totalPositions / 2, totalPositions - 1);
  
  // Put upper half participants into their positions
  const upperPositionsWithNoByes = getPositionsWithNoByes(0, totalPositions / 2 - 1, upperHalfPositions);
  for (let i = 0; i < upperHalf.length; i++) {
    result[upperPositionsWithNoByes[i]] = upperHalf[i];
  }
  
  // Put lower half participants into their positions
  const lowerPositionsWithNoByes = getPositionsWithNoByes(totalPositions / 2, totalPositions - 1, lowerHalfPositions);
  for (let i = 0; i < lowerHalf.length; i++) {
    result[lowerPositionsWithNoByes[i]] = lowerHalf[i];
  }
  
  return result;
}

/**
 * Assigns bye positions according to seeding rules
 * @param positions Array to store positions with byes
 * @param numByes Number of byes to assign
 * @param start Starting position index
 * @param end Ending position index
 */
function assignByePositions(
  positions: number[],
  numByes: number,
  start: number,
  end: number
): void {
  if (numByes <= 0) return;
  
  // Alternating pattern from top and bottom seeds
  let byesAssigned = 0;
  let topIndex = 0;
  let bottomIndex = end - start;
  
  while (byesAssigned < numByes) {
    // Add position from bottom seed
    if (byesAssigned % 2 === 0) {
      positions.push(end - bottomIndex);
      bottomIndex--;
    } 
    // Add position from top seed
    else {
      positions.push(start + topIndex);
      topIndex++;
    }
    byesAssigned++;
  }
}

/**
 * Gets positions that don't have byes assigned
 * @param start Starting position index
 * @param end Ending position index
 * @param byePositions Array of positions with byes
 * @returns Array of positions without byes
 */
function getPositionsWithNoByes(
  start: number,
  end: number,
  byePositions: number[]
): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    if (!byePositions.includes(i)) {
      result.push(i);
    }
  }
  return result;
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
  containerElement: HTMLElement
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
