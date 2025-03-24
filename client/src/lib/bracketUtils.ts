import { BracketMatch } from "@shared/schema";

/**
 * Creates a single elimination tournament bracket
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

  // Calculate the number of rounds needed
  const numRounds = Math.ceil(Math.log2(seededParticipants.length));
  
  // Calculate total number of matches needed
  const totalMatches = Math.pow(2, numRounds) - 1;
  
  // Calculate number of byes needed to fill the bracket
  const numByes = Math.pow(2, numRounds) - seededParticipants.length;
  
  // Create bracket data structure
  const bracket: BracketMatch[][] = Array(numRounds)
    .fill(null)
    .map(() => []);
  
  // First round: fill in participants
  const firstRoundMatchCount = Math.pow(2, numRounds - 1);
  
  for (let i = 0; i < firstRoundMatchCount; i++) {
    const matchId = `match-r1-${i + 1}`;
    const nextMatchId = i % 2 === 0 ? `match-r2-${Math.floor(i / 2) + 1}` : `match-r2-${Math.floor(i / 2) + 1}`;
    
    // Determine participants for this match
    const participant1Index = i;
    const participant2Index = firstRoundMatchCount * 2 - 1 - i;
    
    const participant1 = participant1Index < seededParticipants.length ? seededParticipants[participant1Index] : null;
    const participant2 = participant2Index < seededParticipants.length ? seededParticipants[participant2Index] : null;
    
    const match: BracketMatch = {
      id: matchId,
      participants: [participant1, participant2],
      winner: null,
      nextMatchId: numRounds > 1 ? nextMatchId : null,
      position: i,
    };
    
    bracket[0].push(match);
  }
  
  // Create subsequent rounds with empty matches
  for (let round = 1; round < numRounds; round++) {
    const matchesInRound = Math.pow(2, numRounds - 1 - round);
    
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = `match-r${round + 1}-${i + 1}`;
      const nextMatchId = round < numRounds - 1 ? `match-r${round + 2}-${Math.floor(i / 2) + 1}` : null;
      
      const match: BracketMatch = {
        id: matchId,
        participants: [null, null],
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
