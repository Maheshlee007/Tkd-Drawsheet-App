import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BracketMatch } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { calculateBracketConnectors, createBracket } from "@/lib/bracketUtils";

// Define return type for better type safety
interface UseTournamentReturn {
  participantCount: number;
  bracketData: BracketMatch[][] | null;
  isExportModalOpen: boolean;
  isPending: boolean;
  generateBracket: (participants: string[], seedType: "random" | "ordered" | "as-entered") => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  exportAsPNG: () => void;
  exportAsPDF: () => void;
  copyToClipboard: () => void;
  updateTournamentMatch: (matchId: string, winnerId: string) => void;
}

export const useTournament = (): UseTournamentReturn => {
  const [bracketData, setBracketData] = useState<BracketMatch[][] | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { toast } = useToast();
  const [participantCount, setParticipantCount] = useState(0);

  // Generate tournament bracket mutation
  const generateBracketMutation = useMutation({
    mutationFn: async ({
      participants,
      seedType,
    }: {
      participants: string[];
      seedType: "random" | "ordered" | "as-entered";
    }) => {
      setParticipantCount(participants.length || 0);
      const bracketData = createBracket(participants, seedType);
      return { bracketData, tournamentId: 1 };
    },
    onSuccess: (data) => {
      setBracketData(data.bracketData);
      toast({
        title: "Success",
        description: "Tournament bracket generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate tournament bracket",
      });
    },
  });

  // Generate the bracket
  const generateBracket = useCallback(
    (participants: string[], seedType: "random" | "ordered" | "as-entered") => {
      generateBracketMutation.mutate({ participants, seedType });
    },
    [generateBracketMutation]
  );

  // Open the export modal
  const openExportModal = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  // Close the export modal
  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  // Update match winner
  const updateTournamentMatch = useCallback(
    (matchId: string, winnerId: string) => {
      if (!bracketData) return;

      const newBracketData = [...bracketData];
      
      // Find the match in the bracket data
      let targetMatch: BracketMatch | null = null;
      let targetRoundIndex = -1;
      let targetMatchIndex = -1;
      
      // Find the match by ID
      for (let roundIndex = 0; roundIndex < newBracketData.length; roundIndex++) {
        const round = newBracketData[roundIndex];
        const matchIndex = round.findIndex(match => match.id === matchId);
        
        if (matchIndex !== -1) {
          targetMatch = round[matchIndex];
          targetRoundIndex = roundIndex;
          targetMatchIndex = matchIndex;
          break;
        }
      }
      
      if (!targetMatch || targetRoundIndex === -1 || targetMatchIndex === -1) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Match not found"
        });
        return;
      }
      
      // Update the winner for this match
      newBracketData[targetRoundIndex][targetMatchIndex] = {
        ...targetMatch,
        winner: winnerId
      };
      
      // If there's a next match, update its participants too
      if (targetMatch.nextMatchId) {
        // Find the next match
        let nextMatch: BracketMatch | null = null;
        let nextRoundIndex = -1;
        let nextMatchIndex = -1;
        
        for (let roundIndex = 0; roundIndex < newBracketData.length; roundIndex++) {
          const round = newBracketData[roundIndex];
          const matchIndex = round.findIndex(match => match.id === targetMatch?.nextMatchId);
          
          if (matchIndex !== -1) {
            nextMatch = round[matchIndex];
            nextRoundIndex = roundIndex;
            nextMatchIndex = matchIndex;
            break;
          }
        }
        
        if (nextMatch && nextRoundIndex !== -1 && nextMatchIndex !== -1) {
          // Determine which position this participant should take
          const positionInNextMatch = targetMatch.position % 2 === 0 ? 0 : 1;
          
          // Create an updated participants array for the next match
          const newParticipants: [string | null, string | null] = [...nextMatch.participants] as [string | null, string | null];
          newParticipants[positionInNextMatch] = winnerId;
          
          // Update the next match
          newBracketData[nextRoundIndex][nextMatchIndex] = {
            ...nextMatch,
            participants: newParticipants,
            // If the other finalist doesn't exist yet, we can't determine a winner
            winner: nextMatch.winner === nextMatch.participants[positionInNextMatch] ? winnerId : nextMatch.winner
          };
        }
      }
      
      // Update the state with the new bracket data
      setBracketData(newBracketData);
      
      // You could also send this to the API if needed
      // apiRequest("PUT", `/api/tournaments/match/${matchId}`, { winner: winnerId });
      
    },
    [bracketData, toast]
  );

  // Export as PNG
  const exportAsPNG = useCallback(() => {
    const activePoolTab = document.querySelector('button[data-state="active"]');
    const poolIndex = activePoolTab?.getAttribute('value') || "0";
    
    const printView = document.querySelector(".print\\:block .bracket-display");
    if (!printView) return;
    
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.backgroundColor = 'white';
    cloneContainer.style.padding = '20px';
    
    const title = document.createElement('h2');
    title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex as string) + 1}`;
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.margin = '20px 0';
    cloneContainer.appendChild(title);
    
    const clone = printView.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    html2canvas(cloneContainer, {
      backgroundColor: "#FFFFFF",
      scale: 1.5,
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 0 !important;
            margin-left: 20px !important;
          }
          .bracket-round:first-child {
            margin-left: 0 !important;
          }
          .bracket-match {
            padding: 0 !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 2px !important;
          }
          .participant {
            padding: 1px 2px !important;
            margin: 0 !important;
          }
          .bracket-connector {
            border-color: #666 !important;
          }
        `;
        document.head.appendChild(clonedStyles);
      }
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `tournament-bracket-pool-${parseInt(poolIndex as string) + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      document.body.removeChild(cloneContainer);
      
      closeExportModal();
      
      toast({
        title: "Success",
        description: "Bracket exported as PNG successfully!",
      });
    }).catch(error => {
      console.error("Export error:", error);
      document.body.removeChild(cloneContainer);
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Failed to export bracket as PNG",
      });
      closeExportModal();
    });
  }, [closeExportModal, toast]);

  // Export as PDF
  const exportAsPDF = useCallback(() => {
    const activePoolTab = document.querySelector('button[data-state="active"]');
    const poolIndex = activePoolTab?.getAttribute('value') || "0";
    
    const printView = document.querySelector(".print\\:block .bracket-display");
    if (!printView) {
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Could not find bracket display element"
      });
      return;
    }
    
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.backgroundColor = 'white';
    cloneContainer.style.padding = '20px';
    
    const title = document.createElement('h2');
    title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex as string) + 1}`;
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.margin = '20px 0';
    cloneContainer.appendChild(title);
    
    const clone = printView.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    html2canvas(cloneContainer, {
      backgroundColor: "#FFFFFF",
      scale: 1.5,
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 0 !important;
            margin-left: 20px !important;
          }
          .bracket-round:first-child {
            margin-left: 0 !important;
          }
          .bracket-match {
            padding: 0 !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 2px !important;
          }
          .participant {
            padding: 1px 2px !important;
            margin: 0 !important;
          }
          .bracket-connector {
            border-color: #666 !important;
          }
        `;
        document.head.appendChild(clonedStyles);
      }
    }).then((canvas) => {
      // Generate PDF
      try {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Calculate dimensions to fit the PDF page
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        let imgWidth = pdfWidth - 20; // 10mm margins on each side
        let imgHeight = (canvasHeight * imgWidth) / canvasWidth;
        
        // If image is too tall, scale based on height
        if (imgHeight > pdfHeight - 20) {
          imgHeight = pdfHeight - 20;
          imgWidth = (canvasWidth * imgHeight) / canvasHeight;
        }
        
        // Center the image
        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;
        
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`tournament-bracket-pool-${parseInt(poolIndex as string) + 1}.pdf`);
        
        document.body.removeChild(cloneContainer);
        
        closeExportModal();
        
        toast({
          title: "Success",
          description: "Bracket exported as PDF successfully!",
        });
      } catch (error) {
        console.error("PDF generation error:", error);
        document.body.removeChild(cloneContainer);
        toast({
          variant: "destructive",
          title: "Export Error",
          description: "Failed to generate PDF",
        });
        closeExportModal();
      }
    }).catch(error => {
      console.error("Export error:", error);
      document.body.removeChild(cloneContainer);
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Failed to generate image for PDF",
      });
      closeExportModal();
    });
  }, [closeExportModal, toast]);

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    const activePoolTab = document.querySelector('button[data-state="active"]');
    const poolIndex = activePoolTab?.getAttribute('value') || "0";
    
    const printView = document.querySelector(".print\\:block .bracket-display");
    if (!printView) {
      toast({
        variant: "destructive",
        title: "Copy Error",
        description: "Could not find bracket display element"
      });
      return;
    }
    
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.backgroundColor = 'white';
    cloneContainer.style.padding = '20px';
    
    const title = document.createElement('h2');
    title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex as string) + 1}`;
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.margin = '20px 0';
    cloneContainer.appendChild(title);
    
    const clone = printView.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    html2canvas(cloneContainer, {
      backgroundColor: "#FFFFFF",
      scale: 1.5,
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 0 !important;
            margin-left: 20px !important;
          }
          .bracket-round:first-child {
            margin-left: 0 !important;
          }
          .bracket-match {
            padding: 0 !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 2px !important;
          }
          .participant {
            padding: 1px 2px !important;
            margin: 0 !important;
          }
          .bracket-connector {
            border-color: #666 !important;
          }
        `;
        document.head.appendChild(clonedStyles);
      }
    }).then((canvas) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]).then(() => {
            toast({
              title: "Success",
              description: "Bracket copied to clipboard!",
            });
            
            document.body.removeChild(cloneContainer);
            
            closeExportModal();
          }).catch(error => {
            console.error("Copy error:", error);
            document.body.removeChild(cloneContainer);
            toast({
              variant: "destructive",
              title: "Copy Error",
              description: "Failed to copy bracket to clipboard",
            });
            closeExportModal();
          });
        }
      }, "image/png");
    }).catch(error => {
      console.error("Copy error:", error);
      document.body.removeChild(cloneContainer);
      toast({
        variant: "destructive",
        title: "Copy Error",
        description: "Failed to generate image for clipboard",
      });
      closeExportModal();
    });
  }, [closeExportModal, toast]);

  return {
    participantCount,
    bracketData,
    isExportModalOpen,
    isPending: generateBracketMutation.isPending,
    generateBracket,
    openExportModal,
    closeExportModal,
    exportAsPNG,
    exportAsPDF,
    copyToClipboard,
    updateTournamentMatch,
  };
};
