import React, { useState } from "react";
import InputPanel from "@/components/InputPanel";
import BracketDisplay from "@/components/BracketDisplay";
import ExportModal from "@/components/ExportModal";
import { useTournament } from "@/hooks/useTournament";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  
  const [enableAnimation, setEnableAnimation] = useState(true);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 text-center">Tournament Bracket Generator</h1>
        <p className="text-center text-slate-600 mt-2">Create single elimination tournament brackets with ease</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <InputPanel onGenerateBracket={generateBracket} />
          
          {/* Animation Toggle */}
          {bracketData && (
            <div className="mt-6 p-4 rounded-lg border bg-white shadow-sm">
              <div className="flex items-center space-x-2 justify-between">
                <div>
                  <h3 className="text-lg font-medium">Tournament Animation</h3>
                  <p className="text-sm text-muted-foreground">
                    Watch how matches progress through the tournament
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="animation-mode" 
                    checked={enableAnimation}
                    onCheckedChange={setEnableAnimation}
                  />
                  <Label htmlFor="animation-mode">
                    {enableAnimation ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bracket Display */}
        <div className="lg:col-span-2">
          <BracketDisplay 
            bracketData={bracketData} 
            onExport={openExportModal} 
            enableAnimation={enableAnimation}
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
