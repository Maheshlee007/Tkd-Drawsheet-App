import React, { useState, useEffect } from "react";
import InputPanel from "@/components/InputPanel";
import BracketDisplay from "@/components/BracketDisplay";
import ExportModal from "@/components/ExportModal";
import Navbar from "@/components/Navbar";
import { useTournament } from "@/hooks/useTournament";
import { useBracketPDF } from "@/hooks/useBracketPDF";
import { Button } from "@/components/ui/button";
import {
  ArrowBigUpDash,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Maximize,
  Minimize,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const Home: React.FC = () => {
  const {
    participantCount=0,
    bracketData,
    isExportModalOpen,
    isPending,
    generateBracket,
    openExportModal,
    closeExportModal,
    exportAsPNG,
    exportAsPDF,
    copyToClipboard,
    updateTournamentMatch,
  } = useTournament();
  
  // Import both the standard and preview PDF generation functionality
  const { generateBracketPDF, previewBracketPDF, orientation, toggleOrientation } = useBracketPDF();
  
  const [showInputPanel, setShowInputPanel] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState<boolean>(true);
  const [tournamentheader, setTournamentheader] = useState("");
  
  // Handler to generate bracket and hide input panel
  const handleGenerateBracket = (participants: string[], seedType: "random" | "ordered" | "as-entered",name:string) => {
    generateBracket(participants, seedType);
    setShowInputPanel(false);
    // Open details panel by default after generation
    setIsDetailsPanelOpen(true);
    setTournamentheader(name);
    
    // Auto-close the details panel after 2.5 seconds
    setTimeout(() => {
      setIsDetailsPanelOpen(false);
    }, 2500);
  };
  
  // Reset function to show input panel again
  const handleReset = () => {
    setShowInputPanel(true);
  };
  
  // Handler for direct PDF generation
  const handleDirectPDFExport = () => {
    if (bracketData) {
      generateBracketPDF(bracketData, "Tournament Bracket", participantCount);
    }
  };
  
  // Handler for PDF preview
  const handlePreviewPDF = () => {
    if (bracketData) {
      previewBracketPDF(bracketData, "Tournament Bracket", participantCount);
    }
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };
  
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


  
  // Calculate tournament statistics
  const calculateStats = () => {
    if (!bracketData) return null;
    
    const totalRounds = bracketData.length;
    const totalMatches = participantCount - 1; // This is the correct formula for single elimination
    
    // Calculate pools (if more than 16 participants)
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

  // Tournament details component that can be used in the side panel
  const TournamentDetails = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Tournament Details</h2>
      
      {stats && (
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-600">Participants</span>
            <span className="font-medium text-slate-800">{stats.participants}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-600">Rounds</span>
            <span className="font-medium text-slate-800">{stats.rounds}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-600">Matches</span>
            <span className="font-medium text-slate-800">{stats.matches}</span>
          </div>
          
          {stats.pools > 1 && (
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Pools</span>
              <span className="font-medium text-slate-800">{stats.pools}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="pt-4 space-y-3">
        <Button 
          onClick={openExportModal}
          variant="outline" 
          className="w-full justify-start"
        >
          <FileText className="mr-2 h-4 w-4" />
          Export Options
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
          onClick={handleDirectPDFExport}
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
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <Navbar 
        showNewButton={!showInputPanel}
        onNewTournament={handleReset}
        onDownloadPDF={bracketData ? handleDirectPDFExport : undefined}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <div className="flex-1 overflow-auto">
        {showInputPanel ? (
          /* Before generation: Input Panel at the top */
          <div className="container mx-auto px-4 py-4 lg:px-8 lg:py-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                Enter Tournament Participants
              </h2>
              <InputPanel 
                onGenerateBracket={handleGenerateBracket}
                isPending={isPending}
              />
            </div>
          </div>
        ) : (
          /* After generation: Full-screen bracket with side drawer for details */
          <div className="relative h-full">
            {/* Mobile Download Button */}
            <div className="md:hidden fixed bottom-6 right-6 z-10">
              <Button 
                size="icon" 
                onClick={handleDirectPDFExport}
                className="h-12 w-12 rounded-full shadow-lg bg-primary text-white"
              >
                <Download className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Side Drawer for Tournament Details */}
            <div className={`fixed top-16 bottom-0 right-0 z-20 bg-white shadow-lg transition-transform duration-300 w-80 md:w-96 ${isDetailsPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="h-full overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-800">Tournament Details</h2>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsDetailsPanelOpen(false)}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {stats && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">Participants</span>
                        <span className="font-medium text-slate-800">{stats.participants}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">Rounds</span>
                        <span className="font-medium text-slate-800">{stats.rounds}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">Matches</span>
                        <span className="font-medium text-slate-800">{stats.matches}</span>
                      </div>
                      
                      {stats.pools > 1 && (
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600">Pools</span>
                          <span className="font-medium text-slate-800">{stats.pools}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-6 space-y-3">
                    {/* <Button 
                      onClick={openExportModal}
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export Options
                    </Button> */}
                    
                    <Button 
                      onClick={handlePreviewPDF}
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview PDF
                    </Button>
                    
                    <Button 
                      onClick={handleDirectPDFExport}
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
                </div>
              </div>
            </div>
            
            {/* Toggle button for details panel when closed */}
            {!isDetailsPanelOpen && (
              <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-20">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setIsDetailsPanelOpen(true)}
                  className="h-12 w-8 rounded-l-md rounded-r-none shadow-md"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>
            )}
            
            {/* Main Bracket Display */}
            <div className={`h-full transition-all duration-300 ${isDetailsPanelOpen ? 'mr-80 md:mr-96' : 'mr-0'}`}>
              <div className="container mx-auto px-4 py-4 h-full">
                <BracketDisplay 
                  bracketData={bracketData}
                  onExport={openExportModal}
                  onUpdateMatch={updateTournamentMatch}
                  header={tournamentheader}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={closeExportModal}
        onExportAsPNG={exportAsPNG}
        onExportAsPDF={exportAsPDF}
        onCopyToClipboard={copyToClipboard}
      />
    </div>
  );
};

export default Home;
