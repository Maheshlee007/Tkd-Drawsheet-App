import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BracketMatch } from "@shared/schema";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export type PDFOrientation = "landscape" | "portrait";

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
      
      // Add title to the document
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, pageWidth / 2, margin + 5, { align: "center" });
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Participants: ${participantCount}`, pageWidth / 2, margin + 12, { align: "center" });
      
      // Calculate rounds
      const roundCount = bracketData.length;
      
      // Handle the bracket rendering based on size
      if (participantCount > 32 || roundCount > 5) {
        // For large brackets, use a different approach - we'll render as a table with proper pages
        renderLargeBracket(pdf, bracketData, margin, contentWidth, contentHeight, participantCount, finalOrientation);
      } else {
        // For smaller brackets, render a visual bracket diagram
        renderVisualBracket(pdf, bracketData, margin, contentWidth, contentHeight, finalOrientation);
      }
      
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
   * Render a large bracket as a structured table
   */
  const renderLargeBracket = (
    pdf: jsPDF, 
    bracketData: BracketMatch[][], 
    margin: number, 
    contentWidth: number, 
    contentHeight: number,
    participantCount: number,
    orientation: PDFOrientation
  ) => {
    // Set up header for the bracket table
    const headers = bracketData.map((_, i) => `Round ${i + 1}`);
    
    // Prepare the table data structure
    const matchesInFirstRound = bracketData[0].length;
    const tableRows: any[] = [];
    
    // Generate rows for the table
    for (let i = 0; i < matchesInFirstRound; i++) {
      const row: any[] = [];
      
      // Add cells for each round
      bracketData.forEach((round, roundIndex) => {
        // Calculate which match from this round belongs in this row
        // For round 0, it's straightforward
        if (roundIndex === 0) {
          const match = round[i];
          // Display participants
          const participant1 = match.participants[0] || "TBD";
          const participant2 = match.participants[1] || "TBD";
          const winner = match.winner ? `Winner: ${match.winner}` : "";
          
          row.push({
            content: `${participant1}\nvs\n${participant2}${winner ? `\n${winner}` : ""}`,
            styles: {
              fontSize: 8,
              cellPadding: 2,
              cellWidth: contentWidth / bracketData.length
            }
          });
        } else {
          // For later rounds, we need to determine if a match should be shown in this row
          // The pattern repeats based on powers of 2
          const matchesInThisRound = round.length;
          const matchesPerRow = matchesInFirstRound / matchesInThisRound;
          
          // Check if this row should contain a match from this round
          if (i % matchesPerRow === 0) {
            const matchIndex = i / matchesPerRow;
            if (matchIndex < matchesInThisRound) {
              const match = round[matchIndex];
              const participant1 = match.participants[0] || "TBD";
              const participant2 = match.participants[1] || "TBD";
              const winner = match.winner ? `Winner: ${match.winner}` : "";
              
              row.push({
                content: `${participant1}\nvs\n${participant2}${winner ? `\n${winner}` : ""}`,
                styles: {
                  fontSize: 8,
                  cellPadding: 2,
                  rowSpan: matchesPerRow,
                  valign: 'middle',
                  halign: 'center',
                  cellWidth: contentWidth / bracketData.length
                }
              });
            } else {
              row.push({ content: "", styles: { cellWidth: contentWidth / bracketData.length } });
            }
          } else {
            // Skip cells that are part of a rowspan
            row.push({ content: "", styles: { cellWidth: contentWidth / bracketData.length } });
          }
        }
      });
      
      tableRows.push(row);
    }
    
    // Add the table to the PDF
    (pdf as any).autoTable({
      head: [headers],
      body: tableRows,
      startY: margin + 20,
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap',
        fontSize: 8,
        cellPadding: 2,
        valign: 'middle',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: contentWidth / bracketData.length }
      },
      margin: { top: margin, right: margin, bottom: margin, left: margin },
      theme: 'grid'
    });
  };
  
  /**
   * Render a visual bracket diagram for smaller tournaments
   */
  const renderVisualBracket = (
    pdf: jsPDF, 
    bracketData: BracketMatch[][], 
    margin: number, 
    contentWidth: number, 
    contentHeight: number,
    orientation: PDFOrientation
  ) => {
    // Calculate bracket layout dimensions
    const roundCount = bracketData.length;
    const roundWidth = contentWidth / roundCount;
    
    // Calculate the highest number of matches in a single round (first round)
    const matchesInFirstRound = bracketData[0].length;
    
    // Calculate match dimensions and spacing
    const totalMatches = Math.pow(2, roundCount - 1);
    const maxMatchHeight = contentHeight / matchesInFirstRound;
    const matchHeight = Math.min(10, maxMatchHeight * 0.7); // Limit match height
    const matchWidth = roundWidth * 0.7; // Leave space for connectors
    
    // Start drawing position
    const startY = margin + 20;
    
    // Draw each round
    bracketData.forEach((round, roundIndex) => {
      // Calculate x position for this round
      const roundX = margin + (roundIndex * roundWidth);
      
      // Calculate the spacing multiplier for this round
      // First round has matches evenly spaced
      // Each subsequent round doubles the spacing
      const spacingMultiplier = Math.pow(2, roundIndex);
      const baseSpacing = contentHeight / matchesInFirstRound;
      
      // Draw each match in this round
      round.forEach((match, matchIndex) => {
        // Calculate vertical position
        // In later rounds, matches need to be centered between the positions of their "child" matches
        const matchY = startY + (matchIndex * spacingMultiplier * baseSpacing);
        
        // Draw match box with slight rounded corners
        pdf.setDrawColor(100, 100, 100);
        pdf.setFillColor(250, 250, 250);
        pdf.roundedRect(roundX, matchY, matchWidth, matchHeight, 1, 1, 'F');
        pdf.roundedRect(roundX, matchY, matchWidth, matchHeight, 1, 1, 'S');
        
        // Draw divider line between participants
        pdf.setDrawColor(180, 180, 180);
        pdf.line(roundX, matchY + (matchHeight / 2), roundX + matchWidth, matchY + (matchHeight / 2));
        
        // Get participants
        const participant1 = match.participants[0] || "";
        const participant2 = match.participants[1] || "";
        
        // Format participant names
        const text1 = participant1 === "(bye)" ? "— bye —" : participant1;
        const text2 = participant2 === "(bye)" ? "— bye —" : participant2;
        
        // Draw participant names - adjust font size based on available space
        // Choose font size based on match height
        pdf.setFontSize(matchHeight > 8 ? 8 : 6);
        
        // First participant
        if (match.winner === participant1) {
          // Highlight winner
          pdf.setFillColor(235, 245, 235);
          pdf.rect(roundX, matchY, matchWidth, matchHeight / 2, 'F');
          pdf.setFont("helvetica", "bold");
        } else {
          pdf.setFont("helvetica", "normal");
        }
        
        // Ensure text fits in the match box
        const maxTextWidth = matchWidth - 4;
        let displayText1 = text1;
        if (pdf.getTextWidth(displayText1) > maxTextWidth) {
          displayText1 = displayText1.substring(0, 10) + "...";
        }
        
        pdf.text(displayText1, roundX + 2, matchY + (matchHeight / 4) + 1);
        
        // Second participant
        pdf.setFont("helvetica", "normal");
        if (match.winner === participant2) {
          // Highlight winner
          pdf.setFillColor(235, 245, 235);
          pdf.rect(roundX, matchY + (matchHeight / 2), matchWidth, matchHeight / 2, 'F');
          pdf.setFont("helvetica", "bold");
        }
        
        let displayText2 = text2;
        if (pdf.getTextWidth(displayText2) > maxTextWidth) {
          displayText2 = displayText2.substring(0, 10) + "...";
        }
        
        pdf.text(displayText2, roundX + 2, matchY + (matchHeight * 3/4) + 1);
        
        // Draw connectors to the next match
        if (match.nextMatchId && roundIndex < bracketData.length - 1) {
          // Find the next match
          const nextRound = bracketData[roundIndex + 1];
          const nextMatch = nextRound.find(m => m.id === match.nextMatchId);
          
          if (nextMatch) {
            const nextMatchIndex = nextRound.findIndex(m => m.id === match.nextMatchId);
            const nextMatchY = startY + (nextMatchIndex * spacingMultiplier * 2 * baseSpacing);
            
            // Draw connector lines
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineWidth(0.3);
            
            // Horizontal line from current match
            const connectorStartX = roundX + matchWidth;
            const connectorStartY = matchY + (matchHeight / 2);
            const horizontalEndX = connectorStartX + ((roundWidth - matchWidth) / 2);
            
            pdf.line(connectorStartX, connectorStartY, horizontalEndX, connectorStartY);
            
            // Vertical connector line
            const verticalEndY = nextMatchY + (matchHeight / 2);
            pdf.line(horizontalEndX, connectorStartY, horizontalEndX, verticalEndY);
            
            // Horizontal line to next match
            pdf.line(horizontalEndX, verticalEndY, roundX + roundWidth, verticalEndY);
          }
        }
      });
    });
  };

  // Function to toggle orientation
  const toggleOrientation = useCallback(() => {
    setOrientation(prev => prev === "landscape" ? "portrait" : "landscape");
  }, []);

  return { 
    generateBracketPDF,
    orientation,
    setOrientation,
    toggleOrientation
  };
};