import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTournamentStore } from "@/store/useTournamentStore";

interface RoundsConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoundsConfigModal({ open, onOpenChange }: RoundsConfigModalProps) {
  const setInternalRoundsPerMatch = useTournamentStore(state => state.setInternalRoundsPerMatch);
  const internalRoundsPerMatch = useTournamentStore(state => state.internalRoundsPerMatch || 3);
  
  const [rounds, setRounds] = useState(internalRoundsPerMatch);
  
  const handleSubmit = () => {
    setInternalRoundsPerMatch(rounds);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Match Rounds</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor="rounds">Number of rounds per match</Label>
          <Input
            id="rounds"
            type="number" 
            min={1} 
            max={5}
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value) || 3)}
          />
          <p className="text-sm text-muted-foreground mt-2">
            This sets how many rounds each match will have. Typically 3 or 5 rounds.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
