import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import InputPanel from "@/components/InputPanel";
import { useLocation } from "wouter";
import { useTournamentStore } from "@/store/useTournamentStore";

const CreateTournament: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const generateBracket = useTournamentStore(state => state.generateBracket);
  const [, navigate] = useLocation();
  
  // Handler to generate bracket and redirect to view page
  const handleGenerateBracket = (
    participants: string[], 
    seedType: "random" | "ordered" | "as-entered",
    name: string,
    rounds: number = 3
  ) => {
    try {
      // Clear localStorage to ensure a completely fresh start
      localStorage.clear();
      // Remove tournament-storage specifically to be extra sure
      localStorage.removeItem('tournament-storage');
      
      console.log("Generating bracket with:", { 
        participants, 
        seedType, 
        name, 
        rounds 
      });
      
      // Generate the new bracket
      generateBracket(participants, seedType, name, rounds);
      navigate("/view");
    } catch (err) {
      setError("Failed to generate tournament bracket");
      console.error("Error generating bracket:", err);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create Tournament</h1>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <Button 
              variant="link" 
              className="text-red-700 p-0 h-auto text-sm underline ml-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-slate-600 mb-4">
            Fill out the form below to create your tournament bracket. 
            Add participants, choose your seeding method, and customize your tournament name.
          </p>
          
          <InputPanel onGenerateBracket={handleGenerateBracket} />
        </div>
      </div>
    </div>
  );
};

export default CreateTournament;
