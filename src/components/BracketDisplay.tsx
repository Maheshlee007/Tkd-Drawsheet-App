import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { BracketMatch } from "@shared/schema";
import { calculateBracketConnectors } from "@/lib/bracketUtils";
import {
  ChevronDown,
  ChevronUp,
  Users,
  CalendarDays,
  ListOrdered,
  Swords,
  Shield,
  Layers,
  Maximize,
  CheckCircle,
  Trophy,
  Search,
  Grid,
  MoreVertical
} from "lucide-react";
import "./BracketConnector.css"; // Import custom connector styles
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTournament } from "@/hooks/useTournament";
import { useToast } from "@/hooks/use-toast";
import CanvasBracket from "./CanvasBracket";
import MedalPodium from "./MedalPodium";
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
import {
  getMatchColors,
  getParticipantClasses,
  isCurrentMatch,
  getMatchContainerClasses,
  calculateMatchNumber,
  isByeMatch,
  isParticipantDisqualified,
} from "@/utils/bracketUtils";

interface BracketDisplayProps {
  bracketData: BracketMatch[][] | null;
  onUpdateMatch?: (matchId: string, winnerId: string) => void;
  header: string;
  onMatchClick?: (matchId: string, player1: string, player2: string) => void;
}





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
  const [canvasPrintMode, setCanvasPrintMode] = useState<boolean>(false);  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  // New state for highlighted participant path
  const [highlightedParticipant, setHighlightedParticipant] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // Added for custom search input
  const [showDropdown, setShowDropdown] = useState(false); // Added for custom dropdown visibility
  const searchInputRef = useRef<HTMLInputElement>(null); // Ref for the search input
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the dropdown
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const canvasBracketRef = useRef<HTMLDivElement>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { updateTournamentMatch } = useTournament();
  // Get match results from tournament store
  const matchResults = useTournamentStore((state) => state.matchResults || {});
  
  // Get current match ID for highlighting
  const currentMatchId = useTournamentStore((state) => state.currentMatchId);

  // Winner selection dialog state
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [selectedMatchInfo, setSelectedMatchInfo] = useState<{match: BracketMatch, winner: string | null} | null>(null); // Store match and potential winner

  // console.log("Bracket Data:", bracketData); // Keep this for debugging if needed, or remove
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
      }    }, 200); // Increased timeout to ensure DOM is fully updated
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
        !selectedMatch.participants[participantIndex ? 0 : 1] ||
        selectedMatch.participants[participantIndex ? 0 : 1] === "(bye)"
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
        setSelectedMatchInfo({match: selectedMatch, winner }); // Use new state
        setWinnerDialogOpen(true);
      }
    },
    [bracketData, toast]
  );
  // Apply the winner update
  const confirmWinner = useCallback(() => {
    if (!selectedMatchInfo || !selectedMatchInfo.match || !selectedMatchInfo.winner) return; // Check new state

    // Update the match in the local and remote state
    if (onUpdateMatch) {
      onUpdateMatch(selectedMatchInfo.match.id, selectedMatchInfo.winner);
    } else {
      updateTournamentMatch(selectedMatchInfo.match.id, selectedMatchInfo.winner);
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
          bracketData, // This should ideally be the updated bracketData
          bracketDisplay
        );
        setConnectors(newConnectors);
      }
    }, 300);

    toast({
      title: "Winner Updated",
      description: `${selectedMatchInfo.winner} has advanced to the next round.`,
    });
    setSelectedMatchInfo(null); // Clear selection
  }, [
    selectedMatchInfo, // Use new state
    onUpdateMatch,
    updateTournamentMatch,
    toast,
    bracketData,
    renderMode,  ]);
  // Handle participant selection for navigation/highlighting
  const handleParticipantSelection = useCallback((participantName: string | null) => {
    setShowDropdown(false);
    if (!participantName || !bracketData) {
      setHighlightedParticipant(null);
      setSearchTerm("");
      return;
    }

    setHighlightedParticipant(participantName);
    setSearchTerm(participantName);

    // Find the participant's first match (earliest round)
    let targetMatch: { match: BracketMatch; roundIndex: number } | null = null;

    // Look through rounds starting from the first round
    for (let roundIndex = 0; roundIndex < bracketData.length; roundIndex++) {
      const round = bracketData[roundIndex];
      for (const match of round) {
        if (match.participants[0] === participantName || match.participants[1] === participantName) {
          targetMatch = { match, roundIndex };
          break;
        }
      }
      if (targetMatch) break; // Stop once we find the first occurrence
    }

    if (targetMatch) {
      const targetMatchDomId = `match-${targetMatch.match.id}`;
      const matchElement = document.getElementById(targetMatchDomId);

      if (matchElement) {
        matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });        // Apply pulse effect
        matchElement.classList.add('pulse-highlight');
        setTimeout(() => {
          const currentElement = document.getElementById(targetMatchDomId);
          if (currentElement) {
            currentElement.classList.remove('pulse-highlight');
          }
        }, 1500);

        // Removed toast notification - using console log instead
        console.log(`Participant Found: Scrolled to ${participantName}'s match in round ${targetMatch.roundIndex + 1}.`);
      } else {
        console.warn(`Navigation Error: Could not find the match element for ${participantName}.`);
      }    } else {
      setHighlightedParticipant(null);
      console.warn(`Participant Not Found: ${participantName} was not found in any matches.`);
    }
  }, [bracketData]);
  // Effect to handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

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
  // Canvas print functionality has been removed as requested

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
  // PDF export functionality has been removed as requested

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

  // Display bracket for the selected pool
  const currentBracket = pooledBrackets[activePool] || bracketData;

  // Memoized participant list for search
  const allParticipants = useMemo(() => {
    if (!bracketData || bracketData.length === 0 || !bracketData[0]) {
      return [];
    }
    const participants = bracketData[0].flatMap(match => match.participants);
    const validParticipants = participants.filter(
      p => typeof p === 'string' && p && p !== "(bye)"
    ) as string[];
    return Array.from(new Set(validParticipants)).sort(); // Changed to Array.from()
  }, [bracketData]);

  const filteredParticipants = useMemo(() => {
    if (!searchTerm) {
      return allParticipants; // Show all if search term is empty
    }
    return allParticipants.filter(participant =>
      participant.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allParticipants, searchTerm]);
  // DOM rendering part
  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-6" ref={fullScreenRef}>      {/* Header - responsive layout */}
      <div className="mb-6">
        {/* Mobile Layout: Two-line header */}
        <div className="sm:hidden">
          {/* Mobile First Line: Tournament name and 3-dot menu */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">
              {header ? header : "Tournament Bracket"}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={toggleRenderMode} className="flex items-center">
                  {renderMode === "canvas" ? (
                    <>
                      <Grid className="mr-2 h-4 w-4" />
                      Switch to DOM View
                    </>
                  ) : (
                    <>
                      <Layers className="mr-2 h-4 w-4" />
                      Switch to Canvas View
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleFullScreen} className="flex items-center">
                  <Maximize className="mr-2 h-4 w-4" />
                  Fullscreen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Mobile Second Line: Search bar */}
          <div className="relative w-full" ref={dropdownRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Find participant..."
              className="w-full h-10 pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
                if (e.target.value === "") {
                  setHighlightedParticipant(null);
                }
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && (
              <div className="absolute top-full mt-1 w-full max-h-[300px] overflow-y-auto bg-white border border-slate-300 rounded-md shadow-lg z-50">
                {highlightedParticipant && (
                  <div
                    key="clear-selection-dropdown"
                    className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                    onClick={() => handleParticipantSelection(null)}
                  >
                    Clear selection ({highlightedParticipant})
                  </div>
                )}
                {filteredParticipants.map(participant => (
                  <div
                    key={participant}
                    className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                    onClick={() => handleParticipantSelection(participant)}
                  >
                    {participant}
                  </div>
                ))}
                {searchTerm !== "" && filteredParticipants.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No participants found.
                  </div>
                )}
                {searchTerm === "" && !highlightedParticipant && filteredParticipants.length === 0 && allParticipants.length > 0 && (
                  <div className="px-3 py-2 text-sm text-slate-400">
                    Type to search or select from list.
                  </div>
                )}
                {allParticipants.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No participants in the first round.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout: Single-line header */}
        <div className="hidden sm:flex items-center justify-between">
          {/* Desktop Left: Tournament name */}
          <h2 className="text-xl font-semibold text-slate-800">
            {header ? header : "Tournament Bracket"}
          </h2>

          <div className="flex items-center">
          {/* Desktop Center: Search bar */}
          <div className="relative w-[300px] mx-4" ref={dropdownRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Find participant..."
              className="w-full h-10 pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-800 focus:border-blue-200 outline-none bg-white"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
                if (e.target.value === "") {
                  setHighlightedParticipant(null);
                }
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && (
              <div className="absolute top-full mt-1 w-full max-h-[300px] overflow-y-auto bg-white border border-slate-300 rounded-md shadow-lg z-50">
                {highlightedParticipant && (
                  <div
                    key="clear-selection-dropdown"
                    className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                    onClick={() => handleParticipantSelection(null)}
                  >
                    Clear selection ({highlightedParticipant})
                  </div>
                )}
                {filteredParticipants.map(participant => (
                  <div
                    key={participant}
                    className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                    onClick={() => handleParticipantSelection(participant)}
                  >
                    {participant}
                  </div>
                ))}
                {searchTerm !== "" && filteredParticipants.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No participants found.
                  </div>
                )}
                {searchTerm === "" && !highlightedParticipant && filteredParticipants.length === 0 && allParticipants.length > 0 && (
                  <div className="px-3 py-2 text-sm text-slate-400">
                    Type to search or select from list.
                  </div>
                )}
                {allParticipants.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No participants in the first round.
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Desktop Right: Controls */}
          <div className="flex items-center space-x-2">
            {/* Canvas/DOM Toggle */}
            <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded-md">
              <Grid
                className={`h-4 w-4 ${
                  renderMode === "dom" ? "text-primary" : "text-slate-400"
                }`}
              />
              <Switch
                id="render-mode"
                checked={renderMode === "canvas"}
                onCheckedChange={toggleRenderMode}
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
            
            {/* Fullscreen Button */}
            <Button
              onClick={toggleFullScreen}
              variant="outline"
              className="items-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
            >
              <Maximize className="h-4 w-4 mr-1" />
            </Button>
          </div>
          </div>
        </div>
      </div>

       
      {/* For printing/exporting, we use the active pool */}
      
      {/* Display all pools together for normal view */}
      <div className="print:hidden">
        {renderMode === "canvas" ? (
          // Canvas rendering of the bracket with medal podium
          <div className="flex w-full relative">
            <div
              ref={canvasBracketRef}
              className="canvas-view mb-4 flex-grow"
              style={{ width: "100%" }}
            >              <CanvasBracket
                bracketData={currentBracket}
                onMatchClick={onMatchClick}
                onUpdateMatch={onUpdateMatch}
                width={Math.min(1200, window.innerWidth - 100)}
                height={Math.max(500, 100 * (currentBracket?.length || 1))}
                printMode={canvasPrintMode}
                highlightedParticipant={highlightedParticipant}
              /></div>            {/* Medal Podium Section - Absolutely positioned */}
            <div className="absolute bottom-4 right-4 z-20">
              <MedalPodium bracketData={bracketData} />
            </div>
          </div>
        ) : (
          // DOM rendering of the bracket
          <div className="flex flex-col w-full h-[90vh] relative">
            {/* Combined scrollable content with headers */}

            <div
              className="overflow-auto flex-grow custom-scrollbar"
              ref={bracketContainerRef}
              // style={{ width: \'calc(100% - 220px)\' }}
            >
              <div className="bracket-wrapper ">
                {/* Round Headers at the top */}
                {/* <div className="relative border-2 border-slate-300"> */}
                <div className="flex sticky top-2  pb-4  bg-white  shadow-sm mb-4">
                  {bracketData!.map((round, roundIndex) => { // Added !
                    const totalRounds = bracketData!.length; // Added !
                    const roundName = getRoundName(totalRounds, roundIndex);

                    return (
                      <div
                        key={`header-${roundIndex}`}
                        className="flex-shrink-0"
                        style={{
                          width: "260px", // Increased to match new bracket width
                          marginLeft: roundIndex > 0 ? "50px" : "0", // Increased spacing to match rounds below
                        }}
                      >                        <div className="w-full">
                          <div
                            // className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-1.5 px-3 text-center text-sm shadow-sm border border-blue-400 w-full"
                            className="bg-gradient-to-r from-gray-100 to-gray-200 text-slate-800 font-semibold py-1.5 px-3 text-center text-sm shadow-sm border border-gray-50 w-full"
                            style={{ 
                              borderRadius: "6px 6px 0 0",
                              // borderBottom: "1px solid #cbd5e1"
                            }}
                          >
                            {roundName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* </div> */}
                {/* Bracket content */}
                <div className="flex relative">
                  <div
                    className="bracket-display relative pb-8 flex justify-start"
                    data-pool="0"
                    style={{ minHeight: bracketData!.length > 2 ? 500 : 300 }} // Added !
                  >
                    {/* Render rounds with increased spacing */}
                    {bracketData!.map((round, roundIndex) => ( // Added !
                      <div
                        key={`round-${roundIndex}`}
                        className="bracket-round"
                        style={{
                          width: "260px", // Increased width for more spacious bracket layout
                          marginLeft: roundIndex > 0 ? "50px" : "0", // Significantly increased spacing between rounds
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
                              bracketData!, // Added !
                              roundIndex
                            );

                          const hasMatchByeBottom =
                            !isFirstRound &&
                            match.participants[1] !== null &&
                            match.participants[1] !== "(bye)" &&
                            previousRoundHadBye(
                              match.participants[1],
                              bracketData!, // Added !
                              roundIndex
                            );

                          const containerClasses = getMatchContainerClasses(
                            match,
                            matchResults,
                            currentMatchId,
                            highlightedParticipant
                          );                          return (
                            <div
                              key={`match-${match.id}`}
                              id={`match-${match.id}`}
                              className={`bracket-match p-1 border ${containerClasses} rounded-md shadow-sm relative mb-6`}
                              data-match-id={match.id}
                              data-highlighted-participant={
                                (highlightedParticipant && 
                                 (match.participants[0] === highlightedParticipant || 
                                  match.participants[1] === highlightedParticipant))
                                  ? "true"
                                  : "false"
                              }
                            >
                              {/* Match Number Display */}
                              {(!isByeMatch(match) || (match.participants[0] && match.participants[1])) && (
                                <div
                                  className={`absolute -top-5 left-1/2 transform -translate-x-1/2 bg-slate-100 border border-slate-300 text-slate-500 text-xs font-semibold px-1.5 py-0.5 rounded-sm shadow-sm z-10 ${
                                    isByeMatch(match) ? "opacity-50" : ""
                                  }`}
                                >
                                  M{(() => {
                                      let matchNumber = 0;
                                      // Count all non-bye matches in previous rounds
                                      for (let i = 0; i < roundIndex; i++) {
                                        const roundMatches = bracketData![i] || []; // Added !
                                        for (const prevMatch of roundMatches) {
                                          if (!isByeMatch(prevMatch)) {
                                            matchNumber++;
                                          }
                                        }
                                      }
                                      // Add non-bye matches in the current round up to this match
                                      for (let i = 0; i <= matchIndex; i++) {
                                        if (!isByeMatch(round[i])) { // round is from bracketData!.map, so it's fine
                                          matchNumber++;
                                        }
                                      }
                                      return matchNumber;
                                    })()}
                                </div>
                              )}
                              {/* Participant 1 */}{" "}                              <div
                                className={`participant py-1 px-2.5 mb-1 text-sm rounded-r-sm print:border-b print:border-b-slate-700 ${getParticipantClasses(
                                  match.participants[0],
                                  hasMatchByeTop,
                                  hasOpponentByeTop,
                                  true,
                                  match,
                                  matchResults
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
                                }}                                style={{
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
                                {/* Disqualification indicator for first participant */}
                                {(() => {
                                  const matchResult = matchResults[match.id];
                                  if (matchResult && matchResult.completed && matchResult.rounds.length > 0) {
                                    const decisiveRound = [...matchResult.rounds].reverse().find(round => 
                                      round.winMethod && round.winner
                                    );
                                    
                                    if (decisiveRound && decisiveRound.winMethod) {
                                      const isDisqualificationMethod = decisiveRound.winMethod === 'DSQ' || 
                                                                     decisiveRound.winMethod === 'DQB' || 
                                                                     decisiveRound.winMethod === 'DQBOTH';
                                      
                                      if (isDisqualificationMethod) {
                                        let isDisqualified = false;
                                        if (decisiveRound.winMethod === 'DQBOTH') {
                                          // Both players disqualified
                                          isDisqualified = true;
                                        } else {
                                          // Single disqualification - the disqualified player is the one who is NOT the winner
                                          isDisqualified = match.participants[0] !== decisiveRound.winner;
                                        }
                                        
                                        if (isDisqualified && match.participants[0] !== "(bye)") {
                                          return (
                                            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 text-red-600 pointer-events-none">
                                              <svg width="12" height="12" viewBox="0 0 12 12" className="fill-current">
                                                <path d="M10.5 1.5l-9 9M1.5 1.5l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                              </svg>
                                            </div>
                                          );
                                        }
                                      }
                                    }
                                  }
                                  return null;
                                })()}
                              </div>
                              {/* Separator */}
                              <div className="h-px bg-slate-200"></div>
                              {/* Participant 2 */}{" "}                              <div
                                className={`participant py-1 px-2.5 text-sm rounded-r-sm ${getParticipantClasses(
                                  match.participants[1],
                                  hasMatchByeBottom,
                                  hasOpponentByeBottom,
                                  false,
                                  match,
                                  matchResults
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
                                }}                                style={{
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
                                {/* Disqualification indicator for second participant */}
                                {(() => {
                                  const matchResult = matchResults[match.id];
                                  if (matchResult && matchResult.completed && matchResult.rounds.length > 0) {
                                    const decisiveRound = [...matchResult.rounds].reverse().find(round => 
                                      round.winMethod && round.winner
                                    );
                                    
                                    if (decisiveRound && decisiveRound.winMethod) {
                                      const isDisqualificationMethod = decisiveRound.winMethod === 'DSQ' || 
                                                                     decisiveRound.winMethod === 'DQB' || 
                                                                     decisiveRound.winMethod === 'DQBOTH';
                                      
                                      if (isDisqualificationMethod) {
                                        let isDisqualified = false;
                                        if (decisiveRound.winMethod === 'DQBOTH') {
                                          // Both players disqualified
                                          isDisqualified = true;
                                        } else {
                                          // Single disqualification - the disqualified player is the one who is NOT the winner
                                          isDisqualified = match.participants[1] !== decisiveRound.winner;
                                        }
                                        
                                        if (isDisqualified && match.participants[1] !== "(bye)") {
                                          return (
                                            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 text-red-600 pointer-events-none">
                                              <svg width="12" height="12" viewBox="0 0 12 12" className="fill-current">
                                                <path d="M10.5 1.5l-9 9M1.5 1.5l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                              </svg>
                                            </div>
                                          );
                                        }
                                      }
                                    }
                                  }
                                  return null;
                                })()}
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
                              )}                              {/* Champion badge for final match */}
                              {roundIndex === bracketData!.length - 1 && matchResults[bracketData[bracketData.length -1][0]?.id ??""] &&
                                match.winner && (
                                  <div className="absolute -right-32 top-1/2 transform -translate-y-1/2 bg-primary text-white text-xs py-1 px-2 rounded-full flex items-center">
                                    <Trophy className="h-3 w-3 mr-1" /> 
                                    Winner: {match.winner}
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
            <div className="absolute bottom-4 right-4 z-20">
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
              {selectedMatchInfo && selectedMatchInfo.match && selectedMatchInfo.winner ? (
                `Are you sure you want to set ${selectedMatchInfo.winner} as the winner for the match between ${selectedMatchInfo.match.participants[0]} and ${selectedMatchInfo.match.participants[1]}?`
              ) : (
                "Please select a valid match and winner."
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
      
    </div>
  );
};

export default BracketDisplay;