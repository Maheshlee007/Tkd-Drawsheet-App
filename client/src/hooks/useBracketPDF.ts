import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BracketMatch } from "@shared/schema";
import { jsPDF } from "jspdf";

export type PDFOrientation = "landscape" | "portrait";

// Function to determine if a player had a bye in the previous round (copied from BracketDisplay)
function previousRoundHadBye(playerName: string, bracketData: BracketMatch[][], currentRound: number): boolean {
  if (currentRound <= 0 || !bracketData[currentRound - 1]) return false;
  
  // Find the player in the previous round
  const prevRound = bracketData[currentRound - 1];
  
  for (const match of prevRound) {
    // If this player faced a bye in the previous round
    if (
      (match.participants[0] === playerName && match.participants[1] === "(bye)") ||
      (match.participants[1] === playerName && match.participants[0] === "(bye)")
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * Format a date as DD-MM-YYYY
 */
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get round name based on the round index and total rounds
 */
function getRoundName(roundIndex: number, totalRounds: number): string {
  // Calculate rounds from the end (final, semi, etc.)
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
}

/**
 * Get background color for round labels
 */
function getRoundLabelColor(roundIndex: number, totalRounds: number): { bg: number[], text: number[] } {
  // Calculate rounds from the end (final, semi, etc.)
  const roundsFromEnd = totalRounds - roundIndex - 1;
  
  switch (roundsFromEnd) {
    case 0: // Final - blue
      return { 
        bg: [230, 242, 255], 
        text: [30, 70, 150] 
      };
    case 1: // Semi Finals - green
      return { 
        bg: [230, 255, 240], 
        text: [30, 120, 60] 
      };
    case 2: // Quarter Finals - purple
      return { 
        bg: [242, 230, 255], 
        text: [120, 30, 150] 
      };
    default: // Regular rounds - gray
      return { 
        bg: [240, 240, 240], 
        text: [80, 80, 80] 
      };
  }
}

/**
 * Split large brackets into pages of 16 brackets each
 * This allows us to fit 32 players per page
 */
function splitBracketForPagination(bracketData: BracketMatch[][]): BracketMatch[][][] {
  // For brackets with >16 matches in the first round, split into pages
  const firstRoundMatches = bracketData[0].length;
  
  // If the first round has 16 or fewer matches (32 or fewer players), keep as one page
  if (firstRoundMatches <= 16) {
    return [bracketData];
  }
  
  // Split the bracket into chunks of 16 brackets per page
  const pages: BracketMatch[][][] = [];
  const bracketCopy = [...bracketData];
  
  // For each page, create a subset of the bracket with 16 first-round matches
  for (let i = 0; i < firstRoundMatches; i += 16) {
    // Take up to 16 matches from each round for this page
    const pageData: BracketMatch[][] = [];
    
    // Process each round
    for (let roundIdx = 0; roundIdx < bracketCopy.length; roundIdx++) {
      const round = bracketCopy[roundIdx];
      
      // For the first round, take 16 matches
      if (roundIdx === 0) {
        const matchGroup = round.slice(i, Math.min(i + 16, round.length));
        pageData.push(matchGroup);
      } else {
        // For subsequent rounds, find corresponding matches
        const prevRoundMatches = pageData[roundIdx - 1];
        const matchIds = prevRoundMatches.map(m => m.nextMatchId).filter(id => id !== null);
        
        // Get matches from this round that are connected to the previous round
        const connectedMatches = round.filter(m => matchIds.includes(m.id));
        
        if (connectedMatches.length > 0) {
          pageData.push(connectedMatches);
        }
      }
    }
    
    // Only add the page if it contains matches
    if (pageData.length > 0 && pageData[0].length > 0) {
      pages.push(pageData);
    }
  }
  
  return pages;
}

export const useBracketPDF = () => {
  const { toast } = useToast();
  const [orientation, setOrientation] = useState<PDFOrientation>("landscape");

  /**
   * Generate a PDF with a visual tournament bracket
   */
  const generateBracketPDF = useCallback((
    bracketData: BracketMatch[][],
    title = "Tournament Bracket",
    participantCount: number = 0,
    pdfOrientation?: PDFOrientation
  ) => {
    try {
      // Use provided orientation or fall back to state
      const finalOrientation = pdfOrientation || orientation;
      
      // Get the current date
      const currentDate = formatDate(new Date());
      
      // Split brackets into pages of 16 brackets each
      const bracketPages = splitBracketForPagination(bracketData);
      
      // Set up PDF with proper orientation
      const pdf = new jsPDF({
        orientation: finalOrientation,
        unit: "mm",
        format: "a4"
      });
      
      // Define page dimensions and layout settings
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      // Generate each page
      bracketPages.forEach((pageBracket, pageIndex) => {
        // Add a new page for all pages except the first
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        // Add title, participant count, and date on the same line
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, pageWidth / 2, margin + 5, { align: "center" });
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        
        // Add participant count on right side
        pdf.text(`Participants: ${participantCount}`, pageWidth - margin, margin + 5, { align: "right" });
        
        // Add date on left side
        pdf.text(`Date: ${currentDate}`, margin, margin + 5);
        
        // Add page indicator if multiple pages
        if (bracketPages.length > 1) {
          pdf.setFontSize(9);
          pdf.text(`Page ${pageIndex + 1} of ${bracketPages.length}`, pageWidth / 2, margin + 12, { align: "center" });
          
          // Add bracket range description
          const startBracket = pageIndex * 16 + 1;
          const endBracket = Math.min(startBracket + 15, bracketData[0].length);
          
          pdf.setFont("helvetica", "italic");
          pdf.text(`Brackets ${startBracket}-${endBracket}`, pageWidth / 2, margin + 17, { align: "center" });
          pdf.setFont("helvetica", "normal");
        }
        
        // Draw the bracket with visual style matching BracketDisplay component
        renderBracket(pdf, pageBracket, margin, contentWidth, contentHeight, finalOrientation);
      });
      
      // Save the PDF
      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
      
      // Show success message
      toast({
        title: "Success",
        description: "Bracket PDF has been generated and saved!",
      });
      
      return true;
    } catch (error) {
      console.error("Error generating bracket PDF:", error);
      toast({
        variant: "destructive",
        title: "PDF Generation Error",
        description: "Failed to generate the bracket PDF.",
      });
      return false;
    }
  }, [toast, orientation]);

  /**
   * Pre-calculate the match positions for all rounds
   * This ensures matches in later rounds are properly positioned between their parent matches
   */
  const calculateMatchPositions = (
    bracketData: BracketMatch[][],
    startY: number,
    matchHeight: number,
    roundWidth: number,
    margin: number
  ) => {
    const positions: Record<string, { x: number, y: number, height: number }> = {};
    const roundPositions: Array<Array<{x: number, y: number, nextMatchId: string | null, id: string, height: number}>> = [];
    
    // First calculate all positions for the first round (evenly spaced)
    const firstRound = bracketData[0];
    const firstRoundPositions: Array<{x: number, y: number, nextMatchId: string | null, id: string, height: number}> = [];
    roundPositions.push(firstRoundPositions);
    
    // Calculate spacing for first round - REDUCED spacing to fit 32 players
    // We need to fit 16 brackets on a page, so reduce the spacing
    const baseSpacing = matchHeight * 1.2; // Reduced from 1.5 to fit more brackets
    const firstRoundX = margin;
    
    // Position first round matches
    firstRound.forEach((match, idx) => {
      const matchY = startY + (idx * baseSpacing);
      positions[match.id] = { x: firstRoundX, y: matchY, height: matchHeight };
      firstRoundPositions.push({
        x: firstRoundX,
        y: matchY,
        nextMatchId: match.nextMatchId,
        id: match.id,
        height: matchHeight
      });
    });
    
    // Process subsequent rounds
    for (let roundIdx = 1; roundIdx < bracketData.length; roundIdx++) {
      const round = bracketData[roundIdx];
      const roundPositionArr: Array<{x: number, y: number, nextMatchId: string | null, id: string, height: number}> = [];
      roundPositions.push(roundPositionArr);
      
      // Position for this round's matches
      const roundX = margin + (roundIdx * roundWidth);
      
      // For each match in this round, find its source matches and position it between them
      round.forEach((match) => {
        // Find the previous round's matches that feed into this match
        const prevRound = bracketData[roundIdx - 1];
        const sourceMatches = prevRound.filter(m => m.nextMatchId === match.id);
        
        // Position this match between its source matches
        if (sourceMatches.length > 0) {
          let totalY = 0;
          sourceMatches.forEach(sourceMatch => {
            const sourcePos = positions[sourceMatch.id];
            if (sourcePos) {
              totalY += sourcePos.y + (sourcePos.height / 2);
            }
          });
          
          // Calculate average Y position of source matches
          const avgY = totalY / sourceMatches.length - (matchHeight / 2);
          
          // Store position
          positions[match.id] = { x: roundX, y: avgY, height: matchHeight };
          roundPositionArr.push({
            x: roundX,
            y: avgY,
            nextMatchId: match.nextMatchId,
            id: match.id,
            height: matchHeight
          });
        } else {
          // If no source matches (shouldn't happen but just in case), just position somewhere
          const matchY = startY + (matchHeight * 2);
          positions[match.id] = { x: roundX, y: matchY, height: matchHeight };
          roundPositionArr.push({
            x: roundX,
            y: matchY,
            nextMatchId: match.nextMatchId,
            id: match.id,
            height: matchHeight
          });
        }
      });
    }
    
    return roundPositions;
  };

  /**
   * Render a bracket with style matching the BracketDisplay component
   */
  const renderBracket = (
    pdf: jsPDF, 
    bracketData: BracketMatch[][], 
    margin: number, 
    contentWidth: number, 
    contentHeight: number,
    orientation: PDFOrientation
  ) => {
    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate dimensions
    const roundCount = bracketData.length;
    
    // Calculate the round width based on available space
    // Updated: adjust round width calculation to account for connectors
    const matchWidthProportion = 0.65; // Match takes 65% of round width, connectors take 35%
    const roundWidth = contentWidth / roundCount;
    
    // Calculate match dimensions
    const matchWidth = Math.min(40, roundWidth * matchWidthProportion);
    const matchHeight = 7; // Slightly reduced match height to fit more
    
    // Starting position with room for round labels
    const startY = margin + 25; // Increased for round labels
    
    // Draw round labels with background colors
    pdf.setFontSize(9);
    
    // Add round labels in a row at the top
    bracketData.forEach((round, roundIndex) => {
      const roundX = margin + (roundIndex * roundWidth) + (matchWidth / 2);
      const roundName = getRoundName(roundIndex, roundCount);
      
      // Get round label colors
      const colors = getRoundLabelColor(roundIndex, roundCount);
      
      // Draw round label with colored background
      const labelWidth = 32;
      const labelHeight = 8;
      const labelX = roundX - (labelWidth / 2);
      const labelY = startY - 15;
      
      // Draw rounded rectangle background
      pdf.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      pdf.setDrawColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.roundedRect(labelX, labelY, labelWidth, labelHeight, 2, 2, 'FD');
      
      // Draw round name text
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.setFont("helvetica", "bold");
      pdf.text(roundName, roundX, startY - 9, { align: "center" });
    });
    
    // Reset text color
    pdf.setTextColor(30, 30, 30);
    
    // Pre-calculate match positions to ensure proper alignment
    const matchPositions = calculateMatchPositions(
      bracketData,
      startY,
      matchHeight,
      roundWidth,
      margin
    );
    
    // Draw each round
    bracketData.forEach((round, roundIndex) => {
      // Draw each match in this round
      round.forEach((match, matchIndex) => {
        // Get the pre-calculated position for this match
        const matchPosition = matchPositions[roundIndex].find(m => m.id === match.id);
        if (!matchPosition) return;
        
        const roundX = matchPosition.x;
        const matchY = matchPosition.y;
        
        // Get participant styling info (similar to BracketDisplay getParticipantStyle)
        const isFirstRound = roundIndex === 0;
        const hasOpponentByeTop = match.participants[0] !== null && match.participants[1] === "(bye)";
        const hasOpponentByeBottom = match.participants[1] !== null && match.participants[0] === "(bye)";
        const hasMatchByeTop = !isFirstRound && match.participants[0] !== null && 
                          match.participants[0] !== "(bye)" &&
                          previousRoundHadBye(match.participants[0], bracketData, roundIndex);
        const hasMatchByeBottom = !isFirstRound && match.participants[1] !== null && 
                              match.participants[1] !== "(bye)" &&
                              previousRoundHadBye(match.participants[1], bracketData, roundIndex);
        
        // Draw match box
        pdf.setDrawColor(200, 200, 200);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(roundX, matchY, matchWidth, matchHeight, 1, 1, 'FD');
        
        // Draw participant 1
        const participant1 = match.participants[0] || "";
        const text1 = participant1 === "(bye)" ? "(bye)" : participant1;
        // Set appropriate background color (similar to BracketDisplay colors)
        if (participant1 === "(bye)") {
          // Gray with green border for bye
          pdf.setFillColor(240, 240, 240);
          pdf.rect(roundX, matchY, matchWidth, matchHeight/2, 'F');
          pdf.setDrawColor(0, 180, 0);
          pdf.line(roundX, matchY, roundX, matchY + matchHeight/2);
          pdf.setDrawColor(200, 200, 200);
        } else if (hasOpponentByeTop) {
          // Light green for player with bye
          pdf.setFillColor(240, 255, 240);
          pdf.rect(roundX, matchY, matchWidth, matchHeight/2, 'F');
          pdf.setDrawColor(0, 180, 0);
          pdf.line(roundX, matchY, roundX, matchY + matchHeight/2);
          pdf.setDrawColor(200, 200, 200);
        } else if (hasMatchByeTop) {
          // Light green for player from match with bye
          pdf.setFillColor(240, 255, 240);
          pdf.rect(roundX, matchY, matchWidth, matchHeight/2, 'F');
          pdf.setDrawColor(0, 180, 0);
          pdf.line(roundX, matchY, roundX, matchY + matchHeight/2);
          pdf.setDrawColor(200, 200, 200);
        } else {
          // Blue for top participant
          pdf.setFillColor(240, 245, 255);
          pdf.rect(roundX, matchY, matchWidth, matchHeight/2, 'F');
          pdf.setDrawColor(30, 120, 255);
          pdf.line(roundX, matchY, roundX, matchY + matchHeight/2);
          pdf.setDrawColor(200, 200, 200);
        }
        
        // Draw text for participant 1
        pdf.setFontSize(6.5);
        if (match.winner === participant1) {
          pdf.setFont("helvetica", "bold");
        } else {
          pdf.setFont("helvetica", "normal");
        }
        
        // Truncate text if needed
        let displayText1 = text1;
        pdf.setTextColor(30, 30, 30);
        const maxTextWidth = matchWidth - 4;
        if (pdf.getTextWidth(displayText1) > maxTextWidth) {
          displayText1 = displayText1.substring(0, 15) + "...";
        }
        
        pdf.text(displayText1, roundX + 2, matchY + (matchHeight / 4) + 1);
        
        // Draw divider line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(roundX, matchY + matchHeight/2, roundX + matchWidth, matchY + matchHeight/2);
        
        // Draw participant 2
        const participant2 = match.participants[1] || "";
        const text2 = participant2 === "(bye)" ? "(bye)" : participant2;
        
        // Set appropriate background color (similar to BracketDisplay colors)
        if (participant2 === "(bye)") {
          // Gray with green border for bye
          pdf.setFillColor(240, 240, 240);
          pdf.rect(roundX, matchY + matchHeight/2, matchWidth, matchHeight/2, 'F');
          pdf.setDrawColor(0, 180, 0);
          pdf.line(roundX, matchY + matchHeight/2, roundX, matchY + matchHeight);
          pdf.setDrawColor(200, 200, 200);
        } else if (hasOpponentByeBottom) {
          // Light green for player with bye
          pdf.setFillColor(240, 255, 240);
          pdf.rect(roundX, matchY + matchHeight/2, matchWidth, matchHeight/2, 'F');
          pdf.setDrawColor(0, 180, 0);
          pdf.line(roundX, matchY + matchHeight/2, roundX, matchY + matchHeight);
          pdf.setDrawColor(200, 200, 200);
        } else if (hasMatchByeBottom) {
          // Light green for player from match with bye
          pdf.setFillColor(240, 255, 240);
          pdf.rect(roundX, matchY + matchHeight/2, matchWidth, matchHeight/2, 'F');
          pdf.setDrawColor(0, 180, 0);
          pdf.line(roundX, matchY + matchHeight/2, roundX, matchY + matchHeight);
          pdf.setDrawColor(200, 200, 200);
        } else {
          // Red for bottom participant
          pdf.setFillColor(255, 245, 245);
          pdf.rect(roundX, matchY + matchHeight/2, matchWidth, matchHeight/2, 'F');
          pdf.setDrawColor(255, 70, 70);
          pdf.line(roundX, matchY + matchHeight/2, roundX, matchY + matchHeight);
          pdf.setDrawColor(200, 200, 200);
        }
        
        // Draw text for participant 2
        pdf.setFontSize(6.5);
        if (match.winner === participant2) {
          pdf.setFont("helvetica", "bold");
        } else {
          pdf.setFont("helvetica", "normal");
        }
        
        // Truncate text if needed
        let displayText2 = text2;
        pdf.setTextColor(30, 30, 30);
        if (pdf.getTextWidth(displayText2) > maxTextWidth) {
          displayText2 = displayText2.substring(0, 15) + "...";
        }
        
        pdf.text(displayText2, roundX + 2, matchY + (matchHeight * 3/4) + 1);
      });
    });
    
    // Draw connectors (similar to how BracketDisplay calculates its connectors)
    // Process all rounds except the last one
    for (let roundIndex = 0; roundIndex < matchPositions.length - 1; roundIndex++) {
      const round = matchPositions[roundIndex];
      
      // Process each match in the round
      round.forEach(match => {
        if (match.nextMatchId) {
          // Find the next match this one connects to
          const nextRound = matchPositions[roundIndex + 1];
          const nextMatch = nextRound.find(m => m.id === match.nextMatchId);
          
          if (nextMatch) {
            // Calculate connector points
            // Start point (from current match)
            const startX = match.x + matchWidth;
            const startY = match.y + (match.height / 2);
            
            // End point (to next match)
            const endX = nextMatch.x;
            const endY = nextMatch.y + (nextMatch.height / 2);
            
            // Calculate midpoint for drawing the vertical connector
            const midX = startX + ((endX - startX) / 2);
            
            // Draw connector lines with lighter color (similar to BracketDisplay)
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineWidth(0.2);
            
            // Horizontal line from current match
            pdf.line(startX, startY, midX, startY);
            
            // Vertical connector
            pdf.line(midX, startY, midX, endY);
            
            // Horizontal line to next match
            pdf.line(midX, endY, endX, endY);
          }
        }
      });
    }
    
    // If this is the final round, add Winner label to the champion
    const finalRound = bracketData[bracketData.length - 1];
    if (finalRound && finalRound.length === 1 && finalRound[0].winner) {
      const finalMatch = finalRound[0];
      const winner = finalMatch.winner;
      
      // Find the position of the final match
      const finalMatchPos = matchPositions[matchPositions.length - 1][0];
      
      if (finalMatchPos) {
        // Add winner badge
        pdf.setFillColor(100, 100, 255);
        pdf.setDrawColor(80, 80, 200);
        pdf.roundedRect(
          finalMatchPos.x + matchWidth + 2, 
          finalMatchPos.y + (finalMatchPos.height / 2) - 3, 
          20, 
          6, 
          2, 
          2, 
          'FD'
        );
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          "WINNER", 
          finalMatchPos.x + matchWidth + 12, 
          finalMatchPos.y + (finalMatchPos.height / 2) + 1, 
          { align: "center" }
        );
      }
    }
    
    // Add footer if this bracket is part of a multi-page document
    if (bracketData[0].length >= 16) {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        "Large tournament bracket - continues on next page(s)", 
        pageWidth / 2, 
        pageHeight - 5, 
        { align: "center" }
      );
    }
  };

  // Function to toggle orientation
  const toggleOrientation = useCallback(() => {
    setOrientation(prev => prev === "landscape" ? "portrait" : "landscape");
  }, []);

  // Function to preview the PDF before downloading
  const previewBracketPDF = useCallback((
    bracketData: BracketMatch[][],
    title = "Tournament Bracket",
    participantCount: number = 0
  ) => {
    try {
      // Get the current date
      const currentDate = formatDate(new Date());
      
      // Split brackets into pages of 16 brackets each
      const bracketPages = splitBracketForPagination(bracketData);
      
      // Create the PDF
      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: "a4"
      });
      
      // Define page dimensions and layout settings
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      // Generate each page
      bracketPages.forEach((pageBracket, pageIndex) => {
        // Add a new page for all pages except the first
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        // Add title, participant count, and date on the same line
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, pageWidth / 2, margin + 5, { align: "center" });
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        
        // Add participant count on right side
        pdf.text(`Participants: ${participantCount}`, pageWidth - margin, margin + 5, { align: "right" });
        
        // Add date on left side
        pdf.text(`Date: ${currentDate}`, margin, margin + 5);
        
        // Add page indicator if multiple pages
        if (bracketPages.length > 1) {
          pdf.setFontSize(9);
          pdf.text(`Page ${pageIndex + 1} of ${bracketPages.length}`, pageWidth / 2, margin + 12, { align: "center" });
          
          // Add bracket range description
          const startBracket = pageIndex * 16 + 1;
          const endBracket = Math.min(startBracket + 15, bracketData[0].length);
          
          pdf.setFont("helvetica", "italic");
          pdf.text(`Brackets ${startBracket}-${endBracket}`, pageWidth / 2, margin + 17, { align: "center" });
          pdf.setFont("helvetica", "normal");
        }
        
        // Draw the bracket
        renderBracket(pdf, pageBracket, margin, contentWidth, contentHeight, orientation);
      });
      
      // Generate PDF as data URL for preview
      const pdfOutput = pdf.output('datauristring');
      
      // Open PDF in a new window (better browser compatibility than new tab)
      const previewWindow = window.open('', '_blank');
      if (!previewWindow) {
        // If popup is blocked, show error message
        toast({
          variant: "destructive",
          title: "Preview Blocked",
          description: "Please allow popups to preview the bracket.",
        });
        return false;
      }
      
      // Write PDF viewer HTML to the new window
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tournament Bracket Preview</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              height: 100vh;
            }
            .toolbar {
              background: #f5f5f5;
              border-bottom: 1px solid #ddd;
              padding: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .preview {
              flex: 1;
              width: 100%;
              height: 100%;
              border: none;
            }
            button {
              padding: 6px 12px;
              background: #0284c7;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              margin-left: 10px;
            }
            button:hover {
              background: #0369a1;
            }
            .page-controls {
              display: ${bracketPages.length > 1 ? 'flex' : 'none'};
              align-items: center;
              margin-right: 20px;
            }
            .page-info {
              margin: 0 10px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <h3>Tournament Bracket Preview</h3>
            <div style="display: flex; align-items: center;">
              <div class="page-controls">
                <button id="prev-btn" ${bracketPages.length <= 1 ? 'disabled' : ''}>Previous Page</button>
                <span class="page-info">Page <span id="current-page">1</span> of ${bracketPages.length}</span>
                <button id="next-btn" ${bracketPages.length <= 1 ? 'disabled' : ''}>Next Page</button>
              </div>
              <button id="print-btn">Print</button>
              <button id="download-btn">Download</button>
              <button id="close-btn">Close</button>
            </div>
          </div>
          <iframe class="preview" src="${pdfOutput}"></iframe>
          <script>
            const iframe = document.querySelector('iframe');
            let currentPage = 0;
            const totalPages = ${bracketPages.length};
            
            document.getElementById('print-btn').addEventListener('click', function() {
              iframe.contentWindow.print();
            });
            
            document.getElementById('download-btn').addEventListener('click', function() {
              const link = document.createElement('a');
              link.href = "${pdfOutput}";
              link.download = "${title.replace(/\s+/g, '_')}.pdf";
              link.click();
            });
            
            document.getElementById('close-btn').addEventListener('click', function() {
              window.close();
            });
            
            // Page controls for multi-page PDFs
            if (totalPages > 1) {
              const pdfDoc = iframe.contentWindow;
              const currentPageEl = document.getElementById('current-page');
              
              document.getElementById('prev-btn').addEventListener('click', function() {
                if (currentPage > 0) {
                  currentPage--;
                  if (pdfDoc.PDFViewerApplication) {
                    pdfDoc.PDFViewerApplication.page = currentPage + 1;
                  }
                  currentPageEl.textContent = currentPage + 1;
                }
              });
              
              document.getElementById('next-btn').addEventListener('click', function() {
                if (currentPage < totalPages - 1) {
                  currentPage++;
                  if (pdfDoc.PDFViewerApplication) {
                    pdfDoc.PDFViewerApplication.page = currentPage + 1;
                  }
                  currentPageEl.textContent = currentPage + 1;
                }
              });
            }
          </script>
        </body>
        </html>
      `);
      
      previewWindow.document.close();
      
      // Show success message
      toast({
        title: "Preview Ready",
        description: "The bracket preview has been opened in a new window.",
      });
      
      return true;
    } catch (error) {
      console.error("Error generating bracket PDF preview:", error);
      toast({
        variant: "destructive",
        title: "PDF Preview Error",
        description: "Failed to generate the bracket PDF preview.",
      });
      return false;
    }
  }, [toast, orientation]);

  return { 
    generateBracketPDF,
    previewBracketPDF,
    orientation,
    setOrientation,
    toggleOrientation
  };
};