import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BracketMatch } from "@shared/schema";
import { jsPDF } from "jspdf";
import tkdLogo from '@/assets/tkd_logo.png';

export type PDFOrientation = "landscape" | "portrait";

export interface PDFGenOptions {
  tournamentHeader: string;
  organizedBy: string;
  fileName: string;
  pdfOrientation?: PDFOrientation;
  noColorMode?: boolean;
  lineViewMode?: boolean; // Added lineViewMode
  hideBye?: boolean; // Added hideBye option
}

interface PaginatedBracket {
  pages: BracketMatch[][][];
  isFinalsPage: boolean[]; // True if the page is the "Finals" page
  pageTitles: string[];
  overallTournamentRounds: number; // Total rounds in the entire tournament
  firstRoundIndexOnPage: number[]; // The 0-based global index of this page's first round
}

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
function getRoundName(
  roundIndexOnPage: number,          // 0-indexed for the current page's rounds
  overallTournamentRounds: number,   // Total rounds in the entire tournament
  firstRoundIndexOnThisPage: number, // 0-indexed global round number that corresponds to roundIndexOnPage = 0
  isSegmentPage: boolean             // True if this page is a segment of a multi-page layout (not finals, not single page)
): string {
  if (isSegmentPage) {
    // For segment pages (e.g., Pool A, Pool B of a multi-page bracket),
    // always display "Round 1", "Round 2", etc., relative to the segment.
    return `Round ${roundIndexOnPage + 1}`;
  } else {
    // For Finals pages of a multi-page bracket, or for single-page brackets,
    // use special names based on the overall tournament structure.
    const globalRoundIndex = firstRoundIndexOnThisPage + roundIndexOnPage;
    const roundsFromEnd = overallTournamentRounds - globalRoundIndex - 1;
    switch (roundsFromEnd) {
      case 0:
        return "Final";
      case 1:
        return "Semi Finals";
      case 2:
        return "Quarter Finals";
      default:
        // For rounds on the finals page or single page that are not QF, SF, F
        return `Round ${globalRoundIndex + 1}`;
    }
  }
}

/**
 * Get background color for round labels - Using Indian flag color scheme
 */
function getRoundLabelColor(roundIndexOnPage: number, totalRoundsOnPage: number, noColorMode = false): { bg?: number[], text: number[], border: number[] } {
  if (noColorMode) {
    return {
      text: [0, 0, 0],       // Black text
      border: [150, 150, 150], // Gray border
      bg: [255, 255, 255]    // White background
    };
  }

  const roundsFromEndOnPage = totalRoundsOnPage - roundIndexOnPage - 1;

  switch (roundsFromEndOnPage) {
    case 0: // Last round on this page
      return {
        bg: [144, 248, 144], // Light green background (Finals color)
        text: [4, 106, 56],    // India green text
        border: [0, 100, 0],   // Dark green border
      };
    case 1: // Second to last round on this page
      return {
        bg: [255, 255, 255],  // Smoky white background (Semi-Finals color)
        text: [0, 0, 128],    // Navy blue text (for Ashoka Chakra)
        border: [200, 200, 200], // Light gray border
      };
    case 2: // Third to last round on this page
      return {
        bg: [255, 231, 171],   // Light saffron background (Quarter-Finals color)
        text: [255, 103, 31],  // Deep saffron text
        border: [204, 82, 0],  // Darker saffron border
      };
    default: // All other rounds on this page
      return {
        bg: [220, 220, 220],   // Consistent light gray for other rounds
        text: [50, 50, 50],     // Dark gray text
        border: [180, 180, 180] // Slightly darker gray border
      };
  }
}

/**
 * Split large brackets into pages of 16 brackets each
 * This allows us to fit 32 players per page
 */
