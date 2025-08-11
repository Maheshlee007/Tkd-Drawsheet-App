import { useState, useEffect } from "react";
import { useTournamentStore } from "@/store/useTournamentStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

import { 
  Megaphone, 
  Plus, 
  Trash, 
  Pin, 
  PinOff, 
  Edit, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  RefreshCw,
  Archive,
  ArchiveRestore,
  Copy,
  Send,
  Calendar,
  FileText,
  Zap,
  Eye,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image,
  Smile,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";

// Define the announcement type with enhanced properties
interface Announcement {
  id: string;
  title: string;
  content: string;
  date: Date;
  isPinned: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'schedule' | 'rules' | 'results' | 'emergency';
  authorName?: string;
  expiresAt?: Date;
  isArchived: boolean;
  views: number;
  isScheduled?: boolean;
  scheduledFor?: Date;
  template?: string;
  formattedContent?: string; // HTML formatted content
  isMarkdown?: boolean; // Whether content uses markdown
  hasSound?: boolean; // Whether to play sound for urgent announcements
}

// Template interface
interface AnnouncementTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  category: Announcement['category'];
  priority: Announcement['priority'];
  isUserCreated?: boolean;
  createdAt?: Date;
  isActive?: boolean;
}

// Rich text editor format types
interface TextFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
}

