import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { createBracket } from "../client/src/lib/bracketUtils";
import { createTournamentSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to generate a tournament bracket
  app.post("/api/tournaments/generate", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const result = createTournamentSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.errors 
        });
      }
      
      const { participants, seedType } = result.data;
      
      // Validate participant count
      if (participants.length < 2) {
        return res.status(400).json({ 
          message: "At least 2 participants are required" 
        });
      }
      
      if (participants.length % 2 !== 0) {
        return res.status(400).json({ 
          message: "Number of participants must be even" 
        });
      }
      
      // Generate bracket
      const bracketData = createBracket(participants, seedType);
      
      // Store the tournament in memory
      const tournament = await storage.createTournament({
        name: "Tournament",
        participants,
        bracketData,
        createdAt: new Date().toISOString(),
      });
      
      // Return the generated bracket
      return res.status(200).json({ 
        bracketData, 
        tournamentId: tournament.id 
      });
    } catch (error) {
      console.error("Error generating tournament:", error);
      return res.status(500).json({ 
        message: "Failed to generate tournament bracket" 
      });
    }
  });

  // API endpoint to handle file uploads for participants
  app.post("/api/tournaments/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Parse file content to get participants
      const fileContent = req.file.buffer.toString("utf-8");
      const participants = fileContent
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return res.status(200).json({ participants });
    } catch (error) {
      console.error("Error processing file upload:", error);
      return res.status(500).json({ message: "Failed to process file upload" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
