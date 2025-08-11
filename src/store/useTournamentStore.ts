import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { BracketMatch } from '@shared/schema';
import { createBracket } from '@/lib/bracketUtils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Define Toast type
type ToastType = 'default' | 'success' | 'destructive';

interface ToastMessage {
  type: ToastType;
  title: string;
  description: string;
}

// Define win methods
export type WinMethod = 'PTF' | 'PTG' | 'DSQ' | 'PUN' | 'RSC' | 'WDR' | 'DQB' | 'DQBOTH';

// Define round result
export interface RoundResult {
  player1Score: number | null;
  player2Score: number | null;
  winMethod: WinMethod | null;
  winner: string | null; // player name or null for tie
  winMethodReason?: string; // Optional reason for the win method, especially for PUN
}

// Define match history entry
export interface MatchHistoryEntry {
  timestamp: number;
  action: 'create' | 'update';
  previousWinner: string | null;
  newWinner: string | null;
  reason: string | null;
}

// Define match result
export interface MatchResult {
  matchId: string;
  player1: string;
  player2: string;
  winner: string | null; // player name, null for tie, or "NO_WINNER" for mutual disqualification
  completed: boolean;
  rounds: RoundResult[];
  comment?: string;  // Optional comment field for tiebreaker decisions
  matchLevelDecision?: {
    method: 'PUN' | 'EXTRA_ROUND' | null;
    winner: string | null;
    reason: string;
  };
  history: MatchHistoryEntry[];
}

interface TournamentState {
  // Data
  tournamentId: string; // Unique identifier for each tournament
  tournamentName: string;
  bracketData: BracketMatch[][] | null;
  participantCount: number;
  seedType: 'random' | 'ordered' | 'as-entered';
  
  // Participant Management (Future Extension)
  // participantDetails: Record<string, ParticipantDetails>; // Future: Extended participant info
  // Currently we use participant names as strings in bracketData and matchResults
  
  // Match round configuration
  internalRoundsPerMatch: number;
  matchResults: Record<string, MatchResult>;
  
  // UI State
  isExportModalOpen: boolean;
  isPending: boolean;
  toast: ToastMessage | null;
    // Current match highlighting
  currentMatchId: string | null; // ID of the match currently being worked on
  
  // Tournament Progress Tracking
  tournamentStarted: boolean; // Whether the tournament has begun (any matches started)
  roundsStarted: boolean; // Whether round-based scoring has started
  
  // Actions
  resetTournamentData: () => void;
  setTournamentName: (name: string) => void;
  generateBracket: (
    participants: string[], 
    seedType: 'random' | 'ordered' | 'as-entered',
    tournamentName?: string,
    rounds?: number
  ) => void;
  updateTournamentMatch: (matchId: string, winnerId: string) => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  exportAsPNG: () => void;
  exportAsPDF: () => void;
  copyToClipboard: () => void;
  
  // New actions for match rounds
  setInternalRoundsPerMatch: (rounds: number) => void;
  saveMatchResult: (matchResult: MatchResult) => void;
  saveIntermediateMatchState: (matchId: string, rounds: RoundResult[], comment: string, matchLevelDecision: any) => void;
  updateMatchWinner: (matchId: string, newWinner: string, reason: string) => void;
  exportMatchDataAsJson: () => void;
    // Participant management
  updateParticipantName: (oldName: string, newName: string) => { success: boolean; message?: string };
  deleteParticipant: (participantName: string) => { success: boolean; message?: string };
  addParticipant: (participantName: string) => { success: boolean; message?: string };
  
  // Tournament Progress Tracking
  getRoundStatus: () => { anyMatchesStarted: boolean; anyRoundsStarted: boolean };
  canModifyParticipants: () => { canModify: boolean; reason?: string };
  
  // Current match actions
  setCurrentMatch: (matchId: string | null) => void;
  
  // Toast actions
  showToast: (toast: ToastMessage) => void;
  clearToast: () => void;
}

