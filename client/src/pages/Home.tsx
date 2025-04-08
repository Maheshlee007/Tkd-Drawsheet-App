import React, { useState } from "react";
import InputPanel from "@/components/InputPanel";
import BracketDisplay from "@/components/BracketDisplay";
import ExportModal from "@/components/ExportModal";
import { useTournament } from "@/hooks/useTournament";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const Home: React.FC = () => {
  const {
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
  
  // Calculate tournament statistics
  const calculateStats = () => {
    if (!bracketData) return null;
    
    const totalRounds = bracketData.length;
    const totalMatches = bracketData.flat().length;
    
    // Count participants
    const matches = bracketData[0];
    let participantCount = 0;
    let byeCount = 0;
    
    matches.forEach(match => {
      if (match.participants[0] && match.participants[0] !== "(bye)") participantCount++;
      if (match.participants[1] && match.participants[1] !== "(bye)") participantCount++;
      if (match.participants[0] === "(bye)") byeCount++;
      if (match.participants[1] === "(bye)") byeCount++;
    });
    
    // Calculate pools (if more than 16 participants)
    let poolCount = 1;
    if (participantCount > 16) {
      poolCount = Math.ceil(participantCount / 16);
    }
    
    return {
      participants: participantCount,
      rounds: totalRounds,
      matches: totalMatches,
      byes: byeCount,
      pools: poolCount
    };
  };
  
  const stats = calculateStats();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 text-center">Tournament Bracket Generator</h1>
        <p className="text-center text-slate-600 mt-2">Create single elimination tournament brackets with ease</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel or Stats Panel */}
        <div className="lg:col-span-1">
          {showInputPanel ? (
            <InputPanel onGenerateBracket={handleGenerateBracket} />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Tournament Statistics</h2>
              
              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col p-3 border rounded-md border-slate-200 bg-slate-50">
                    <span className="text-slate-600 text-sm">Participants</span>
                    <span className="font-medium text-lg">{stats.participants}</span>
                  </div>
                  <div className="flex flex-col p-3 border rounded-md border-slate-200 bg-slate-50">
                    <span className="text-slate-600 text-sm">Pools</span>
                    <span className="font-medium text-lg">{stats.pools}</span>
                  </div>
                  <div className="flex flex-col p-3 border rounded-md border-slate-200 bg-slate-50">
                    <span className="text-slate-600 text-sm">Total Matches</span>
                    <span className="font-medium text-lg">{stats.matches}</span>
                  </div>
                  <div className="flex flex-col p-3 border rounded-md border-slate-200 bg-slate-50">
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
            </div>
          )}
        </div>

        {/* Bracket Display */}
        <div className="lg:col-span-2">
          <BracketDisplay bracketData={bracketData} onExport={openExportModal} />
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
