import React, { useState, useRef, useEffect } from 'react';
import { BracketMatch } from '@shared/schema';
import { Medal, Trophy, Clock, Award, X } from 'lucide-react';
import { useTournamentStore } from '@/store/useTournamentStore';

interface MedalPodiumProps {
  bracketData: BracketMatch[][] | null;
}

interface TournamentWinners {
  first: string | null;
  second: string | null;
  third: string | null;
  fourth: string | null;
}

const MedalPodium: React.FC<MedalPodiumProps> = ({ bracketData }) => {
  // State to track whether the podium is visible
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const podiumRef = useRef<HTMLDivElement>(null);
  const { matchResults } = useTournamentStore();
  // Function to determine the winners based on bracket data
  const getWinners = (brackets: BracketMatch[][] | null): TournamentWinners => {
    if (!brackets || brackets.length === 0) {
      return { first: null, second: null, third: null, fourth: null };
    }
    
    // Only calculate winners when the final match is complete
    const lastRound = brackets[brackets.length - 1];
    if (!lastRound || lastRound.length === 0 || !lastRound[0].winner) {
      return { first: null, second: null, third: null, fourth: null };
    }
    
    const winners: TournamentWinners = {
      first: null,
      second: null,
      third: null,
      fourth: null,
    };

    // Final round is the last round in the bracket (we already know it has a winner from the check above)
    const finalRound = lastRound;

    // Handle the case where both finalists are disqualified
    if (finalRound[0].winner === "NO_WINNER") {
      // No champion due to mutual disqualification
      winners.first = "No Winner - Both Finalists DQ";
      winners.second = null;
      
      // Still try to determine 3rd and 4th place from semifinals if available
      if (brackets.length > 1) {
        const semiFinalRound = brackets[brackets.length - 2];
        if (semiFinalRound.length >= 2 && semiFinalRound.every((match: BracketMatch) => match.winner !== null)) {
          // Get semifinal losers for 3rd/4th place
          const semifinal1 = semiFinalRound[0];
          const semifinal2 = semiFinalRound[1];
          
          const loser1 = semifinal1.participants.find((p: string | null) => p !== semifinal1.winner);
          const loser2 = semifinal2.participants.find((p: string | null) => p !== semifinal2.winner);
          
          winners.third = loser1 || null;
          winners.fourth = loser2 || null;
        }
      }
      
      return winners;
    }

    // Set first place (the winner of the final match)
    winners.first = finalRound[0].winner;

    // Second place is the loser of the final match
    const loser = finalRound[0].participants.find((p: string | null) => p !== winners.first);
    winners.second = loser || null;

    // For third place, we need the semifinal losers
    if (brackets.length > 1) {
      const semiFinalRound = brackets[brackets.length - 2];
      
      // Only process semifinals if they have declared winners
      if (semiFinalRound.every((match: BracketMatch) => match.winner !== null)) {
        const thirdPlacePlayoff = semiFinalRound.filter((match: BracketMatch) => {
          // Find finalists
          const isFinalist1 = match.winner === winners.first;
          const isFinalist2 = match.winner === winners.second;
          
          // Return the match whose loser would be in the 3rd/4th place playoff
          return isFinalist1 || isFinalist2;
        });

        if (thirdPlacePlayoff.length >= 2) {
          // The semifinal matches that determine 3rd and 4th places
          const semifinal1 = thirdPlacePlayoff[0];
          const semifinal2 = thirdPlacePlayoff[1];

          // Find the losers of the semifinals
          const loser1 = semifinal1.participants.find((p: string | null) => p !== semifinal1.winner);
          const loser2 = semifinal2.participants.find((p: string | null) => p !== semifinal2.winner);

          // Only add bronze medalists if semifinals have been completed
          winners.third = loser1 || null;
          winners.fourth = loser2 || null;
        }
      }
    }

    return winners;
  };
  
  // Get winners from bracket data
  const winners = getWinners(bracketData);
  const finalMatchId= bracketData && bracketData.length > 0 ? bracketData[bracketData.length - 1][0].id : "";
  // Check tournament progress to control when to show results
  const finalRound = bracketData && bracketData.length > 0 ? bracketData[bracketData.length - 1] : null;
  const isFinalRoundComplete = finalRound && finalRound.length > 0 && finalRound[0].winner !== null;
  
  // Check if semifinals are complete (all semifinal matches have winners)
  const areSemiFinalsComplete = bracketData && 
                               bracketData.length > 1 && 
                               bracketData[bracketData.length - 2]?.every((match: BracketMatch) => match.winner !== null);
  
  // Only show bronze medals when semifinals are complete AND finals are complete
  const showBronzeMedals = areSemiFinalsComplete && isFinalRoundComplete;
  
  // Only show full results when final match has a winner AND we have a winner
  const hasFinalWinner = isFinalRoundComplete && winners.first !== null;
  
  // Close the podium when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (podiumRef.current && !podiumRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    }
    
    // Only add the listener when the podium is visible
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);
  
  return (
    <>
      {/* Toggle button when podium is hidden */}
      {!isVisible && (
        <button 
          onClick={() => setIsVisible(true)}
          className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all"
          title="Show Tournament Results"
        >
          <Trophy className="h-5 w-5" />
        </button>
      )}
      
      {/* Podium content when visible */}
      {isVisible && (
        <div 
          ref={podiumRef}
          className="medal-podium-container p-3 border rounded-lg shadow-lg bg-white/95 backdrop-blur-sm w-[250px]"
          style={{
            animation: 'podiumFadeIn 0.3s ease-out',
            transform: 'translateY(0)',
            transition: 'transform 0.3s ease, opacity 0.3s ease'
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-1">
              <Trophy className="h-5 w-5 text-yellow-500" /> Tournament Results
            </h2>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close results"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <style>{`
            @keyframes podiumFadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {hasFinalWinner && matchResults[finalMatchId] ? (
            <div className="space-y-2">
              {/* Gold - 1st Place */}
              <div className="flex items-center gap-2 bg-yellow-50 p-2 rounded-md border border-yellow-200">
                <div className="bg-yellow-100 rounded-full p-1.5 flex-shrink-0">
                  <Trophy className="h-4 w-4 text-yellow-500" />1st
                </div>
                <div className="font-medium text-sm truncate flex-grow">
                  {winners.first}
                </div>
              </div>
              
              {/* Silver - 2nd Place */}
              {winners.second && (
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border border-gray-200">
                  <div className="bg-gray-100 rounded-full p-1.5 flex-shrink-0">
                    <Medal className="h-4 w-4 text-gray-500" />2nd
                  </div>
                  <div className="font-medium text-sm truncate flex-grow">
                    {winners.second}
                  </div>
                </div>
              )}
              
              {/* Bronze medals - Only show when semifinals are complete */}
              {showBronzeMedals && (
                <>
                  {/* Bronze - 3rd Place */}
                  {winners.third && (
                    <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-md border border-orange-200">
                      <div className="bg-orange-100 rounded-full p-1.5 flex-shrink-0">
                        <Medal className="h-4 w-4 text-orange-500" />3rd
                      </div>
                      <div className="font-medium text-sm truncate flex-grow">
                        {winners.third}
                      </div>
                    </div>
                  )}
                  
                  {/* 4th Place */}
                  {winners.fourth && (
                    <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-md border border-orange-200 opacity-80">
                      <div className="bg-orange-100 rounded-full p-1.5 flex-shrink-0">
                        <Medal className="h-4 w-4 text-orange-400" />4th
                      </div>
                      <div className="font-medium text-sm truncate flex-grow">
                        {winners.fourth}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="py-2">
              <div className="flex items-center justify-center text-sm text-gray-600 mb-2">
                <Clock className="h-4 w-4 mr-1 text-blue-500" />
                <span>Tournament in progress...</span>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {finalRound && finalRound.length > 0 ? 
                  "Waiting for final match results" :
                  "Results will appear when all matches are completed"
                }
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default MedalPodium;
