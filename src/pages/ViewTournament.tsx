import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTournamentStore } from "@/store/useTournamentStore";
import BracketDisplay from "@/components/BracketDisplay";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Download, 
  Eye, 
  FileText, 
  Maximize, 
  Minimize, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Settings,
  Award,
  Save
} from "lucide-react";
import { useBracketPDF, PDFGenOptions } from "@/hooks/useBracketPDF"; // PDFGenOptions already imported
import { cn } from "@/lib/utils";
import { RoundsConfigModal } from "@/components/RoundsConfigModal";
import { MatchScoringModal } from "@/components/MatchScoringModal";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog"; // Import the new dialog

// Interface for match info used in the scoring modal
interface MatchInfo {
  matchId: string;
  player1: string;
  player2: string;
}

const ViewTournament = () => {
  const [, navigate] = useLocation();  const {
    bracketData,
    tournamentName,
    participantCount,
    updateTournamentMatch,
    internalRoundsPerMatch,
    saveMatchResult,
    matchResults,
    exportMatchDataAsJson,
    setCurrentMatch
  } = useTournamentStore();
  
  const { generateBracketPDF, previewBracketPDF, orientation, toggleOrientation } = useBracketPDF();
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfDialogOptionsOpen, setPdfDialogOptionsOpen] = useState(false); // State for new dialog
  
  // New state for modals
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchInfo | null>(null);
  
  // Calculate tournament statistics
  const calculateStats = () => {
    if (!bracketData) return null;
    
    const totalRounds = bracketData.length;
    const totalMatches = participantCount - 1;
    
    let poolCount = 1;
    if (participantCount > 16) {
      poolCount = Math.ceil(participantCount / 16);
    }
    
    return {
      participants: participantCount,
      rounds: totalRounds,
      matches: totalMatches,
      pools: poolCount
    };
  };
  
  const stats = calculateStats();
  
  // If no bracket data exists, redirect to home
  useEffect(() => {
    if (!bracketData) {
      navigate("/");
    }
  }, [bracketData, navigate]);
  
  // Update fullscreen state when user uses F11 or Esc
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Toggle fullscreen mode
  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Handler for direct PDF generation - now opens the dialog
  const handleOpenPDFDialog = () => {
    setPdfDialogOptionsOpen(true);
  };

  // Handler for PDF generation with custom options from dialog
  const handlePDFExportWithOptions = (options: PDFGenOptions) => {
    if (bracketData) {
      // Ensure tournamentName from store is used if header is empty, or use the one from dialog
      const header = options.tournamentHeader || tournamentName;
      generateBracketPDF(bracketData, header, participantCount, options);
    }
  };

  // Handler for PDF preview with custom options from dialog
  const handlePDFPreviewWithOptions = (options: PDFGenOptions) => {
    if (bracketData) {
      // Ensure tournamentName from store is used if header is empty, or use the one from dialog
      const header = options.tournamentHeader || tournamentName;
      // console.log("Previewing PDF with options:", options);
      
      previewBracketPDF(bracketData, header, participantCount, options);
    }
  };

  // Handler for PDF preview
  const handlePreviewPDF = () => {
    if (bracketData) {
      // Pass the current orientation from the hook explicitly to ensure the preview uses it
      previewBracketPDF(bracketData, tournamentName, participantCount, { pdfOrientation: orientation });
    }
  };
  
  // Handler for closing the scoring modal
  const handleScoringModalClose = (open: boolean) => {
    setScoringModalOpen(open);
    if (!open) {
      setCurrentMatch(null);
      setSelectedMatch(null);
    }
  };
  
  if (!bracketData) {
    return null; // Will redirect in useEffect
  }
    return (
    <div className="p-2 sm:p-3 space-y-3 relative">
    <div className="flex flex-col  ">
      <div className="flex-1 ">
        {/* Main Bracket Display - ensuring no scrolling */}
        {/* <div className=" h-full w-full flex items-center justify-center p-3"> */}
          <div className="h-full w-full flex flex-col">            <BracketDisplay 
              bracketData={bracketData}
              onUpdateMatch={updateTournamentMatch}
              header={tournamentName}
              onMatchClick={(matchId, player1, player2) => {
                setSelectedMatch({ matchId, player1, player2 });
                setCurrentMatch(matchId);
                setScoringModalOpen(true);
              }}
            />
          </div>
        {/* </div> */}
        
        {/* Floating trigger button for details panel with animation */}
        <div className="absolute top-1/2 right-0 transform -translate-y-1/3">
          <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen} >
            <SheetTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm" 
                className={cn(
                  "h-12 w-8 rounded-l-md rounded-r-none shadow-md transition-all duration-300",
                  isDetailsOpen ? "opacity-0" : "opacity-100"
                )}
              >
                <ChevronLeft className="h-5 w-5 animate-pulse" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96 pt-12 overflow-y-auto">
              {/* <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4"
                onClick={() => setIsDetailsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button> */}
              
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Tournament Details</h3>
                
                {stats && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Tournament</span>
                      <span className="font-medium">{tournamentName}</span>
                    </div>
                  
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Participants</span>
                      <span className="font-medium">{stats.participants}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Rounds</span>
                      <span className="font-medium">{stats.rounds}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Matches</span>
                      <span className="font-medium">{stats.matches}</span>
                    </div>
                    
                    {stats.pools > 1 && (
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Pools</span>
                        <span className="font-medium">{stats.pools}</span>
                      </div>
                    )}
                  </div>
                )}
                  <div className="pt-4 space-y-3">
                  {/* Tournament Settings Section */}
                  <h4 className="text-md font-semibold mb-2">Tournament Settings</h4>
                  <Button 
                    onClick={() => setConfigModalOpen(true)}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Match Rounds
                  </Button>
                  
                  <Button 
                    onClick={exportMatchDataAsJson}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Export Match Results
                  </Button>
                
                  {/* Display Options */}
                  <h4 className="text-md font-semibold mb-2 mt-4">Display Options</h4>
                  <Button 
                    onClick={handleFullscreenToggle}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize className="mr-2 h-4 w-4" />
                        Exit Fullscreen
                      </>
                    ) : (
                      <>
                        <Maximize className="mr-2 h-4 w-4" />
                        Fullscreen
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handlePreviewPDF}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview PDF
                  </Button>
                  
                  <Button 
                    onClick={handleOpenPDFDialog} // Changed from handleDirectPDFExport
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  
                  <Button 
                    onClick={toggleOrientation}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    {orientation === "landscape" ? (
                      <>
                        <Minimize className="mr-2 h-4 w-4" />
                        Switch to Portrait
                      </>
                    ) : (
                      <>
                        <Maximize className="mr-2 h-4 w-4" />
                        Switch to Landscape
                      </>
                    )}
                  </Button>
                </div>
              </div>            </SheetContent>
          </Sheet>
        </div>

        {/* Floating PDF Download FAB - bottom right */}
        {bracketData && (
          <div className="fixed bottom-6 right-6 z-40 md:hidden">
            <Button 
              onClick={handleOpenPDFDialog}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all duration-200 hover:scale-105"
            >
              <Download className="h-6 w-6" />
              <span className="sr-only">Download PDF</span>
            </Button>
          </div>
        )}
      </div>
    </div>
      {/* Rounds configuration modal */}
    <RoundsConfigModal 
      open={configModalOpen} 
      onOpenChange={setConfigModalOpen}
    />
    {/* PDF Download Options Modal */}
    <PDFDownloadDialog
      open={pdfDialogOptionsOpen}
      onOpenChange={setPdfDialogOptionsOpen}
      defaultTournamentName={tournamentName}
      defaultOrientation={orientation}
      defaultOrganizerName="Professional Taekwondo Academy"
      onDownload={handlePDFExportWithOptions}
      onPreview={handlePDFPreviewWithOptions} // Pass the new preview handler
    />
      {/* Match scoring modal - pass selectedMatch details */}
    {selectedMatch && (
      <MatchScoringModal 
        open={scoringModalOpen} 
        onOpenChange={handleScoringModalClose} 
        match={selectedMatch}
        onScoringComplete={saveMatchResult}
      />
    )}
    </div>
  );
};

export default ViewTournament;