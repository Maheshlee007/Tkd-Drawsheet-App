import React, { useEffect, useRef, useState } from "react";
import { BracketMatch } from "@shared/schema";

interface CanvasBracketProps {
  bracketData: BracketMatch[][] | null;
  onMatchClick?: (matchId: string, participantIndex: 0 | 1) => void;
  width?: number;
  height?: number;
  printMode?: boolean;
}

const CanvasBracket: React.FC<CanvasBracketProps> = ({
  bracketData,
  onMatchClick,
  width = 900,
  height = 500,
  printMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
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
  
  // Function to draw the bracket on canvas
  const drawBracket = () => {
    if (!canvasRef.current || !bracketData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
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
          // First round needs tighter spacing for large brackets
          spacing = Math.max(70, Math.min(50, availableHeight / (firstRoundMatches + 1)));
        } else {
          // Later rounds can have more space
          const matchesInThisRound = bracketData[roundIndex].length;
          spacing = Math.max(80, Math.min(60, availableHeight / (matchesInThisRound + 1)));
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
    
    // Calculate total height needed for the bracket
    let totalHeightNeeded = verticalMargin * 2; // Margins
    const firstRoundSpacing = getVerticalSpacing(0);
    totalHeightNeeded += firstRoundMatches * (matchHeight + 10); // Add height for all matches
    totalHeightNeeded += firstRoundMatches * firstRoundSpacing; // Add spacing between matches
    
    // Ensure canvas height is at least the required height
    const minRequiredHeight = Math.max(height, totalHeightNeeded);
    if (canvas.height / scale < minRequiredHeight) {
      // Resize canvas if needed (keeping DPR scaling)
      canvas.height = minRequiredHeight * scale;
      canvas.style.height = `${minRequiredHeight}px`;
    }
    
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
        });
        
        // Draw match box
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#cbd5e1";
        ctx.fillStyle = "#ffffff";
        
        ctx.beginPath();
        ctx.roundRect(roundX, matchY, matchWidth, matchHeight, 4);
        ctx.fill();
        ctx.stroke();
        
        // Draw divider line between participants
        ctx.beginPath();
        ctx.moveTo(roundX, matchY + matchHeight / 2);
        ctx.lineTo(roundX + matchWidth, matchY + matchHeight / 2);
        ctx.stroke();
        
        // Draw participants
        const isTop = (idx: number) => idx === 0;
        const isOpponentBye = (idx: number) => 
          match.participants[idx] !== null && 
          match.participants[idx ? 0 : 1] === "(bye)";
          
        // Draw first participant
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
          roundIndex === bracketData.length - 1 // Is final round
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
          roundIndex === bracketData.length - 1 // Is final round
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
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#94a3b8";
          
          // Horizontal line from source match
          ctx.moveTo(startX, startY);
          ctx.lineTo(midX, startY);
          
          // Vertical connector
          ctx.moveTo(midX, startY);
          ctx.lineTo(midX, endY);
          
          // Horizontal line to target match
          ctx.moveTo(midX, endY);
          ctx.lineTo(endX, endY);
          
          ctx.stroke();
        }
      });
    }
    
    // Draw winners box if not in print mode
    if (!printMode) {
      drawWinnersBox(ctx, bracketData, width, height);
    }
    
    // Update match positions for interaction
    setMatchPositions(newMatchPositions);
  };
  
  // Draw a single participant in a match
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
    isFinalRound: boolean
  ) => {
    const text = participant === "(bye)" ? "(bye)" : (participant || "");
    
    // Determine background and border colors
    let backgroundColor;
    let borderColor;
    
    if (participant === "(bye)") {
      // Bye participant
      backgroundColor = "#f1f5f9";
      borderColor = "#10b981";
    } else if (hasOpponentBye) {
      // Participant with bye opponent
      backgroundColor = "#ecfdf5";
      borderColor = "#10b981";
    } else if (isFinalRound && isWinner) {
      // Final round winner gets green background
      backgroundColor = "#86efac"; // Light green
      borderColor = "#22c55e"; // Medium green
    } else {
      // Regular participant
      backgroundColor = isTop ? "#eff6ff" : "#fff1f2";
      borderColor = isTop ? "#3b82f6" : "#f43f5e";
    }
    
    // Change background if hovered
    if (isHovered) {
      backgroundColor = "#e2e8f0";
    }
    
    // Draw participant background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x, y, width, height);
    
    // Draw left border
    ctx.lineWidth = 3;
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.stroke();
    
    // Draw participant name
    ctx.font = isWinner ? "bold 13px Arial" : "13px Arial"; // Slightly larger font
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#334155";
    
    // Truncate long names
    let displayText = text;
    if (text.length > 24) { // Increased character limit for wider boxes
      displayText = text.substring(0, 22) + "...";
    }
    
    ctx.fillText(displayText, x + 8, y + height / 2);
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
    
    if (finalRound.length === 0 || !finalRound[0].winner) return;
    
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
  
  // Handle mouse move to detect hovering over matches
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
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
        
        // Only allow hovering over valid participants
        if (match.participants[participantIndex] && match.participants[participantIndex] !== "(bye)") {
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
  
  // Handle click on a match
  const handleClick = () => {
    if (hoveredMatch && onMatchClick) {
      onMatchClick(hoveredMatch.id, hoveredMatch.participantIndex);
    }
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredMatch(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "default";
    }
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
    
    // For larger brackets, estimate height needed
    if (firstRoundMatches > 8) {
      calculatedHeight = Math.max(
        height,
        firstRoundMatches * 100 + 100 // 100px per match plus margin
      );
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
  }, [bracketData, hoveredMatch, printMode]);
  
  // Get dimensions from bracket data
  const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
  
  return (
    <div 
      ref={containerRef}
      className="canvas-bracket-container" 
      style={{ 
        width: '100%',
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '80vh' // Make it scrollable when taller than viewport
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        style={{ 
          display: "block", 
          minWidth: `${canvasWidth}px`,
          minHeight: `${canvasHeight}px`
        }}
      />
    </div>
  );
};

export default CanvasBracket;