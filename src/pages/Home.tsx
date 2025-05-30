import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTournamentStore } from "@/store/useTournamentStore";
import { Plus, Eye, Users, FileText, Award, ArrowRight } from "lucide-react";

const Home: React.FC = () => {
  const [, navigate] = useLocation();
  const bracketData = useTournamentStore(state => state.bracketData);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-dvw">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Tournament Bracket Manager</h1>
            <p className="text-slate-600">
              Create, organize, and track your tournament brackets
            </p>
          </div>          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create New Tournament Card */}            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-100 transition-all hover:shadow-xl">
              <div className="bg-gradient-to-r from-blue-600 to-red-500 p-6 flex justify-center">
                <Plus size={80} className="text-white" />
              </div>              <div className="p-6">
                <h2 className="text-2xl font-bold mb-3">Create Bracket</h2>
                <p className="text-slate-600 mb-6">
                  Start a new tournament, add participants, and set up your bracket structure.
                </p>                <div className="w-3/4 mx-auto relative bg-gradient-to-r from-blue-600 to-red-500 rounded-full p-[2px] shadow-md transition-all hover:-translate-y-1  border-0 z-10">
                  

                 
                  <Button 
                    className="w-full flex items-center justify-center gap-2 bg-white text-slate-800 rounded-full"
                    size="lg" 
                    onClick={() => {
                      // Clear any existing tournament data first
                      localStorage.removeItem('tournament-storage');
                      navigate("/create");
                    }}
                    variant="outline"
                  >
                    <Plus size={18} />
                    New Tournament
                  </Button>
                   
                </div>
              </div>
            </div>

            {/* View Existing Tournament Card */}            <div className={`bg-white rounded-lg shadow-lg overflow-hidden border border-slate-100 transition-all hover:shadow-xl ${!bracketData ? 'opacity-70' : ''}`}>
              <div className="bg-gradient-to-l from-green-500 to-green-400 p-6 flex justify-center">
                <Eye size={80} className="text-white" />
              </div>
              <div className="p-6">                <h2 className="text-2xl font-bold mb-3">View Bracket</h2>
                <p className="text-slate-600 mb-6">
                  Access your existing tournament, update results, and track progress.
                </p>                
                  {bracketData && (
                <div className="w-3/4 mx-auto relative mt-11 bg-gradient-to-l from-green-500 to-green-400 rounded-full p-[2px] shadow-md transition-all hover:-translate-y-1  border-0 relative z-10">
                    
                  
                  <Button 
                    className={`w-full flex items-center justify-center gap-2 transition-all duration-300 rounded-full ${
                      bracketData 
                        ? "bg-white text-slate-800 " 
                        : "text-slate-400 border-slate-200"
                    }`}
                    size="lg"
                    disabled={!bracketData}
                    onClick={() => navigate("/view")}
                    variant="outline"
                  >
                    <Eye size={18} />
                    {bracketData ? "View Tournament" : "No Tournament Found"}
                  </Button>
                  </div>
                  )}
                
              </div>
            </div>
            </div>
          
          {/* Feature Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-center mb-8">Tournament Management Features</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
                <Users className="h-12 w-12 text-blue-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Participant Management</h3>
                <p className="text-slate-600">
                  Easily add, remove and seed participants in your tournament.
                </p>
              </div>
              
              {/* Feature 2 */}
              <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
                <Award className="h-12 w-12 text-purple-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Scoring System</h3>
                <p className="text-slate-600">
                  Track match results with our detailed scoring system.
                </p>
              </div>
              
              {/* Feature 3 */}
              <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
                <FileText className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Export Options</h3>
                <p className="text-slate-600">
                  Export brackets as PDF, PNG or copy to clipboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="py-4 text-center text-sm text-slate-500 bg-white border-t mt-12">
        Tournament Bracket Manager &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Home;
