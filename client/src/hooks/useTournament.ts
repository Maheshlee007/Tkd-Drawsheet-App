import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BracketMatch } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const useTournament = () => {
  const [bracketData, setBracketData] = useState<BracketMatch[][] | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { toast } = useToast();

  // Generate tournament bracket mutation
  const generateBracketMutation = useMutation({
    mutationFn: async ({
      participants,
      seedType,
    }: {
      participants: string[];
      seedType: "random" | "ordered" | "as-entered";
    }) => {
      const response = await apiRequest("POST", "/api/tournaments/generate", {
        participants,
        seedType,
      });
      return response.json();
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
    const bracketContainer = document.querySelector(".overflow-x-auto");
    if (!bracketContainer) return;

    // Make a clone of the bracket to avoid modifying the original DOM
    const bracketElement = document.querySelector(".bracket-display");
    if (!bracketElement) return;

    // Create a clone of the bracket for exporting
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.overflow = 'visible';
    
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
    html2canvas(clone, {
      backgroundColor: "#FFFFFF",
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      scale: 1.0, // Lower scale for full bracket
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        // Adjust styles in the cloned document for better export
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 5px !important;
          }
          .bracket-match {
            padding: 5px !important;
            margin-bottom: 10px !important;
          }
          .participant {
            padding: 3px 5px !important;
            margin-bottom: 3px !important;
          }
        `;
        document.head.appendChild(clonedStyles);
      }
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = "tournament-bracket.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      // Remove the temporary clone
      document.body.removeChild(cloneContainer);
      
      closeExportModal();
    }).catch(error => {
      console.error("Export error:", error);
      document.body.removeChild(cloneContainer);
      closeExportModal();
    });
  }, [closeExportModal]);

  // Export as PDF
  const exportAsPDF = useCallback(() => {
    const bracketContainer = document.querySelector(".overflow-x-auto");
    if (!bracketContainer) return;

    // Make a clone of the bracket to avoid modifying the original DOM
    const bracketElement = document.querySelector(".bracket-display");
    if (!bracketElement) return;

    // Create a clone of the bracket for exporting
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.overflow = 'visible';
    
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
    html2canvas(clone, {
      backgroundColor: "#FFFFFF",
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      scale: 1.0, // Lower scale for full bracket
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        // Adjust styles in the cloned document for better export
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 5px !important;
          }
          .bracket-match {
            padding: 5px !important;
            margin-bottom: 10px !important;
          }
          .participant {
            padding: 3px 5px !important;
            margin-bottom: 3px !important;
          }
        `;
        document.head.appendChild(clonedStyles);
      }
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("tournament-bracket.pdf");
      
      // Remove the temporary clone
      document.body.removeChild(cloneContainer);
      
      closeExportModal();
    }).catch(error => {
      console.error("Export error:", error);
      document.body.removeChild(cloneContainer);
      closeExportModal();
    });
  }, [closeExportModal]);

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    const bracketContainer = document.querySelector(".overflow-x-auto");
    if (!bracketContainer) return;

    // Make a clone of the bracket to avoid modifying the original DOM
    const bracketElement = document.querySelector(".bracket-display");
    if (!bracketElement) return;

    // Create a clone of the bracket for exporting
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.overflow = 'visible';
    
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
    html2canvas(clone, {
      backgroundColor: "#FFFFFF",
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      scale: 1.0, // Lower scale for full bracket
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        // Adjust styles in the cloned document for better export
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 5px !important;
          }
          .bracket-match {
            padding: 5px !important;
            margin-bottom: 10px !important;
          }
          .participant {
            padding: 3px 5px !important;
            margin-bottom: 3px !important;
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
            
            // Remove the temporary clone
            document.body.removeChild(cloneContainer);
            
            closeExportModal();
          });
        }
      });
    }).catch(error => {
      console.error("Copy error:", error);
      document.body.removeChild(cloneContainer);
      closeExportModal();
    });
  }, [closeExportModal, toast]);

  return {
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
