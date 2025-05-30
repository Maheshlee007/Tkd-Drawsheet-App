import React from 'react';
import { BracketMatch } from '@shared/schema';
import { Medal, Trophy } from 'lucide-react';

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
  // Function to determine the winners based on bracket data
  const getWinners = (brackets: BracketMatch[][] | null): TournamentWinners => {
    if (!brackets || brackets.length === 0) {
      return { first: null, second: null, third: null, fourth: null };
    }

    const winners: TournamentWinners = {
      first: null,
      second: null,
      third: null,
      fourth: null,
    };

    // Final round is the last round in the bracket
    const finalRound = brackets[brackets.length - 1];

    // If there's a final match with a winner
    if (finalRound?.length > 0 && finalRound[0].winner) {
      // First place is the winner of the final match
      winners.first = finalRound[0].winner;

      // Second place is the loser of the final match
      const loser = finalRound[0].participants.find(p => p !== winners.first);
      winners.second = loser || null;
    }

    // For third place, we need the semifinal losers
    if (brackets.length > 1) {
      const semiFinalRound = brackets[brackets.length - 2];
      const thirdPlacePlayoff = semiFinalRound.filter(match => {
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
        const loser1 = semifinal1.participants.find(p => p !== semifinal1.winner);
        const loser2 = semifinal2.participants.find(p => p !== semifinal2.winner);

        // For simplicity, we'll just assign 3rd and 4th places based on semifinals positions
        // In a real tournament, there would be a 3rd place match
        winners.third = loser1 || null;
        winners.fourth = loser2 || null;
      }
    }

    return winners;
  };

  const winners = getWinners(bracketData);
  // Check if there's a final winner
  const hasFinalWinner = winners.first !== null;

  return (
    <div className="medal-podium-container p-3 border rounded-lg shadow-md bg-white">
      <div className="text-center mb-3">
        <h2 className="text-lg font-bold text-blue-800 flex items-center justify-center gap-1">
          <Trophy className="h-4 w-4" /> Tournament Results
        </h2>
      </div>

      {hasFinalWinner ? (
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
          {winners.fourth && (
            <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-md border border-orange-200">
              <div className="bg-orange-100 rounded-full p-1.5 flex-shrink-0">
                <Medal className="h-4 w-4 text-orange-500" />4th
              </div>
              <div className="font-medium text-sm truncate flex-grow">
                {winners.fourth}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-sm text-gray-500 py-2">
          Tournament in progress...
        </div>
      )}
    </div>
  );
};

export default MedalPodium;
