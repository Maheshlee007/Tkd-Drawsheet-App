import React, { useState } from "react";
import InputPanel from "@/components/InputPanel";
import BracketDisplay from "@/components/BracketDisplay";
import ExportModal from "@/components/ExportModal";
import { useTournament } from "@/hooks/useTournament";
import { useBracketPDF, PDFOrientation } from "@/hooks/useBracketPDF";
import { Button } from "@/components/ui/button";
import { ArrowBigUpDash, RefreshCw, FileText, Minimize, Maximize, Eye } from "lucide-react";
// import "../index.css"

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
  
  // Handler to generate bracket and hide input panel
  const handleGenerateBracket = (participants: string[], seedType: "random" | "ordered" | "as-entered") => {
    generateBracket(participants, seedType);
    setShowInputPanel(false);
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

  return (
    <div className="container mx-auto px-8 py-8 max-w-full " id="">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 text-center">Tournament Bracket Generator</h1>
        <p className="text-center text-slate-600 mt-2">Create single elimination tournament brackets with ease</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Input Panel or Stats Panel */}
        <div className="lg:col-span-1">
          {showInputPanel ? (
            /* Input Panel */
            <InputPanel 
              onGenerateBracket={handleGenerateBracket}
              isPending={isPending}
            />
          ) : (
            /* Stats Panel */
            <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Tournament Details</h2>
              
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
                  onClick={handleReset}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  New Tournament
                </Button>
                
                <Button 
                  onClick={openExportModal}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export Options
                </Button>
                
                <Button 
                  onClick={handleDirectPDFExport}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <ArrowBigUpDash className="mr-2 h-4 w-4" />
                  Download PDF
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
          )}
        </div>
        
        {/* Bracket Display */}
        <div className="lg:col-span-3">
          <BracketDisplay 
            bracketData={bracketData}
            onExport={openExportModal}
            onUpdateMatch={updateTournamentMatch}
          />
        </div>
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