function splitBracketForPagination(bracketData: BracketMatch[][], participantCount: number, baseTitle: string): PaginatedBracket {
  const MAX_PLAYERS_PER_STANDARD_PAGE = 32; 
  const MAX_ROUNDS_FOR_SINGLE_PAGE_LAYOUT = 5; 

  const numOverallRounds = bracketData.length > 0 ? bracketData.length : (participantCount > 0 ? Math.ceil(Math.log2(participantCount)) : 0);

  if (numOverallRounds === 0) {
    return { pages: [], isFinalsPage: [], pageTitles: [], overallTournamentRounds: 0, firstRoundIndexOnPage: [] };
  }

  if (participantCount <= MAX_PLAYERS_PER_STANDARD_PAGE || numOverallRounds <= MAX_ROUNDS_FOR_SINGLE_PAGE_LAYOUT) {
    return {
      pages: [bracketData],
      isFinalsPage: [false],
      pageTitles: [baseTitle],
      overallTournamentRounds: numOverallRounds,
      firstRoundIndexOnPage: [0]
    };
  }

  let roundsOnSegmentPages = 4;
  let roundsOnFinalsPage = numOverallRounds - roundsOnSegmentPages;

  if (numOverallRounds <= roundsOnSegmentPages) { // Should not happen if previous check is correct
      return {
          pages: [bracketData],
          isFinalsPage: [false],
          pageTitles: [baseTitle],
          overallTournamentRounds: numOverallRounds,
          firstRoundIndexOnPage: [0]
      };
  }

  const paginatedResult: PaginatedBracket = {
    pages: [],
    isFinalsPage: [],
    pageTitles: [],
    overallTournamentRounds: numOverallRounds,
    firstRoundIndexOnPage: []
  };

  const MATCHES_PER_SEGMENT_FIRST_ROUND = 16;
  const numberOfSegments = Math.ceil(participantCount / MAX_PLAYERS_PER_STANDARD_PAGE);

  if (roundsOnSegmentPages > 0) {
    for (let i = 0; i < numberOfSegments; i++) {
      const segmentStartIndex = i * MATCHES_PER_SEGMENT_FIRST_ROUND;
      const actualDepthForSegment = Math.min(roundsOnSegmentPages, numOverallRounds);

      // Corrected call to extractMatchesForSegment:
      // It expects (bracketData, startMatchIndexInFirstRound, numMatchesInFirstRoundForSegment, depthToExtract)
      // The original `bracketData[0]` was to get the first round, but we need to pass the whole bracketData
      // and let extractMatchesForSegment handle the slicing.
      // The `numMatchesInFirstRoundForSegment` is MATCHES_PER_SEGMENT_FIRST_ROUND.
      const segmentBracketData = extractMatchesForSegment(
        bracketData, // Pass the whole bracket
        segmentStartIndex,
        MATCHES_PER_SEGMENT_FIRST_ROUND,
        actualDepthForSegment
      );
      if (segmentBracketData.length > 0) {
        paginatedResult.pages.push(segmentBracketData);
        paginatedResult.isFinalsPage.push(false);
        paginatedResult.pageTitles.push(`${baseTitle} - Pool ${String.fromCharCode(65 + i)}`);
        paginatedResult.firstRoundIndexOnPage.push(0); // Segments always display starting from global round 0 perspective
      }
    }
  }

  if (roundsOnFinalsPage > 0 && numOverallRounds > roundsOnSegmentPages) {
    const finalsBracketData: BracketMatch[][] = [];
    const firstRoundIndexForFinals = roundsOnSegmentPages;

    for (let r = firstRoundIndexForFinals; r < numOverallRounds; r++) {
      if (bracketData[r]) { 
         finalsBracketData.push(bracketData[r]);
      }
    }
    if (finalsBracketData.length > 0) {
      paginatedResult.pages.push(finalsBracketData);
      paginatedResult.isFinalsPage.push(true);
      paginatedResult.pageTitles.push(`${baseTitle} - Finals`);
      paginatedResult.firstRoundIndexOnPage.push(firstRoundIndexForFinals);
    }
  }

  if (paginatedResult.pages.length === 0 && bracketData.length > 0) {
      paginatedResult.pages.push(bracketData);
      paginatedResult.isFinalsPage.push(false); 
      paginatedResult.pageTitles.push(baseTitle);
      paginatedResult.overallTournamentRounds = numOverallRounds; // Already set, but ensure consistency
      paginatedResult.firstRoundIndexOnPage.push(0);
  }
  
  return paginatedResult;
}

/**
 * Extracts a segment of the bracket.
 * @param fullBracketData The complete bracket data for the entire tournament.
 * @param startMatchIndexInFirstRound The index of the first match in the *overall first round* that this segment should start from.
 * @param numMatchesInFirstRoundForSegment The number of matches from the *overall first round* that belong to this segment.
 * @param depthToExtract The number of rounds to extract for this segment.
 */
function extractMatchesForSegment(
  fullBracketData: BracketMatch[][],
  startMatchIndexInFirstRound: number,
  numMatchesInFirstRoundForSegment: number,
  depthToExtract: number
): BracketMatch[][] {
  const segmentBracket: BracketMatch[][] = [];
  const MAX_ROUNDS_PER_SEGMENT_PAGE = 5;

  if (!fullBracketData || fullBracketData.length === 0) return [];

  // Get the initial set of matches for this segment's first round
  const firstRoundSegmentMatches = fullBracketData[0].slice(startMatchIndexInFirstRound, startMatchIndexInFirstRound + numMatchesInFirstRoundForSegment);
  if (firstRoundSegmentMatches.length === 0) return [];

  segmentBracket.push(firstRoundSegmentMatches);
  const processedMatchIds = new Set<string>(firstRoundSegmentMatches.map(m => m.id));

  for (let r = 0; r < MAX_ROUNDS_PER_SEGMENT_PAGE -1; r++) {
    if (r + 1 >= fullBracketData.length) break; // Original bracket is shorter than 5 rounds

    const nextRoundMatchesInSegment: BracketMatch[] = [];
    const currentRoundInSegment = segmentBracket[r];

    for (const currentMatch of currentRoundInSegment) {
      if (currentMatch.nextMatchId) {
        // Find the next match in the full bracket data
        const nextMatchInFullBracket = fullBracketData[r + 1].find(m => m.id === currentMatch.nextMatchId);
        if (nextMatchInFullBracket && !processedMatchIds.has(nextMatchInFullBracket.id)) {
          nextRoundMatchesInSegment.push(nextMatchInFullBracket);
          processedMatchIds.add(nextMatchInFullBracket.id);
        } else if (nextMatchInFullBracket && processedMatchIds.has(nextMatchInFullBracket.id)) {
          // If already added (e.g. two matches from current round feed into one in next)
          // ensure it's in the list if not already by another path
          if (!nextRoundMatchesInSegment.some(m => m.id === nextMatchInFullBracket.id)) {
            // This case should ideally be handled by ensuring each match is unique in the round
            // For safety, let's check, but primary logic relies on finding unique nextMatchId targets
          }
        }
      }
    }
    if (nextRoundMatchesInSegment.length > 0) {
      // Ensure unique matches in the round before pushing
      const uniqueNextRoundMatches = Array.from(new Map(nextRoundMatchesInSegment.map(m => [m.id, m])).values());
      segmentBracket.push(uniqueNextRoundMatches);
    } else {
      break; // No more matches to trace for this segment
    }
  }
  return segmentBracket;
}

