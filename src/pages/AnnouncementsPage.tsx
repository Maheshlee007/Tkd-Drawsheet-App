import { useState } from "react";
import { useTournamentStore } from "@/store/useTournamentStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Plus, Trash } from "lucide-react";

// Define the announcement type
interface Announcement {
  id: string;
  title: string;
  content: string;
  date: Date;
  isPinned: boolean;
}

const AnnouncementsPage = () => {
  // In a real app, these would be stored in state management like Zustand
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "Tournament Schedule Update",
      content: "The final round will start at 2:00 PM instead of 1:30 PM due to lunch break extension.",
      date: new Date(2025, 4, 5),
      isPinned: true
    },
    {
      id: "2",
      title: "Water Stations",
      content: "Water stations have been set up near each court. Please stay hydrated throughout the tournament.",
      date: new Date(2025, 4, 4),
      isPinned: false
    },
    {
      id: "3",
      title: "Welcome to the Tournament",
      content: "Welcome to our tournament! Registration opens at 8:00 AM. Please arrive 30 minutes before your scheduled match time.",
      date: new Date(2025, 4, 3),
      isPinned: false
    }
  ]);
  
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: ""
  });

  const { tournamentName } = useTournamentStore();
  
  // Add a new announcement
  const handleAddAnnouncement = () => {
    if (newAnnouncement.title.trim() === "" || newAnnouncement.content.trim() === "") {
      return;
    }
    
    const announcement: Announcement = {
      id: Date.now().toString(),
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      date: new Date(),
      isPinned: false
    };
    
    setAnnouncements([announcement, ...announcements]);
    setNewAnnouncement({ title: "", content: "" });
  };
  
  // Delete an announcement
  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter(announcement => announcement.id !== id));
  };
  
  // Toggle pinned status
  const handleTogglePin = (id: string) => {
    setAnnouncements(announcements.map(announcement => 
      announcement.id === id 
        ? { ...announcement, isPinned: !announcement.isPinned } 
        : announcement
    ));
  };
  
  // Format date to a readable string
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            {tournamentName || "Tournament"} • {announcements.length} announcements
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Create a new announcement for the tournament. This will be visible to all participants.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  placeholder="Enter announcement title" 
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea 
                  id="content" 
                  placeholder="Enter announcement content" 
                  rows={4}
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setNewAnnouncement({ title: "", content: "" })}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAddAnnouncement}>Post Announcement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-4">
        {/* Pinned announcements */}
        {announcements.some(announcement => announcement.isPinned) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pinned</h2>
            {announcements
              .filter(announcement => announcement.isPinned)
              .map(announcement => (
                <Card key={announcement.id} className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4 text-primary" />
                          {announcement.title}
                        </CardTitle>
                        <CardDescription>{formatDate(announcement.date)}</CardDescription>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePin(announcement.id)}
                        >
                          Unpin
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p>{announcement.content}</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
        
        {/* Regular announcements */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent</h2>
          {announcements
            .filter(announcement => !announcement.isPinned)
            .map(announcement => (
              <Card key={announcement.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{announcement.title}</CardTitle>
                      <CardDescription>{formatDate(announcement.date)}</CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePin(announcement.id)}
                      >
                        Pin
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>{announcement.content}</p>
                </CardContent>
              </Card>
            ))}
            
          {announcements.filter(announcement => !announcement.isPinned).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <p className="text-muted-foreground">No recent announcements</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;