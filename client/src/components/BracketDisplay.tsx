import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BracketMatch } from "@shared/schema";
import { calculateBracketConnectors } from "@/lib/bracketUtils";
import { Download } from "lucide-react";

interface BracketDisplayProps {
  bracketData: BracketMatch[][] | null;
  onExport: () => void;
}

const BracketDisplay: React.FC<BracketDisplayProps> = ({ bracketData, onExport }) => {
  const [connectors, setConnectors] = useState<
    Array<{ left: number; top: number; width?: number; height?: number; type: string }>
  >([]);
  const bracketContainerRef = useRef<HTMLDivElement>(null);

  // Calculate connector lines when the bracket data changes
  useEffect(() => {
    if (bracketData && bracketContainerRef.current) {
      const newConnectors = calculateBracketConnectors(bracketData, bracketContainerRef.current);
      setConnectors(newConnectors);
    }
  }, [bracketData]);

  // If no bracket data is available, show empty state
  if (!bracketData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Tournament Bracket</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-slate-700 mb-2">No Bracket Generated</h3>
          <p className="text-slate-500 max-w-sm">Enter your tournament participants and click "Generate Bracket" to see your tournament structure.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Tournament Bracket</h2>
        <Button
          onClick={onExport}
          variant="outline"
          className="inline-flex items-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>

      <div className="overflow-x-auto" ref={bracketContainerRef}>
        <div className="bracket-display min-w-[750px] relative pb-8" style={{ minHeight: bracketData.length > 2 ? 400 : 200 }}>
          {/* Render rounds */}
          {bracketData.map((round, roundIndex) => (
            <div
              key={`round-${roundIndex}`}
              className="bracket-round flex flex-col justify-around absolute"
              style={{
                left: `${roundIndex * 208}px`,
                top: 0,
                bottom: 0,
                width: "12rem",
              }}
            >
              {round.map((match, matchIndex) => (
                <div
                  key={`match-${match.id}`}
                  className="bracket-match p-3 border border-slate-200 rounded-md bg-white shadow-sm relative mb-4"
                  data-match-id={match.id}
                >
                  {/* First participant */}
                  <div
                    className={`participant p-2 mb-1 text-sm rounded-r-sm ${
                      match.winner === match.participants[0]
                        ? "border-l-4 border-primary bg-slate-50"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <span className={match.winner === match.participants[0] ? "font-medium" : ""}>
                      {match.participants[0] || "TBD"}
                    </span>
                  </div>
                  
                  {/* Second participant */}
                  <div
                    className={`participant p-2 text-sm rounded-r-sm ${
                      match.winner === match.participants[1]
                        ? "border-l-4 border-primary bg-slate-50"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <span className={match.winner === match.participants[1] ? "font-medium" : ""}>
                      {match.participants[1] || "TBD"}
                    </span>
                  </div>

                  {/* Show winner badge for final match */}
                  {roundIndex === bracketData.length - 1 && match.winner && (
                    <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 bg-primary text-white text-xs py-1 px-2 rounded-full">
                      Winner
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Render connector lines */}
          {connectors.map((connector, index) => (
            <div
              key={`connector-${index}`}
              className={`bracket-connector ${connector.type === "horizontal" ? "connector-horizontal" : "connector-vertical"}`}
              style={{
                left: `${connector.left}px`,
                top: `${connector.top}px`,
                width: connector.width ? `${connector.width}px` : undefined,
                height: connector.height ? `${connector.height}px` : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketDisplay;
