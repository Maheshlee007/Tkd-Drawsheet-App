import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BracketMatch } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { createBracket } from "@/lib/bracketUtils";


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
    // Check for pool tabs to determine if we have multiple pools
    const poolTabs = document.querySelectorAll('button[value="0"], button[value="1"], button[value="2"], button[value="3"]');
    const hasMultiplePools = poolTabs.length > 1;
    
    // For multiple pools, we want to generate a multi-page PDF with one pool per page
    if (hasMultiplePools) {
      // Create PDF with landscape orientation
      // Create PDF with user-selected orientation
      const pdf = new jsPDF({
        orientation: document.querySelector('.bracket-display.portrait') ? 'portrait' : 'landscape',
        unit: "px",
      });
      
      // Get the total number of pools
      const poolCount = poolTabs.length;
      
      // Function to capture each pool
      const capturePool = (poolIndex: number) => {
        return new Promise<void>((resolve, reject) => {
          // Click the tab for this pool to make it active
          const poolTab = document.querySelector(`button[value="${poolIndex}"]`) as HTMLElement;
          if (poolTab) {
            poolTab.click();
            
            // Give time for the DOM to update
            setTimeout(() => {
              // Get the print view element for this pool
              const printView = document.querySelector(".print\\:block .bracket-display");
              if (!printView) {
                reject(new Error("Print view not found"));
                return;
              }
              
              // Create header text
              const headerText = `Tournament Bracket - Pool ${poolIndex + 1}`;
              
              // Clone the print view for capturing
              const clone = printView.cloneNode(true) as HTMLElement;
              const cloneContainer = document.createElement('div');
              cloneContainer.style.position = 'absolute';
              cloneContainer.style.top = '-9999px';
              cloneContainer.style.left = '-9999px';
              cloneContainer.style.width = 'max-content';
              cloneContainer.style.backgroundColor = 'white';
              
              // Add header
              const header = document.createElement('h2');
              header.textContent = headerText;
              header.style.textAlign = 'center';
              header.style.fontWeight = 'bold';
              header.style.margin = '20px 0';
              
              cloneContainer.appendChild(header);
              cloneContainer.appendChild(clone);
              document.body.appendChild(cloneContainer);
              
              // Capture the pool
              html2canvas(cloneContainer, {
                backgroundColor: "#FFFFFF",
                scale: 1.0,
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
                  `;
                  document.head.appendChild(clonedStyles);
                }
              }).then(canvas => {
                // Add page to PDF
                const imgData = canvas.toDataURL("image/png");
                
                // Add a new page if not the first pool
                if (poolIndex > 0) {
                  pdf.addPage();
                }
                
                // Calculate dimensions to fit the page
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                // Calculate image dimensions to maintain aspect ratio
                const imgWidth = imgProps.width;
                const imgHeight = imgProps.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                const finalWidth = imgWidth * ratio;
                const finalHeight = imgHeight * ratio;
                
                // Center the image
                const x = (pdfWidth - finalWidth) / 2;
                const y = (pdfHeight - finalHeight) / 2;
                
                // Add image to PDF
                pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);
                
                // Clean up
                document.body.removeChild(cloneContainer);
                resolve();
              }).catch(error => {
                console.error(`Error capturing pool ${poolIndex}:`, error);
                document.body.removeChild(cloneContainer);
                reject(error);
              });
            }, 100); // Wait for UI to update
          } else {
            reject(new Error(`Pool tab ${poolIndex} not found`));
          }
        });
      };
      
      // Capture all pools sequentially
      const captureAllPools = async () => {
        try {
          for (let i = 0; i < poolCount; i++) {
            await capturePool(i);
          }
          // Save the complete PDF
          pdf.save("tournament-brackets.pdf");
          closeExportModal();
        } catch (error) {
          console.error("Failed to generate multi-pool PDF:", error);
          toast({
            variant: "destructive",
            title: "Export Error",
            description: "Failed to export multi-pool bracket to PDF",
          });
          closeExportModal();
        }
      };
      
      captureAllPools();
    } else {
      // Single pool export - simpler process
      const bracketElement = document.querySelector(".bracket-display");
      if (!bracketElement) return;
  
      // Create a clone of the bracket for exporting
      const cloneContainer = document.createElement('div');
      cloneContainer.style.position = 'absolute';
      cloneContainer.style.top = '-9999px';
      cloneContainer.style.left = '-9999px';
      cloneContainer.style.width = 'max-content';
      cloneContainer.style.overflow = 'visible';
      
      // Add title
      const title = document.createElement('h2');
      title.textContent = "Tournament Bracket";
      title.style.textAlign = 'center';
      title.style.fontWeight = 'bold';
      title.style.margin = '20px 0';
      cloneContainer.appendChild(title);
      
      // Clone the content
      const clone = bracketElement.cloneNode(true) as HTMLElement;
      clone.style.width = 'max-content';
      clone.style.height = 'auto';
      clone.style.position = 'relative';
      clone.style.display = 'flex';
      clone.style.padding = '20px';
      clone.style.backgroundColor = 'white';
      
      // Add to document temporarily
      cloneContainer.appendChild(clone);
      document.body.appendChild(cloneContainer);
  
      // Capture the clone
      html2canvas(cloneContainer, {
        backgroundColor: "#FFFFFF",
        scale: 1.0,
        allowTaint: true,
        useCORS: true,
        logging: false,
        onclone: (document) => {
          // Adjust styles in the cloned document for better export
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
          `;
          document.head.appendChild(clonedStyles);
        }
      }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: document.querySelector('.bracket-display.portrait') ? 'portrait' : 'landscape',
          unit: "px",
        });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Calculate dimensions to maintain aspect ratio and fit page
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;
        
        // Center the image
        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;
        
        pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);
        pdf.save("tournament-bracket.pdf");
        
        // Remove the temporary clone
        document.body.removeChild(cloneContainer);
        
        closeExportModal();
      }).catch(error => {
        console.error("Export error:", error);
        document.body.removeChild(cloneContainer);
        closeExportModal();
      });
    }
  }, [closeExportModal, toast]);

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
