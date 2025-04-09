import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InputPanelProps {
  onGenerateBracket: (
    participants: string[],
    seedType: "random" | "ordered" | "as-entered",
  ) => void;
}

const InputPanel = ({ onGenerateBracket }: InputPanelProps) => {
  const [inputMethod, setInputMethod] = useState<string>("blank");
  const [participants, setParticipants] = useState<{
    bulk: string;
    individual: string[];
    file: string[];
    blank: number;
  }>({
    bulk: "",
    individual: ["", ""],
    file: [],
    blank: 8,
  });
  const [seedType, setSeedType] = useState<"random" | "ordered" | "as-entered">(
    "as-entered",
  );
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add new input field for individual participant
  const addParticipant = () => {
    setParticipants((prev) => ({
      ...prev,
      individual: [...prev.individual, ""],
    }));
  };

  // Update individual participant field
  const updateIndividualParticipant = (index: number, value: string) => {
    const newIndividual = [...participants.individual];
    newIndividual[index] = value;
    setParticipants((prev) => ({ ...prev, individual: newIndividual }));
  };

  // Handle file upload
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setFileName(file.name);

    try {
      const text = await file.text();
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      setParticipants((prev) => ({ ...prev, file: lines }));
    } catch (error) {
      setError("Failed to read file. Please make sure it's a valid text file.");
    }
  };

  // Validate and generate bracket
  const handleGenerateBracket = () => {
    let participantsList: string[] = [];

    if (inputMethod === "bulk") {
      participantsList = participants.bulk
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
    } else if (inputMethod === "individual") {
      participantsList = participants.individual.filter(
        (name) => name.trim().length > 0,
      );
    } else if (inputMethod === "file") {
      participantsList = participants.file;
    } else if (inputMethod === "blank") {
      // Generate numbered participants like "Player 1", "Player 2", etc.
      participantsList = Array.from(
        { length: participants.blank },
        (_, i) => `Player ${i + 1}`,
      );
    }

    // Validate participant count
    if (participantsList.length < 2) {
      setError("Please enter at least 2 participants.");
      return;
    }

    // We no longer require an even number of participants
    // Our enhanced bracket logic with byes handles odd numbers properly

    setError(null);
    onGenerateBracket(participantsList, seedType);
  };

  // Clear all form data
  const handleClearForm = () => {
    setParticipants({
      bulk: "",
      individual: ["", ""],
      file: [],
      blank: 8,
    });
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-4">
        Participants
      </h2>

      <Tabs value={inputMethod} onValueChange={setInputMethod}>
        <TabsList className="mb-4 border-b w-full rounded-none bg-transparent justify-start">
          <TabsTrigger
            value="bulk"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600"
          >
            Bulk Input
          </TabsTrigger>
          <TabsTrigger
            value="individual"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600"
          >
            Individual
          </TabsTrigger>
          <TabsTrigger
            value="file"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600"
          >
            File Upload
          </TabsTrigger>
          <TabsTrigger
            value="blank"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600"
          >
            Blank Bracket
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="mb-6">
          <Label
            htmlFor="participants-bulk"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Enter participants (one per line)
          </Label>
          <Textarea
            id="participants-bulk"
            rows={8}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
            placeholder="Team A&#10;Team B&#10;Team C&#10;Team D"
            value={participants.bulk}
            onChange={(e) =>
              setParticipants((prev) => ({ ...prev, bulk: e.target.value }))
            }
          />
          {participants.bulk.trim() && (
            <div className="mt-2 text-sm text-slate-600">
              Participants count:{" "}
              <span className="font-medium">
                {
                  participants.bulk
                    .split("\n")
                    .filter((line) => line.trim().length > 0).length
                }
              </span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="individual" className="mb-6">
          <div className="space-y-3">
            {participants.individual.map((participant, index) => (
              <div key={index} className="mb-3">
                <Label
                  htmlFor={`participant-${index}`}
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Participant {index + 1}
                </Label>
                <Input
                  id={`participant-${index}`}
                  value={participant}
                  onChange={(e) =>
                    updateIndividualParticipant(index, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-sm text-primary hover:text-primary-dark font-medium flex items-center"
            onClick={addParticipant}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Participant
          </Button>
        </TabsContent>

        <TabsContent value="file" className="mb-6">
          <Label
            htmlFor="file-upload"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Upload participant list (.txt, .csv)
          </Label>
          <div className="flex items-center justify-center w-full">
            <Label htmlFor="file-upload" className="w-full cursor-pointer">
              <div className="border-2 border-dashed border-slate-300 rounded-md p-6 flex flex-col items-center justify-center hover:border-primary transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-2 text-sm text-slate-600 font-medium">
                  Drop file here or click to upload
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  One participant name per line
                </p>
              </div>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </Label>
          </div>
          {fileName && (
            <div className="mt-2 text-sm text-slate-600">
              Selected file: <span className="font-medium">{fileName}</span>
              <p>Found {participants.file.length} participants</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="blank" className="mb-6">
          <Label
            htmlFor="blank-count"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Number of participants
          </Label>
          <div className="flex items-center">
            <Input
              id="blank-count"
              type="number"
              min="2"
              max="128"
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              value={participants.blank}
              onChange={(e) => {
                // Clear the field and set the new value
                const value = e.target.value.replace(/\D/g, "");
                const numValue = parseInt(value);
                setParticipants((prev) => ({ ...prev, blank: numValue }));
              }}
            />
          </div>
          {(!Boolean(participants.blank) || participants?.blank < 2) && (
            <p className="text-sm text-red-500">
              ** minumum 2 players are reuired
            </p>
          )}
          <div className="mt-2 text-sm text-slate-600">
            This will create a bracket with {participants.blank} unnamed players
            (Player 1, Player 2, etc.)
          </div>
        </TabsContent>
      </Tabs>

      <div className="mb-4">
        <Label className="block text-sm font-medium text-slate-700 mb-2">
          Seeding Options
        </Label>
        <RadioGroup
          value={seedType}
          onValueChange={(value: "random" | "ordered" | "as-entered") =>
            setSeedType(value)
          }
          className="mt-2 flex flex-wrap gap-4"
        >
          <div className="flex items-center">
            <RadioGroupItem id="random" value="random" />
            <Label htmlFor="random" className="ml-2 text-sm text-slate-700">
              Random Seeding
            </Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem id="ordered" value="ordered" />
            <Label htmlFor="ordered" className="ml-2 text-sm text-slate-700">
              Use Order as Seeding
            </Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem id="as-entered" value="as-entered" />
            <Label htmlFor="as-entered" className="ml-2 text-sm text-slate-700">
              As Entered (No Seeding)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-3">
        <Button
          className="flex-1 bg-primary hover:bg-blue-600 text-white"
          onClick={handleGenerateBracket}
        >
          Generate Bracket
        </Button>
        <Button
          variant="outline"
          className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
          onClick={handleClearForm}
        >
          Clear Form
        </Button>
      </div>
    </div>
  );
};

export default InputPanel;
