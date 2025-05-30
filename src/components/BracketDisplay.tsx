import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BracketMatch } from "@shared/schema";
import { calculateBracketConnectors } from "@/lib/bracketUtils";
import {
  Download,
  FileText,
  Printer,
  Smartphone,
  Monitor,
  Grid,
  Layers,
  Copy,
  Expand,
  Maximize,
  Lock,
  Trophy,
  CheckCircle,
} from "lucide-react";
import "./BracketConnector.css"; // Import custom connector styles
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTournament } from "@/hooks/useTournament";
import { useToast } from "@/hooks/use-toast";
import CanvasBracket from "./CanvasBracket";
import MedalPodium from "./MedalPodium";
import { useBracketPDF } from "@/hooks/useBracketPDF";
import { useTournamentStore, MatchResult } from "@/store/useTournamentStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BracketDisplayProps {
  bracketData: BracketMatch[][] | null;
  onUpdateMatch?: (matchId: string, winnerId: string) => void;
  header: string;
  onMatchClick?: (matchId: string, player1: string, player2: string) => void;
}

// Function to determine if a player had a bye in the previous round
// Helper function to determine label names based on bracket size and round position
function getRoundName(totalRounds: number, roundIndex: number): string {
  const roundsFromEnd = totalRounds - roundIndex - 1;

  if (roundsFromEnd === 0) {
    return "Final";
  } else if (roundsFromEnd === 1) {
    return "Semi Finals";
  } else if (roundsFromEnd === 2) {
    return "Quarter Finals";
  } else {
    return `Round ${roundIndex + 1}`;
  }
}

function previousRoundHadBye(
  playerName: string,
  bracketData: BracketMatch[][],
  currentRound: number
): boolean {
  if (currentRound <= 0 || !bracketData[currentRound - 1]) return false;

  // Find the player in the previous round
  const prevRound = bracketData[currentRound - 1];

  for (const match of prevRound) {
    // If this player faced a bye in the previous round
    if (
      (match.participants[0] === playerName &&
        match.participants[1] === "(bye)") ||
      (match.participants[1] === playerName &&
        match.participants[0] === "(bye)")
    ) {
      return true;
    }
  }

  return false;
}

