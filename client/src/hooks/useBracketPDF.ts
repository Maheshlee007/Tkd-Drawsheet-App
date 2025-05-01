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
 * Get background color for round labels - Using Indian flag color scheme
 */
function getRoundLabelColor(roundIndex: number, totalRounds: number): { bg: number[], text: number[], border: number[] } {
  // Calculate rounds from the end (final, semi, etc.)
  const roundsFromEnd = totalRounds - roundIndex - 1;
  
  switch (roundsFromEnd) {
    case 0:
      return { 
        bg: [144, 248, 144],       // Light green background
    text: [4, 106, 56],        // India green text
    border: [0, 100, 0],       // Dark green border
      };
    case 1:
      return { 
        bg: [255, 255, 255],      // Smoky white background
    text: [0, 0, 128],        // Navy blue text (for Ashoka Chakra)
    border: [200, 200, 200],  // Light gray border
      };
    case 2:
      return { 
        bg: [255, 231, 171],       // Light saffron background
        text: [255, 103, 31],      // Deep saffron text
        border: [204, 82, 0],      // Darker saffron border
      };
    default:
      return { 
        bg: [240, 240, 240], 
        text: [80, 80, 80],
        border: [200, 200, 200]
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

/**
 * Adds footer with organization info, copyright, and judge signature to the PDF
 */
function addPDFFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, margin: number, pageNumber: number, totalPages: number, tkdLogoBase64?: string) {
  // Move the divider even lower to prevent collision with the last bracket
  const footerTop = pageHeight - 16; // Moved 10px lower from previous position (was 22)
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.5);
  pdf.line(margin, footerTop, pageWidth - margin, footerTop);
  
  // Logo placement (left side) - Adjusted for the new footer position
  const logoHeight = 12;
  const logoWidth = 15;
  const logoX = margin;
  const logoY = pageHeight - 15; // Adjusted for the new footer position
  
  // If logo is available, use it, otherwise use text
  if (tkdLogoBase64) {
    try {
      pdf.addImage(tkdLogoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.error("Error adding logo:", error);
      // Fallback to text if image fails
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("WTF", logoX, logoY + 8);
    }
  } else {
    // Text-only logo fallback
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("WTF", logoX, logoY + 8);
  }
  
  // Organization info (left side)
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.text("Professional TKD Academy", logoX + logoWidth + 3, logoY + 5);
  
  // Copyright (center)
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "italic");
  pdf.text("© All Rights Reserved by Mahesh", pageWidth / 2, pageHeight - 10, { align: "center" });
  
  // Add page numbers below the copyright text
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" });
  
  // Judge signature (right side) - Made into single line
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setDrawColor(100, 100, 100);
  
  const signatureWidth = 60;
  const signatureX = pageWidth - margin - signatureWidth;
  pdf.text("Judge Signature: ", signatureX, pageHeight - 10);
  pdf.line(signatureX + 23, pageHeight - 8, pageWidth - margin, pageHeight - 8);
}

/**
 * Adds a placement box for noting 1st, 2nd, 3rd, 4th positions
 */
function addPlacementBox(pdf: jsPDF, pageWidth: number, pageHeight: number, margin: number) {
  // Position box at bottom of page above the separator line
  const boxWidth = 60; // Increased width for noting names
  const boxHeight = 40;
  const boxY = pageHeight - 18 - boxHeight; // Place above footer area
  const boxX = pageWidth - margin - boxWidth;
  
  // Draw the main box with rounded corners
  pdf.setDrawColor(100, 100, 100);
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');
  
  // Title
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text("PLACEMENTS", boxX + (boxWidth / 2), boxY + 5, { align: "center" });
  
  // Create 4 sections inside the box
  const sectionHeight = 8;
  const textX = boxX + 4;
  
  // Gold - 1st Place
  pdf.setFillColor(255, 240, 180); // Gold color
  pdf.rect(boxX + 1, boxY + 7, boxWidth - 2, sectionHeight, 'F');
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(150, 120, 0);
  pdf.text("1st (Gold):", textX, boxY + 12);
  
  // Silver - 2nd Place
  pdf.setFillColor(230, 230, 230); // Silver color
  pdf.rect(boxX + 1, boxY + 7 + sectionHeight, boxWidth - 2, sectionHeight, 'F');
  pdf.setFontSize(6);
  pdf.setTextColor(100, 100, 100);
  pdf.text("2nd (Silver):", textX, boxY + 12 + sectionHeight);
  
  // Bronze - 3rd Place
  pdf.setFillColor(230, 200, 170); // Bronze color
  pdf.rect(boxX + 1, boxY + 7 + (sectionHeight * 2), boxWidth - 2, sectionHeight, 'F');
  pdf.setFontSize(6);
  pdf.setTextColor(150, 90, 50);
  pdf.text("3rd (Bronze):", textX, boxY + 12 + (sectionHeight * 2));
  
  // 2nd Bronze - 4th Place
  pdf.setFillColor(230, 200, 170); // Bronze color
  pdf.rect(boxX + 1, boxY + 7 + (sectionHeight * 3), boxWidth - 2, sectionHeight, 'F');
  pdf.setFontSize(6);
  pdf.setTextColor(150, 90, 50);
  pdf.text("4th (Bronze):", textX, boxY + 12 + (sectionHeight * 3));
  
  // Lines for writing names - make longer for more space
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.1);
  
  for (let i = 0; i < 4; i++) {
    const lineY = boxY + 14 + (sectionHeight * i);
    pdf.line(textX + 18, lineY, boxX + boxWidth - 2, lineY);
  }
}