/**
 * Adds footer with organization info, copyright, and judge signature to the PDF
 */
function addPDFFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, margin: number, pageNumber: number, totalPages: number, organizedBy: string, tkdLogoBase64?: string) {
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
      pdf.text("WT", logoX, logoY + 8);
    }
  } else {
    // Text-only logo fallback
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("WT", logoX, logoY + 8);
  }
  
  // Organization info (left side)
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.text(organizedBy, logoX + logoWidth + 3, logoY + 5);
  
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
function addPlacementBox(pdf: jsPDF, pageWidth: number, pageHeight: number, margin: number, noColorMode = false) {
  // Position box at bottom of page above the separator line
  const boxWidth = 60; // Increased width for noting names
  const boxHeight = 40;
  const boxY = pageHeight - 18 - boxHeight; // Place above footer area
  const boxX = pageWidth - margin - boxWidth;
  
  // Draw the main box with rounded corners
  pdf.setDrawColor(100, 100, 100);
  if (noColorMode) {
    pdf.setFillColor(255, 255, 255); // White background for no-color mode
  } else {
    pdf.setFillColor(250, 250, 250); // Default light gray background
  }
  pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');
  
  // Title
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(noColorMode ? 0 : 80, noColorMode ? 0 : 80, noColorMode ? 0 : 80); // Black text for no-color
  pdf.text("PLACEMENTS", boxX + (boxWidth / 2), boxY + 5, { align: "center" });
  
  // Create 4 sections inside the box
  const sectionHeight = 8;
  const textX = boxX + 4;
  
  const placements = [
    { label: "1st (Gold):", color: [150, 120, 0], bgColor: [255, 240, 180] },
    { label: "2nd (Silver):", color: [100, 100, 100], bgColor: [230, 230, 230] },
    { label: "3rd (Bronze):", color: [150, 90, 50], bgColor: [230, 200, 170] },
    { label: "4th (Bronze):", color: [150, 90, 50], bgColor: [230, 200, 170] },
  ];

  placements.forEach((placement, i) => {
    if (!noColorMode) {
      pdf.setFillColor(placement.bgColor[0], placement.bgColor[1], placement.bgColor[2]);
      pdf.rect(boxX + 1, boxY + 7 + (sectionHeight * i), boxWidth - 2, sectionHeight, 'F');
      pdf.setTextColor(placement.color[0], placement.color[1], placement.color[2]);
    } else {
      pdf.setTextColor(0,0,0); // Black text for no-color mode
      // Optionally draw a border for sections in no-color mode
      pdf.setDrawColor(180, 180, 180);
      pdf.rect(boxX + 1, boxY + 7 + (sectionHeight * i), boxWidth - 2, sectionHeight, 'D'); 
    }
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");
    pdf.text(placement.label, textX, boxY + 12 + (sectionHeight * i));
  });
  
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
      img.crossOrigin="ananymus";
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
      img.src = tkdLogo || '/src/assets/tkd_logo.png';
      
      // Try alternate path if the first one fails
      setTimeout(() => {
        if (!img.complete) {
          // img.src = './src/assets/tkd_logo.png';
          img.src = tkdLogo;
        }
      }, 500);
    });
  }, [tkdLogoBase64]);

  /**
   * Generate a PDF with a visual tournament bracket
   */
  const generateBracketPDF = useCallback(async (
    bracketData: BracketMatch[][],
    title: string, 
    participantCount: number, 
    options: Partial<PDFGenOptions> = {}
  ) => {
    console.log("Generating PDF with options:", options);
    
    try {
      const logoData = await loadTkdLogo();
      const finalOrientation = options.pdfOrientation || orientation;
      const organizedByText = options.organizedBy || "Professional TKD Academy";
      const finalFileName = options.fileName || `${title.replace(/\\s+/g, '_')}.pdf`;
      const noColor = !!options.noColorMode;
      const lineView = !!options.lineViewMode;

      const currentDate = formatDate(new Date());
      
      const allMatchSequentialIds = new Map<string, number>();
      let globalMatchCounter = 1;
      bracketData.forEach(round => {
        round.forEach(match => {
          allMatchSequentialIds.set(match.id, globalMatchCounter++);
        });
      });
      
      const paginatedBracket = splitBracketForPagination(bracketData, participantCount, title);
      
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
      
      const isOverallBracketSinglePage = paginatedBracket.pages.length === 1;
      
      // Generate each page
      paginatedBracket.pages.forEach((pageBracketData: BracketMatch[][], pageIndex: number) => {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const matchSequentialIdsForPage = new Map<string, number>();
        pageBracketData.forEach(round => {
          round.forEach(match => {
            const seqId = allMatchSequentialIds.get(match.id);
            if (seqId !== undefined) {
              matchSequentialIdsForPage.set(match.id, seqId);
            }
          });
        });

        const currentPageTitle = paginatedBracket.pageTitles[pageIndex] || title;
        const isCurrentPageFinals = paginatedBracket.isFinalsPage[pageIndex];
        const currentOverallTournamentRounds = paginatedBracket.overallTournamentRounds;
        const currentFirstRoundIndexOnPage = paginatedBracket.firstRoundIndexOnPage[pageIndex] !== undefined
                                              ? paginatedBracket.firstRoundIndexOnPage[pageIndex]
                                              : 0;
        const isSegmentPageForRoundNaming = !isCurrentPageFinals && !isOverallBracketSinglePage;

        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(currentPageTitle, pageWidth / 2, margin + 5, { align: "center" });
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        
        // Add participant count on right side
        pdf.text(`Participants: ${participantCount}`, pageWidth - margin - 40, margin + 5, { align: "right" });
        
        // Add date on left side
        pdf.text(`Date: ${currentDate}`, margin, margin + 5);
        
        // Add page indicator if multiple pages
        if (paginatedBracket.pages.length > 1) {
          pdf.setFontSize(9);
          pdf.text(`Page ${pageIndex + 1} of ${paginatedBracket.pages.length}`, pageWidth / 2, margin + 12, { align: "center" });
          
          // Add bracket range description - this might need adjustment for segmented brackets
          // For now, let's keep it simple or conditional
          if (!isCurrentPageFinals) {
            const playersOnThisPage = pageBracketData[0] ? pageBracketData[0].length * 2 : 0; // Approx
            pdf.setFont("helvetica", "italic");
            // pdf.text(`Displaying segment for up to ${playersOnThisPage} players`, pageWidth / 2, margin + 17, { align: "center" });
            pdf.setFont("helvetica", "normal");
          } else {
            pdf.setFont("helvetica", "italic");
            pdf.text(`Final Playoff Rounds`, pageWidth / 2, margin + 17, { align: "center" });
            pdf.setFont("helvetica", "normal");
          }
        }
        
        // Add placement box to every page
        addPlacementBox(pdf, pageWidth, pageHeight, margin, noColor);        // Draw the bracket with visual style matching BracketDisplay component
        renderBracket(
          pdf,
          pageBracketData,
          margin,
          contentWidth,
          contentHeight,
          finalOrientation,
          noColor,
          lineView,
          isCurrentPageFinals, 
          currentOverallTournamentRounds,
          currentFirstRoundIndexOnPage,
          isSegmentPageForRoundNaming, 
          matchSequentialIdsForPage,
          !!options.hideBye
        );

        // Add footer with organization info and signature line
        addPDFFooter(pdf, pageWidth, pageHeight, margin, pageIndex + 1, paginatedBracket.pages.length, organizedByText, logoData || undefined);
      });
      
      // Save the PDF
      pdf.save(finalFileName);
      
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
   */  const renderBracket = (
    pdfDoc: jsPDF, 
    bracketData: BracketMatch[][],
    margin: number,
    contentWidth: number,
    contentHeight: number,
    currentOrientation: PDFOrientation, 
    noColorMode = false,
    lineViewMode = false,
    isFinalsPage = false, 
    overallTournamentRounds: number, 
    firstRoundIndexOnThisPage: number, 
    isSegmentPage: boolean, 
    matchSequentialIds?: Map<string, number>,
    hideBye = false
  ) => {    const CONNECTOR_HORIZONTAL_MARGIN = 5; 
    const pageWidth = pdfDoc.internal.pageSize.getWidth(); 
    const pageHeight = pdfDoc.internal.pageSize.getHeight(); 
    
    const roundCount = bracketData.length;
    
    // Helper function to check if a match involves a bye
    const isByeMatch = (match: BracketMatch): boolean => {
      return match.participants[0] === "(bye)" || match.participants[1] === "(bye)";
    };
    
    let dynamicRoundWidth = contentWidth / roundCount;
    if (isFinalsPage && roundCount < 3 && roundCount > 0) { 
        dynamicRoundWidth = contentWidth / Math.max(roundCount, 2); 
    }

    const matchWidthProportion = 0.75; 
    const roundWidth = dynamicRoundWidth; 
    
    const baseMatchDisplayWidth = isFinalsPage ? roundWidth * 0.9 : roundWidth * matchWidthProportion;
    
    const matchWidth = (currentOrientation === 'landscape' 
      ? Math.min(lineViewMode ? 70 : 55, baseMatchDisplayWidth) 
      : Math.min(lineViewMode ? 65 : 50, baseMatchDisplayWidth)); 
    
    const matchHeight = currentOrientation === 'landscape' ? 8 : 8; 
    
    const startY = currentOrientation === 'portrait' 
      ? margin + 23  
      : margin + 25; 
    
    const blockWidthPdf = 3; 
    
    pdfDoc.setDrawColor(150, 150, 150); 
    pdfDoc.setLineWidth(0.5); 
    pdfDoc.line(margin, startY - 18, pageWidth - margin, startY - 18); 
    
    pdfDoc.setFontSize(currentOrientation === 'portrait' ? 8 : 9); 
    
    bracketData.forEach((round, roundIndex) => { 
      const roundX = margin + (roundIndex * roundWidth) + (matchWidth / 2);
      const roundName = getRoundName(
        roundIndex, 
        overallTournamentRounds,
        firstRoundIndexOnThisPage,
        isSegmentPage 
      );
      
      const roundsOnThisPage = bracketData.length;
      const colors = getRoundLabelColor(roundIndex, roundsOnThisPage, noColorMode);
      
      const labelWidth = currentOrientation === 'portrait' ? 28 : 32; 
      const labelHeight = currentOrientation === 'portrait' ? 6 : 7;  
      const labelX = roundX - (labelWidth / 2);
      const labelY = startY - 16; 
      
      if (colors.bg) { 
        pdfDoc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]); 
      } else {
        pdfDoc.setFillColor(255, 255, 255); 
      }
      pdfDoc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]); 
      pdfDoc.roundedRect(labelX, labelY, labelWidth, labelHeight, 2, 2, 'FD'); 
      
      pdfDoc.setTextColor(colors.text[0], colors.text[1], colors.text[2]); 
      pdfDoc.setFont("helvetica", "bold"); 
      pdfDoc.text(roundName, roundX, startY - 11.5, { align: "center" }); 
    });
    
    pdfDoc.setTextColor(30, 30, 30); 
    
    const matchPositions = calculateMatchPositions(
      bracketData,
      startY-7,
      matchHeight,
      roundWidth, 
      margin,
      currentOrientation 
    );
      bracketData.forEach((round, roundIndex) => {
      round.forEach((match, matchIndex) => {
        const matchPosition = matchPositions[roundIndex].find(m => m.id === match.id);
        if (!matchPosition) return;
        
        const roundX = matchPosition.x;
        const matchY = matchPosition.y;

        // Skip rendering bye matches if hideBye is enabled
        if (hideBye && isByeMatch(match)) {
          return; // Skip drawing this match entirely but maintain positioning
        }

        if (matchSequentialIds) {
          const currentMatchSeqId = matchSequentialIds.get(match.id);
          if (currentMatchSeqId !== undefined) {
            const idText = `M${currentMatchSeqId}`;
            pdfDoc.setFontSize(6); 
            pdfDoc.setTextColor(128, 128, 128); 
            pdfDoc.setFont("helvetica", "normal"); 
            pdfDoc.text(idText, roundX + matchWidth + 1, matchY + (matchHeight / 2) + 1.5); 
            pdfDoc.setTextColor(30, 30, 30); 
          }
        }

        if (lineViewMode && roundIndex > 0) {
          const lineViewMatchRepresentationWidth = matchWidth; // Occupy full conceptual width
          const lineViewMatchX = matchPosition.x;
          const lineViewMatchY = matchPosition.y + (matchHeight / 2); // Vertical center of the match slot
          
          pdfDoc.setDrawColor(150, 150, 150); // Use pdfDoc
          pdfDoc.setLineWidth(0.3); // Use pdfDoc
          pdfDoc.line(lineViewMatchX, lineViewMatchY, lineViewMatchX + lineViewMatchRepresentationWidth, lineViewMatchY); // Use pdfDoc
          
          // Skip drawing the full match box, participants, etc.
          return; 
        }
        
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
        pdfDoc.setDrawColor(200, 200, 200); // Use pdfDoc
        pdfDoc.setFillColor(255, 255, 255); // Use pdfDoc
        pdfDoc.roundedRect(roundX, matchY, matchWidth, matchHeight, 1, 1, 'FD'); // Use pdfDoc
        
        // Draw participant 1
        const participant1 = match.participants[0] || "";
        const text1 = participant1 === "(bye)" ? "(bye)" : participant1;
        
        if (noColorMode) {
            const participantTextStartX = roundX + blockWidthPdf + 2;
            // const participantNameBgX = roundX + blockWidthPdf; // Unused
            // const participantNameBgWidth = matchWidth - blockWidthPdf; // Unused

            if (participant1 === "(bye)") {
                pdfDoc.setFillColor(240, 240, 240);  // Use pdfDoc
                pdfDoc.rect(roundX, matchY, matchWidth, matchHeight / 2, 'F'); // Use pdfDoc
                pdfDoc.setTextColor(150, 150, 150);  // Use pdfDoc
            } else {
                pdfDoc.setFillColor(59, 130, 246);  // Use pdfDoc
                pdfDoc.rect(roundX, matchY, blockWidthPdf, matchHeight / 2, 'F'); // Use pdfDoc
                
                const originalFontSize = pdfDoc.getFontSize(); // Use pdfDoc
                const originalFont = pdfDoc.getFont(); // Use pdfDoc
                pdfDoc.setFontSize(6);  // Use pdfDoc
                pdfDoc.setFont("helvetica", "bold"); // Use pdfDoc
                pdfDoc.setTextColor(255, 255, 255);  // Use pdfDoc
                pdfDoc.text("B", roundX + blockWidthPdf / 2, matchY + (matchHeight / 4) + 1.5, { align: "center" }); // Use pdfDoc
                pdfDoc.setFontSize(originalFontSize); // Use pdfDoc
                pdfDoc.setFont(originalFont.fontName, originalFont.fontStyle); // Use pdfDoc


                pdfDoc.setFillColor(255, 255, 255); // Use pdfDoc
                // pdfDoc.rect(participantNameBgX, matchY, participantNameBgWidth, matchHeight / 2, 'F'); // This line was causing a visual bug
                pdfDoc.setTextColor(0, 0, 0); // Use pdfDoc
            }
        } else {
            // Existing color logic for Participant 1
            if (participant1 === "(bye)") {
              pdfDoc.setFillColor(240, 240, 240); // Use pdfDoc
              pdfDoc.rect(roundX, matchY, matchWidth, matchHeight/2, 'F');  // Use pdfDoc
              pdfDoc.setDrawColor(0, 180, 0); // Use pdfDoc
              pdfDoc.line(roundX, matchY, roundX, matchY + matchHeight/2); // Use pdfDoc
            } else if (hasOpponentByeTop || hasMatchByeTop) {
              pdfDoc.setFillColor(240, 255, 240); // Use pdfDoc
              pdfDoc.rect(roundX, matchY, matchWidth, matchHeight/2, 'F'); // Use pdfDoc
              pdfDoc.setDrawColor(0, 180, 0); // Use pdfDoc
              pdfDoc.line(roundX, matchY, roundX, matchY + matchHeight/2); // Use pdfDoc
            } else {
              pdfDoc.setFillColor(240, 245, 255);  // Use pdfDoc
              pdfDoc.rect(roundX, matchY, matchWidth, matchHeight/2, 'F'); // Use pdfDoc
              pdfDoc.setDrawColor(30, 120, 255);  // Use pdfDoc
              pdfDoc.line(roundX, matchY, roundX, matchY + matchHeight/2); // Use pdfDoc
            }
            pdfDoc.setTextColor(30, 30, 30); // Use pdfDoc
        }
        pdfDoc.setDrawColor(200, 200, 200); // Use pdfDoc

        pdfDoc.setFontSize(6.5); // Use pdfDoc
        if (match.winner === participant1 && participant1 !== "(bye)") {
          pdfDoc.setFont("helvetica", "bold"); // Use pdfDoc
        } else {
          pdfDoc.setFont("helvetica", "normal"); // Use pdfDoc
        }
        
        let displayText1 = text1;
        const availableTextWidth1 = (noColorMode && participant1 !== "(bye)") 
                                  ? matchWidth - blockWidthPdf - 2 - 2 
                                  : matchWidth - 4; 
        
        const ellipsis = "...";
        const ellipsisWidth = pdfDoc.getTextWidth(ellipsis); // Use pdfDoc

        if (pdfDoc.getTextWidth(displayText1) > availableTextWidth1) { // Use pdfDoc
            if (availableTextWidth1 <= ellipsisWidth && availableTextWidth1 > 0) {
                let tempText = displayText1;
                 while(pdfDoc.getTextWidth(tempText) > availableTextWidth1 && tempText.length > 0) { // Use pdfDoc
                    tempText = tempText.substring(0, tempText.length - 1);
                 }
                 displayText1 = tempText;
            } else if (availableTextWidth1 > ellipsisWidth) {
                let newText = displayText1;
                while (pdfDoc.getTextWidth(newText + ellipsis) > availableTextWidth1 && newText.length > 0) { // Use pdfDoc
                    newText = newText.substring(0, newText.length - 1);
                }
                displayText1 = newText + ellipsis;
            } else { 
                displayText1 = "";
            }
        }

        const textX1 = (noColorMode && participant1 !== "(bye)") ? (roundX + blockWidthPdf + 2) : (roundX + 2);
        pdfDoc.text(displayText1, textX1, matchY + (matchHeight / 4) + 1); // Use pdfDoc
        
        // Draw divider line
        pdfDoc.setDrawColor(200, 200, 200); // Use pdfDoc
        pdfDoc.line(roundX, matchY + matchHeight/2, roundX + matchWidth, matchY + matchHeight/2); // Use pdfDoc
        
        // Draw participant 2
        const participant2 = match.participants[1] || "";
        const text2 = participant2 === "(bye)" ? "(bye)" : participant2;
        
        if (noColorMode) {
            const participantTextStartX = roundX + blockWidthPdf + 2;
            // const participantNameBgX = roundX + blockWidthPdf; // Unused
            // const participantNameBgWidth = matchWidth - blockWidthPdf; // Unused

            if (participant2 === "(bye)") {
                pdfDoc.setFillColor(240, 240, 240); // Use pdfDoc
                pdfDoc.rect(roundX, matchY + matchHeight / 2, matchWidth, matchHeight / 2, 'F'); // Use pdfDoc
                pdfDoc.setTextColor(150, 150, 150); // Use pdfDoc
            } else {
                pdfDoc.setFillColor(239, 68, 68);  // Use pdfDoc
                pdfDoc.rect(roundX, matchY + matchHeight / 2, blockWidthPdf, matchHeight / 2, 'F'); // Use pdfDoc

                const originalFontSize = pdfDoc.getFontSize(); // Use pdfDoc
                const originalFont = pdfDoc.getFont(); // Use pdfDoc
                pdfDoc.setFontSize(6); // Use pdfDoc
                pdfDoc.setFont("helvetica", "bold"); // Use pdfDoc
                pdfDoc.setTextColor(255, 255, 255); // Use pdfDoc
                pdfDoc.text("R", roundX + blockWidthPdf / 2, matchY + (matchHeight * 3/4) + 1.5, { align: "center" }); // Use pdfDoc
                pdfDoc.setFontSize(originalFontSize); // Use pdfDoc
                pdfDoc.setFont(originalFont.fontName, originalFont.fontStyle); // Use pdfDoc

                pdfDoc.setFillColor(255, 255, 255); // Use pdfDoc
                // pdfDoc.rect(participantNameBgX, matchY + matchHeight / 2, participantNameBgWidth, matchHeight / 2, 'F'); // This line was causing a visual bug
                pdfDoc.setTextColor(0, 0, 0); // Use pdfDoc
            }
        } else {
            // Existing color logic for Participant 2
            if (participant2 === "(bye)") {
              pdfDoc.setFillColor(240, 240, 240); // Use pdfDoc
              pdfDoc.rect(roundX, matchY + matchHeight/2, matchWidth, matchHeight/2, 'F'); // Use pdfDoc
              pdfDoc.setDrawColor(0, 180, 0); // Use pdfDoc
              pdfDoc.line(roundX, matchY + matchHeight/2, roundX, matchY + matchHeight); // Use pdfDoc
            } else if (hasOpponentByeBottom || hasMatchByeBottom) {
              pdfDoc.setFillColor(240, 255, 240); // Use pdfDoc
              pdfDoc.rect(roundX, matchY + matchHeight/2, matchWidth, matchHeight/2, 'F'); // Use pdfDoc
              pdfDoc.setDrawColor(0, 180, 0); // Use pdfDoc
              pdfDoc.line(roundX, matchY + matchHeight/2, roundX, matchY + matchHeight); // Use pdfDoc
            } else {
              pdfDoc.setFillColor(255, 245, 245);  // Use pdfDoc
              pdfDoc.rect(roundX, matchY + matchHeight/2, matchWidth, matchHeight/2, 'F'); // Use pdfDoc
              pdfDoc.setDrawColor(255, 70, 70);  // Use pdfDoc
              pdfDoc.line(roundX, matchY + matchHeight/2, roundX, matchY + matchHeight); // Use pdfDoc
            }
            pdfDoc.setTextColor(30, 30, 30); // Use pdfDoc
        }
        pdfDoc.setDrawColor(200, 200, 200); // Use pdfDoc

        pdfDoc.setFontSize(6.5); // Use pdfDoc
        if (match.winner === participant2 && participant2 !== "(bye)") {
          pdfDoc.setFont("helvetica", "bold"); // Use pdfDoc
        } else {
          pdfDoc.setFont("helvetica", "normal"); // Use pdfDoc
        }
        
        let displayText2 = text2;
        const availableTextWidth2 = (noColorMode && participant2 !== "(bye)")
                                  ? matchWidth - blockWidthPdf - 2 - 2
                                  : matchWidth - 4;

        if (pdfDoc.getTextWidth(displayText2) > availableTextWidth2) {
            if (availableTextWidth2 <= ellipsisWidth && availableTextWidth2 > 0) {
                 let tempText = displayText2;
                 while(pdfDoc.getTextWidth(tempText) > availableTextWidth2 && tempText.length > 0) {
                    tempText = tempText.substring(0, tempText.length - 1);
                 }
                 displayText2 = tempText;
            } else if (availableTextWidth2 > ellipsisWidth) {
                let newText = displayText2;
                while (pdfDoc.getTextWidth(newText + ellipsis) > availableTextWidth2 && newText.length > 0) {
                    newText = newText.substring(0, newText.length - 1);
                }
                displayText2 = newText + ellipsis;
            } else {
                displayText2 = "";
            }
        }

        const textX2 = (noColorMode && participant2 !== "(bye)") ? (roundX + blockWidthPdf + 2) : (roundX + 2);
        pdfDoc.text(displayText2, textX2, matchY + (matchHeight * 3/4) + 1); // Use pdfDoc
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
            // Get the actual match data to check for byes
            const currentMatchData = bracketData[roundIndex].find(m => m.id === match.id);
            const nextMatchData = bracketData[roundIndex + 1].find(m => m.id === nextMatch.id);
            
            // Skip drawing connectors if hideBye is enabled and either match involves a bye
            if (hideBye && (
              (currentMatchData && isByeMatch(currentMatchData)) || 
              (nextMatchData && isByeMatch(nextMatchData))
            )) {
              return; // Skip drawing this connector
            }
            
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
            pdfDoc.setDrawColor(150, 150, 150);
            pdfDoc.setLineWidth(0.2);
            
            // Horizontal line from current match
            pdfDoc.line(startX, startY, midX, startY);
            
            // Vertical connector
            pdfDoc.line(midX, startY, midX, endY);
            
            // Horizontal line to next match
            pdfDoc.line(midX, endY, endX, endY);
          }
        }
      });
    }
    
    // If this is the final round, add Winner label to the champion
    const finalRound = bracketData[bracketData.length - 1];
    if (finalRound && finalRound.length === 1 && finalRound[0].winner) {
      const finalMatch = finalRound[0];
      // const winner = finalMatch.winner; // Not strictly needed if we might skip drawing
      const finalMatchPos = matchPositions[matchPositions.length - 1][0];
      
      if (finalMatchPos) {
        // Determine if the final round on this page should be rendered as a line
        // (i.e., lineViewMode is on AND the final round is not the first round of this page's bracketData)
        const isFinalRoundAsLine = lineViewMode && (bracketData.length - 1 > 0);

        if (!isFinalRoundAsLine) {
          let badgeBg = [100, 100, 255]; 
          let badgeBorder = [80, 80, 200]; 
          let badgeText = [255, 255, 255]; 

          if (noColorMode) {
              badgeBg = [230, 230, 230]; 
              badgeBorder = [0, 0, 0];   
              badgeText = [0, 0, 0];     
          }

          pdfDoc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
          pdfDoc.setDrawColor(badgeBorder[0], badgeBorder[1], badgeBorder[2]);
          pdfDoc.roundedRect(
            finalMatchPos.x + matchWidth + 2, 
            finalMatchPos.y + (finalMatchPos.height / 2) - 3, 
            20, 
            6, 
            2, 
            2, 
            'FD'
          );
          
          pdfDoc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
          pdfDoc.setFontSize(7);
          pdfDoc.setFont("helvetica", "bold");
          pdfDoc.text(
            "WINNER", 
            finalMatchPos.x + matchWidth + 12, 
            finalMatchPos.y + (finalMatchPos.height / 2) + 1, 
            { align: "center" }
          );
        }
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

  /**
   * Preview the PDF before downloading
   */
  const previewBracketPDF = useCallback(async (
    bracketData: BracketMatch[][],
    title = "Tournament Bracket",
    participantCount: number = 0,
    options: Partial<PDFGenOptions> = {}
  ) => {
    try {
      const logoData = await loadTkdLogo();
      const finalOrientation = options.pdfOrientation || orientation;
      const organizedByText = options.organizedBy || "Professional TKD Academy";
      const noColor = !!options.noColorMode;
      const lineView = !!options.lineViewMode;

      const currentDate = formatDate(new Date());

      // Generate sequential IDs for ALL matches in the entire bracketData for preview
      const allMatchSequentialIdsPreview = new Map<string, number>();
      let globalMatchCounterPreview = 1;
      bracketData.forEach(round => {
        round.forEach(match => {
          allMatchSequentialIdsPreview.set(match.id, globalMatchCounterPreview++);
        });
      });

      const paginatedBracket = splitBracketForPagination(bracketData, participantCount, title);

      const pdf = new jsPDF({
        orientation: finalOrientation,
        unit: "mm",
        format: "a4"
      });

      const isOverallBracketSinglePage = paginatedBracket.pages.length === 1;

      // Generate each page for preview
      paginatedBracket.pages.forEach((pageBracketData: BracketMatch[][], pageIndex: number) => {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // Create a map of sequential IDs for matches on the current page for preview
        const matchSequentialIdsForPage = new Map<string, number>();
        pageBracketData.forEach(round => {
          round.forEach(match => {
            const seqId = allMatchSequentialIdsPreview.get(match.id); // Use allMatchSequentialIdsPreview
            if (seqId !== undefined) {
              matchSequentialIdsForPage.set(match.id, seqId);
            }
          });
        });

        const currentPageTitle = paginatedBracket.pageTitles[pageIndex] || title;
        const isCurrentPageFinals = paginatedBracket.isFinalsPage[pageIndex] || false;
        const currentOverallTournamentRounds = paginatedBracket.overallTournamentRounds;
        const currentFirstRoundIndexOnPage = paginatedBracket.firstRoundIndexOnPage[pageIndex] !== undefined
                                              ? paginatedBracket.firstRoundIndexOnPage[pageIndex]
                                              : 0;
        const isSegmentPageForRoundNaming = !isCurrentPageFinals && !isOverallBracketSinglePage;

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);

        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(currentPageTitle, pageWidth / 2, margin + 5, { align: "center" });

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Participants: ${participantCount}`, pageWidth - margin -40, margin + 5, { align: "right" });
        pdf.text(`Date: ${currentDate}`, margin, margin + 5);

        if (paginatedBracket.pages.length > 1) {
          pdf.setFontSize(9);
          pdf.text(`Page ${pageIndex + 1} of ${paginatedBracket.pages.length}`, pageWidth / 2, margin + 12, { align: "center" });
           if (!isCurrentPageFinals) {
            pdf.setFont("helvetica", "italic");
            // pdf.text(`Displaying segment for up to 32 players`, pageWidth / 2, margin + 17, { align: "center" });
            pdf.setFont("helvetica", "normal");
          } else {
            pdf.setFont("helvetica", "italic");
            pdf.text(`Final Playoff Rounds`, pageWidth / 2, margin + 17, { align: "center" });
            pdf.setFont("helvetica", "normal");
          }
        }
          addPlacementBox(pdf, pageWidth, pageHeight, margin, noColor);
        renderBracket(
          pdf,
          pageBracketData,
          margin,
          contentWidth,
          contentHeight,
          finalOrientation,
          noColor,
          lineView,
          isCurrentPageFinals,
          currentOverallTournamentRounds,
          currentFirstRoundIndexOnPage,
          isSegmentPageForRoundNaming,
          matchSequentialIdsForPage, // Pass the sequential IDs for the current page for preview
          !!options.hideBye
        );
        addPDFFooter(pdf, pageWidth, pageHeight, margin, pageIndex + 1, paginatedBracket.pages.length, organizedByText, logoData || undefined);
      });

      const pdfDataUri = pdf.output('datauristring');
      const previewWindow = window.open();
      if (previewWindow) {
        previewWindow.document.write(`<iframe width='100%' height='100%' src='${pdfDataUri}'></iframe>`);
        previewWindow.document.title = `Preview: ${options.fileName || title}`;
      } else {
        toast({
          variant: "destructive",
          title: "Preview Error",
          description: "Failed to open preview window. Please check your browser settings.",
        });
      }
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

  // Function to toggle orientation
  const toggleOrientation = useCallback(() => {
    setOrientation(prev => prev === "landscape" ? "portrait" : "landscape");
  }, []);

  return {
    generateBracketPDF,
    previewBracketPDF,
    orientation,
    toggleOrientation, // Ensure toggleOrientation is returned
    loadTkdLogo // if it needs to be exposed
  };
};
