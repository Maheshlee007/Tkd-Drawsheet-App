import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BracketMatch } from "@shared/schema";
import { calculateBracketConnectors } from "@/lib/bracketUtils";
import { Download } from "lucide-react";
import AnimationControls from "./AnimationControls";

interface BracketDisplayProps {
  bracketData: BracketMatch[][] | null;
  onExport: () => void;
  enableAnimation?: boolean;
}

const BracketDisplay: React.FC<BracketDisplayProps> = ({ 
  bracketData, 
  onExport,
  enableAnimation = true
}) => {
  const [connectors, setConnectors] = useState<
    Array<{ left: number; top: number; width?: number; height?: number; type: string }>
  >([]);
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [animatedBracket, setAnimatedBracket] = useState<BracketMatch[][] | null>(null);
  
  // Animation interval reference
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate connector lines when the bracket data changes
  useEffect(() => {
    if (bracketData && bracketContainerRef.current) {
      const newConnectors = calculateBracketConnectors(bracketData, bracketContainerRef.current);
      setConnectors(newConnectors);
      
      // Initialize animation state if enableAnimation is true
      if (enableAnimation) {
        calculateTotalSteps();
        resetAnimation();
      } else {
        setAnimatedBracket(bracketData);
      }
    }
  }, [bracketData]);
  
  // Calculate total steps for animation
  const calculateTotalSteps = () => {
    if (!bracketData) return;
    
    let steps = 0;
    // First step: Show initial bracket with all participants
    steps += 1;
    
    // Count steps for each round's matches
    bracketData.forEach((round) => {
      // Each match result is a step
      steps += round.length;
    });
    
    setTotalSteps(steps);
  };
  
  // Reset animation to beginning
  const resetAnimation = () => {
    setCurrentStep(0);
    setIsAnimating(false);
    
    if (bracketData) {
      // Create initial state of bracket with no winners
      const initialBracket = bracketData.map((round) => 
        round.map((match) => ({
          ...match,
          winner: null
        }))
      );
      
      // For the first round, we already have the participants
      setAnimatedBracket(initialBracket);
    }
    
    // Clear any running animation
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
  };
  
  // Progress animation by one step
  const progressAnimation = () => {
    if (!bracketData || currentStep >= totalSteps) {
      setIsAnimating(false);
      return;
    }
    
    // Clone current animated bracket
    const newAnimatedBracket = JSON.parse(JSON.stringify(animatedBracket));
    
    // Determine which match to update based on the current step
    const stepOffset = 1; // First step is just showing the bracket
    
    if (currentStep < stepOffset) {
      // First step is already handled by showing initial bracket
      setCurrentStep((prev) => prev + 1);
      return;
    }
    
    const stepIndex = currentStep - stepOffset;
    let matchesToProcess = 0;
    let targetRound = 0;
    let targetMatch = 0;
    
    // Find which round and match this step corresponds to
    for (let roundIndex = 0; roundIndex < bracketData.length; roundIndex++) {
      const roundMatches = bracketData[roundIndex].length;
      if (stepIndex < matchesToProcess + roundMatches) {
        targetRound = roundIndex;
        targetMatch = stepIndex - matchesToProcess;
        break;
      }
      matchesToProcess += roundMatches;
    }
    
    // Get the target match
    const origMatch = bracketData[targetRound][targetMatch];
    
    // Update the winner in the animated bracket
    if (origMatch && newAnimatedBracket[targetRound][targetMatch]) {
      newAnimatedBracket[targetRound][targetMatch].winner = origMatch.winner;
      
      // If there's a next match, update the participant there
      if (origMatch.nextMatchId && origMatch.winner) {
        // Find the next match
        for (let r = targetRound + 1; r < newAnimatedBracket.length; r++) {
          const nextMatchIndex = newAnimatedBracket[r].findIndex(
            (m: BracketMatch) => m.id === origMatch.nextMatchId
          );
          
          if (nextMatchIndex !== -1) {
            // Determine which side to place the winner (0 or 1)
            const matchPosition = origMatch.position;
            const isEvenPosition = matchPosition % 2 === 0;
            const participantIndex = isEvenPosition ? 0 : 1;
            
            // Update the participant
            newAnimatedBracket[r][nextMatchIndex].participants[participantIndex] = origMatch.winner;
            break;
          }
        }
      }
    }
    
    // Update the animated bracket
    setAnimatedBracket(newAnimatedBracket);
    setCurrentStep((prev) => prev + 1);
  };
  
  // Effect for animation playback
  useEffect(() => {
    if (isAnimating) {
      // Start animation interval
      animationIntervalRef.current = setInterval(() => {
        progressAnimation();
      }, 1000 / animationSpeed);
    } else if (animationIntervalRef.current) {
      // Stop animation
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    
    // Clean up interval on unmount
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [isAnimating, currentStep, animationSpeed, animatedBracket]);
  
  // Update connectors when animated bracket changes
  useEffect(() => {
    if (animatedBracket && bracketContainerRef.current) {
      setTimeout(() => {
        const container = bracketContainerRef.current;
        if (container) {
          const newConnectors = calculateBracketConnectors(animatedBracket, container);
          setConnectors(newConnectors);
        }
      }, 50); // Small delay to allow DOM to update
    }
  }, [animatedBracket]);

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
        <div className="bracket-display min-w-[900px] relative pb-8" style={{ minHeight: bracketData.length > 2 ? 500 : 250, minWidth: bracketData.length * 240 }}>
          {/* Render rounds */}
          {(enableAnimation ? animatedBracket : bracketData)?.map((round, roundIndex) => (
            <div
              key={`round-${roundIndex}`}
              className="bracket-round flex flex-col justify-around absolute"
              style={{
                left: `${roundIndex * 230}px`,
                top: 0,
                bottom: 0,
                width: "14rem",
              }}
            >
              {round.map((match, matchIndex) => (
                <div
                  key={`match-${match.id}`}
                  className={`bracket-match p-3 border rounded-md bg-white shadow-sm relative mb-6 ${
                    roundIndex === 0 ? "border-blue-500 bg-blue-50 bg-opacity-40" : 
                    roundIndex === 1 ? "border-red-500 bg-red-50 bg-opacity-60" : 
                    "border-slate-200"
                  }`}
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
                  {roundIndex === (enableAnimation ? (animatedBracket?.length || 0) : bracketData.length) - 1 && match.winner && (
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
      
      {/* Animation Controls */}
      {enableAnimation && animatedBracket && (
        <AnimationControls
          isPlaying={isAnimating}
          setIsPlaying={setIsAnimating}
          currentStep={currentStep}
          setCurrentStep={(step) => {
            // When manually setting a step, we need to rebuild the bracket state
            setCurrentStep(0); // Reset first
            
            // Then simulate progressing to the specified step
            const simBracket = JSON.parse(JSON.stringify(animatedBracket));
            for (let i = 0; i <= step; i++) {
              // We're not actually changing state here, just building a simulated bracket
              // Copy the progressAnimation logic but apply it to a local variable
              if (i > 0) { // Skip first step which is just the initial display
                const stepIndex = i - 1;
                let matchesToProcess = 0;
                let targetRound = 0;
                let targetMatch = 0;
                
                // Find which match this step corresponds to
                for (let roundIndex = 0; roundIndex < bracketData.length; roundIndex++) {
                  const roundMatches = bracketData[roundIndex].length;
                  if (stepIndex < matchesToProcess + roundMatches) {
                    targetRound = roundIndex;
                    targetMatch = stepIndex - matchesToProcess;
                    break;
                  }
                  matchesToProcess += roundMatches;
                }
                
                // Get the target match
                const origMatch = bracketData[targetRound][targetMatch];
                
                // Update the winner in the simulated bracket
                if (origMatch && simBracket[targetRound][targetMatch]) {
                  simBracket[targetRound][targetMatch].winner = origMatch.winner;
                  
                  // If there's a next match, update the participant there
                  if (origMatch.nextMatchId && origMatch.winner) {
                    // Find the next match
                    for (let r = targetRound + 1; r < simBracket.length; r++) {
                      const nextMatchIndex = simBracket[r].findIndex(
                        (m: BracketMatch) => m.id === origMatch.nextMatchId
                      );
                      
                      if (nextMatchIndex !== -1) {
                        // Determine which side to place the winner
                        const matchPosition = origMatch.position;
                        const isEvenPosition = matchPosition % 2 === 0;
                        const participantIndex = isEvenPosition ? 0 : 1;
                        
                        // Update the participant
                        simBracket[r][nextMatchIndex].participants[participantIndex] = origMatch.winner;
                        break;
                      }
                    }
                  }
                }
              }
            }
            
            // Set the state to the resulting bracket and step
            setAnimatedBracket(simBracket);
            setCurrentStep(step);
          }}
          totalSteps={totalSteps}
          resetAnimation={resetAnimation}
          animationSpeed={animationSpeed}
          setAnimationSpeed={setAnimationSpeed}
        />
      )}
    </div>
  );
};

export default BracketDisplay;
