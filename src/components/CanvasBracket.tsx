import React, { useEffect, useRef, useState } from "react";
import { BracketMatch } from "@shared/schema";
import { useTournamentStore } from "@/store/useTournamentStore";
import {
  getMatchColors,
  getParticipantColors,
  isCurrentMatch,
  calculateMatchNumber,
  isByeMatch,
  isParticipantDisqualified,
} from "@/utils/bracketUtils";

interface CanvasBracketProps {
  bracketData: BracketMatch[][] | null;
  onMatchClick?: (matchId: string, player1: string, player2: string) => void;
  onUpdateMatch?: (matchId: string, winnerId: string) => void;
  width?: number;
  height?: number;
  printMode?: boolean;
  highlightedParticipant?: string | null;
}

const CanvasBracket: React.FC<CanvasBracketProps> = ({
  bracketData,
  onMatchClick,
  onUpdateMatch,
  width = 900,
  height = 500,
  printMode = false,
  highlightedParticipant,
}) => {  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  // Get match results from the store for color-coding
  const matchResults = useTournamentStore((state) => state.matchResults || {});
   const finalMatchId= bracketData && bracketData.length > 0 ? bracketData[bracketData.length - 1][0].id : "";
  // Get current match ID for highlighting
  const currentMatchId = useTournamentStore((state) => state.currentMatchId);

  const [hoveredMatch, setHoveredMatch] = useState<{
    id: string;
    participantIndex: 0 | 1;
  } | null>(null);
    // Store match positions for interaction handling
  const [matchPositions, setMatchPositions] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      participants: [string | null, string | null];
      winner: string | null;
      roundIndex: number;
    }>
  >([]);

  // State for pulse animation
  const [pulseMatchId, setPulseMatchId] = useState<string | null>(null);

  // Zoom level state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);

  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 2.0;
  const handleZoomIn = () => setZoomLevel(prev => Math.min(MAX_ZOOM, +(prev + 0.1).toFixed(1)));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(MIN_ZOOM, +(prev - 0.1).toFixed(1)));
  const handleZoomReset = () => setZoomLevel(1);
  // Fit the full bracket width into the visible container
  const handleZoomFit = () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !canvas.offsetWidth) return;
    const fit = (container.clientWidth - 8) / canvas.offsetWidth;
    setZoomLevel(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +fit.toFixed(2))));
    container.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  // Function to get match color scheme based on state and win method
  // Function to check if a match should be highlighted (part of participant's path)
  const isMatchHighlighted = (match: BracketMatch): boolean => {
    if (!highlightedParticipant) return false;
    return match.participants.includes(highlightedParticipant);
  };

  // Function to check if a match should have pulse animation
  const isMatchPulsing = (matchId: string): boolean => {
    return pulseMatchId === matchId;
  };

  // Function to navigate to participant's earliest match
  const navigateToParticipant = (participantName: string) => {
    if (!bracketData || !containerRef.current) return;

    // Find participant's earliest match (first occurrence)
    for (let roundIndex = 0; roundIndex < bracketData.length; roundIndex++) {
      const round = bracketData[roundIndex];
      for (const match of round) {
        if (match.participants.includes(participantName)) {
          // Found the earliest match, now scroll to it
          const matchPosition = matchPositions.find(pos => pos.id === match.id);
          if (matchPosition) {
            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            
            // Calculate scroll positions to center the match
            const scrollLeft = Math.max(0, 
              matchPosition.x - (containerRect.width / 2) + (matchPosition.width / 2)
            );
            const scrollTop = Math.max(0, 
              matchPosition.y - (containerRect.height / 2) + (matchPosition.height / 2)
            );
            
            // Smooth scroll to the match
            container.scrollTo({
              left: scrollLeft,
              top: scrollTop,
              behavior: 'smooth'
            });            // Apply pulse animation
            setPulseMatchId(match.id);
            setTimeout(() => {
              setPulseMatchId(null);
            }, 2000); // Remove pulse after 2 seconds
          }
          return; // Exit after finding the first match
        }
      }
    }
  };

  // Function to draw the bracket on canvas
  const drawBracket = () => {
    if (!canvasRef.current || !bracketData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Calculate sizes and spacing
    const roundCount = bracketData.length;
    const matchHeight = 44; // Increased match height
    const matchWidth = 200; // Increased match width for better readability
    const roundWidth = matchWidth * 1.4; // Match width + space for connectors
    const horizontalMargin = 20;
    const verticalMargin = 30;
    
    // Store match positions for interaction
    const newMatchPositions: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      participants: [string | null, string | null];
      winner: string | null;
      roundIndex: number;
    }> = [];
    
    // Calculate max participants to determine vertical spacing
    const firstRoundMatches = bracketData[0].length;
    const availableHeight = height - (verticalMargin * 2);
    
    // Dynamic spacing calculation based on number of first round matches
    const getVerticalSpacing = (roundIndex: number) => {
      // Base spacing for all rounds
      let spacing = 50;

      // For large brackets (16+ players), adjust spacing differently
      if (firstRoundMatches > 8) {
        if (roundIndex === 0) {
          // First round needs tighter spacing for large brackets (clamp 40–60)
          spacing = Math.max(40, Math.min(60, availableHeight / (firstRoundMatches + 1)));
        } else {
          // Later rounds can have more space (clamp 50–70)
          const matchesInThisRound = bracketData[roundIndex].length;
          spacing = Math.max(50, Math.min(70, availableHeight / (matchesInThisRound + 1)));
        }
      } else {
        // For smaller brackets, use more generous spacing
        if (roundIndex === 0) {
          spacing = Math.min(120, Math.max(60, availableHeight / firstRoundMatches));
        } else {
          spacing = Math.min(100, Math.max(50, availableHeight / bracketData[roundIndex].length));
        }
      }
      
      return spacing;
    };
    
    // Calculate total height needed for the bracket
    let totalHeightNeeded = verticalMargin * 2; // Margins
    const firstRoundSpacing = getVerticalSpacing(0);
    totalHeightNeeded += firstRoundMatches * (matchHeight + 10); // Add height for all matches
    totalHeightNeeded += firstRoundMatches * firstRoundSpacing; // Add spacing between matches

    // Resize canvas BEFORE any drawing: assigning canvas.height resets the 2D
    // context (including the DPR transform), which previously left HiDPI renders
    // at half size and made click hit-testing miss the visible boxes.
    const minRequiredHeight = Math.max(height, totalHeightNeeded);
    if (canvas.height / scale < minRequiredHeight) {
      canvas.height = minRequiredHeight * scale;
      canvas.style.height = `${minRequiredHeight}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0); // re-apply DPR scaling
    }

    // Clear canvas + background (CSS pixel space — context is DPR-scaled)
    const cssWidth = canvas.width / scale;
    const cssHeight = canvas.height / scale;
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Draw round labels at the top
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#475569";

    bracketData.forEach((_, roundIndex) => {
      const roundName = getRoundName(roundIndex, roundCount);
      const x = horizontalMargin + (roundIndex * roundWidth) + (matchWidth / 2);
      const y = 15;

      // Draw round label box
      ctx.fillStyle = getRoundColor(roundIndex, roundCount);
      ctx.beginPath();
      ctx.roundRect(x - 60, y - 10, 120, 20, 3);
      ctx.fill();

      // Draw round label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(roundName, x, y);
    });

    // Draw each round
    bracketData.forEach((round, roundIndex) => {
      const roundX = horizontalMargin + (roundIndex * roundWidth);
      const verticalSpacing = getVerticalSpacing(roundIndex);
      
      // Position calculation for this round
      round.forEach((match, matchIndex) => {
        // Calculate positions for matches in this round based on first round
        const isFirstRound = roundIndex === 0;
        
        let matchY;
        if (isFirstRound) {
          // First round - evenly spaced
          matchY = verticalMargin + (matchIndex * (matchHeight + verticalSpacing));
        } else {
          // Later rounds - position based on source matches
          const sourceMatches = bracketData[roundIndex - 1].filter(
            m => m.nextMatchId === match.id
          );
          
          if (sourceMatches.length > 0) {
            // Position between source matches
            const sourcePositions = sourceMatches
              .map(sourceMatch => {
                const pos = newMatchPositions.find(p => p.id === sourceMatch.id);
                return pos ? pos.y + (matchHeight / 2) : verticalMargin;
              });
            
            const averageY = sourcePositions.reduce((a, b) => a + b, 0) / sourcePositions.length;
            matchY = averageY - (matchHeight / 2);
          } else {
            // Fallback position
            matchY = verticalMargin + (matchIndex * (matchHeight + verticalSpacing));
          }
        }
        
        // Store match position for interaction
        newMatchPositions.push({
          id: match.id,
          x: roundX,
          y: matchY,
          width: matchWidth,
          height: matchHeight,
          participants: match.participants,
          winner: match.winner,
          roundIndex: roundIndex
        });        // Draw match box
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#cbd5e1";
        ctx.fillStyle = "#ffffff";
          // Add special highlighting for current match or participant path
        const isCurrentMatch = currentMatchId === match.id;
        const shouldHighlightForParticipant = isMatchHighlighted(match);
        const shouldPulse = isMatchPulsing(match.id);
        
        if (isCurrentMatch) {
          // Current match highlighting
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#3b82f6"; // Blue border for current match
          ctx.shadowColor = "#3b82f6";
          ctx.shadowBlur = 6;
        } else if (shouldHighlightForParticipant) {
          // Participant path highlighting
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#a855f7"; // Purple border for participant path
          ctx.shadowColor = "#a855f7";
          ctx.shadowBlur = 4;
          // Add slight background tint
          ctx.fillStyle = "#f5f3ff"; // Very light purple background
        }
          // Add pulse effect for navigation (static highlight, no animation)
        if (shouldPulse) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#f59e0b"; // Amber color for pulse
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 8;
        }
        
        ctx.beginPath();
        ctx.roundRect(roundX, matchY, matchWidth, matchHeight, 4);
        ctx.fill();
        ctx.stroke();
          // Reset shadow for other elements
        if (isCurrentMatch || shouldHighlightForParticipant || shouldPulse) {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }
        
        // Only draw match identifier if this is not a bye match
        if (!(match.participants[0] === "(bye)" || match.participants[1] === "(bye)")) {
          // Draw match identifier (sequential numbers: M1, M2, etc.)
          ctx.fillStyle = "#f1f5f9"; // Light gray background
          ctx.strokeStyle = "#cbd5e1"; // Border color
          ctx.lineWidth = 1;
          
          // Draw identifier background
          const labelWidth = 30; // Slightly smaller since we have shorter labels
          const labelHeight = 16;
          const labelX = roundX - 2;
          const labelY = matchY - 16;
          
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 3);
          ctx.fill();
          ctx.stroke();
          
          // Draw identifier text - continuous match number (skipping bye matches)
          ctx.fillStyle = "#64748b"; // Slate text color
          ctx.font = "bold 11px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          // Calculate continuous match number across rounds, skipping bye matches
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
          
          // Add 1 for current match (since we already know it's not a bye)
          matchNumber++;
          ctx.fillText(`M${matchNumber}`, labelX + labelWidth/2, labelY + labelHeight/2);
        }
        
        // Draw divider line between participants
        ctx.beginPath();
        ctx.moveTo(roundX, matchY + matchHeight / 2);
        ctx.lineTo(roundX + matchWidth, matchY + matchHeight / 2);
        ctx.stroke();        // Get color scheme for this match
        const matchColors = getMatchColors(match, matchResults);
        
        // Draw participants
        const isTop = (idx: number) => idx === 0;
        const isOpponentBye = (idx: number) => 
          match.participants[idx] !== null && 
          match.participants[idx ? 0 : 1] === "(bye)";        // Draw first participant
        drawParticipant(
          ctx, 
          match.participants[0], 
          roundX, 
          matchY, 
          matchWidth, 
          matchHeight / 2,
          isTop(0),
          isOpponentBye(0),
          match.winner === match.participants[0],
          hoveredMatch?.id === match.id && hoveredMatch?.participantIndex === 0,
          match,
          getParticipantColors(
            match.participants[0],
            true, // isTop
            isOpponentBye(0),
            match,
            matchResults
          )
        );
          // Draw second participant
        drawParticipant(
          ctx, 
          match.participants[1], 
          roundX, 
          matchY + matchHeight / 2, 
          matchWidth, 
          matchHeight / 2,
          isTop(1),
          isOpponentBye(1),
          match.winner === match.participants[1],
          hoveredMatch?.id === match.id && hoveredMatch?.participantIndex === 1,
          match,
          getParticipantColors(
            match.participants[1],
            false, // isTop
            isOpponentBye(1),
            match,
            matchResults
          )
        );
      });
    });
    
    // Draw connectors between matches
    for (let roundIndex = 0; roundIndex < roundCount - 1; roundIndex++) {
      bracketData[roundIndex].forEach(match => {
        if (!match.nextMatchId) return;
        
        // Find source and target match positions
        const sourcePos = newMatchPositions.find(p => p.id === match.id);
        const targetPos = newMatchPositions.find(p => p.id === match.nextMatchId);
        
        if (sourcePos && targetPos) {
          // Draw connector lines
          const startX = sourcePos.x + sourcePos.width;
          const startY = sourcePos.y + (sourcePos.height / 2);
          const endX = targetPos.x;
          const endY = targetPos.y + (targetPos.height / 2);
          const midX = startX + ((endX - startX) / 2);
            ctx.beginPath();
          ctx.lineWidth = 1.5;          // Use green color for connectors based on these conditions:
          // 1. For bye matches: Always show green (bye advancement)
          // 2. For normal matches: Only show green when winner is declared through actual match play
          // 3. For automatic advancement (single player in round): Do NOT show green until winner declared
          
          const isByeMatch = match.participants[0] === "(bye)" || match.participants[1] === "(bye)";
          const bothParticipantsValid = match.participants[0] && 
            match.participants[0] !== "(bye)" &&
            match.participants[1] && 
            match.participants[1] !== "(bye)";
          
          // Check if this is automatic advancement (only one valid participant)
          const isAutomaticAdvancement = (match.participants[0] && match.participants[0] !== "(bye)" && !match.participants[1]) ||
                                        (match.participants[1] && match.participants[1] !== "(bye)" && !match.participants[0]) ||
                                        (!match.participants[0] && match.participants[1] && match.participants[1] !== "(bye)") ||
                                        (match.participants[0] && match.participants[0] !== "(bye)" && !match.participants[1]);
          
          let shouldShowGreen = false;
          
          if (isByeMatch) {
            // Bye matches always show green connectors
            shouldShowGreen = true;
          } else if (bothParticipantsValid && match.winner) {
            // Normal matches with both participants - show green only when winner is declared
            shouldShowGreen = true;
          } else if (isAutomaticAdvancement && match.winner) {
            // Automatic advancement - show green only when winner is explicitly declared
            shouldShowGreen = true;
          }
          
          ctx.strokeStyle = shouldShowGreen ? "#22c55e" : "#94a3b8";
          
          // Draw connector line with smoother corners
          ctx.moveTo(startX, startY);
          
          // Handle vertical differences for better visual appearance
          if (Math.abs(startY - endY) > 10) {
            // Horizontal line from source match
            ctx.lineTo(midX, startY);
            
            // Vertical connector - smoother for larger gaps
            if (Math.abs(startY - endY) > 40) {
              const controlY = startY < endY ? 
                startY + Math.min(20, (endY - startY) / 2) : 
                startY - Math.min(20, (startY - endY) / 2);
              
              ctx.quadraticCurveTo(midX, controlY, midX, endY);
            } else {
              // Direct line for smaller gaps
              ctx.lineTo(midX, endY);
            }
            
            // Horizontal line to target match
            ctx.lineTo(endX, endY);
          } else {
            // If matches are nearly level, just draw a straight line
            ctx.lineTo(endX, endY);
          }          ctx.stroke();
          
          // Add arrow indicator based on the same conditions as green connectors
          if (shouldShowGreen) {
            // Draw small arrow on the line to indicate direction of advancement
            const arrowSize = 4;
            const arrowX = midX + 5;
            const arrowY = Math.abs(startY - endY) < 10 ? startY : 
                          startY < endY ? Math.min(startY + 15, endY - 10) : 
                                         Math.max(startY - 15, endY + 10);
            
            ctx.beginPath();
            ctx.fillStyle = "#22c55e";
            ctx.moveTo(arrowX + arrowSize, arrowY);
            ctx.lineTo(arrowX - arrowSize, arrowY - arrowSize);
            ctx.lineTo(arrowX - arrowSize, arrowY + arrowSize);
            ctx.closePath();
            ctx.fill();
          }
        }
      });
    }
    
    // Draw winners box if not in print mode
    if (!printMode && matchResults[finalMatchId]) {
      drawWinnersBox(ctx, bracketData, width, height);
    }
    
    // Update match positions for interaction
    setMatchPositions(newMatchPositions);
  };  // Draw a single participant in a match
  const drawParticipant = (
    ctx: CanvasRenderingContext2D,
    participant: string | null,
    x: number,
    y: number,
    width: number,
    height: number,
    isTop: boolean,
    hasOpponentBye: boolean,
    isWinner: boolean,
    isHovered: boolean,
    match: BracketMatch,
    participantColors: {
      background: string;
      border: string;
      text: string;
      isWinner?: boolean;
      isLoser?: boolean;
      isDisqualified?: boolean;
    }
  ) => {
    const text = participant === "(bye)" ? "(bye)" : (participant || "");
    const blockWidth = 20; // Width for the B/R block
    const namePaddingLeft = 8; // Padding between B/R block and name

    if (participant === "(bye)") {
      // Style for "(bye)" participants
      ctx.fillStyle = "#f3f4f6"; // Light gray background
      ctx.fillRect(x, y, width, height); // Fill the whole participant area

      ctx.font = "13px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#6b7280"; // Gray text
      // Adjust text position if blockWidth was conceptually part of its padding before
      ctx.fillText("(bye)", x + namePaddingLeft, y + height / 2);
    } else {
      // Style for actual participants (with B/R block)

      // 1. Draw B/R block
      const blockColor = isTop ? '#3b82f6' : '#ef4444'; // Blue for Top (B), Red for Bottom (R)
      ctx.fillStyle = blockColor;
      ctx.fillRect(x, y, blockWidth, height);

      // Draw 'B' or 'R' text in the block
      ctx.fillStyle = '#ffffff'; // White text
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isTop ? 'B' : 'R', x + blockWidth / 2, y + height / 2);

      // 2. Draw main participant name area
      let currentMainAreaBackgroundColor: string;
      let currentTextColor: string;

      if (isHovered) {
        currentMainAreaBackgroundColor = "#e9eef3"; // Lighter slate for hover background
        currentTextColor = "#1c2735"; // Darker text for hover
      } else if (hasOpponentBye) {
        currentMainAreaBackgroundColor = "#ecfdf5"; // Light green background if opponent is bye
        currentTextColor = "#047857";    // Dark green text
      } else {
        currentMainAreaBackgroundColor = participantColors.background; // Use original participant background
        currentTextColor = participantColors.text; 
      }
      
      ctx.fillStyle = currentMainAreaBackgroundColor;
      ctx.fillRect(x + blockWidth, y, width - blockWidth, height);

      // Draw participant name
      ctx.font = isWinner ? "bold 13px Arial" : "13px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = currentTextColor;

      let displayText = text;
      // Adjust truncation based on available space: width - blockWidth - namePaddingLeft - (space for potential cross)
      const availableTextWidth = width - blockWidth - namePaddingLeft - (participantColors.isDisqualified ? 25 : 10);
      
      // Simple length-based truncation as a fallback if measureText is too complex here
      // Max 20 chars displayed, 18 + "..."
      if (text.length > 18) { 
         displayText = text.substring(0, 18) + "...";
      }
      // More accurate truncation using measureText if preferred:
      // if (ctx.measureText(text).width > availableTextWidth) {
      //   for (let i = text.length - 1; i > 0; i--) {
      //     displayText = text.substring(0, i) + "...";
      //     if (ctx.measureText(displayText).width <= availableTextWidth) {
      //       break;
      //     }
      //   }
      // }


      ctx.fillText(displayText, x + blockWidth + namePaddingLeft, y + height / 2);
    
      // Draw red cross for disqualified players - this is the ONLY visual indicator for disqualification
      if (participantColors.isDisqualified && participant !== "(bye)") {
        const crossSize = 8;
        // Position cross at the right end of the name area
        const crossCenterX = x + width - (crossSize / 2) - 8; // 8px padding from right edge
        const crossCenterY = y + height / 2;
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#dc2626"; // Red color
        ctx.beginPath();
        ctx.moveTo(crossCenterX - crossSize / 2, crossCenterY - crossSize / 2);
        ctx.lineTo(crossCenterX + crossSize / 2, crossCenterY + crossSize / 2);
        ctx.moveTo(crossCenterX + crossSize / 2, crossCenterY - crossSize / 2);
        ctx.lineTo(crossCenterX - crossSize / 2, crossCenterY + crossSize / 2);
        ctx.stroke();
      }
    }
  };
  
  // Draw winners box at bottom right
  const drawWinnersBox = (
    ctx: CanvasRenderingContext2D,
    bracketData: BracketMatch[][],
    width: number,
    height: number
  ) => {
    if (bracketData.length < 2) return; // Need at least 2 rounds
    
    // Get final and semi-final matches
    const finalRound = bracketData[bracketData.length - 1];
    const semiFinalRound = bracketData[bracketData.length - 2];
    
    if ((finalRound.length === 0 || !finalRound[0].winner)&& matchResults[finalMatchId]) return;
    
    // Box dimensions
    const boxWidth = 220; // Slightly wider box
    const boxHeight = 150;
    const boxX = width - boxWidth - 20;
    const boxY = height - boxHeight - 20;
    
    // Draw box background
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
    ctx.fill();
    ctx.stroke();
    
    // Draw title
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Tournament Results", boxX + boxWidth / 2, boxY + 20);
    
    // Draw horizontal line
    ctx.beginPath();
    ctx.moveTo(boxX + 15, boxY + 35);
    ctx.lineTo(boxX + boxWidth - 15, boxY + 35);
    ctx.stroke();
      // Get placements
    const finalMatch = finalRound[0];
    const goldMedalist = finalMatch.winner;
    
    // Handle mutual disqualification case
    if (goldMedalist === "NO_WINNER") {
      // Draw special message for mutual disqualification
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "left";
      ctx.fillStyle = "#dc2626"; // Red color
      
      ctx.fillText("Tournament Result:", boxX + 25, boxY + 55);
      ctx.fillText("No Winner", boxX + 25, boxY + 75);
      ctx.fillText("(Both Finalists DQ)", boxX + 25, boxY + 95);
      
      // Still show semifinal losers as 3rd/4th if available
      if (semiFinalRound.length >= 2) {
        let bronzeMedalist = "N/A";
        let fourthPlace = "N/A";
        
        const semifinal1 = semiFinalRound[0];
        const semifinal2 = semiFinalRound[1];
        
        if (semifinal1.winner) {
          bronzeMedalist = semifinal1.participants[0] === semifinal1.winner 
            ? (semifinal1.participants[1] || "N/A") 
            : (semifinal1.participants[0] || "N/A");
          if (bronzeMedalist === "(bye)") bronzeMedalist = "N/A";
        }
        
        if (semifinal2.winner) {
          fourthPlace = semifinal2.participants[0] === semifinal2.winner 
            ? (semifinal2.participants[1] || "N/A") 
            : (semifinal2.participants[0] || "N/A");
          if (fourthPlace === "(bye)") fourthPlace = "N/A";
        }
        
        ctx.fillStyle = "#b45309";
        ctx.fillText("3rd:", boxX + 25, boxY + 120);
        ctx.fillStyle = "#0f172a";
        ctx.fillText(bronzeMedalist, boxX + 60, boxY + 120);
        
        ctx.fillStyle = "#475569";
        ctx.fillText("4th:", boxX + 25, boxY + 140);
        ctx.fillStyle = "#0f172a";
        ctx.fillText(fourthPlace, boxX + 60, boxY + 140);
      }
      
      return;
    }
    
    const silverMedalist = finalMatch.participants[0] === goldMedalist ? finalMatch.participants[1] : finalMatch.participants[0];
    
    // Get bronze medalist (player who lost in semifinal against the gold medalist)
    let bronzeMedalist = "N/A";
    let fourthPlace = "N/A";
    
    // We need to find which semifinal match produced the gold medalist
    const goldSemiFinal = semiFinalRound.find(match => 
      match.participants.includes(goldMedalist)
    );
    
    const silverSemiFinal = semiFinalRound.find(match => 
      match.participants.includes(silverMedalist)
    );
    
    if (goldSemiFinal) {
      bronzeMedalist = goldSemiFinal.participants[0] === goldMedalist 
        ? (goldSemiFinal.participants[1] || "N/A") 
        : (goldSemiFinal.participants[0] || "N/A");
      
      // Handle bye case
      if (bronzeMedalist === "(bye)") bronzeMedalist = "N/A";
    }
    
    if (silverSemiFinal) {
      fourthPlace = silverSemiFinal.participants[0] === silverMedalist 
        ? (silverSemiFinal.participants[1] || "N/A") 
        : (silverSemiFinal.participants[0] || "N/A");
      
      // Handle bye case
      if (fourthPlace === "(bye)") fourthPlace = "N/A";
    }
    
    // Draw placements
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    
    // Draw 1st place (gold)
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("1st:", boxX + 25, boxY + 55);
    ctx.fillStyle = "#0f172a";
    ctx.fillText(goldMedalist || "N/A", boxX + 60, boxY + 55);
    
    // Draw 2nd place (silver)
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("2nd:", boxX + 25, boxY + 80);
    ctx.fillStyle = "#0f172a";
    ctx.fillText(silverMedalist || "N/A", boxX + 60, boxY + 80);
    
    // Draw 3rd place (bronze)
    ctx.fillStyle = "#b45309";
    ctx.fillText("3rd:", boxX + 25, boxY + 105);
    ctx.fillStyle = "#0f172a";
    ctx.fillText(bronzeMedalist, boxX + 60, boxY + 105);
    
    // Draw 4th place
    ctx.fillStyle = "#475569";
    ctx.fillText("4th:", boxX + 25, boxY + 130);
    ctx.fillStyle = "#0f172a";
    ctx.fillText(fourthPlace, boxX + 60, boxY + 130);
  };
  
  // Get round name based on round index
  const getRoundName = (roundIndex: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - roundIndex - 1;
    
    switch (roundsFromEnd) {
      case 0:
        return "Final";
      case 1:
        return "Semi Finals";
      case 2:
        return "Quarter Finals";
      default:
        return `Round ${roundIndex + 1}`;
    }
  };
  
  // Get background color for round labels - Using Indian flag color scheme
  const getRoundColor = (roundIndex: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - roundIndex - 1;
    
    switch (roundsFromEnd) {
      case 0: // Final - saffron
        return "#FF9933";
      case 1: // Semi Finals - navy blue
        return "#000080";
      case 2: // Quarter Finals - green
        return "#138807";
      default: // Regular rounds - gray
        return "#64748b";
    }
  };
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(prev + delta).toFixed(1))));
    }
  };

    // Handle mouse move to detect hovering over matches
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Account for CSS transform: scale(zoomLevel) which scales getBoundingClientRect
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    // Check if mouse is over any match
    let hoveredMatchFound = false;
    
    for (const match of matchPositions) {
      if (
        x >= match.x &&
        x <= match.x + match.width &&
        y >= match.y &&
        y <= match.y + match.height
      ) {
        // Determine which participant is hovered
        const participantIndex = y >= match.y + match.height / 2 ? 1 : 0;
        const participant = match.participants[participantIndex];
          // Only allow hovering over valid participants who are not byes
        // Allow clicking on matches even if they already have a winner (to re-declare)
        if (participant && participant !== "(bye)") {
          setHoveredMatch({
            id: match.id,
            participantIndex: participantIndex as 0 | 1
          });
          
          hoveredMatchFound = true;
          canvas.style.cursor = "pointer";
          break;
        }
      }
    }
    
    if (!hoveredMatchFound) {
      setHoveredMatch(null);
      canvas.style.cursor = "default";
    }
  };

  const findMatchAtPosition = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Account for CSS transform: scale(zoomLevel) which scales getBoundingClientRect
    const x = (clientX - rect.left) / zoomLevel;
    const y = (clientY - rect.top) / zoomLevel;

    for (const match of matchPositions) {
      if (x >= match.x && x <= match.x + match.width && y >= match.y && y <= match.y + match.height) {
        const participantIndex = y >= match.y + match.height / 2 ? 1 : 0;
        const participant = match.participants[participantIndex];
        if (participant && participant !== "(bye)") {
          return { match, participantIndex: participantIndex as 0 | 1 };
        }
      }
    }
    return null;
  };

  // Handle click on a match
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    let targetMatch = hoveredMatch;

    if (!targetMatch) {
      const found = findMatchAtPosition(e.clientX, e.clientY);
      if (found) {
        targetMatch = { id: found.match.id, participantIndex: found.participantIndex };
      }
    }

    if (!targetMatch) return;

    const matchData = matchPositions.find(m => m.id === targetMatch!.id);
    if (!matchData) return;

    const participant = matchData.participants[targetMatch.participantIndex];
    const otherParticipant = matchData.participants[targetMatch.participantIndex ? 0 : 1];

    if (!participant || participant === "(bye)") return;
    if (!otherParticipant || otherParticipant === "(bye)") return;

    if (onMatchClick &&
        matchData.participants[0] && matchData.participants[0] !== "(bye)" &&
        matchData.participants[1] && matchData.participants[1] !== "(bye)") {
      onMatchClick(targetMatch.id, matchData.participants[0], matchData.participants[1]);
    } else if (onUpdateMatch) {
      onUpdateMatch(targetMatch.id, participant);
    }
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredMatch(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "default";
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = (dist - lastPinchDistRef.current) / 100;
      setZoomLevel(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(prev + delta).toFixed(1))));
      lastPinchDistRef.current = dist;
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    lastPinchDistRef.current = null;
    if (touchStartRef.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      if (dt < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const found = findMatchAtPosition(touch.clientX, touch.clientY);
        if (found) {
          const matchData = found.match;
          const p = matchData.participants[found.participantIndex];
          const op = matchData.participants[found.participantIndex ? 0 : 1];
          if (p && p !== "(bye)" && op && op !== "(bye)") {
            if (onMatchClick) {
              onMatchClick(matchData.id, matchData.participants[0]!, matchData.participants[1]!);
            } else if (onUpdateMatch) {
              onUpdateMatch(matchData.id, p);
            }
          }
        }
      }
    }
    touchStartRef.current = null;
  };
  
  // Calculate canvas size based on bracket data
  const getCanvasSize = () => {
    if (!bracketData) return { width, height };
    
    // Calculate width based on round count
    const calculatedWidth = Math.max(
      width,
      bracketData.length * 280 + 40 // 280px per round plus margins
    );
    
    // Calculate height based on first round matches
    const firstRoundMatches = bracketData[0]?.length || 0;
    let calculatedHeight = height;
    
    // For larger brackets, estimate height needed - improved calculation
    if (firstRoundMatches > 8) {
      // More aggressive height scaling for very large brackets
      if (firstRoundMatches > 32) {
        // Fix for large brackets (>32 participants) to ensure full display
        calculatedHeight = Math.max(
          height,
          firstRoundMatches * 90 + 150 // Reduced spacing for very large brackets but ensure all are visible
        );
      } else if (firstRoundMatches > 16) {
        calculatedHeight = Math.max(
          height,
          firstRoundMatches * 110 + 120 // Adequate spacing for large brackets
        );
      } else {
        calculatedHeight = Math.max(
          height,
          firstRoundMatches * 80 + 100 // Standard spacing for medium brackets
        );
      }
    }
    
    return {
      width: calculatedWidth,
      height: calculatedHeight
    };
  };
  
  // Resize canvas to fit container and adjust for device pixel ratio
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio for crisp rendering
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    
    // Set canvas display size
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    
    // Scale canvas to account for device pixel ratio
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      setScale(dpr);
    }
    
    // Redraw bracket
    drawBracket();
  }, [bracketData]);
  // Redraw when bracket data changes or hover state changes
  useEffect(() => {
    drawBracket();
  }, [bracketData, hoveredMatch, printMode, pulseMatchId]);

  // Handle navigation when highlightedParticipant changes
  useEffect(() => {
    if (highlightedParticipant && matchPositions.length > 0) {
      navigateToParticipant(highlightedParticipant);
    }
  }, [highlightedParticipant, matchPositions]);

  // Simple timeout for pulse effect (no animation loop)
  useEffect(() => {
    if (pulseMatchId) {
      // Redraw once to show the pulse
      drawBracket();
    }
  }, [pulseMatchId]);
  
  // Get dimensions from bracket data
  const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
  
  return (
    <div
      ref={containerRef}
      className="canvas-bracket-container relative"
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      onWheel={handleWheel}
    >
      {/* Zoom Controls */}
      {!printMode && (
        <div className="sticky top-2 z-10 flex gap-1 justify-end mb-1 pr-2">
          <button
            onClick={handleZoomOut}
            className="h-7 w-7 flex items-center justify-center rounded bg-white border border-slate-300 shadow-sm text-slate-600 hover:bg-slate-50 text-sm font-bold"
            title="Zoom out"
          >{'\u2212'}</button>
          <button
            onClick={handleZoomReset}
            className="h-7 px-2 flex items-center justify-center rounded bg-white border border-slate-300 shadow-sm text-slate-600 hover:bg-slate-50 text-xs"
            title="Reset zoom"
          >{Math.round(zoomLevel * 100)}%</button>
          <button
            onClick={handleZoomIn}
            className="h-7 w-7 flex items-center justify-center rounded bg-white border border-slate-300 shadow-sm text-slate-600 hover:bg-slate-50 text-sm font-bold"
            title="Zoom in"
          >+</button>
          <button
            onClick={handleZoomFit}
            className="h-7 px-2 flex items-center justify-center rounded bg-white border border-slate-300 shadow-sm text-slate-600 hover:bg-slate-50 text-xs"
            title="Fit bracket to screen"
          >Fit</button>
        </div>
      )}
      <div style={{
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top left',
        width: zoomLevel !== 1 ? `${100 / zoomLevel}%` : undefined,
      }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: "block",
            minWidth: `${canvasWidth}px`,
            minHeight: `${canvasHeight}px`,
            touchAction: 'manipulation',
          }}
        />
      </div>
    </div>
  );
};

export default CanvasBracket;