export const useBracketPDF = () => {
  const { toast } = useToast();
  const [orientation, setOrientation] = useState<PDFOrientation>("landscape");
  const [tkdLogoBase64, setTkdLogoBase64] = useState<string | null>(null);

  // Load the TKD logo when needed
  const loadTkdLogo = useCallback(() => {
    // Only load if not already loaded
    if (tkdLogoBase64) return Promise.resolve(tkdLogoBase64);
    
    return new Promise<string | null>((resolve) => {
      // Create image object
      const img = new Image();
      
      // Handle image load
      img.onload = () => {
        // Create canvas to convert image to base64
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          // Convert to base64
          try {
            const dataUrl = canvas.toDataURL('image/png');
            setTkdLogoBase64(dataUrl);
            resolve(dataUrl);
          } catch (error) {
            console.error("Error converting logo to base64:", error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      
      // Handle image error
      img.onerror = () => {
        console.error("Error loading TKD logo");
        resolve(null);
      };
      
      // Set source and start loading
      img.src = '/src/assets/tkd_logo.png';
      
      // Try alternate path if the first one fails
      setTimeout(() => {
        if (!img.complete) {
          img.src = './src/assets/tkd_logo.png';
        }
      }, 500);
    });
  }, [tkdLogoBase64]);

  /**
   * Generate a PDF with a visual tournament bracket
   */
  const generateBracketPDF = useCallback(async (
    bracketData: BracketMatch[][],
    title = "Tournament Bracket",
    participantCount: number = 0,
    pdfOrientation?: PDFOrientation
  ) => {
    try {
      // Attempt to load the TKD logo
      const logoData = await loadTkdLogo();
      
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
        pdf.text(`Participants: ${participantCount}`, pageWidth - margin - 40, margin + 5, { align: "right" });
        
        // Add date on left side
        pdf.text(`Date: ${currentDate}`, margin, margin + 5);
        
        // Add page indicator if multiple pages
        if (bracketPages.length > 1 && false) { //later change based on requirement
          pdf.setFontSize(9);
          pdf.text(`Page ${pageIndex + 1} of ${bracketPages.length}`, pageWidth / 2, margin + 12, { align: "center" });
          
          // Add bracket range description
          const startBracket = pageIndex * 16 + 1;
          const endBracket = Math.min(startBracket + 15, bracketData[0].length);
          
          pdf.setFont("helvetica", "italic");
          pdf.text(`Brackets ${startBracket}-${endBracket}`, pageWidth / 2, margin + 17, { align: "center" });
          pdf.setFont("helvetica", "normal");
        }
        
        // Add placement box to every page
        addPlacementBox(pdf, pageWidth, pageHeight, margin);
        
        // Draw the bracket with visual style matching BracketDisplay component
        renderBracket(pdf, pageBracket, margin, contentWidth, contentHeight, finalOrientation);
        
        // Add footer with organization info and signature line
        addPDFFooter(pdf, pageWidth, pageHeight, margin, pageIndex + 1, bracketPages.length, logoData || undefined);
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
  }, [toast, orientation, loadTkdLogo]);

  /**
   * Pre-calculate the match positions for all rounds
   * This ensures matches in later rounds are properly positioned between their parent matches
   */
  const calculateMatchPositions = (
    bracketData: BracketMatch[][],
    startY: number,
    matchHeight: number,
    roundWidth: number,
    margin: number,
    orientation: PDFOrientation
  ) => {
    const positions: Record<string, { x: number, y: number, height: number }> = {};
    const roundPositions: Array<Array<{x: number, y: number, nextMatchId: string | null, id: string, height: number}>> = [];
    
    // First calculate all positions for the first round (evenly spaced)
    const firstRound = bracketData[0];
    const firstRoundPositions: Array<{x: number, y: number, nextMatchId: string | null, id: string, height: number}> = [];
    roundPositions.push(firstRoundPositions);
    
    // Calculate spacing based on orientation
    // For portrait, increase spacing between brackets as there's more vertical space
    // For landscape, keep spacing tight to fit 16 brackets horizontally
    const baseSpacing = orientation === 'portrait' 
      ? matchHeight * 1.8  // Increased spacing for portrait mode
      : matchHeight * 1.3; // Reduced spacing for landscape to fit all 16 brackets
    
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
            height: matchHeight // Fix connector alignment - don't divide by 2 here
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
    
    // Calculate the round width based on available space and orientation
    // Increase match proportion to make brackets wider
    const matchWidthProportion = 0.75; // Increased to 75% for bracket, 25% for connector
    const roundWidth = contentWidth / roundCount;
    
    // Calculate match dimensions - increase sizes for both orientations
    // For landscape mode: wider brackets than portrait
    const matchWidth = orientation === 'landscape' 
      ? Math.min(55, roundWidth * matchWidthProportion) // Significantly wider in landscape
      : Math.min(50, roundWidth * matchWidthProportion); // Wider in portrait too
    
    // Increase match height for better readability in both modes
    // But keep smaller in landscape to fit 16 brackets on page
    const matchHeight = orientation === 'landscape' ? 8 : 8; // Same height for consistency
    
    // Starting position with room for round labels - Start higher on the page
    const startY = orientation === 'portrait' 
      ? margin + 23  // Higher start in portrait
      : margin + 25; // Higher start in landscape
    
    // Add separator line above round labels
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.5);
    pdf.line(margin, startY - 18, pageWidth - margin, startY - 18);
    
    // Draw round labels with background colors
    pdf.setFontSize(orientation === 'portrait' ? 8 : 9); // Smaller font in portrait mode
    
    // Add round labels in a row at the top - moved higher to give more space for brackets
    bracketData.forEach((round, roundIndex) => {
      const roundX = margin + (roundIndex * roundWidth) + (matchWidth / 2);
      const roundName = getRoundName(roundIndex, roundCount);
      
      // Get round label colors
      const colors = getRoundLabelColor(roundIndex, roundCount);
      
      // Draw round label with colored background - reduced height and centered
      const labelWidth = orientation === 'portrait' ? 28 : 32; // Smaller in portrait
      const labelHeight = orientation === 'portrait' ? 6 : 7;  // Reduced height for both orientations
      const labelX = roundX - (labelWidth / 2);
      const labelY = startY - 16; // Moved higher to give more space for brackets
      
      // Draw rounded rectangle background
      pdf.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      pdf.roundedRect(labelX, labelY, labelWidth, labelHeight, 2, 2, 'FD');
      
      // Draw round name text - centered vertically in the smaller label
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.setFont("helvetica", "bold");
      pdf.text(roundName, roundX, startY - 11.5, { align: "center" }); // Adjusted text position
    });
    
    // Reset text color
    pdf.setTextColor(30, 30, 30);
    
    // Pre-calculate match positions to ensure proper alignment
    const matchPositions = calculateMatchPositions(
      bracketData,
      startY-7,
      matchHeight,
      roundWidth,
      margin,
      orientation
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
    // if (bracketData[0].length >= 16) {
    //   pdf.setFontSize(8);
    //   pdf.setFont("helvetica", "italic");
    //   pdf.setTextColor(100, 100, 100);
    //   pdf.text(
    //     "Large tournament bracket - continues on next page(s)", 
    //     pageWidth / 2, 
    //     pageHeight - 5, 
    //     { align: "center" }
    //   );
    // }
  };

  // Function to toggle orientation
  const toggleOrientation = useCallback(() => {
    setOrientation(prev => prev === "landscape" ? "portrait" : "landscape");
  }, []);

  /**
   * Preview the PDF before downloading
   */
  const previewBracketPDF = useCallback(async (
    bracketData: BracketMatch[][],
    title = "Tournament Bracket",
    participantCount: number = 0
  ) => {
    try {
      // Attempt to load the TKD logo
      const logoData = await loadTkdLogo();
      
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
        pdf.text(`Participants: ${participantCount}`, pageWidth - margin - 40, margin + 5, { align: "right" });
        
        // Add date on left side
        pdf.text(`Date: ${currentDate}`, margin, margin + 5);
        
        // Add page indicator if multiple pages
        if (bracketPages.length > 1 ) { //later change based on requirement
          pdf.setFontSize(9);
          // pdf.text(`Page ${pageIndex + 1} of ${bracketPages.length}`, pageWidth / 2, margin + 12, { align: "center" });
          
          // Add bracket range description
          const startBracket = pageIndex * 16 + 1;
          const endBracket = Math.min(startBracket + 15, bracketData[0].length);
          
          pdf.setFont("helvetica", "italic");
          pdf.text(`Matches ${startBracket}-${endBracket}`, pageWidth - margin - 15, margin + 5, { align: "right" });
          pdf.setFont("helvetica", "normal");
        }
        
        // Add placement box to every page
        addPlacementBox(pdf, pageWidth, pageHeight, margin);
        
        // Draw the bracket with visual style matching BracketDisplay component
        renderBracket(pdf, pageBracket, margin, contentWidth, contentHeight, orientation);
        
        // Add footer with organization info and signature line
        addPDFFooter(pdf, pageWidth, pageHeight, margin, pageIndex + 1, bracketPages.length,logoData || undefined);
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
  }, [toast, orientation, loadTkdLogo]);

  return { 
    generateBracketPDF,
    previewBracketPDF,
    orientation,
    setOrientation,
    toggleOrientation
  };
};