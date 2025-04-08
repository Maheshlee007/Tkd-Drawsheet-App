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
    const bracketElement = document.querySelector(".bracket-display");
    if (!bracketElement) return;

    html2canvas(bracketElement as HTMLElement, { backgroundColor: "#FFFFFF" }).then((canvas) => {
      const link = document.createElement("a");
      link.download = "tournament-bracket.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      closeExportModal();
    });
  }, [closeExportModal]);

  // Export as PDF
  const exportAsPDF = useCallback(() => {
    const bracketElement = document.querySelector(".bracket-display");
    if (!bracketElement) return;

    html2canvas(bracketElement as HTMLElement, { backgroundColor: "#FFFFFF" }).then((canvas) => {
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
      closeExportModal();
    });
  }, [closeExportModal]);

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    const bracketElement = document.querySelector(".bracket-display");
    if (!bracketElement) return;

    html2canvas(bracketElement as HTMLElement, { backgroundColor: "#FFFFFF" }).then((canvas) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]).then(() => {
            toast({
              title: "Success",
              description: "Bracket copied to clipboard!",
            });
            closeExportModal();
          });
        }
      });
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
