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
    participantCount,
    bracketData,
    isExportModalOpen,
    isPending,
    generateBracket,
    openExportModal,
    closeExportModal,
    exportAsPNG,
    exportAsPDF,
    copyToClipboard,
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
    const totalMatches =participantCount-1 // bracketData.flat().length;//this includes byes 
    
    // Count participants
    // const matches = bracketData[0];
    // let participantCount = 0;
    // let byeCount = 0;
    
    // matches.forEach(match => {
    //   if (match.participants[0] && match.participants[0] !== "(bye)") participantCount++;
    //   if (match.participants[1] && match.participants[1] !== "(bye)") participantCount++;
    //   if (match.participants[0] === "(bye)") byeCount++;
    //   if (match.participants[1] === "(bye)") byeCount++;
    // });
    
    // Calculate pools (if more than 16 participants)
    let poolCount = 1;
    if (participantCount > 16) {
      poolCount = Math.ceil(participantCount / 16);
    }
    
    return {
      participants: participantCount,
      rounds: totalRounds,
      matches: totalMatches,
      // byes: byeCount,
      pools: poolCount
    };
  };
  
  const stats = calculateStats();

  return (<>
    <div className="container mx-auto px-8 py-8 max-w-full " id="">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 text-center">Tournament Bracket Generator</h1>
        <p className="text-center text-slate-600 mt-2">Create single elimination tournament brackets with ease</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Input Panel or Stats Panel */}
        <div className="lg:col-span-1  ">
          {showInputPanel ? (
            <InputPanel onGenerateBracket={handleGenerateBracket} />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-0">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Tournament Statistics</h2>
              
              {stats && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col w-32 p-3 border rounded-md border-slate-200 bg-slate-50">
                    <span className="text-slate-600 text-sm">Participants</span>
                    <span className="font-medium text-lg">{stats.participants}</span>
                  </div>
                  <div className="flex flex-col w-32 p-3 border rounded-md border-slate-200 bg-slate-50">
                    <span className="text-slate-600 text-sm">Pools</span>
                    <span className="font-medium text-lg">{stats.pools}</span>
                  </div>
                  <div className="flex flex-col w-32 p-3 border rounded-md border-slate-200 bg-slate-50">
                    <span className="text-slate-600 text-sm">Total Matches</span>
                    <span className="font-medium text-lg">{stats.matches}</span>
                  </div>
                  <div className="flex flex-col w-32 p-3 border rounded-md border-slate-200 bg-slate-50">
                    <span className="text-slate-600 text-sm">Rounds</span>
                    <span className="font-medium text-lg">{stats.rounds}</span>
                  </div>
                </div>
              )}
              
              <Button 
                className="w-full mt-6 flex items-center justify-center"
                onClick={handleReset}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Bracket
              </Button>
              
              {bracketData && (
                <>
                  <div className="mt-4 bg-slate-100 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">PDF Export Options</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Orientation:</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={toggleOrientation}
                      >
                        {orientation === "landscape" ? (
                          <>
                            <Maximize className="h-3 w-3" />
                            <span>Landscape</span>
                          </>
                        ) : (
                          <>
                            <Minimize className="h-3 w-3 rotate-90" />
                            <span>Portrait</span>
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button
                        className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handlePreviewPDF}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      
                      <Button
                        className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleDirectPDFExport}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Save PDF
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bracket Display */}
        <div className="lg:col-span-3 ">
          <BracketDisplay bracketData={bracketData} onExport={exportAsPDF} />
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
    <div className="fixed bottom-0 right-0 bg-blue-700 text-white rounded-full p-2 z-1  mx-2" >
    <a href="#"  ><ArrowBigUpDash size={32} fill="white"/></a></div>
    
    </>
  );
};

export default Home;
