import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTournamentStore, MatchResult, WinMethod } from "@/store/useTournamentStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Trophy, XCircle, Info, CheckCircle, AlertCircle, Edit2, Save, X, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ParticipantsPage = () => {  const [, navigate] = useLocation();
  const { 
    bracketData, 
    participantCount, 
    tournamentName, 
    matchResults, 
    updateParticipantName,
    deleteParticipant,
    addParticipant,
    canModifyParticipants 
  } = useTournamentStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  
  // Name editing state
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  
  // Add/Delete participant state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  
  // If no bracket data exists, redirect to home
  useEffect(() => {
    if (!bracketData) {
      navigate("/");
    }
  }, [bracketData, navigate]);
  
  if (!bracketData) {
    return null; // Will redirect in useEffect
  }
  
  // Extract all unique participants from the bracket data
  const getAllParticipants = () => {
    const participants = new Set<string>();
    
    bracketData.forEach(round => {
      round.forEach(match => {
        if (match.participants[0] && match.participants[0] !== "(bye)") {
          participants.add(match.participants[0]);
        }
        if (match.participants[1] && match.participants[1] !== "(bye)") {
          participants.add(match.participants[1]);
        }
      });
    });
    
    return Array.from(participants);
  };
  // Count wins and losses for each participant based on actual match results
  const getParticipantStats = (participantName: string) => {
    let wins = 0;
    let losses = 0;
    let matches: MatchResult[] = [];
    
    // Get detailed matches from matchResults (this is the source of truth)
    Object.values(matchResults).forEach(matchResult => {
      if (matchResult.player1 === participantName || matchResult.player2 === participantName) {
        matches.push(matchResult);
        
        // Only count completed matches
        if (matchResult.completed) {
          if (matchResult.winner === participantName) {
            wins++;
          } else if (matchResult.winner && matchResult.winner !== participantName) {
            // Normal loss to opponent
            losses++;
          } else if (matchResult.winner === "NO_WINNER") {
            // Both players disqualified - count as loss
            losses++;
          }
          // If winner is null (tie), we don't count it as win or loss
        }
      }
    });
    
    return { wins, losses, matches };
  };
  // Function to get win method label and color
  const getWinMethodInfo = (method: WinMethod | null) => {
    const methodMap: Record<WinMethod, {label: string, color: string}> = {
      'PTF': { label: 'Win by Final Score', color: 'bg-blue-100 text-blue-800' },
      'PTG': { label: 'Win by Point Gap', color: 'bg-green-100 text-green-800' },
      'DSQ': { label: 'Win by Disqualification', color: 'bg-red-100 text-red-800' },
      'PUN': { label: 'Win by Punitive Declaration', color: 'bg-amber-100 text-amber-800' },
      'RSC': { label: 'Referee Stops Contest', color: 'bg-purple-100 text-purple-800' },
      'WDR': { label: 'Win by Withdrawal', color: 'bg-slate-100 text-slate-800' },
      'DQB': { label: 'DQ for Unsportsmanlike Behavior', color: 'bg-rose-100 text-rose-800' },
      'DQBOTH': { label: 'Both Players Disqualified', color: 'bg-red-200 text-red-900' }
    };
    
    return method ? methodMap[method] : { label: 'Undecided', color: 'bg-slate-100 text-slate-800' };  };

  // Name editing functions
  const startEditing = (participantName: string) => {
    setEditingParticipant(participantName);
    setEditedName(participantName);
  };

  const saveNameEdit = () => {
    if (!editingParticipant || !editedName.trim()) {
      return;
    }
    
    const result = updateParticipantName(editingParticipant, editedName.trim());
    
    if (result.success) {
      setEditingParticipant(null);
      setEditedName("");
    }
  };

  const cancelNameEdit = () => {
    setEditingParticipant(null);
    setEditedName("");
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveNameEdit();
    } else if (e.key === 'Escape') {
      cancelNameEdit();
    }
  };  // Advanced participant management functions
  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) {
      return;
    }
    
    const result = addParticipant(newParticipantName.trim());
    
    if (result.success) {
      setShowAddModal(false);
      setNewParticipantName("");
    }
  };

  const handleDeleteParticipant = (participantName: string) => {
    setParticipantToDelete(participantName);
  };

  const confirmDeleteParticipant = () => {
    if (!participantToDelete) return;
    
    const result = deleteParticipant(participantToDelete);
    
    if (result.success) {
      setParticipantToDelete(null);
    }
  };

  const cancelDeleteParticipant = () => {
    setParticipantToDelete(null);
  };

  const handleAddKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddParticipant();
    } else if (e.key === 'Escape') {
      setShowAddModal(false);
      setNewParticipantName("");
    }
  };

  // Check if modifications are allowed
  const modificationStatus = canModifyParticipants();

  // Get all participants and their stats
  const participants = getAllParticipants().map(name => ({
    name,
    ...getParticipantStats(name)
  }));
  
  // Filter participants based on search
  const filteredParticipants = participants.filter(participant => 
    participant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="p-6 space-y-6">
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-950 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Participants</h1>
          <p className="text-muted-foreground mt-1">
            {tournamentName} • {participants.length} participants
          </p>
        </div>
        
        <div className="flex items-center gap-2">          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search participants..."
              className="pl-8 w-full md:w-[260px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>       
                         <Button 
                  className="shrink-0" 
                  onClick={() => setShowAddModal(true)}
                  disabled={!modificationStatus.canModify}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Participant
                </Button>
              </TooltipTrigger>
              {!modificationStatus.canModify && (
                <TooltipContent>
                  <p>{modificationStatus.reason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* New scroll container for the Table */}
      <div className="overflow-y-auto h-[60vh] rounded-md border shadow-sm bg-white dark:bg-slate-900">
        <Table>
          {/* Updated TableHeader for sticky positioning and consistent dark mode background */}
          <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[160px]">Wins</TableHead>
              <TableHead className="w-[160px]">Losses</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* The problematic div that was here has been removed.
                Participant mapping is now a direct child of TableBody. */}            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((participant) => (
                <TableRow key={participant.name}>
                  <TableCell className="font-medium">
                    {editingParticipant === participant.name ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="h-8"
                          autoFocus
                        />
                        <Button 
                          onClick={saveNameEdit} 
                          size="sm"
                          disabled={!editedName.trim() || editedName.trim() === participant.name}
                          className="h-8 w-8 p-0"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button 
                          onClick={cancelNameEdit} 
                          size="sm" 
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <span>{participant.name}</span>
                        <Button 
                          onClick={() => startEditing(participant.name)} 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {participant.wins > 0 ? (
                      <div className="flex items-center">
                        <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
                        {participant.wins}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">0</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {participant.losses > 0 ? (
                      <div className="flex items-center">
                        <XCircle className="mr-2 h-4 w-4 text-red-500" />
                        {participant.losses}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">0</div>
                    )}
                  </TableCell>                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/participant/${encodeURIComponent(participant.name)}`)}>
                        View Details
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteParticipant(participant.name)}
                              disabled={!modificationStatus.canModify}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          {!modificationStatus.canModify && (
                            <TooltipContent>
                              <p>{modificationStatus.reason}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No participants match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>        </Table>      </div> {/* End of new scroll container */}      {/* Add Participant Modal */}
      <Dialog 
        open={showAddModal} 
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (open) {
            // Reset the input when opening the modal
            setNewParticipantName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Participant</DialogTitle>
            <DialogDescription>
              Enter the name of the new participant to add to the tournament.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">            <Input
              placeholder="Participant name..."
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={handleAddKeyPress}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddModal(false);
                setNewParticipantName("");
              }}
            >
              Cancel
            </Button>            <Button 
              onClick={handleAddParticipant}
              disabled={!newParticipantName.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Participant Confirmation */}
      <AlertDialog 
        open={participantToDelete !== null} 
        onOpenChange={(open) => !open && cancelDeleteParticipant()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{participantToDelete}" from the tournament? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteParticipant}>
              Cancel
            </AlertDialogCancel>            <AlertDialogAction 
              onClick={confirmDeleteParticipant}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Participant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>      </AlertDialog>
    </div>
  );
};

export default ParticipantsPage;