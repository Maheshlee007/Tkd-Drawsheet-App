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

// Function to determine if a player had a bye in the previous round
function previousRoundHadBye(playerName: string, bracketData: BracketMatch[][], currentRound: number): boolean {
  if (currentRound <= 0 || !bracketData[currentRound - 1]) return false;
  
  // Find the player in the previous round
  const prevRound = bracketData[currentRound - 1];
  
  for (const match of prevRound) {
    // If this player faced a bye in the previous round
    if (
      (match.participants[0] === playerName && match.participants[1] === "(bye)") ||
      (match.participants[1] === playerName && match.participants[0] === "(bye)")
    ) {
      return true;
    }
  }
  
  return false;
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
    if (!bracketData || !bracketContainerRef.current) return;
    
    // Wait for the DOM to update before calculating connectors
    setTimeout(() => {
      // For single pool view, calculate connectors directly
      if (poolCount <= 1) {
        const newConnectors = calculateBracketConnectors(
          bracketData,
          bracketContainerRef.current!,
        );
        setConnectors(newConnectors);
      } else {
        // For multiple pools, we'll calculate connectors for each pool
        const allConnectors: Array<{
          left: number;
          top: number;
          width?: number;
          height?: number;
          type: string;
        }> = [];
        
        // Calculate connectors for the active pool only when printing
        if (window.matchMedia('print').matches) {
          const activePoolContainer = bracketContainerRef.current!.querySelector(
            `.bracket-display[data-pool="${activePool}"]`
          ) as HTMLElement;
          
          if (activePoolContainer) {
            const poolConnectors = calculateBracketConnectors(
              pooledBrackets[activePool],
              activePoolContainer
            );
            allConnectors.push(...poolConnectors);
          }
        } else {
          // Calculate connectors for all pools
          const poolContainers = bracketContainerRef.current!.querySelectorAll(
            '.bracket-display[data-pool]'
          );
          
          poolContainers.forEach((container, index) => {
            if (index < pooledBrackets.length) {
              const poolConnectors = calculateBracketConnectors(
                pooledBrackets[index],
                container as HTMLElement
              );
              allConnectors.push(...poolConnectors);
            }
          });
        }
        
        setConnectors(allConnectors);
      }
    }, 100); // Increased timeout to ensure DOM is fully updated
  }, [bracketData, pooledBrackets, poolCount, activePool]);

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

    // Split the first round into pools and generate separate brackets for export
    if (pools > 1 && bracketData.length > 0) {
      const poolBrackets: BracketMatch[][][] = [];
      const firstRound = bracketData[0];
      const matchesPerPool = Math.ceil(firstRound.length / pools);
      
      // Create pools
      for (let i = 0; i < pools; i++) {
        const poolMatches = firstRound.slice(i * matchesPerPool, (i + 1) * matchesPerPool);
        if (poolMatches.length > 0) {
          // Create a full bracket structure for each pool (for export)
          // This doesn't affect the display - just used for printing/export
          const poolBracket: BracketMatch[][] = [poolMatches];
          
          // Add rest of the rounds for this pool (for complete export brackets)
          for (let r = 1; r < bracketData.length; r++) {
            // Filter matches in this round that are connected to this pool
            const relevantMatches = bracketData[r].filter(match => {
              // Check if any of the matches in the previous round from this pool
              // lead to this match in the current round
              const prevRoundPoolMatches = r === 1 ? poolMatches : poolBracket[r - 1];
              return prevRoundPoolMatches.some(prevMatch => prevMatch.nextMatchId === match.id);
            });
            
            poolBracket.push(relevantMatches);
          }
          
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
  const getParticipantStyle = (participant: string | null, hasMatchBye: boolean, isOpponentBye: boolean, isTop: boolean) => {
    if (participant === "(bye)") {
      // Style for bye placeholder (gray with green border)
      return "border-l-4 border-green-400 bg-gray-100 text-gray-500";
    }
    
    if (isOpponentBye) {
      // Style for player who got a bye (green left border and light green background)
      return "border-l-4 border-green-400 bg-green-50";
    }
    
    if (hasMatchBye) {
      // Style for player from a match that had a bye elsewhere
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

      {/* Pool count information */}
      {poolCount > 1 && (
        <div className="mb-6">
          <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
            <p className="text-slate-700 font-medium">
              Tournament divided into {poolCount} pools for better organization
            </p>
          </div>
        </div>
      )}

      {/* For printing/exporting, we use the active pool */}
      <div className="hidden print:block">
        <div className="print-header text-center mb-6">
          <h2 className="text-xl font-bold text-black">Tournament Bracket - Pool {activePool + 1}</h2>
        </div>
        <div className="overflow-x-auto w-full" ref={bracketContainerRef}>
          <div
            className="bracket-display relative pb-0 landscape mt-0 flex justify-start"
            data-pool={activePool}
            style={{ minHeight: pooledBrackets[activePool]?.length > 2 ? 500 : 300 }}
          >
            {/* Render rounds for print/export */}
            {pooledBrackets[activePool]?.map((round, roundIndex) => (
              <div
                key={`print-round-${roundIndex}`}
                className="bracket-round"
                style={{
                  width: "180px",
                  marginLeft: roundIndex > 0 ? "20px" : "0"
                }}
              >
                {round.map((match, matchIndex) => {
                  const isFirstRound = roundIndex === 0;
                  const hasOpponentByeTop = match.participants[0] !== null && match.participants[1] === "(bye)";
                  const hasOpponentByeBottom = match.participants[1] !== null && match.participants[0] === "(bye)";
                  const hasMatchByeTop = !isFirstRound && match.participants[0] !== null && 
                                      match.participants[0] !== "(bye)" &&
                                      previousRoundHadBye(match.participants[0], bracketData, roundIndex);
                  const hasMatchByeBottom = !isFirstRound && match.participants[1] !== null && 
                                        match.participants[1] !== "(bye)" &&
                                        previousRoundHadBye(match.participants[1], bracketData, roundIndex);

                  return (
                    <div
                      key={`print-match-${match.id}`}
                      className="bracket-match border border-slate-200 rounded-md bg-gray-50 relative mb-1 p-0"
                      data-match-id={match.id}
                    >
                      <div
                        className={`participant py-0 px-1 text-sm rounded-none ${
                          getParticipantStyle(match.participants[0], hasMatchByeTop, hasOpponentByeTop, true)
                        } ${match.winner === match.participants[0] ? "font-medium" : ""}`}
                      >
                        {match.participants[0] === "(bye)" ? "(bye)" : (match.participants[0] || "")}
                      </div>
                      <div
                        className={`participant py-0 px-1 text-sm rounded-none ${
                          getParticipantStyle(match.participants[1], hasMatchByeBottom, hasOpponentByeBottom, false)
                        } ${match.winner === match.participants[1] ? "font-medium" : ""}`}
                      >
                        {match.participants[1] === "(bye)" ? "(bye)" : (match.participants[1] || "")}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Render connector lines for print */}
            {connectors.map((connector, index) => (
              <div
                key={`print-connector-${index}`}
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
      </div>

      {/* Display all pools together for normal view */}
      <div className="print:hidden">
        {poolCount > 1 ? (
          // Multiple pools with full pool view option
          <div>
            {/* View selector - full view or grid view */}
            <div className="mb-4">
              <Tabs defaultValue="grid" className="mb-4">
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="grid">Grid View</TabsTrigger>
                  <TabsTrigger value="full">Full View</TabsTrigger>
                </TabsList>
                <TabsContent value="grid">
                  {/* Grid View - Each pool is displayed in a grid */}
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {pooledBrackets.map((poolBracket, poolIndex) => (
                      <div key={`pool-${poolIndex}`} className="space-y-4">
                        <h3 className="text-lg font-medium text-slate-800 mb-2">Pool {poolIndex + 1}</h3>
                        <div className="overflow-x-auto">
                          <div
                            className="bracket-display relative pb-8 flex justify-start"
                            data-pool={poolIndex}
                            style={{ minHeight: poolBracket.length > 2 ? 400 : 250 }}
                          >
                            {/* Render rounds for this pool */}
                            {poolBracket.map((round, roundIndex) => (
                              <div
                                key={`pool-${poolIndex}-round-${roundIndex}`}
                                className="bracket-round"
                                style={{
                                  width: "180px",
                                  marginLeft: roundIndex > 0 ? "20px" : "0"
                                }}
                              >
                                {round.map((match, matchIndex) => {
                                  const isFirstRound = roundIndex === 0;
                                  const hasOpponentByeTop = match.participants[0] !== null && match.participants[1] === "(bye)";
                                  const hasOpponentByeBottom = match.participants[1] !== null && match.participants[0] === "(bye)";
                                  const hasMatchByeTop = !isFirstRound && match.participants[0] !== null && 
                                                      match.participants[0] !== "(bye)" &&
                                                      previousRoundHadBye(match.participants[0], bracketData, roundIndex);
                                  const hasMatchByeBottom = !isFirstRound && match.participants[1] !== null && 
                                                        match.participants[1] !== "(bye)" &&
                                                        previousRoundHadBye(match.participants[1], bracketData, roundIndex);

                                  return (
                                    <div
                                      key={`pool-${poolIndex}-match-${match.id}`}
                                      className="bracket-match p-1 border border-slate-200 rounded-md bg-white shadow-sm relative mb-2"
                                      data-match-id={match.id}
                                    >
                                      <div
                                        className={`participant py-0.5 px-1 mb-0.5 text-sm rounded-r-sm ${
                                          getParticipantStyle(match.participants[0], hasMatchByeTop, hasOpponentByeTop, true)
                                        } ${match.winner === match.participants[0] ? "font-medium" : ""}`}
                                      >
                                        {match.participants[0] === "(bye)" ? "(bye)" : (match.participants[0] || "")}
                                      </div>
                                      <div
                                        className={`participant py-0.5 px-1 text-sm rounded-r-sm ${
                                          getParticipantStyle(match.participants[1], hasMatchByeBottom, hasOpponentByeBottom, false)
                                        } ${match.winner === match.participants[1] ? "font-medium" : ""}`}
                                      >
                                        {match.participants[1] === "(bye)" ? "(bye)" : (match.participants[1] || "")}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                            
                            {/* Render connector lines for this pool */}
                            {connectors
                              .filter(conn => {
                                // Only show connectors for this pool's container
                                const poolContainer = document.querySelector(`.bracket-display[data-pool="${poolIndex}"]`);
                                return poolContainer && poolContainer.contains(document.elementFromPoint(conn.left, conn.top));
                              })
                              .map((connector, index) => (
                                <div
                                  key={`pool-${poolIndex}-connector-${index}`}
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
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="full">
                  {/* Full View - All pools displayed vertically */}
                  <div className="space-y-12">
                    {pooledBrackets.map((poolBracket, poolIndex) => (
                      <div key={`full-pool-${poolIndex}`} className="space-y-4 border-b pb-8 last:border-b-0">
                        <h3 className="text-xl font-semibold text-slate-800 mb-4">Pool {poolIndex + 1}</h3>
                        <div className="overflow-x-auto">
                          <div
                            className="bracket-display relative pb-8 flex justify-start"
                            data-pool={poolIndex}
                            style={{ minHeight: poolBracket.length > 2 ? 400 : 250 }}
                          >
                            {/* Render rounds for this pool */}
                            {poolBracket.map((round, roundIndex) => (
                              <div
                                key={`full-pool-${poolIndex}-round-${roundIndex}`}
                                className="bracket-round"
                                style={{
                                  width: "180px",
                                  marginLeft: roundIndex > 0 ? "20px" : "0"
                                }}
                              >
                                {round.map((match, matchIndex) => {
                                  const isFirstRound = roundIndex === 0;
                                  const hasOpponentByeTop = match.participants[0] !== null && match.participants[1] === "(bye)";
                                  const hasOpponentByeBottom = match.participants[1] !== null && match.participants[0] === "(bye)";
                                  const hasMatchByeTop = !isFirstRound && match.participants[0] !== null && 
                                                      match.participants[0] !== "(bye)" &&
                                                      previousRoundHadBye(match.participants[0], bracketData, roundIndex);
                                  const hasMatchByeBottom = !isFirstRound && match.participants[1] !== null && 
                                                        match.participants[1] !== "(bye)" &&
                                                        previousRoundHadBye(match.participants[1], bracketData, roundIndex);
                                  
                                  return (
                                    <div
                                      key={`full-pool-${poolIndex}-match-${match.id}`}
                                      className="bracket-match p-1 border border-slate-200 rounded-md bg-white shadow-sm relative mb-2"
                                      data-match-id={match.id}
                                    >
                                      <div
                                        className={`participant py-0.5 px-1 mb-0.5 text-sm rounded-r-sm ${
                                          getParticipantStyle(match.participants[0], hasMatchByeTop, hasOpponentByeTop, true)
                                        } ${match.winner === match.participants[0] ? "font-medium" : ""}`}
                                      >
                                        {match.participants[0] === "(bye)" ? "(bye)" : (match.participants[0] || "")}
                                      </div>
                                      <div
                                        className={`participant py-0.5 px-1 text-sm rounded-r-sm ${
                                          getParticipantStyle(match.participants[1], hasMatchByeBottom, hasOpponentByeBottom, false)
                                        } ${match.winner === match.participants[1] ? "font-medium" : ""}`}
                                      >
                                        {match.participants[1] === "(bye)" ? "(bye)" : (match.participants[1] || "")}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                            
                            {/* Render connector lines for this pool */}
                            {connectors
                              .filter(conn => {
                                // Only show connectors for this pool's container
                                const poolContainer = document.querySelector(`.bracket-display[data-pool="${poolIndex}"]`);
                                return poolContainer && poolContainer.contains(document.elementFromPoint(conn.left, conn.top));
                              })
                              .map((connector, index) => (
                                <div
                                  key={`full-pool-${poolIndex}-connector-${index}`}
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
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          // Single pool - display full bracket
          <div className="overflow-x-auto">
            <div
              className="bracket-display relative pb-8 flex justify-start"
              data-pool="0"
              style={{ minHeight: bracketData.length > 2 ? 500 : 300 }}
            >
              {/* Render rounds */}
              {bracketData.map((round, roundIndex) => (
                <div
                  key={`round-${roundIndex}`}
                  className="bracket-round"
                  style={{
                    width: "180px", // Reduced width to use more horizontal space
                    marginLeft: roundIndex > 0 ? "20px" : "0"
                  }}
                >
                  {round.map((match, matchIndex) => {
                    // Get the previous round's match that led to this match
                    const isFirstRound = roundIndex === 0;
                    
                    // Check for opponent bye conditions
                    const hasOpponentByeTop = match.participants[0] !== null && 
                                          match.participants[1] === "(bye)";
                                          
                    const hasOpponentByeBottom = match.participants[1] !== null && 
                                            match.participants[0] === "(bye)";
                    
                    // Check for byes in previous matches that led to this player
                    const hasMatchByeTop = !isFirstRound && match.participants[0] !== null && 
                                        match.participants[0] !== "(bye)" &&
                                        previousRoundHadBye(match.participants[0], bracketData, roundIndex);
                                        
                    const hasMatchByeBottom = !isFirstRound && match.participants[1] !== null && 
                                          match.participants[1] !== "(bye)" &&
                                          previousRoundHadBye(match.participants[1], bracketData, roundIndex);

                    return (
                      <div
                        key={`match-${match.id}`}
                        className="bracket-match p-1 border border-slate-200 rounded-md bg-white shadow-sm relative mb-2"
                        data-match-id={match.id}
                      >
                        {/* First participant */}
                        <div
                          className={`participant py-0.5 px-1 mb-0.5 text-sm rounded-r-sm ${
                            getParticipantStyle(match.participants[0], hasMatchByeTop, hasOpponentByeTop, true)
                          } ${
                            match.winner === match.participants[0] ? "font-medium" : ""
                          }`}
                        >
                          {match.participants[0] === "(bye)" ? "(bye)" : (match.participants[0] || "")}
                        </div>

                        {/* Second participant */}
                        <div
                          className={`participant py-0.5 px-1 text-sm rounded-r-sm ${
                            getParticipantStyle(match.participants[1], hasMatchByeBottom, hasOpponentByeBottom, false)
                          } ${
                            match.winner === match.participants[1] ? "font-medium" : ""
                          }`}
                        >
                          {match.participants[1] === "(bye)" ? "(bye)" : (match.participants[1] || "")}
                        </div>

                        {/* Show winner badge for final match */}
                        {roundIndex === bracketData.length - 1 && match.winner && (
                          <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 bg-primary text-white text-xs py-1 px-2 rounded-full">
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
        )}
      </div>

      {/* Tabs for selecting which pool to print/export */}
      {poolCount > 1 && (
        <div className="mt-6 border-t pt-4 print:hidden">
          <h3 className="text-md font-medium text-slate-700 mb-3">Select pool for export/print:</h3>
          <Tabs 
            defaultValue="0" 
            className="mb-4"
            onValueChange={(value) => setActivePool(parseInt(value))}
          >
            <TabsList className="bg-slate-100">
              {Array.from({ length: poolCount }).map((_, index) => (
                <TabsTrigger
                  key={`export-pool-${index}`}
                  value={index.toString()}
                >
                  Pool {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-sm text-slate-500">
            When exporting or printing, only the selected pool will be included.
          </p>
        </div>
      )}

      {/* Print-specific styles - added to the page via style tag */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Connector line styles */
        .bracket-connector {
          position: absolute;
          border-color: #cbd5e1;
          z-index: 1;
        }
        .connector-horizontal {
          border-top: 1px solid;
          border-right: 1px solid;
        }
        .connector-vertical {
          border-right: 1px solid;
        }
        
        /* Print styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .print-header, .bracket-display, .bracket-display *, .print-header * {
            visibility: visible;
          }
          .print-header {
            position: absolute;
            top: 10mm;
            left: 0;
            width: 100%;
          }
          .bracket-display {
            position: absolute;
            top: 25mm;
            left: 0;
            width: 100%;
            padding: 0 10mm !important;
          }
          .bracket-match {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .bracket-connector {
            border-color: #666 !important;
          }
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          /* Maximum of 8 matches per page in landscape mode */
          @page {
            margin-top: 1cm;
            margin-bottom: 1cm;
          }
          /* Add page break between pools */
          .print-pool-wrapper {
            page-break-after: always;
          }
          /* PDF multi-page support */
          .bracket-display[data-pool] {
            page-break-after: always;
          }
        }
      `}} />
    </div>
  );
};

export default BracketDisplay;
