import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BracketMatch } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { calculateBracketConnectors, createBracket } from "@/lib/bracketUtils";


export const useTournament = () => {
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
      // try{

      // }
      // const response = await apiRequest("POST", "/api/tournaments/generate", {
      //   participants,
      //   seedType,
      // });
      setParticipantCount(participants.length || 0);
       const bracketData = createBracket(participants, seedType);
      // return response?.json() || {bracketData, tournamentId: 1 };
      // console.log("Bracket Data:", bracketData);
      
      return  {bracketData, tournamentId: 1 };
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

  // Export as PNG
  const exportAsPNG = useCallback(() => {
    // Check for the active pool tab
    const activePoolTab = document.querySelector('button[data-state="active"]');
    const poolIndex = activePoolTab?.getAttribute('value') || "0";
    
    // Get the active pool's bracket
    const printView = document.querySelector(".print\\:block .bracket-display");
    if (!printView) return;
    
    // Create a clone for capturing
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.backgroundColor = 'white';
    cloneContainer.style.padding = '20px';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex as string) + 1}`;
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.margin = '20px 0';
    cloneContainer.appendChild(title);
    
    // Clone the content
    const clone = printView.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    // Capture the clone
    html2canvas(cloneContainer, {
      backgroundColor: "#FFFFFF",
      scale: 1.5, // Higher scale for better quality
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        // Adjust styles for better export
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
      // Create download link
      const link = document.createElement("a");
      link.download = `tournament-bracket-pool-${parseInt(poolIndex as string) + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      // Remove the temporary clone
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
    // Create a self-contained document for PDF generation
    const documentTitle = "Taekwondo Tournament Tie sheet";
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Please allow popups for this website to preview the bracket."
      });
      return;
    }
    
    // Find the actual bracket display element that we want to clone
    const bracketElement = document.querySelector(".bracket-display") as HTMLElement;
    if (!bracketElement) {
      console.error("Could not find bracket display element");
      return;
    }
    
    // Get all stylesheets from current document to ensure consistent styling
    const styleSheets = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          if (styleSheet.cssRules) {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          }
        } catch (e) {
          // CORS might prevent reading some stylesheets
          console.log('Could not read stylesheet', e);
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
    
    // Create custom styles specific for the bracket
    const customStyles = `
      body {
        font-family: system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 20px;
        background: white;
      }
      .bracket-container {
        padding: 20px;
        overflow: visible;
        position: relative;
      }
      .bracket-display {
        display: flex !important;
        position: relative !important;
        padding-bottom: 20px !important;
        overflow: visible !important;
      }
      .bracket-round {
        width: 180px !important;
        margin-left: 20px !important;
      }
      .bracket-round:first-child {
        margin-left: 0 !important;
      }
      .bracket-match {
        padding: 0 !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 4px !important;
        position: relative !important;
        margin-bottom: 4px !important;
        background: white !important;
        overflow: hidden !important;
      }
      /* Enhanced participant styling for better differentiation */
      .participant {
        padding: 4px 6px !important;
        margin: 0 !important;
        font-size: 12px !important;
        border-left-width: 4px !important;
      }/*
      .participant:first-child {
        border-bottom: 2px solid #f8fafc !important;
        background-color: #f8fafc !important;
      }
      .participant:last-child {
        border-top: 2px solid #f8fafc !important;
        background-color: #f1f5f9 !important;
      }*/
      /* Better styling for byes */
      .participant.text-gray-500 {
        color: #94a3b8 !important;
        font-style: italic !important;
      }
      /* Winner highlight */
      .font-medium {
        font-weight: 600 !important;
        background-color: #eff6ff !important;
      }
      /* Always ensure separation is visible in print */
      @media print {
    
        .participant:first-child {
        border-bottom: 1px solid #d2d5da !important;
        background-color: #f8fafc !important;
      }
      .participant:last-child {
        border-top: 1px solid #d2d5da !important;
        background-color: #f1f5f9 !important;
      }
      }
      .bracket-connector {
        position: absolute !important;
        background-color: #64748b !important;
        z-index: 10 !important;
      }
      .connector-horizontal {
        height: 2px !important;
      }
      .connector-vertical {
        width: 2px !important;
      }
      .border-blue-400 { border-color: #60a5fa !important; }
      .border-red-400 { border-color: #f87171 !important; }
      .border-green-400 { border-color: #34d399 !important; }
      .bg-blue-50 { background-color: #eff6ff !important; }
      .bg-red-50 { background-color: #fef2f2 !important; }
      .bg-green-50 { background-color: #ecfdf5 !important; }
      .bg-gray-100 { background-color: #f3f4f6 !important; }
      .text-gray-500 { color: #6b7280 !important; }
      .border-l-4 { border-left-width: 4px !important; }
      .font-medium { font-weight: 500 !important; }
      h1 { text-align: center; margin: 0 0 20px 0; font-size: 20px; }
      .preview-controls {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #f8f9fa;
        padding: 15px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 1000;
      }
      .download-btn {
        background: #2563eb;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        margin: 0 5px;
      }
      .download-btn:hover {
        background: #1d4ed8;
      }
      .content-container {
        margin-top: 70px;
      }
      @media print {
        .preview-controls { display: none; }
        .content-container { margin-top: 0; }
        @page {
          size: ${document.querySelector('.bracket-display.portrait') ? 'portrait' : 'landscape'};
          margin: 1cm;
        }
      }
    `;
    
    // Open document and write content
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documentTitle}</title>
        <style>${styleSheets}\n${customStyles}</style>
      </head>
      <body>
        <div class="preview-controls">
          <button class="download-btn" id="download-btn">Download PDF</button>
          <button class="download-btn" id="print-btn" style="background: #0ea5e9;">Print</button>
          <button class="download-btn" id="close-btn" style="background: #ef4444;">Close</button>
        </div>
        <div class="content-container">
          <h1>${documentTitle}</h1>
          <div class="bracket-container" id="bracket-container"></div>
        </div>
        
        <script>
          // Handle buttons
          document.getElementById('download-btn').addEventListener('click', function() {
            const tempControls = document.querySelector('.preview-controls');
            tempControls.style.display = 'none';
            
            // Give time for styles to render properly
            setTimeout(function() {
              window.print();
              tempControls.style.display = 'block';
            }, 200);
          });
          
          document.getElementById('print-btn').addEventListener('click', function() {
            window.print();
          });
          
          document.getElementById('close-btn').addEventListener('click', function() {
            window.close();
          });
        </script>
      </body>
      </html>
    `);
    
    // Function to clone the bracket structure completely
    const cloneBracket = (sourceElement: HTMLElement): HTMLElement => {
      const clone = sourceElement.cloneNode(true) as HTMLElement;
      
      // Ensure all data attributes are copied
      Array.from(sourceElement.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          clone.setAttribute(attr.name, attr.value);
        }
      });
      
      // Ensure all match elements have their data-match-id attributes
      const sourceMatches = sourceElement.querySelectorAll('.bracket-match');
      const cloneMatches = clone.querySelectorAll('.bracket-match');
      
      sourceMatches.forEach((sourceMatch, index) => {
        if (index < cloneMatches.length) {
          const matchId = sourceMatch.getAttribute('data-match-id');
          if (matchId) {
            cloneMatches[index].setAttribute('data-match-id', matchId);
          }
        }
      });
      
      return clone;
    };
    
    // Clone the bracket element
    const bracketContainer = printWindow.document.getElementById('bracket-container');
    if (!bracketContainer) {
      printWindow.document.close();
      return;
    }
    
    const bracketClone = cloneBracket(bracketElement);
    
    // Remove any existing connectors from the clone
    bracketClone.querySelectorAll('.bracket-connector').forEach(el => el.remove());
    
    // Append clone to the print window
    bracketContainer.appendChild(bracketClone);
    
    // Wait for DOM to be fully rendered before calculating connectors
    setTimeout(() => {
      try {
        // Get bracket data
        const pooledBracketsElements = document.querySelectorAll('.bracket-display[data-pool]');
        let bracketToUse = bracketData;
        
        // Create a function to calculate connectors in the print window context
        printWindow.calculateBracketConnectors = function(bracketData: BracketMatch[][], container: HTMLElement) {
          const connectors: Array<{ 
            left: number; 
            top: number; 
            width?: number; 
            height?: number; 
            type: string 
          }> = [];
          
          if (!bracketData || bracketData.length <= 1 || !container) {
            return connectors;
          }
          
          try {
            const matchElements = container.querySelectorAll('.bracket-match');
            
            if (matchElements.length === 0) {
              return connectors;
            }
            
            for (let roundIndex = 0; roundIndex < bracketData.length - 1; roundIndex++) {
              const currentRound = bracketData[roundIndex];
              
              for (let matchIndex = 0; matchIndex < currentRound.length; matchIndex++) {
                const match = currentRound[matchIndex];
                if (!match.nextMatchId) continue;
                
                const matchElement = Array.from(matchElements).find(
                  (el) => el.getAttribute('data-match-id') === match.id
                );
                
                const nextMatchElement = Array.from(matchElements).find(
                  (el) => el.getAttribute('data-match-id') === match.nextMatchId
                );
                
                if (matchElement && nextMatchElement) {
                  try {
                    const matchRect = matchElement.getBoundingClientRect();
                    const nextMatchRect = nextMatchElement.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    
                    // Calculate relative positions
                    const currentX = matchRect.right - containerRect.left;
                    const currentY = matchRect.top + matchRect.height / 2 - containerRect.top;
                    const nextX = nextMatchRect.left - containerRect.left;
                    const nextY = nextMatchRect.top + nextMatchRect.height / 2 - containerRect.top;
                    
                    // Only create connectors if elements are properly positioned
                    if (currentX >= 0 && currentY >= 0 && nextX >= 0 && nextY >= 0) {
                      // Horizontal line from current match
                      connectors.push({
                        left: currentX,
                        top: currentY,
                        width: (nextX - currentX) / 2,
                        type: "horizontal",
                      });
                      
                      // Vertical line connecting both
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
                  } catch (err) {
                    console.error("Error calculating connector position:", err);
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error calculating bracket connectors:", error);
          }
          
          return connectors;
        };
        
        // Calculate connectors in the print window context
        if (bracketToUse) {
          const newConnectors = printWindow.calculateBracketConnectors(bracketToUse, bracketClone);
          
          // Add connector lines to the clone
          newConnectors.forEach(connector => {
            const connectorDiv = printWindow.document.createElement('div');
            connectorDiv.className = `bracket-connector ${connector.type === "horizontal" ? "connector-horizontal" : "connector-vertical"}`;
            connectorDiv.style.position = 'absolute';
            connectorDiv.style.left = `${connector.left}px`;
            connectorDiv.style.top = `${connector.top}px`;
            connectorDiv.style.backgroundColor = '#64748b';
            
            if (connector.type === 'horizontal') {
              connectorDiv.style.height = '2px';
              if (connector.width) connectorDiv.style.width = `${connector.width}px`;
            } else {
              connectorDiv.style.width = '2px';
              if (connector.height) connectorDiv.style.height = `${connector.height}px`;
            }
            
            bracketClone.appendChild(connectorDiv);
          });
        }
        
        // Mark document as complete
        printWindow.document.close();
        
        // Close export modal
        closeExportModal();
        
        // Notify success
        toast({
          title: "Success",
          description: "PDF preview generated successfully. Click 'Download PDF' to save it.",
        });
        
      } catch (error) {
        console.error("Error setting up print preview:", error);
        printWindow.document.close();
        toast({
          variant: "destructive",
          title: "Export Error",
          description: "Failed to generate PDF preview."
        });
        closeExportModal();
      }
    }, 500); // Longer timeout to ensure DOM is fully rendered
  }, [bracketData, closeExportModal, toast]);

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    // Check for the active pool tab
    const activePoolTab = document.querySelector('button[data-state="active"]');
    const poolIndex = activePoolTab?.getAttribute('value') || "0";
    
    // Get the active pool's bracket
    const printView = document.querySelector(".print\\:block .bracket-display");
    if (!printView) return;
    
    // Create a clone for capturing
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.backgroundColor = 'white';
    cloneContainer.style.padding = '20px';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex as string) + 1}`;
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.margin = '20px 0';
    cloneContainer.appendChild(title);
    
    // Clone the content
    const clone = printView.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    // Capture the clone
    html2canvas(cloneContainer, {
      backgroundColor: "#FFFFFF",
      scale: 1.5, // Higher scale for better quality
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        // Adjust styles for better export
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
      // Copy to clipboard
      canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]).then(() => {
            toast({
              title: "Success",
              description: "Bracket copied to clipboard!",
            });
            
            // Remove the temporary clone
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
  };
};