const BracketDisplay: React.FC<BracketDisplayProps> = ({
  bracketData,
  onUpdateMatch,
  header,
  onMatchClick,
}) => {
  const [connectors, setConnectors] = useState<
    Array<{
      left: number;
      top: number;
      width?: number;
      height?: number;
      type: string;
      hasWinner?: boolean;
      matchId?: string;
    }>
  >([]);
  const [poolCount, setPoolCount] = useState<number>(1);
  const [activePool, setActivePool] = useState<number>(0);
  const [pooledBrackets, setPooledBrackets] = useState<BracketMatch[][][]>([]);
  const [printOrientation, setPrintOrientation] = useState<
    "landscape" | "portrait"
  >("landscape");
  const [renderMode, setRenderMode] = useState<"dom" | "canvas">("canvas"); // Changed default to canvas
  const [canvasPrintMode, setCanvasPrintMode] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const canvasBracketRef = useRef<HTMLDivElement>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { generateBracketPDF } = useBracketPDF();

  const { updateTournamentMatch } = useTournament();

  // Get match results from tournament store
  const matchResults = useTournamentStore((state) => state.matchResults || {});

  // Winner selection dialog state
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);

  console.log("Bracket Data:", bracketData);
  // Calculate connector lines when the bracket data changes
  useEffect(() => {
    if (!bracketData || !bracketContainerRef.current || renderMode === "canvas")
      return;

    // Wait for the DOM to update before calculating connectors
    setTimeout(() => {
      // For single pool view, calculate connectors directly
      if (poolCount <= 1) {
        const bracketDisplay = bracketContainerRef?.current?.querySelector(
          ".bracket-display"
        ) as HTMLElement;
        if (!bracketDisplay) return;

        const newConnectors = calculateBracketConnectors(
          bracketData,
          bracketDisplay
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
        if (window.matchMedia("print").matches) {
          const activePoolContainer =
            bracketContainerRef.current!.querySelector(
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
            ".bracket-display[data-pool]"
          );

          poolContainers.forEach((container, index) => {
            if (index < pooledBrackets.length) {
              const poolConnectors = calculateBracketConnectors(
                pooledBrackets[index],
                container as HTMLElement
              );
              console.log("Pool Connectors:", poolConnectors);
              allConnectors.push(...poolConnectors);
            }
          });
        }

        setConnectors(allConnectors);
      }
    }, 200); // Increased timeout to ensure DOM is fully updated
  }, [bracketData, pooledBrackets, poolCount, activePool, renderMode]);

  // Organize brackets into pools
  useEffect(() => {
    if (!bracketData) return;

    // Determine number of pools based on bracket size
    const totalMatches = bracketData[0].length;
    let pools = 1;

    if (totalMatches <= 16) pools = 1;
    else if (totalMatches <= 32) pools = 2;
    else if (totalMatches <= 64) pools = 4;
    else pools = 6; // Changed to 6 pools for >64 participants

    setPoolCount(pools);

    // Split the first round into pools and generate separate brackets for export
    if (pools > 1 && bracketData.length > 0 && false) {
      // const poolBrackets: BracketMatch[][][] = [];
      // const firstRound = bracketData[0];
      // const matchesPerPool = Math.ceil(firstRound.length / pools);
      // // Create pools
      // for (let i = 0; i < pools; i++) {
      //   const poolMatches = firstRound.slice(i * matchesPerPool, (i + 1) * matchesPerPool);
      //   if (poolMatches.length > 0) {
      //     // Create a full bracket structure for each pool (for export)
      //     // This doesn't affect the display - just used for printing/export
      //     const poolBracket: BracketMatch[][] = [poolMatches];
      //     // Add rest of the rounds for this pool (for complete export brackets)
      //     for (let r = 1; r < bracketData.length; r++) {
      //       // Filter matches in this round that are connected to this pool
      //       const relevantMatches = bracketData[r].filter(match => {
      //         // Check if any of the matches in the previous round from this pool
      //         // lead to this match in the current round
      //         const prevRoundPoolMatches = r === 1 ? poolMatches : poolBracket[r - 1];
      //         return prevRoundPoolMatches.some(prevMatch => prevMatch.nextMatchId === match.id);
      //       });
      //       poolBracket.push(relevantMatches);
      //     }
      //     poolBrackets.push(poolBracket);
      //   }
      // }
      // setPooledBrackets(poolBrackets);
    } else {
      // If only one pool, use the full bracket
      setPooledBrackets([bracketData]);
    }
  }, [bracketData]);

  // Print-related event handlers
  useEffect(() => {
    const handleBeforePrint = () => {
      if (!bracketContainerRef.current || !bracketData) return;

      const bracketDisplay = bracketContainerRef.current.querySelector(
        ".bracket-display"
      ) as HTMLElement;
      if (!bracketDisplay) return;

      const newConnectors = calculateBracketConnectors(
        bracketData,
        bracketDisplay
      );
      setConnectors(newConnectors);
    };

    const handleAfterPrint = () => {
      if (!bracketContainerRef.current || !bracketData) return;

      const bracketDisplay = bracketContainerRef.current.querySelector(
        ".bracket-display"
      ) as HTMLElement;
      if (!bracketDisplay) return;

      const newConnectors = calculateBracketConnectors(
        bracketData,
        bracketDisplay
      );
      setConnectors(newConnectors);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [bracketData]);

  // Recalculate connectors when the pool tab changes
  const handlePoolChange = (pool: string) => {
    if (pool === "all") {
      setActivePool(-1);
    } else {
      setActivePool(parseInt(pool));
    }

    // Force connector recalculation
    setTimeout(() => {
      if (
        !bracketContainerRef.current ||
        !bracketData ||
        renderMode === "canvas"
      )
        return;

      const activeContainer = bracketContainerRef.current.querySelectorAll(
        pool === "all"
          ? ".bracket-display[data-pool]"
          : `.bracket-display[data-pool="${pool}"]`
      );

      const allConnectors: Array<{
        left: number;
        top: number;
        width?: number;
        height?: number;
        type: string;
      }> = [];

      activeContainer.forEach((container) => {
        const poolIndex = container.getAttribute("data-pool");
        if (poolIndex !== null) {
          const bracketToUse =
            pool === "all"
              ? pooledBrackets[parseInt(poolIndex)]
              : pooledBrackets[parseInt(pool)];

          if (bracketToUse) {
            const bracketDisplay =
              (container as HTMLElement).querySelector(".bracket-display") ||
              container;
            const poolConnectors = calculateBracketConnectors(
              bracketToUse,
              bracketDisplay as HTMLElement
            );
            allConnectors.push(...poolConnectors);
          }
        }
      });

      setConnectors(allConnectors);
    }, 200);
  };

  // Handler for when a match is clicked to select a winner
  const handleMatchClick = useCallback(
    (matchId: string, participantIndex: 0 | 1) => {
      if (!bracketData) return;

      // Find the match in the bracket data
      let selectedMatch: BracketMatch | null = null;
      let roundIndex = -1;

      for (let i = 0; i < bracketData.length; i++) {
        const match = bracketData[i].find((m) => m.id === matchId);
        if (match) {
          selectedMatch = match;
          roundIndex = i;
          break;
        }
      }

      if (!selectedMatch) return;

      // Get the participant who was clicked
      const winner = selectedMatch.participants[participantIndex];

      // Only allow setting winner if both participants are present
      if (
        !winner ||
        winner === "(bye)" ||
        !selectedMatch.participants[participantIndex ? 0 : 1]
      ) {
        toast({
          title: "Cannot set winner",
          description: "Both participants must be present to set a winner.",
          variant: "destructive",
        });
        return;
      }

      // If this is a different winner than already set, confirm
      if (selectedMatch.winner !== winner) {
        setSelectedMatch(selectedMatch);
        setSelectedWinner(winner);
        setWinnerDialogOpen(true);
      }
    },
    [bracketData, toast]
  );
  // Apply the winner update
  const confirmWinner = useCallback(() => {
    if (!selectedMatch || !selectedWinner) return;

    // Update the match in the local and remote state
    if (onUpdateMatch) {
      onUpdateMatch(selectedMatch.id, selectedWinner);
    } else {
      updateTournamentMatch(selectedMatch.id, selectedWinner);
    }

    setWinnerDialogOpen(false);
    // Force connector recalculation after the bracket is updated
    setTimeout(() => {
      if (bracketContainerRef.current && bracketData && renderMode === "dom") {
        const bracketDisplay = bracketContainerRef.current.querySelector(
          ".bracket-display"
        ) as HTMLElement;
        if (!bracketDisplay) return;

        const newConnectors = calculateBracketConnectors(
          bracketData,
          bracketDisplay
        );
        setConnectors(newConnectors);
      }
    }, 300);

    toast({
      title: "Winner Updated",
      description: `${selectedWinner} has advanced to the next round.`,
    });
  }, [
    selectedMatch,
    selectedWinner,
    onUpdateMatch,
    updateTournamentMatch,
    toast,
    bracketData,
    renderMode,
  ]);

  // Toggle print orientation
  const togglePrintOrientation = () => {
    setPrintOrientation((prev) =>
      prev === "landscape" ? "portrait" : "landscape"
    );
  };

  // Toggle rendering mode between DOM and Canvas
  const toggleRenderMode = () => {
    setRenderMode((prev) => (prev === "dom" ? "canvas" : "dom"));
  };

  // Handle print function
  const handlePrint = () => {
    if (!bracketContainerRef.current) return;

    const printContents = bracketContainerRef.current.outerHTML;
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow popups for this website.");
      return;
    }

    printWindow.document.open();

    // Copy all <style> and <link rel="stylesheet"> tags from original page
    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((style) => style.outerHTML)
      .join("\n");

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Bracket</title>
          ${styles}
          <style>
            @media print {
              body {
                margin: 0;
              }
              h1{text-align:center}
              
              @page {
                size: ${printOrientation};
                margin: ${printOrientation === "landscape" ? "0.7cm" : "0.5cm"};
              }
            }
          </style>
        </head>
        <body>
          <h1>KDTA Tournament Tie sheet</h1>
          ${printContents}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Handle Canvas print
  const handleCanvasPrint = () => {
    if (!canvasBracketRef.current) return;

    // Enable print mode to hide the winners box
    setCanvasPrintMode(true);

    // Allow time for re-render with printMode=true
    setTimeout(() => {
      const canvasElement = canvasBracketRef.current?.querySelector("canvas");
      if (!canvasElement) {
        setCanvasPrintMode(false);
        return;
      }

      // Get data URL from canvas
      const dataURL = (canvasElement as HTMLCanvasElement).toDataURL(
        "image/png"
      );

      // Create print window
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups for this website.");
        setCanvasPrintMode(false);
        return;
      }

      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>Canvas Bracket Print</title>
            <style>
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                img {
                  max-width: 100%;
                  height: auto;
                }
                h1 {
                  text-align: center;
                  font-family: Arial, sans-serif;
                }
                @page {
                  size: ${printOrientation};
                  margin: ${
                    printOrientation === "landscape" ? "0.7cm" : "0.5cm"
                  };
                }
              }
            </style>
          </head>
          <body>
            <h1>KDTA Tournament Tie sheet (Canvas)</h1>
            <img src="${dataURL}" alt="Tournament Bracket" style="width: 100%;" />
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 100);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();

      // Disable print mode after printing
      setTimeout(() => {
        setCanvasPrintMode(false);
      }, 500);
    }, 200);
  };

  // Handle Full Screen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      // Enter full screen
      if (fullScreenRef.current?.requestFullscreen) {
        fullScreenRef.current.requestFullscreen().catch((err) => {
          toast({
            title: "Fullscreen Error",
            description: `Error attempting to enable fullscreen: ${err.message}`,
            variant: "destructive",
          });
        });
      }
      setIsFullScreen(true);
    } else {
      // Exit full screen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  // Handle PDF Download with useBracketPDF hook
  const handlePDFDownload = () => {
    if (!bracketData) return;

    // Get total participant count
    let participantCount = 0;
    if (bracketData[0]) {
      participantCount = bracketData[0].reduce((count, match) => {
        return (
          count +
          (match.participants[0] && match.participants[0] !== "(bye)" ? 1 : 0) +
          (match.participants[1] && match.participants[1] !== "(bye)" ? 1 : 0)
        );
      }, 0);
    }

    // Generate PDF with bracket data
    generateBracketPDF(
      bracketData,
      header || "Tournament Bracket",
      participantCount,
      printOrientation
    );
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  console.log(header);

  // If no bracket data is available, show empty state
  if (!bracketData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs sm:text-xl font-semibold text-slate-800">
            {header ? header : "Tournament Bracket"}
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
  const getParticipantStyle = (
    participant: string | null,
    hasMatchBye: boolean,
    isOpponentBye: boolean,
    isTop: boolean
  ) => {
    if (participant === "(bye)") {
      // Style for bye placeholder (gray with green border)
      return "border-l-4 border-green-400 bg-gray-100 text-gray-500";
    }

    if (isOpponentBye) {
      // Style for player who got a bye (green left border and light green background)
      return "border-l-4 border-green-400 bg-green-50";
    }

    // Normal participant styling (blue for top, red for bottom)
    return isTop
      ? "border-l-4 border-blue-400 bg-blue-50"
      : "border-l-4 border-red-400 bg-red-50";
  };

  // Display bracket for the selected pool
  const currentBracket = pooledBrackets[activePool] || bracketData;

  return (
    <div className="bg-white rounded-lg shadow-md p-6" ref={fullScreenRef}>
      {/* Header with title and export/print buttons */}
      <div className="flex justify-between items-center mb-6 ">
        <h2 className="text-xl font-semibold text-slate-800">
          {header ? header : "Tournament Bracket"}
        </h2>
        <div className="flex space-x-2">
          <div className="flex items-center space-x-2 mr-4">
            {/* <Label htmlFor="render-mode" className="cursor-pointer">Rendering:</Label> */}
            <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded-md ">
              <Grid
                className={`h-4 w-4  ${
                  renderMode === "dom" ? "text-primary" : "text-slate-400"
                }`}
              />
              <Switch
                id="render-mode"
                checked={renderMode === "canvas"}
                onCheckedChange={toggleRenderMode}
                // className="w-5 h-5"
              />
              <Layers
                className={`h-4 w-4 ${
                  renderMode === "canvas" ? "text-primary" : "text-slate-400"
                }`}
              />
            </div>
            <span className="text-sm text-slate-600">
              {renderMode === "dom" ? "DOM" : "Canvas"}
            </span>
          </div>

          {/* Full Screen Button */}
          <Button
            onClick={toggleFullScreen}
            variant="outline"
            className="sm:inline-flex hidden items-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
          >
            <Maximize className="h-4 w-4 mr-1" />
            {/* {isFullScreen ? "Exit Full Screen" : "Full Screen"} */}
          </Button>

          {/* PDF Download Button */}
          {/* <Button
          onClick={handlePDFDownload}
          variant="outline"
          className="sm:inline-flex hidden items-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
        >
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button> */}

          {renderMode === "dom" ? (
            <Button
              onClick={handlePrint}
              variant="outline"
              className="sm:inline-flex hidden items-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
            >
              <Printer className="h-4 w-4 mr-1" />
              Print DOM
            </Button>
          ) : (
            <Button
              onClick={handleCanvasPrint}
              variant="outline"
              className="sm:inline-flex hidden items-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
            >
              <Printer className="h-4 w-4 mr-1" />
              Print Canvas
            </Button>
          )}
        </div>
      </div>
      {/* For printing/exporting, we use the active pool */}
      <div className="hidden print:block">
        <div className="print-header text-center mb-6">
          <h2 className="text-xl font-bold text-black">
            Tournament Bracket - Pool {activePool + 1}
          </h2>
        </div>
        <div className="overflow-x-auto w-full" ref={bracketContainerRef}>
          <div
            className={`bracket-display relative pb-0 ${printOrientation} mt-0 flex justify-start`}
            data-pool={activePool}
            style={{
              minHeight: pooledBrackets[activePool]?.length > 2 ? 500 : 300,
            }}
          >
            {/* Render rounds for print/export */}
            {pooledBrackets[activePool]?.map((round, roundIndex) => (
              <div
                key={`print-round-${roundIndex}`}
                className="bracket-round"
                style={{
                  width: "180px",
                  marginLeft: roundIndex > 0 ? "20px" : "0",
                }}
              >
                {round.map((match, matchIndex) => {
                  const isFirstRound = roundIndex === 0;
                  const hasOpponentByeTop =
                    match.participants[0] !== null &&
                    match.participants[1] === "(bye)";
                  const hasOpponentByeBottom =
                    match.participants[1] !== null &&
                    match.participants[0] === "(bye)";
                  const hasMatchByeTop =
                    !isFirstRound &&
                    match.participants[0] !== null &&
                    match.participants[0] !== "(bye)" &&
                    previousRoundHadBye(
                      match.participants[0],
                      bracketData,
                      roundIndex
                    );
                  const hasMatchByeBottom =
                    !isFirstRound &&
                    match.participants[1] !== null &&
                    match.participants[1] !== "(bye)" &&
                    previousRoundHadBye(
                      match.participants[1],
                      bracketData,
                      roundIndex
                    );

                  return (
                    <div
                      key={`print-match-${match.id}`}
                      className="bracket-match border border-slate-200 rounded-md bg-gray-50 relative mb-1 p-0"
                      data-match-id={match.id}
                    >
                      {" "}
                      {/* Match identifier for print version */}
                      <div className="absolute -top-4 -left-0 text-[8px] font-semibold bg-slate-100 px-0.5 rounded text-slate-600 border border-slate-300 print:block">
                        M{roundIndex * round.length + matchIndex + 1}
                      </div>
                      <div
                        className={`participant py-0 px-1 text-sm rounded-none ${getParticipantStyle(
                          match.participants[0],
                          hasMatchByeTop,
                          hasOpponentByeTop,
                          true
                        )} ${
                          match.winner === match.participants[0]
                            ? "font-medium"
                            : ""
                        }`}
                      >
                        {match.participants[0] === "(bye)"
                          ? "(bye)"
                          : match.participants[0] || ""}
                      </div>
                      <div
                        className={`participant py-0 px-1 text-sm rounded-none ${getParticipantStyle(
                          match.participants[1],
                          hasMatchByeBottom,
                          hasOpponentByeBottom,
                          false
                        )} ${
                          match.winner === match.participants[1]
                            ? "font-medium"
                            : ""
                        }`}
                      >
                        {match.participants[1] === "(bye)"
                          ? "(bye)"
                          : match.participants[1] || ""}
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
                className={`bracket-connector 
                  ${
                    connector.type === "horizontal"
                      ? "connector-horizontal"
                      : "connector-vertical"
                  } 
                  ${
                    connector.hasWinner
                      ? "connector-winner connector-animate print:border-green-500"
                      : "print:border-gray-400"
                  }
                `}
                style={{
                  left: `${connector.left}px`,
                  top: `${connector.top}px`,
                  width: connector.width ? `${connector.width}px` : undefined,
                  height: connector.height
                    ? `${connector.height}px`
                    : undefined,
                }}
                data-match-id={connector.matchId}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Display all pools together for normal view */}
      <div className="print:hidden">
        {renderMode === "canvas" ? (          // Canvas rendering of the bracket with medal podium
          <div className="flex w-full relative">
            <div
              ref={canvasBracketRef}
              className="canvas-view mb-4 flex-grow"
              style={{ width: "100%" }}
            >
              <CanvasBracket
                bracketData={currentBracket}
                onMatchClick={handleMatchClick}
                width={Math.min(1200, window.innerWidth - 100)}
                height={Math.max(500, 100 * (currentBracket?.length || 1))}
                printMode={canvasPrintMode}
              />            </div>
            {/* Medal Podium Section - Absolutely positioned */}
            <div className="absolute bottom-4 right-4 w-[160px] shadow-md z-20">
              <MedalPodium bracketData={bracketData} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-[90vh] relative">
            {/* Combined scrollable content with headers */}

            <div
              className="overflow-auto flex-grow custom-scrollbar"
              ref={bracketContainerRef}
              // style={{ width: 'calc(100% - 220px)' }}
            >
              <div className="bracket-wrapper ">
                {/* Round Headers at the top */}
                <div className="flex sticky top-1 z-10 pb-3 pt-1 bg-white border-b shadow-md mb-6">
                  {bracketData.map((round, roundIndex) => {
                    const totalRounds = bracketData.length;
                    const roundName = getRoundName(totalRounds, roundIndex);

                    return (
                      <div
                        key={`header-${roundIndex}`}
                        className="flex-shrink-0"
                        style={{
                          width: "240px",
                          marginLeft: roundIndex > 0 ? "32px" : "0", // Match the spacing of the rounds below
                        }}
                      >
                        <div className="flex justify-center">
                          <div
                            className="bg-blue-800 text-white font-bold py-2 px-4 rounded-md text-center text-sm shadow-sm relative"
                            style={{ width: "220px" }} // Make this closer to the bracket match width
                          >
                            {roundName}
                            <div className="absolute -bottom-2 left-1/2 w-0 h-0 transform -translate-x-1/2 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-blue-800"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Bracket content */}
                <div className="flex relative">
                  <div
                    className="bracket-display relative pb-8 flex justify-start"
                    data-pool="0"
                    style={{ minHeight: bracketData.length > 2 ? 500 : 300 }}
                  >
                    {/* Render rounds with increased spacing */}{" "}
                    {bracketData.map((round, roundIndex) => (
                      <div
                        key={`round-${roundIndex}`}
                        className="bracket-round"
                        style={{
                          width: "240px",
                          marginLeft: roundIndex > 0 ? "32px" : "0", // Further increased spacing between rounds
                        }}
                      >
                        {round.map((match, matchIndex) => {
                          // Get the previous round's match that led to this match
                          const isFirstRound = roundIndex === 0;

                          // Check for opponent bye conditions
                          const hasOpponentByeTop =
                            match.participants[0] !== null &&
                            match.participants[1] === "(bye)";

                          const hasOpponentByeBottom =
                            match.participants[1] !== null &&
                            match.participants[0] === "(bye)";

                          // Check for byes in previous matches that led to this player
                          const hasMatchByeTop =
                            !isFirstRound &&
                            match.participants[0] !== null &&
                            match.participants[0] !== "(bye)" &&
                            previousRoundHadBye(
                              match.participants[0],
                              bracketData,
                              roundIndex
                            );

                          const hasMatchByeBottom =
                            !isFirstRound &&
                            match.participants[1] !== null &&
                            match.participants[1] !== "(bye)" &&
                            previousRoundHadBye(
                              match.participants[1],
                              bracketData,
                              roundIndex
                            );

                          return (
                            <div
                              key={`match-${match.id}`}
                              className={`bracket-match p-1 border ${
                                matchResults[match.id]?.completed
                                  ? "border-slate-300 bg-slate-100"
                                  : matchResults[match.id]
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-slate-200 bg-white"
                              } rounded-md shadow-sm relative mb-2`}
                              data-match-id={match.id}
                            >
                              {" "}
                              {/* Match identifier - positioned at the top left */}
                              <div className="absolute -top-5 -left-0 text-xs font-semibold bg-slate-100 px-1 rounded text-slate-600 border border-slate-300">
                                M{roundIndex * round.length + matchIndex + 1}
                              </div>
                              {/* First participant */}{" "}
                              <div
                                className={`participant py-1 px-2.5 mb-1 text-sm rounded-r-sm print:border-b print:border-b-slate-700 ${getParticipantStyle(
                                  match.participants[0],
                                  hasMatchByeTop,
                                  hasOpponentByeTop,
                                  true
                                )} ${
                                  match.winner === match.participants[0]
                                    ? "font-medium"
                                    : ""
                                }`}
                                onClick={() => {
                                  // If we have an onMatchClick handler, use that for the new match scoring system
                                  if (
                                    onMatchClick &&
                                    match.participants[0] &&
                                    match.participants[0] !== "(bye)" &&
                                    match.participants[1] &&
                                    match.participants[1] !== "(bye)"
                                  ) {
                                    onMatchClick(
                                      match.id,
                                      match.participants[0],
                                      match.participants[1]
                                    );
                                  } else if (
                                    match.participants[0] &&
                                    match.participants[0] !== "(bye)"
                                  ) {
                                    // Legacy winner selection
                                    handleMatchClick(match.id, 0);
                                  }
                                }}
                                style={{
                                  cursor:
                                    match.participants[0] &&
                                    match.participants[0] !== "(bye)"
                                      ? "pointer"
                                      : "default",
                                }}
                              >
                                {match.participants[0] === "(bye)"
                                  ? "(bye)"
                                  : match.participants[0] || ""}
                              </div>
                              {/* Second participant */}{" "}
                              <div
                                className={`participant py-1 px-2.5 text-sm rounded-r-sm ${getParticipantStyle(
                                  match.participants[1],
                                  hasMatchByeBottom,
                                  hasOpponentByeBottom,
                                  false
                                )} ${
                                  match.winner === match.participants[1]
                                    ? "font-medium"
                                    : ""
                                }`}
                                onClick={() => {
                                  // If we have an onMatchClick handler, use that for the new match scoring system
                                  if (
                                    onMatchClick &&
                                    match.participants[0] &&
                                    match.participants[0] !== "(bye)" &&
                                    match.participants[1] &&
                                    match.participants[1] !== "(bye)"
                                  ) {
                                    onMatchClick(
                                      match.id,
                                      match.participants[0],
                                      match.participants[1]
                                    );
                                  } else if (
                                    match.participants[1] &&
                                    match.participants[1] !== "(bye)"
                                  ) {
                                    // Legacy winner selection
                                    handleMatchClick(match.id, 1);
                                  }
                                }}
                                style={{
                                  cursor:
                                    match.participants[1] &&
                                    match.participants[1] !== "(bye)"
                                      ? "pointer"
                                      : "default",
                                }}
                              >
                                {match.participants[1] === "(bye)"
                                  ? "(bye)"
                                  : match.participants[1] || ""}
                              </div>{" "}
                              {/* Match Status Indicators */}
                              {/* Lock icon commented out per request - may be reused later
                              {matchResults[match.id]?.completed && (
                                <div className="absolute -right-7 top-1 transform -translate-y-1/2">
                                  <Lock className="h-4 w-4 text-slate-500" />
                                </div>
                              )}
                              */}
                              {matchResults[match.id]?.winner && (
                                <div className="absolute -right-7 bottom-1 transform -translate-y-1/2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </div>
                              )}
                              {/* Champion badge for final match */}
                              {roundIndex === bracketData.length - 1 &&
                                match.winner && (
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
                        className={`bracket-connector 
                          ${
                            connector.type === "horizontal"
                              ? "connector-horizontal"
                              : "connector-vertical"
                          } 
                          ${
                            connector.hasWinner
                              ? "connector-winner connector-animate"
                              : ""
                          }
                        `}
                        style={{
                          left: `${connector.left}px`,
                          top: `${connector.top}px`,
                          width: connector.width
                            ? `${connector.width}px`
                            : undefined,
                          height: connector.height
                            ? `${connector.height}px`
                            : undefined,
                        }}
                        data-match-id={connector.matchId}
                      />
                    ))}                  </div>
                </div>
              </div>
            </div>
            
            {/* Medal Podium Section - Absolutely positioned */}
            <div className="absolute bottom-4 right-4 w-[200px] shadow-md z-20">
              <MedalPodium bracketData={bracketData} />
            </div>
          </div>
        )}
      </div>
      {/* Winner confirmation dialog */}
      <AlertDialog open={winnerDialogOpen} onOpenChange={setWinnerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Winner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set {selectedWinner} as the winner?
              {selectedMatch?.winner &&
                selectedMatch.winner !== selectedWinner && (
                  <span className="font-semibold block mt-2">
                    This will change the current winner from{" "}
                    {selectedMatch.winner} to {selectedWinner}.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWinner}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Print-specific styles - added to the page via style tag */}{" "}
      <style
        id="bracket-print-styles"
        dangerouslySetInnerHTML={{
          __html: `
  /* Hide everything when printing */
  @media print {
    body * {
      visibility: hidden;
    }
    .print-header, .bracket-display, .bracket-display * {
      visibility: visible;
    }
    .print-header {
      position: absolute;
      top: 10mm;
      left: 0;
      width: 100%;
    }
    .bracket-display {
      width: 1000px !important;
      min-width: 1000px !important;
      max-width: 1000px !important;
      transform: scale(0.8); /* Optional, you can adjust */
      transform-origin: top left;
    }

    .bracket-match {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @page {
      size: ${printOrientation}; /* dynamic print orientation */
      margin: 0.9cm;
    }
  }
  
  /* Winner connector styles */
  .connector-winner {
    border-color: #22c55e !important; /* Green color for winner connectors */
    animation: pulse-connector 2s infinite;
    z-index: 1;
  }
  
  @keyframes pulse-connector {
    0% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.7;
    }
  }
`,
        }}
      />
      {/* Define bracket connector styles */}
      <style>
        {`
          .bracket-connector {
            position: absolute;
            background-color: #94a3b8;
            z-index: 100;
          }
          .connector-horizontal {
            height: 2px;
          }
          .connector-vertical {
            width: 2px;
            transform: translateX(-1px);
          }
          .participant {
            transition: background-color 0.2s;
          }
          .participant:hover {
            background-color: #e2e8f0;
          }
        `}
      </style>
    </div>
  );
};

export default BracketDisplay;