// Define the store with properly typed persistence and devtools
export const useTournamentStore = create<TournamentState>()(
  devtools(
    persist(
      (set, get) => ({  // Initial State
  tournamentId: Date.now().toString(), // Unique ID for each tournament
  tournamentName: 'Tournament Draw Sheet',
  bracketData: null,
  participantCount: 0,
  seedType: 'random',
  internalRoundsPerMatch: 3,
  matchResults: {},
  isExportModalOpen: false,
  isPending: false,
  toast: null,
  currentMatchId: null,
  tournamentStarted: false,
  roundsStarted: false,
  
  // Toast actions
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
  
  // Actions
  setTournamentName: (name) => set({ tournamentName: name }),
  // Reset all tournament data
  resetTournamentData: () => {
    // Generate a new tournament ID to ensure complete fresh start
    const newTournamentId = Date.now().toString();
      set({
      tournamentId: newTournamentId,
      bracketData: null,
      participantCount: 0,
      matchResults: {},
      isExportModalOpen: false,
      isPending: false,
      // Reset to default values
      tournamentName: 'Tournament Draw Sheet',
      seedType: 'random',
      internalRoundsPerMatch: 3,
      tournamentStarted: false,
      roundsStarted: false
    });
    
    // Clear localStorage to ensure no persistence between tournaments
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tournament-storage');
    }
    
    get().showToast({
      type: 'success',
      title: 'Reset Complete',
      description: 'Tournament data has been cleared'
    });
  },
  
  generateBracket: (participants, seedType, tournamentName, rounds = 3) => {
    set({ isPending: true });
    
    try {
      // First perform a complete reset to ensure clean slate
      // Create a new tournament ID for each new tournament
      const newTournamentId = Date.now().toString();
        // Clear all stored data including matchResults
      set({ 
        tournamentId: newTournamentId,
        bracketData: null,
        matchResults: {},
        participantCount: 0,
        tournamentStarted: false,
        roundsStarted: false
      });
      
      // If tournament name is provided, update it
      if (tournamentName) {
        set({ tournamentName });
      }
      
      // Ensure rounds parameter is a valid number
      const validatedRounds = typeof rounds === 'number' && !isNaN(rounds) && rounds > 0 
        ? Math.floor(rounds) 
        : 3;
      
      // Generate the bracket data
      const bracketData = createBracket(participants, seedType);
      const participantCount = participants.length || 0;
      
      set({ 
        bracketData, 
        participantCount, 
        seedType,
        internalRoundsPerMatch: validatedRounds,
        isPending: false 
      });
      
      // Clear localStorage to ensure no persistence between tournaments
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('tournament-storage');
        } catch (e) {
          console.warn('Could not clear localStorage', e);
        }
      }
      
      get().showToast({
        type: 'success',
        title: 'Success',
        description: 'Tournament bracket generated successfully!'
      });
    } catch (error) {
      console.error('Failed to generate bracket:', error);
      set({ isPending: false });
      
      get().showToast({
        type: 'destructive',
        title: 'Error',
        description: 'Failed to generate tournament bracket'
      });
    }
  },
  updateTournamentMatch: (matchId, winnerId) => {
    const { bracketData } = get();
    if (!bracketData) return;
    
    // console.log('updateTournamentMatch called:', { matchId, winnerId });
    
    const newBracketData = [...bracketData];
    
    // Find the match in the bracket data
    let targetMatch: BracketMatch | null = null;
    let targetRoundIndex = -1;
    let targetMatchIndex = -1;
    
    // Find the match by ID
    for (let roundIndex = 0; roundIndex < newBracketData.length; roundIndex++) {
      const round = newBracketData[roundIndex];
      const matchIndex = round.findIndex(match => match.id === matchId);
      
      if (matchIndex !== -1) {
        targetMatch = round[matchIndex];
        targetRoundIndex = roundIndex;
        targetMatchIndex = matchIndex;
        break;
      }
    }
    
    if (!targetMatch || targetRoundIndex === -1 || targetMatchIndex === -1) {
      console.log('Match not found:', { matchId, targetMatch, targetRoundIndex, targetMatchIndex });
      get().showToast({
        type: 'destructive',
        title: 'Error',
        description: 'Match not found'
      });
      return;
    }
    //   console.log('Found target match:', { 
    //   targetMatch, 
    //   targetRoundIndex, 
    //   targetMatchIndex,
    //   nextMatchId: targetMatch.nextMatchId 
    // });

    // Check if this is a real match (both participants present) that requires match results
    const isRealMatch = targetMatch.participants[0] && 
                        targetMatch.participants[1] && 
                        targetMatch.participants[0] !== "(bye)" && 
                        targetMatch.participants[1] !== "(bye)";
    
    const { matchResults } = get();
    const hasMatchResults = matchResults[matchId]?.completed;

    // For real matches, require both winner assignment and completed match results
    if (isRealMatch && !hasMatchResults && winnerId !== "NO_WINNER") {
      console.warn('Warning: Setting winner for real match without completed match results:', {
        matchId,
        participants: targetMatch.participants,
        winnerId,
        hasMatchResults
      });
      
      // Optionally prevent winner assignment without match results:
      // get().showToast({
      //   type: 'destructive',
      //   title: 'Match Results Required',
      //   description: 'Please complete the match scoring before setting a winner.'
      // });
      // return;
    }
    
    // Update the winner for this match
    newBracketData[targetRoundIndex][targetMatchIndex] = {
      ...targetMatch,
      winner: winnerId
    };
      // If there's a next match, update its participants
    if (targetMatch.nextMatchId) {
      // Find the next match
      let nextMatch: BracketMatch | null = null;
      let nextRoundIndex = -1;
      let nextMatchIndex = -1;
      
      for (let roundIndex = 0; roundIndex < newBracketData.length; roundIndex++) {
        const round = newBracketData[roundIndex];
        const matchIndex = round.findIndex(match => match.id === targetMatch?.nextMatchId);
        
        if (matchIndex !== -1) {
          nextMatch = round[matchIndex];
          nextRoundIndex = roundIndex;
          nextMatchIndex = matchIndex;
          break;
        }
      }
        if (nextMatch && nextRoundIndex !== -1 && nextMatchIndex !== -1) {
        // Determine which position this participant should take
        const positionInNextMatch = targetMatch.position % 2 === 0 ? 0 : 1;
        
        // console.log('Propagating winner to next match:', {
        //   nextMatchId: targetMatch.nextMatchId,
        //   nextMatch: nextMatch,
        //   positionInNextMatch,
        //   winnerId,
        //   currentParticipants: nextMatch.participants
        // });
        
        // Create an updated participants array for the next match
        const newParticipants: [string | null, string | null] = [...nextMatch.participants] as [string | null, string | null];
        
        // Set the participant based on whether there's a winner or both were disqualified
        newParticipants[positionInNextMatch] = winnerId === "NO_WINNER" ? "No player" : winnerId;
        
        console.log('Updated participants for next match:', {
          before: nextMatch.participants,
          after: newParticipants
        });
        
        // Update the next match
        newBracketData[nextRoundIndex][nextMatchIndex] = {
          ...nextMatch,
          participants: newParticipants,
          // Only set winner if there's an actual player advancing
          winner: winnerId === "NO_WINNER" ? 
            nextMatch.winner : 
            (nextMatch.winner === nextMatch.participants[positionInNextMatch] ? winnerId : nextMatch.winner)
        };
      } else {
        console.log('Next match not found or invalid:', {
          nextMatchId: targetMatch.nextMatchId,
          nextMatch,
          nextRoundIndex,
          nextMatchIndex
        });
      }
    }
    
    // Update the state with the new bracket data
    set({ bracketData: newBracketData });
    
    // Show appropriate toast message
    const successMessage = winnerId === "NO_WINNER" 
      ? "Match completed - both players disqualified, no advancement"
      : `Winner set to ${winnerId}`;
    
    get().showToast({
      type: 'success',
      title: 'Match Updated',
      description: successMessage
    });
  },
  
  openExportModal: () => set({ isExportModalOpen: true }),
  
  closeExportModal: () => set({ isExportModalOpen: false }),
  
  exportAsPNG: () => {
    const activePoolTab = document.querySelector('button[data-state="active"]');
    const poolIndex = activePoolTab?.getAttribute('value') || "0";
    
    const printView = document.querySelector(".print\\:block .bracket-display");
    if (!printView) {
      get().showToast({
        type: 'destructive',
        title: 'Export Error',
        description: 'Could not find bracket display element'
      });
      return;
    }
    
    const { closeExportModal } = get();
    
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.backgroundColor = 'white';
    cloneContainer.style.padding = '20px';
    
    const title = document.createElement('h2');
    title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex as string) + 1}`;
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.margin = '20px 0';
    cloneContainer.appendChild(title);
    
    const clone = printView.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    html2canvas(cloneContainer, {
      backgroundColor: "#FFFFFF",
      scale: 1.5,
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 0 !important;
            margin-left: 20px !important;
          }
          .bracket-round:first-child {
            margin-left: 0 !important;
          }
          .bracket-match {
            padding: 0 !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 2px !important;
          }
          .participant {
            padding: 1px 2px !important;
            margin: 0 !important;
          }
          .bracket-connector {
            border-color: #666 !important;
          }
        `;
        document.head.appendChild(clonedStyles);
      }
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `tournament-bracket-pool-${parseInt(poolIndex as string) + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      document.body.removeChild(cloneContainer);
      
      closeExportModal();
      
      get().showToast({
        type: 'success',
        title: 'Success',
        description: 'Bracket exported as PNG successfully!'
      });
    }).catch(error => {
      console.error("Export error:", error);
      document.body.removeChild(cloneContainer);
      
      get().showToast({
        type: 'destructive',
        title: 'Export Error',
        description: 'Failed to export bracket as PNG'
      });
      
      closeExportModal();
    });
  },
  
  exportAsPDF: () => {
    const activePoolTab = document.querySelector('button[data-state="active"]');
    const poolIndex = activePoolTab?.getAttribute('value') || "0";
    
    const printView = document.querySelector(".print\\:block .bracket-display");
    if (!printView) {
      get().showToast({
        type: 'destructive',
        title: 'Export Error',
        description: 'Could not find bracket display element'
      });
      return;
    }
    
    const { closeExportModal } = get();
    
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.backgroundColor = 'white';
    cloneContainer.style.padding = '20px';
    
    const title = document.createElement('h2');
    title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex as string) + 1}`;
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.margin = '20px 0';
    cloneContainer.appendChild(title);
    
    const clone = printView.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    html2canvas(cloneContainer, {
      backgroundColor: "#FFFFFF",
      scale: 1.5,
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 0 !important;
            margin-left: 20px !important;
          }
          .bracket-round:first-child {
            margin-left: 0 !important;
          }
          .bracket-match {
            padding: 0 !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 2px !important;
          }
          .participant {
            padding: 1px 2px !important;
            margin: 0 !important;
          }
          .bracket-connector {
            border-color: #666 !important;
          }
        `;
        document.head.appendChild(clonedStyles);
      }
    }).then((canvas) => {
      // Generate PDF
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with appropriate orientation
      const pdf = new jsPDF({
        orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
        unit: 'mm',
      });
      
      // Calculate dimensions to fit the PDF page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      let imgWidth = pdfWidth - 20; // 10mm margins on each side
      let imgHeight = (canvasHeight * imgWidth) / canvasWidth;
      
      // If image is too tall, scale based on height
      if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20;
        imgWidth = (canvasWidth * imgHeight) / canvasHeight;
      }
      
      // Center the image
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`tournament-bracket-pool-${parseInt(poolIndex as string) + 1}.pdf`);
      
      document.body.removeChild(cloneContainer);
      
      closeExportModal();
      
      get().showToast({
        type: 'success',
        title: 'Success',
        description: 'Bracket exported as PDF successfully!'
      });
    }).catch(error => {
      console.error("Export error:", error);
      document.body.removeChild(cloneContainer);
      
      get().showToast({
        type: 'destructive',
        title: 'Export Error',
        description: 'Failed to export bracket as PDF'
      });
      
      closeExportModal();
    });
  },
  
  copyToClipboard: () => {
    const activePoolTab = document.querySelector('button[data-state="active"]');
    const poolIndex = activePoolTab?.getAttribute('value') || "0";
    
    const printView = document.querySelector(".print\\:block .bracket-display");
    if (!printView) {
      get().showToast({
        type: 'destructive',
        title: 'Copy Error',
        description: 'Could not find bracket display element'
      });
      return;
    }
    
    const { closeExportModal } = get();
    
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = 'max-content';
    cloneContainer.style.backgroundColor = 'white';
    cloneContainer.style.padding = '20px';
    
    const title = document.createElement('h2');
    title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex as string) + 1}`;
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.margin = '20px 0';
    cloneContainer.appendChild(title);
    
    const clone = printView.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);
    
    html2canvas(cloneContainer, {
      backgroundColor: "#FFFFFF",
      scale: 1.5,
      allowTaint: true,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        const clonedStyles = document.createElement('style');
        clonedStyles.textContent = `
          .bracket-round {
            width: 180px !important;
            padding: 0 !important;
            margin-left: 20px !important;
          }
          .bracket-round:first-child {
            margin-left: 0 !important;
          }
          .bracket-match {
            padding: 0 !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 2px !important;
          }
          .participant {
            padding: 1px 2px !important;
            margin: 0 !important;
          }
          .bracket-connector {
            border-color: #666 !important;
          }
        `;
        document.head.appendChild(clonedStyles);
      }
    }).then(async (canvas) => {
      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob conversion failed'));
          }, 'image/png');
        });
        
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        
        document.body.removeChild(cloneContainer);
        
        closeExportModal();
        
        get().showToast({
          type: 'success',
          title: 'Success',
          description: 'Bracket copied to clipboard!'
        });
      } catch (err) {
        console.error("Copy error:", err);
        document.body.removeChild(cloneContainer);
        
        get().showToast({
          type: 'destructive',
          title: 'Copy Error',
          description: 'Failed to copy bracket to clipboard'
        });
        
        closeExportModal();
      }
    }).catch(error => {
      console.error("Copy error:", error);
      document.body.removeChild(cloneContainer);
      
      get().showToast({
        type: 'destructive',
        title: 'Copy Error',
        description: 'Failed to generate image for clipboard'
      });
      
      closeExportModal();
    });
  },
  
  setInternalRoundsPerMatch: (rounds) => {
    const { matchResults } = get();
    
    // Update the number of rounds
    set({ internalRoundsPerMatch: rounds });
    
    // If there are existing match results, update them to have the correct number of rounds
    if (Object.keys(matchResults).length > 0) {
      const updatedResults = { ...matchResults };
      
      // Update each match result to have the correct number of rounds
      Object.keys(updatedResults).forEach(matchId => {
        const result = updatedResults[matchId];
        
        // Ensure each match has exactly the new number of rounds
        if (result.rounds.length < rounds) {
          // Add more rounds if needed
          while (result.rounds.length < rounds) {
            result.rounds.push({
              player1Score: null,
              player2Score: null,
              winMethod: null,
              winner: null
            });
          }
        } else if (result.rounds.length > rounds) {
          // Remove excess rounds
          result.rounds = result.rounds.slice(0, rounds);
        }
      });
      
      set({ matchResults: updatedResults });
    }
    
    get().showToast({
      type: 'success',
      title: 'Rounds Updated',
      description: `Match rounds set to ${rounds}`
    });
  },
    saveMatchResult: (matchResult) => {
    const { matchResults, bracketData } = get();
    
    // Save the match result, merging with existing data if present
    set({ 
      matchResults: {
        ...matchResults,
        [matchResult.matchId]: matchResult
      } 
    });
    
    // If we have a completed match with a winner, update the bracket too
    if (matchResult.completed && matchResult.winner && bracketData) {
      // The updateTournamentMatch function handles winner advancement
      get().updateTournamentMatch(matchResult.matchId, matchResult.winner);
    }
    
    get().showToast({
      type: 'success',
      title: 'Success',
      description: 'Match result saved'
    });
  },

  saveIntermediateMatchState: (matchId, rounds, comment, matchLevelDecision) => {
    const { matchResults } = get();
    const existingResult = matchResults[matchId];
    
    // Get match participants from existing result or create a minimal structure
    let player1 = '';
    let player2 = '';
    
    if (existingResult) {
      player1 = existingResult.player1;
      player2 = existingResult.player2;
    } else {
      // If no existing result, we need to find the participants from the bracket
      const { bracketData } = get();
      if (bracketData) {
        for (const round of bracketData) {
          const match = round.find(m => m.id === matchId);
          if (match && match.participants[0] && match.participants[1]) {
            player1 = match.participants[0] || '';
            player2 = match.participants[1] || '';
            break;
          }
        }
      }
    }
    
    // Create intermediate match state - not marked as completed
    const intermediateMatchResult: MatchResult = {
      matchId,
      player1,
      player2,
      winner: null, // Winner not determined yet for intermediate state
      completed: false, // Explicitly mark as incomplete
      rounds: [...rounds], // Save current round states
      comment: comment || '',
      matchLevelDecision: matchLevelDecision || undefined,
      history: existingResult?.history || []
    };
    
    // Save the intermediate state
    set({ 
      matchResults: {
        ...matchResults,
        [matchId]: intermediateMatchResult
      } 
    });
    
    // No toast for intermediate saves to avoid spam
    console.log(`Intermediate match state saved for ${matchId}`);
  },
    updateMatchWinner: (matchId, newWinner, reason) => {
    const { matchResults } = get();
    const matchResult = matchResults[matchId];
    
    if (!matchResult) {
      get().showToast({
        type: 'destructive',
        title: 'Error',
        description: 'Match result not found'
      });
      return;
    }
    
    // Create a properly typed history entry
    const historyEntry: MatchHistoryEntry = {
      timestamp: Date.now(),
      action: 'update',
      previousWinner: matchResult.winner,
      newWinner,
      reason: reason || null
    };
    
    // Update the match result with the new winner
    const updatedMatchResult = {
      ...matchResult,
      winner: newWinner,
      history: [
        ...matchResult.history,
        historyEntry
      ]
    };
    
    set({ 
      matchResults: {
        ...matchResults,
        [matchId]: updatedMatchResult
      } 
    });
    
    get().showToast({
      type: 'success',
      title: 'Success',
      description: `Match winner updated to ${newWinner}`
    });
  },
    exportMatchDataAsJson: () => {
    const { matchResults } = get();
    
    // Convert match results to a JSON string
    const json = JSON.stringify(matchResults, null, 2);
    
    // Create a blob from the JSON string
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a link to download the JSON file
    const a = document.createElement('a');
    a.href = url;
    a.download = 'match-results.json';
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    get().showToast({
      type: 'success',
      title: 'Success',
      description: 'Match data exported as JSON'
    });
  },

  // Participant management
  updateParticipantName: (oldName, newName) => {
    if (!newName || newName.trim() === "") {
      get().showToast({ 
        type: 'destructive', 
        title: 'Error', 
        description: "New name cannot be empty." 
      });
      return { success: false, message: "New name cannot be empty." };
    }
    
    if (oldName === newName) {
      return { success: true, message: "Names are the same, no update performed." };
    }

    const { bracketData, matchResults, showToast } = get();
    
    // Check if newName already exists (case-insensitive)
    const allParticipants = new Set<string>();
    if (bracketData) {
      bracketData.flat().forEach(match => {
        match.participants.forEach(participant => {
          if (participant && participant !== "(bye)") {
            allParticipants.add(participant.toLowerCase());
          }
        });
      });
    }

    if (allParticipants.has(newName.toLowerCase()) && oldName.toLowerCase() !== newName.toLowerCase()) {
      showToast({ 
        type: 'destructive', 
        title: 'Error', 
        description: `Participant name "${newName}" already exists.` 
      });
      return { success: false, message: `Participant name "${newName}" already exists.` };
    }

    // Deep clone to avoid direct state mutation
    let updatedBracketData = bracketData ? JSON.parse(JSON.stringify(bracketData)) as BracketMatch[][] : null;
    const updatedMatchResults = JSON.parse(JSON.stringify(matchResults)) as Record<string, MatchResult>;

    let nameChanged = false;

    // Update in bracketData
    if (updatedBracketData) {
      updatedBracketData.forEach(round => {
        round.forEach(match => {
          match.participants = match.participants.map(participant => {
            if (participant === oldName) { 
              nameChanged = true; 
              return newName; 
            }
            return participant;
          }) as [string | null, string | null];
          
          if (match.winner === oldName) {
            match.winner = newName;
            nameChanged = true;
          }
        });
      });
    }

    // Update in matchResults
    Object.values(updatedMatchResults).forEach(match => {
      if (match.player1 === oldName) { 
        match.player1 = newName; 
        nameChanged = true; 
      }
      if (match.player2 === oldName) { 
        match.player2 = newName; 
        nameChanged = true; 
      }
      if (match.winner === oldName) { 
        match.winner = newName; 
        nameChanged = true; 
      }
      
      // Update rounds
      match.rounds?.forEach(round => {
        if (round.winner === oldName) { 
          round.winner = newName; 
          nameChanged = true; 
        }
      });
      
      // Update history entries
      match.history?.forEach(entry => {
        if (entry.previousWinner === oldName) { 
          entry.previousWinner = newName; 
          nameChanged = true; 
        }
        if (entry.newWinner === oldName) { 
          entry.newWinner = newName; 
          nameChanged = true; 
        }
      });
    });

    if (!nameChanged) {
      showToast({ 
        type: 'destructive', 
        title: 'Error', 
        description: `Participant "${oldName}" not found.` 
      });
      return { success: false, message: `Participant "${oldName}" not found.` };
    }
    
    // Update the state
    set({ 
      bracketData: updatedBracketData, 
      matchResults: updatedMatchResults 
    });
    
    showToast({ 
      type: 'success', 
      title: 'Success', 
      description: `Participant "${oldName}" updated to "${newName}".` 
    });
      return { success: true };
  },  // Advanced Participant Management
  deleteParticipant: (participantName) => {
    const { bracketData, matchResults, showToast, seedType } = get();
    
    // Check if actual tournament matches have started (not just bye advancements)
    const progressStatus = get().getRoundStatus();
    if (progressStatus.anyMatchesStarted) {
      showToast({ 
        type: 'destructive', 
        title: 'Cannot Delete Participant', 
        description: 'Cannot delete participants after actual matches have started. Use disqualification instead.' 
      });
      return { success: false, message: 'Tournament matches have already started.' };
    }

    if (!bracketData) {
      showToast({ 
        type: 'destructive', 
        title: 'Error', 
        description: 'No tournament bracket found.' 
      });
      return { success: false, message: 'No tournament bracket found.' };
    }

    // Check if participant exists
    let participantFound = false;
    bracketData.flat().forEach(match => {
      if (match.participants.includes(participantName)) {
        participantFound = true;
      }
    });

    if (!participantFound) {
      showToast({ 
        type: 'destructive', 
        title: 'Error', 
        description: `Participant "${participantName}" not found.` 
      });
      return { success: false, message: `Participant "${participantName}" not found.` };
    }

    // Get all current participants except the one being deleted
    const remainingParticipants: string[] = [];
    bracketData.flat().forEach(match => {
      match.participants.forEach(participant => {
        if (participant && participant !== "(bye)" && participant !== participantName) {
          remainingParticipants.push(participant);
        }
      });
    });

    // Remove duplicates
    const uniqueRemainingParticipants = Array.from(new Set(remainingParticipants));
    
    if (uniqueRemainingParticipants.length === 0) {
      showToast({ 
        type: 'destructive', 
        title: 'Cannot Delete', 
        description: 'Cannot delete the last participant. Tournament needs at least one participant.' 
      });
      return { success: false, message: 'Cannot delete the last participant.' };
    }

    // Calculate if we can use a smaller bracket
    const currentBracketSize = Math.pow(2, bracketData.length);
    const newRequiredSize = Math.pow(2, Math.ceil(Math.log2(uniqueRemainingParticipants.length)));
    
    if (newRequiredSize < currentBracketSize && uniqueRemainingParticipants.length > 1) {
      // We can optimize to a smaller bracket
      try {
        const newBracketData = createBracket(uniqueRemainingParticipants, seedType);
        
        set({ 
          bracketData: newBracketData, 
          matchResults: {}, // Clear match results since bracket regenerated
          participantCount: uniqueRemainingParticipants.length
        });

        showToast({ 
          type: 'success', 
          title: 'Bracket Optimized', 
          description: `Participant "${participantName}" removed. Bracket optimized from ${currentBracketSize} to ${newRequiredSize} slots.` 
        });

        return { success: true };
      } catch (error) {
        console.error('Failed to optimize bracket:', error);
        // Fall back to simple replacement with bye
      }
    }

    // Simple case: Replace participant with bye (no bracket regeneration needed)
    const updatedBracketData = JSON.parse(JSON.stringify(bracketData)) as BracketMatch[][];
    updatedBracketData.forEach(round => {
      round.forEach(match => {
        match.participants = match.participants.map(participant => 
          participant === participantName ? "(bye)" : participant
        ) as [string | null, string | null];
        
        // Clear winner if it was the deleted participant
        if (match.winner === participantName) {
          match.winner = null;
        }
      });
    });

    // Remove any match results for this participant
    const updatedMatchResults = { ...matchResults };
    Object.keys(updatedMatchResults).forEach(matchId => {
      const match = updatedMatchResults[matchId];
      if (match.player1 === participantName || match.player2 === participantName) {
        delete updatedMatchResults[matchId];
      }
    });

    // Update participant count
    const newParticipantCount = Math.max(0, get().participantCount - 1);

    set({ 
      bracketData: updatedBracketData, 
      matchResults: updatedMatchResults,
      participantCount: newParticipantCount
    });

    showToast({ 
      type: 'success', 
      title: 'Success', 
      description: `Participant "${participantName}" removed from tournament.` 
    });

    return { success: true };  },
  addParticipant: (participantName) => {
    const { bracketData, showToast, seedType, tournamentName, internalRoundsPerMatch } = get();
    
    // Check if actual tournament matches have started (not just bye advancements)
    const progressStatus = get().getRoundStatus();
    if (progressStatus.anyMatchesStarted) {
      showToast({ 
        type: 'destructive', 
        title: 'Cannot Add Participant', 
        description: 'Cannot add participants after actual matches have started.' 
      });
      return { success: false, message: 'Tournament matches have already started.' };
    }

    if (!bracketData) {
      showToast({ 
        type: 'destructive', 
        title: 'Error', 
        description: 'No tournament bracket found.' 
      });
      return { success: false, message: 'No tournament bracket found.' };
    }

    // Validate participant name
    if (!participantName.trim()) {
      showToast({ 
        type: 'destructive', 
        title: 'Error', 
        description: 'Participant name cannot be empty.' 
      });
      return { success: false, message: 'Participant name cannot be empty.' };
    }

    // Check if participant already exists
    const allParticipants = new Set<string>();
    bracketData.flat().forEach(match => {
      match.participants.forEach(participant => {
        if (participant && participant !== "(bye)") {
          allParticipants.add(participant.toLowerCase());
        }
      });
    });

    if (allParticipants.has(participantName.toLowerCase())) {
      showToast({ 
        type: 'destructive', 
        title: 'Error', 
        description: `Participant "${participantName}" already exists.` 
      });
      return { success: false, message: `Participant "${participantName}" already exists.` };    }

    // Prepare bracket update variables
    let byeSlotFound = false;
    const updatedBracketData = JSON.parse(JSON.stringify(bracketData)) as BracketMatch[][];
    
    // Count available bye slots for debugging
    let totalByeSlots = 0;
    let totalRealParticipants = 0;
    bracketData[0].forEach(match => {
      match.participants.forEach(participant => {
        if (participant === "(bye)") {
          totalByeSlots++;
        } else if (participant && participant !== null) {
          totalRealParticipants++;
        }
      });
    });

    // Calculate bracket capacity from structure
    const bracketCapacity = bracketData[0].length * 2; // Each match in Round 1 has 2 participants
    const availableSlots = bracketCapacity - totalRealParticipants;

    console.log(`Debug: Bracket capacity: ${bracketCapacity}, Real participants: ${totalRealParticipants}, Available slots: ${availableSlots}, Bye slots: ${totalByeSlots}`);

    // Look for bye slots OR null/empty slots in the first round
    for (const match of updatedBracketData[0]) {
      for (let i = 0; i < match.participants.length; i++) {
        if (match.participants[i] === "(bye)" || match.participants[i] === null) {
          match.participants[i] = participantName;
          byeSlotFound = true;
          console.log(`Debug: Found available slot and added "${participantName}"`);
          break;
        }
      }
      if (byeSlotFound) break;
    }

    if (byeSlotFound) {
      // Simple case: Added to existing bye slot
      const newParticipantCount = get().participantCount + 1;

      set({ 
        bracketData: updatedBracketData,
        participantCount: newParticipantCount
      });      showToast({ 
        type: 'success', 
        title: 'Success', 
        description: `Participant "${participantName}" added to Round 1. ${availableSlots - 1} slots remaining in current bracket.` 
      });

      return { success: true };
    } else {
      // Complex case: No bye slots available, need to regenerate bracket
      
      // Get all current participants
      const currentParticipants: string[] = [];
      bracketData.flat().forEach(match => {
        match.participants.forEach(participant => {
          if (participant && participant !== "(bye)") {
            currentParticipants.push(participant);
          }
        });
      });      // Remove duplicates (participant might appear in multiple rounds)
      const uniqueParticipants = Array.from(new Set(currentParticipants));
      
      // Add the new participant
      const newParticipantsList = [...uniqueParticipants, participantName];
      
      // Calculate new bracket size (next power of 2)
      const currentSize = newParticipantsList.length;
      const newBracketSize = Math.pow(2, Math.ceil(Math.log2(currentSize)));
      
      showToast({ 
        type: 'default', 
        title: 'Regenerating Bracket', 
        description: `Expanding bracket from ${uniqueParticipants.length} to ${newBracketSize} slots to accommodate new participant.` 
      });

      try {
        // Generate new bracket with all participants including the new one
        const newBracketData = createBracket(newParticipantsList, seedType);
        const newParticipantCount = newParticipantsList.length;

        set({ 
          bracketData: newBracketData,
          participantCount: newParticipantCount,
          // Clear any existing match results since bracket structure changed
          matchResults: {}
        });

        showToast({ 
          type: 'success', 
          title: 'Bracket Regenerated', 
          description: `Participant "${participantName}" added. Bracket expanded to ${newBracketSize} slots with ${newBracketSize - newParticipantCount} byes.` 
        });

        return { success: true };
      } catch (error) {
        console.error('Failed to regenerate bracket:', error);
        
        showToast({ 
          type: 'destructive', 
          title: 'Error', 
          description: 'Failed to regenerate bracket with new participant.' 
        });
        
        return { success: false, message: 'Failed to regenerate bracket.' };
      }
    }
  },
  // Tournament Progress Tracking
  getRoundStatus: () => {
    const { bracketData, matchResults } = get();
    
    let anyMatchesStarted = false;
    let anyRoundsStarted = false;

    if (!bracketData) {
      return { anyMatchesStarted: false, anyRoundsStarted: false };
    }

    // Check if any actual matches (not bye matches) have been completed or have meaningful results
    Object.values(matchResults).forEach(matchResult => {
      // Skip if this is a bye match (one player is "(bye)")
      if (matchResult.player1 === "(bye)" || matchResult.player2 === "(bye)") {
        return;
      }
      
      // Check if the match has been completed or has actual round data
      if (matchResult.completed) {
        anyMatchesStarted = true;
      }
      
      // Check if any rounds have been actually scored (not just default values)
      if (matchResult.rounds.some(round => 
        round.player1Score !== null || round.player2Score !== null || round.winMethod !== null
      )) {
        anyRoundsStarted = true;
        anyMatchesStarted = true;
      }
    });

    // Check bracket data for manually set winners (excluding bye advancements)
    if (!anyMatchesStarted) {
      bracketData.forEach((round, roundIndex) => {
        round.forEach(match => {
          // Only count as "started" if winner was set AND it's not a bye match
          if (match.winner !== null && 
              match.participants[0] !== "(bye)" && 
              match.participants[1] !== "(bye)" &&
              match.participants[0] !== null && 
              match.participants[1] !== null) {
            anyMatchesStarted = true;
          }
        });
      });
    }

    return { anyMatchesStarted, anyRoundsStarted };
  },
  canModifyParticipants: () => {
    const status = get().getRoundStatus();
    
    if (status.anyMatchesStarted) {
      return { 
        canModify: false, 
        reason: 'Actual tournament matches have started. Use disqualification to remove participants.' 
      };
    }

    return { canModify: true };
  },
  // Current match highlighting actions
  setCurrentMatch: (matchId) => set({ currentMatchId: matchId }),
      }),
      {
        name: 'tournament-storage', // base localStorage key
        partialize: (state) => ({
          // Only persist these fields
          bracketData: state.bracketData,
          tournamentName: state.tournamentName,
          internalRoundsPerMatch: state.internalRoundsPerMatch,
          matchResults: state.matchResults,
          // Include tournamentId to ensure unique tournament identification
          tournamentId: state.tournamentId,
          participantCount: state.participantCount,
          seedType: state.seedType,
          // Persist current match highlighting for consistency across mode switches
          currentMatchId: state.currentMatchId,
          // Persist tournament progress tracking
          tournamentStarted: state.tournamentStarted,
          roundsStarted: state.roundsStarted
        }),
        // Use a version number for storage format
        version: 1
      }
    ),
    {
      name: 'tournament-store', // DevTools instance name
    }
  )
);
