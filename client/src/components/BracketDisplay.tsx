import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BracketMatch } from "@shared/schema";
import { calculateBracketConnectors } from "@/lib/bracketUtils";
import { Download, FileText, Printer } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BracketDisplayProps {
  bracketData: BracketMatch[][] | null;
  onExport: () => void;
}

const BracketDisplay: React.FC<BracketDisplayProps> = ({
  bracketData,
  onExport,
}) => {
  const [connectors, setConnectors] = useState<
    Array<{
      left: number;
      top: number;
      width?: number;
      height?: number;
      type: string;
    }>
  >([]);
  const [poolCount, setPoolCount] = useState<number>(1);
  const [activePool, setActivePool] = useState<number>(0);
  const [pooledBrackets, setPooledBrackets] = useState<BracketMatch[][][]>([]);
  const bracketContainerRef = useRef<HTMLDivElement>(null);

  // Calculate connector lines when the bracket data changes
  useEffect(() => {
    if (bracketData && bracketContainerRef.current) {
      // Wait for the DOM to update before calculating connectors
      setTimeout(() => {
        const newConnectors = calculateBracketConnectors(
          bracketData,
          bracketContainerRef.current!,
        );
        setConnectors(newConnectors);
      }, 50);
    }
  }, [bracketData, activePool]);

  // Organize brackets into pools
  useEffect(() => {
    if (!bracketData) return;

    // Determine number of pools based on bracket size
    const totalMatches = bracketData[0].length;
    let pools = 1;
    
    if (totalMatches <= 16) pools = 1;
    else if (totalMatches <= 32) pools = 2;
    else if (totalMatches <= 64) pools = 4;
    else pools = 8;

    setPoolCount(pools);

    // Split the first round into pools and generate separate brackets
    if (pools > 1 && bracketData.length > 0) {
      const poolBrackets: BracketMatch[][][] = [];
      const firstRound = bracketData[0];
      const matchesPerPool = Math.ceil(firstRound.length / pools);
      
      // Create pools
      for (let i = 0; i < pools; i++) {
        const poolMatches = firstRound.slice(i * matchesPerPool, (i + 1) * matchesPerPool);
        if (poolMatches.length > 0) {
          // Each pool gets its own copy of the bracket structure
          const poolBracket: BracketMatch[][] = [poolMatches];
          poolBrackets.push(poolBracket);
        }
      }
      
      setPooledBrackets(poolBrackets);
    } else {
      // If only one pool, use the full bracket
      setPooledBrackets([bracketData]);
    }
  }, [bracketData]);

  // If no bracket data is available, show empty state
  if (!bracketData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">
            Tournament Bracket
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-slate-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            No Bracket Generated
          </h3>
          <p className="text-slate-500 max-w-sm">
            Enter your tournament participants and click "Generate Bracket" to
            see your tournament structure.
          </p>
        </div>
      </div>
    );
  }

  // Function to get style class for participant
  const getParticipantStyle = (participant: string | null, hasBye: boolean, isTop: boolean) => {
    if (participant === "(bye)") {
      return "border-l-4 border-green-400 bg-green-50 text-green-700";
    }
    
    if (hasBye) {
      // Style for player with a bye (green left border and light green background)
      return "border-l-4 border-green-400 bg-green-50";
    }
    
    // Normal participant styling (blue for top, red for bottom)
    return isTop
      ? "border-l-4 border-blue-400 bg-blue-50"
      : "border-l-4 border-red-400 bg-red-50";
  };

  // Add print functionality
  const handlePrint = () => {
    window.print();
  };

  // Display bracket for the selected pool
  const currentBracket = pooledBrackets[activePool] || bracketData;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">
          Tournament Bracket
        </h2>
        <div className="flex space-x-2">
          <Button
            onClick={onExport}
            variant="outline"
            className="inline-flex items-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="inline-flex items-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Show pool tabs if more than one pool */}
      {poolCount > 1 && (
        <Tabs 
          defaultValue="0" 
          className="mb-4"
          onValueChange={(value) => setActivePool(parseInt(value))}
        >
          <TabsList className="mb-4 border-b w-full rounded-none bg-transparent justify-start">
            {Array.from({ length: poolCount }).map((_, index) => (
              <TabsTrigger
                key={`pool-${index}`}
                value={index.toString()}
                className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600"
              >
                Pool {index + 1}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="overflow-x-auto print:w-full" ref={bracketContainerRef}>
        <div
          className="bracket-display relative pb-8 print:pb-0 print:landscape print:mt-0"
          style={{ minHeight: currentBracket.length > 2 ? 500 : 300 }}
        >
          {/* Render rounds */}
          {currentBracket.map((round, roundIndex) => (
            <div
              key={`round-${roundIndex}`}
              className="bracket-round print:pl-2 print:pt-2"
              style={{
                width: "220px",
              }}
            >
              {round.map((match, matchIndex) => {
                // Determine if either participant has a bye in a previous round
                const hasByeTop = match.participants[0] !== null && match.participants[0] !== "(bye)" && 
                  match.participants[0]?.toLowerCase().includes("player") && 
                  (round[matchIndex]?.participants[0] === "(bye)" || match.participants[0] === "(bye)");
                  
                const hasByeBottom = match.participants[1] !== null && match.participants[1] !== "(bye)" && 
                  match.participants[1]?.toLowerCase().includes("player") && 
                  (round[matchIndex]?.participants[1] === "(bye)" || match.participants[1] === "(bye)");

                return (
                  <div
                    key={`match-${match.id}`}
                    className="bracket-match p-3 border border-slate-200 rounded-md bg-white shadow-sm relative mb-4 print:mb-2 print:p-2 print:shadow-none print:bg-gray-50"
                    data-match-id={match.id}
                  >
                    {/* First participant */}
                    <div
                      className={`participant p-2 mb-1 text-sm rounded-r-sm print:p-1 ${
                        getParticipantStyle(match.participants[0], hasByeTop, true)
                      } ${
                        match.winner === match.participants[0] ? "font-medium" : ""
                      }`}
                    >
                      {match.participants[0] === "(bye)" ? "(bye)" : (match.participants[0] || "")}
                    </div>

                    {/* Second participant */}
                    <div
                      className={`participant p-2 text-sm rounded-r-sm print:p-1 ${
                        getParticipantStyle(match.participants[1], hasByeBottom, false)
                      } ${
                        match.winner === match.participants[1] ? "font-medium" : ""
                      }`}
                    >
                      {match.participants[1] === "(bye)" ? "(bye)" : (match.participants[1] || "")}
                    </div>

                    {/* Show winner badge for final match */}
                    {roundIndex === currentBracket.length - 1 && match.winner && (
                      <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 bg-primary text-white text-xs py-1 px-2 rounded-full print:hidden">
                        Winner
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Render connector lines */}
          {connectors.map((connector, index) => (
            <div
              key={`connector-${index}`}
              className={`bracket-connector ${connector.type === "horizontal" ? "connector-horizontal" : "connector-vertical"} print:border-gray-400`}
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

      {/* Print-specific styles - added to the page via style tag */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .bracket-display, .bracket-display * {
            visibility: visible;
          }
          .bracket-display {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 10mm !important;
          }
          .bracket-round {
            page-break-after: always;
          }
          .bracket-connector {
            border-color: #888 !important;
          }
          @page {
            size: landscape;
            margin: 0.5cm;
          }
        }
      `}} />
    </div>
  );
};

export default BracketDisplay;