// Priority and category configurations
const priorityConfig = {
  low: { color: 'bg-blue-100 text-blue-800', icon: Info },
  medium: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  high: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  urgent: { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
};

const categoryConfig = {
  general: { color: 'bg-gray-100 text-gray-800', label: 'General' },
  schedule: { color: 'bg-blue-100 text-blue-800', label: 'Schedule' },
  rules: { color: 'bg-purple-100 text-purple-800', label: 'Rules' },
  results: { color: 'bg-green-100 text-green-800', label: 'Results' },
  emergency: { color: 'bg-red-100 text-red-800', label: 'Emergency' }
};

const AnnouncementsPage = () => {
  // Enhanced state with more announcements and features
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "Tournament Schedule Update",
      content: "The final round will start at 2:00 PM instead of 1:30 PM due to lunch break extension. Please ensure you arrive 15 minutes before your scheduled match time.",
      date: new Date(2025, 4, 5, 10, 30),
      isPinned: true,
      priority: 'high',
      category: 'schedule',
      authorName: 'Tournament Director',
      isArchived: false,
      views: 45
    },
    {
      id: "2",
      title: "Water Stations and Safety",
      content: "Water stations have been set up near each court. Please stay hydrated throughout the tournament. First aid stations are located at the main entrance and near Court 3.",
      date: new Date(2025, 4, 4, 14, 15),
      isPinned: false,
      priority: 'medium',
      category: 'general',
      authorName: 'Safety Officer',
      isArchived: false,
      views: 28
    },
    {
      id: "3",
      title: "Welcome to the Tournament",
      content: "Welcome to our tournament! Registration opens at 8:00 AM. Please arrive 30 minutes before your scheduled match time. Check-in at the main registration desk.",
      date: new Date(2025, 4, 3, 8, 0),
      isPinned: false,
      priority: 'medium',
      category: 'general',
      authorName: 'Registration Team',
      isArchived: false,
      views: 67
    },
    {
      id: "4",
      title: "Equipment Check Reminder",
      content: "All participants must complete equipment check before their first match. Protective gear will be inspected for safety compliance.",
      date: new Date(2025, 4, 5, 9, 0),
      isPinned: false,
      priority: 'high',
      category: 'rules',
      authorName: 'Equipment Inspector',
      isArchived: false,
      views: 23
    }
  ]);
  
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    priority: 'medium' as Announcement['priority'],
    category: 'general' as Announcement['category'],
    authorName: "Tournament Admin",
    expiresAt: "",
    isScheduled: false,
    scheduledFor: "",
    template: "",
    isMarkdown: false,
    formattedContent: ""
  });

  // Enhanced state for bulk actions and templates
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([
    {
      id: "welcome",
      name: "Welcome Message",
      title: "Welcome to {tournamentName}",
      content: "Welcome to our tournament! Registration opens at {time}. Please arrive 30 minutes before your scheduled match time. Check-in at the main registration desk.",
      category: "general",
      priority: "medium"
    },
    {
      id: "schedule_change",
      name: "Schedule Change",
      title: "Schedule Update - {matchType}",
      content: "The {matchType} will start at {newTime} instead of {oldTime} due to {reason}. Please ensure you arrive 15 minutes before your scheduled match time.",
      category: "schedule",
      priority: "high"
    },
    {
      id: "safety",
      name: "Safety Notice",
      title: "Safety Information",
      content: "Water stations have been set up near each court. Please stay hydrated throughout the tournament. First aid stations are located at {locations}.",
      category: "general",
      priority: "medium"
    }
  ]);
  
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Real-time notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  
  // Rich text editor state
  const [isRichTextMode, setIsRichTextMode] = useState(false);
  const [textFormat, setTextFormat] = useState<TextFormat>({
    bold: false,
    italic: false,
    underline: false,
    align: 'left'
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Template management state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    title: "",
    content: "",
    category: 'general' as Announcement['category'],
    priority: 'medium' as Announcement['priority']
  });

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { tournamentName } = useTournamentStore();

  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // In a real app, this would fetch from an API
      console.log("Auto refreshing announcements...");
      // Simulate new announcement for demo
      if (Math.random() > 0.8) {
        const mockAnnouncement: Announcement = {
          id: Date.now().toString(),
          title: "New Live Update",
          content: "This is a simulated real-time announcement to demonstrate the notification system.",
          date: new Date(),
          isPinned: false,
          priority: Math.random() > 0.7 ? 'urgent' : 'medium',
          category: 'general',
          authorName: 'Live System',
          isArchived: false,
          views: 0,
          hasSound: Math.random() > 0.7
        };
        
        setAnnouncements(prev => [mockAnnouncement, ...prev]);
        handleNewAnnouncementNotification(mockAnnouncement);
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Notification permission and setup
  useEffect(() => {
    const setupNotifications = async () => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setBrowserNotificationsEnabled(permission === 'granted');
        setNotificationsEnabled(permission === 'granted');
      }
    };
    
    setupNotifications();
  }, []);

  // Real-time notification functions
  const handleNewAnnouncementNotification = (announcement: Announcement) => {
    if (!notificationsEnabled) return;
    
    // Show toast notification
    toast({
      title: `New ${announcement.priority.toUpperCase()} Announcement`,
      description: announcement.title,
      duration: announcement.priority === 'urgent' ? 8000 : 5000,
    });
    
    // Browser notification
    if (browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`${announcement.priority.toUpperCase()}: ${announcement.title}`, {
        body: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? '...' : ''),
        icon: '/favicon.ico',
        tag: announcement.id,
        badge: '/favicon.ico'
      });
      
      // Auto close after 5 seconds for non-urgent, 10 seconds for urgent
      setTimeout(() => notification.close(), announcement.priority === 'urgent' ? 10000 : 5000);
    }
    
    // Sound notification for urgent announcements
    if (soundEnabled && (announcement.priority === 'urgent' || announcement.hasSound)) {
      playNotificationSound(announcement.priority);
    }
  };

  const playNotificationSound = (priority: string) => {
    try {
      // Create different tones for different priorities
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different priorities
      const frequency = priority === 'urgent' ? 800 : priority === 'high' ? 600 : 400;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // Beep pattern
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      // For urgent announcements, play additional beeps
      if (priority === 'urgent') {
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.setValueAtTime(frequency, audioContext.currentTime);
          gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 0.2);
        }, 300);
      }
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  // Rich text formatting functions
  const applyFormat = (format: keyof TextFormat, value?: any) => {
    setTextFormat(prev => ({
      ...prev,
      [format]: format === 'align' ? value : !prev[format]
    }));
  };

  const insertText = (text: string) => {
    setNewAnnouncement(prev => ({
      ...prev,
      content: prev.content + text
    }));
  };

  const formatContent = (content: string) => {
    if (!isRichTextMode) return content;
    
    let formatted = content;
    
    // Apply basic markdown formatting
    if (textFormat.bold) {
      formatted = `**${formatted}**`;
    }
    if (textFormat.italic) {
      formatted = `*${formatted}*`;
    }
    if (textFormat.underline) {
      formatted = `<u>${formatted}</u>`;
    }
    
    return formatted;
  };

  const convertMarkdownToHtml = (markdown: string) => {
    // Simple markdown to HTML conversion
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/\n/g, '<br>');
  };

  // Common emoji shortcuts
  const emojiShortcuts = [
    { emoji: '👍', name: 'thumbs up' },
    { emoji: '👏', name: 'clap' },
    { emoji: '🎉', name: 'party' },
    { emoji: '⚠️', name: 'warning' },
    { emoji: '📢', name: 'megaphone' },
    { emoji: '🏆', name: 'trophy' },
    { emoji: '⏰', name: 'clock' },
    { emoji: '📅', name: 'calendar' },
    { emoji: '🥋', name: 'martial arts' },
    { emoji: '💪', name: 'muscle' },
    { emoji: '🔥', name: 'fire' },
    { emoji: '✅', name: 'check' }
  ];

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
      isPinned: false,
      priority: newAnnouncement.priority,
      category: newAnnouncement.category,
      authorName: newAnnouncement.authorName,
      expiresAt: newAnnouncement.expiresAt ? new Date(newAnnouncement.expiresAt) : undefined,
      isArchived: false,
      views: 0,
      isScheduled: newAnnouncement.isScheduled,
      scheduledFor: newAnnouncement.scheduledFor ? new Date(newAnnouncement.scheduledFor) : undefined,
      template: newAnnouncement.template,
      formattedContent: isRichTextMode ? convertMarkdownToHtml(formatContent(newAnnouncement.content)) : undefined,
      isMarkdown: isRichTextMode,
      hasSound: newAnnouncement.priority === 'urgent' || soundEnabled
    };
    
    setAnnouncements([announcement, ...announcements]);
    setNewAnnouncement({ 
      title: "", 
      content: "", 
      priority: 'medium', 
      category: 'general', 
      authorName: "Tournament Admin",
      expiresAt: "",
      isScheduled: false,
      scheduledFor: "",
      template: "",
      isMarkdown: false,
      formattedContent: ""
    });
    setIsDialogOpen(false);
    setIsRichTextMode(false);
    setTextFormat({
      bold: false,
      italic: false,
      underline: false,
      align: 'left'
    });

    // Trigger notification for newly created announcement
    if (!newAnnouncement.isScheduled) {
      handleNewAnnouncementNotification(announcement);
    }
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

  // Archive announcement
  const handleArchiveAnnouncement = (id: string) => {
    setAnnouncements(announcements.map(announcement => 
      announcement.id === id 
        ? { ...announcement, isArchived: !announcement.isArchived } 
        : announcement
    ));
  };

  // Increment view count
  const handleViewAnnouncement = (id: string) => {
    setAnnouncements(announcements.map(announcement => 
      announcement.id === id 
        ? { ...announcement, views: announcement.views + 1 } 
        : announcement
    ));
  };
  
  // Filter announcements based on current filters
  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || announcement.category === selectedCategory;
    const matchesPriority = selectedPriority === "all" || announcement.priority === selectedPriority;
    const matchesArchiveStatus = showArchived || !announcement.isArchived;
    const matchesTab = activeTab === "all" || 
                      (activeTab === "pinned" && announcement.isPinned) ||
                      (activeTab === "recent" && !announcement.isPinned);

    return matchesSearch && matchesCategory && matchesPriority && matchesArchiveStatus && matchesTab;
  });
  
  // Format date to a readable string
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Get time ago format
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return formatDate(date);
  };

  // Apply template to new announcement
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    setNewAnnouncement(prev => ({
      ...prev,
      title: template.title.replace("{tournamentName}", tournamentName || "Tournament"),
      content: template.content,
      category: template.category,
      priority: template.priority,
      template: templateId
    }));
  };

  // Template management functions
  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      toast({
        title: "Error",
        description: "Template name and content are required.",
        variant: "destructive"
      });
      return;
    }

    const template: AnnouncementTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      title: newTemplate.title || newTemplate.name,
      content: newTemplate.content,
      category: newTemplate.category,
      priority: newTemplate.priority,
      isUserCreated: true,
      createdAt: new Date(),
      isActive: true
    };

    setTemplates(prev => [...prev, template]);
    setNewTemplate({
      name: "",
      title: "",
      content: "",
      category: 'general',
      priority: 'medium'
    });
    setShowTemplateDialog(false);
    
    toast({
      title: "Template Created",
      description: `Template "${template.name}" has been created successfully.`
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template?.isUserCreated) {
      toast({
        title: "Cannot Delete",
        description: "Default templates cannot be deleted.",
        variant: "destructive"
      });
      return;
    }

    setTemplates(prev => prev.filter(t => t.id !== templateId));
    toast({
      title: "Template Deleted",
      description: `Template "${template.name}" has been deleted.`
    });
  };

  // Bulk actions
  const handleSelectAnnouncement = (id: string) => {
    setSelectedAnnouncements(prev => 
      prev.includes(id)
        ? prev.filter(selId => selId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedAnnouncements(
      selectedAnnouncements.length === filteredAnnouncements.length
        ? []
        : filteredAnnouncements.map(a => a.id)
    );
  };

  const handleBulkAction = (action: 'pin' | 'unpin' | 'archive' | 'delete') => {
    setAnnouncements(prev => {
      switch (action) {
        case 'pin':
          return prev.map(a => 
            selectedAnnouncements.includes(a.id) 
              ? { ...a, isPinned: true }
              : a
          );
        case 'unpin':
          return prev.map(a => 
            selectedAnnouncements.includes(a.id) 
              ? { ...a, isPinned: false }
              : a
          );
        case 'archive':
          return prev.map(a => 
            selectedAnnouncements.includes(a.id) 
              ? { ...a, isArchived: true }
              : a
          );
        case 'delete':
          return prev.filter(a => !selectedAnnouncements.includes(a.id));
        default:
          return prev;
      }
    });
    
    setSelectedAnnouncements([]);
    setShowBulkActions(false);
  };

  // Enhanced render announcement card with selection
  const renderAnnouncementCard = (announcement: Announcement) => {
    const PriorityIcon = priorityConfig[announcement.priority].icon;
    const isSelected = selectedAnnouncements.includes(announcement.id);
    
    return (
      <Card 
        key={announcement.id} 
        className={`${announcement.isPinned ? 'border-primary/20 bg-primary/5' : ''} 
                   ${announcement.isArchived ? 'opacity-60' : ''} 
                   ${isSelected ? 'ring-2 ring-primary' : ''}
                   hover:shadow-md transition-all cursor-pointer`}
        onClick={() => handleViewAnnouncement(announcement.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-3">
            {/* Selection checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleSelectAnnouncement(announcement.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {announcement.isPinned && <Pin className="h-4 w-4 text-primary" />}
                  <Badge className={priorityConfig[announcement.priority].color}>
                    <PriorityIcon className="h-3 w-3 mr-1" />
                    {announcement.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={categoryConfig[announcement.category].color}>
                    {categoryConfig[announcement.category].label}
                  </Badge>
                  {announcement.isArchived && (
                    <Badge variant="secondary">Archived</Badge>
                  )}
                  {announcement.isScheduled && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Calendar className="h-3 w-3 mr-1" />
                      Scheduled
                    </Badge>
                  )}
                  {announcement.template && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      <FileText className="h-3 w-3 mr-1" />
                      Template
                    </Badge>
                  )}
                  {announcement.isMarkdown && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <Type className="h-3 w-3 mr-1" />
                      Formatted
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-semibold line-clamp-2">
                  {announcement.title}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getTimeAgo(announcement.date)}
                  </span>
                  {announcement.authorName && (
                    <span>by {announcement.authorName}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {announcement.views}
                  </span>
                  {announcement.scheduledFor && (
                    <span className="flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      Sends {formatDate(announcement.scheduledFor)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePin(announcement.id);
                }}
                className="h-8 w-8 p-0"
              >
                {announcement.isPinned ? (
                  <PinOff className="h-4 w-4 text-primary" />
                ) : (
                  <Pin className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchiveAnnouncement(announcement.id);
                }}
                className="h-8 w-8 p-0"
              >
                {announcement.isArchived ? (
                  <ArchiveRestore className="h-4 w-4 text-green-600" />
                ) : (
                  <Archive className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteAnnouncement(announcement.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {announcement.isMarkdown && announcement.formattedContent ? (
            <div 
              className="text-sm text-muted-foreground line-clamp-3"
              dangerouslySetInnerHTML={{ __html: announcement.formattedContent }}
            />
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {announcement.content}
            </p>
          )}
          {announcement.expiresAt && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <Clock className="h-3 w-3 mr-1 inline" />
              Expires: {formatDate(announcement.expiresAt)}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
            <div className="flex items-center gap-4">
              {/* Auto-refresh toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  id="auto-refresh"
                />
                <Label htmlFor="auto-refresh" className="text-sm">
                  <RefreshCw className="h-3 w-3 mr-1 inline" />
                  Auto-refresh
                </Label>
              </div>
              
              {/* Notification settings */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                  id="notifications"
                />
                <Label htmlFor="notifications" className="text-sm">
                  🔔 Notifications
                </Label>
              </div>
              
              {/* Sound toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  id="sound"
                />
                <Label htmlFor="sound" className="text-sm">
                  🔊 Sound
                </Label>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground mt-1 text-lg">
            {tournamentName || "Tournament"} • {filteredAnnouncements.length} announcements
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* New Announcement Button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Create a new announcement for the tournament. This will be visible to all participants.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 py-4">
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
                      rows={6}
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={newAnnouncement.priority} 
                        onValueChange={(value) => setNewAnnouncement(prev => ({ ...prev, priority: value as Announcement['priority'] }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={newAnnouncement.category} 
                        onValueChange={(value) => setNewAnnouncement(prev => ({ ...prev, category: value as Announcement['category'] }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="schedule">Schedule</SelectItem>
                          <SelectItem value="rules">Rules</SelectItem>
                          <SelectItem value="results">Results</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="author">Author Name</Label>
                    <Input 
                      id="author" 
                      placeholder="Your name" 
                      value={newAnnouncement.authorName}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, authorName: e.target.value }))}
                    />
                  </div>
                </div>
              </ScrollArea>
            
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleAddAnnouncement}>
                  <Send className="mr-2 h-4 w-4" />
                  Post Announcement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search announcements..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="rules">Rules</SelectItem>
                <SelectItem value="results">Results</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="archived" 
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <Label htmlFor="archived" className="text-sm">Archived</Label>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedAnnouncements.length > 0 && (
          <Card className="p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {selectedAnnouncements.length} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedAnnouncements.length === filteredAnnouncements.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('pin')}
                >
                  <Pin className="h-3 w-3 mr-1" />
                  Pin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('archive')}
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Archive
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Announcements</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedAnnouncements.length} announcement(s)? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleBulkAction('delete')}>
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Announcements</TabsTrigger>
          <TabsTrigger value="pinned">Pinned</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4 mt-6">
          {filteredAnnouncements.length > 0 ? (
            <div className="grid gap-4">
              {filteredAnnouncements.map(renderAnnouncementCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No announcements found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or create a new announcement
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="pinned" className="space-y-4 mt-6">
          {filteredAnnouncements.filter(a => a.isPinned).length > 0 ? (
            <div className="grid gap-4">
              {filteredAnnouncements.filter(a => a.isPinned).map(renderAnnouncementCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Pin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No pinned announcements</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pin important announcements to keep them at the top
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="recent" className="space-y-4 mt-6">
          {filteredAnnouncements.filter(a => !a.isPinned).length > 0 ? (
            <div className="grid gap-4">
              {filteredAnnouncements.filter(a => !a.isPinned).map(renderAnnouncementCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No recent announcements</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Recent announcements will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnnouncementsPage;
