import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label"; // Added Label import
import { Pin, PinOff, Archive, ArchiveRestore, Trash, Eye, Clock, Calendar, FileText, Type, Info, CheckCircle, AlertTriangle, Send, Search, Filter, PlusCircle, ListChecks, RefreshCw, SmilePlus, GripHorizontal, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { useTournamentStore } from '@/store/useTournamentStore';
import initialData from '@/data/announcementsData.json'; // Import the JSON data

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
}

// Template interface
interface AnnouncementTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  category: Announcement['category'];
  priority: Announcement['priority'];
  isUserCreated?: boolean; // Added from JSON
  isActive?: boolean;      // Added from JSON
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
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    initialData.announcements.map((ann: any) => ({ // Cast ann to any to handle potentially missing optional fields from JSON
      ...ann,
      date: new Date(ann.date),
      // Ensure optional fields from JSON are handled correctly, even if not present on all ann objects in JSON
      expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : undefined,
      scheduledFor: ann.scheduledFor ? new Date(ann.scheduledFor) : undefined,
      // Ensure all fields from Announcement interface are present, providing defaults if necessary
      isPinned: ann.isPinned || false,
      isArchived: ann.isArchived || false,
      views: ann.views || 0,
      priority: ann.priority as Announcement['priority'], // Cast if JSON is less specific
      category: ann.category as Announcement['category']  // Cast if JSON is less specific
    }))
  );
  
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

  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>(
    initialData.templates.map(t => ({
      ...t,
      category: t.category as Announcement['category'], // Cast to specific literal type
      priority: t.priority as Announcement['priority']  // Cast to specific literal type
    }))
  );
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Rich text editor state
  const [isRichTextMode, setIsRichTextMode] = useState(false);
  const [textFormat, setTextFormat] = useState<TextFormat>({
    bold: false,
    italic: false,
    underline: false,
    align: 'left'
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // In a real app, this would fetch from an API
      console.log("Auto refreshing announcements...");
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

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
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      isMarkdown: isRichTextMode
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
  const baseFilteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || announcement.category === selectedCategory;
    const matchesPriority = selectedPriority === "all" || announcement.priority === selectedPriority;
    const matchesArchiveStatus = showArchived || !announcement.isArchived;
    // Removed matchesTab as we are creating distinct sections for pinned and others
    return matchesSearch && matchesCategory && matchesPriority && matchesArchiveStatus;
  });

  const pinnedAnnouncements = baseFilteredAnnouncements.filter(a => a.isPinned && (showArchived || !a.isArchived));
  const otherAnnouncements = baseFilteredAnnouncements.filter(a => !a.isPinned && (showArchived || !a.isArchived));
  
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

  // Bulk actions
  const handleSelectAnnouncement = (id: string) => {
    setSelectedAnnouncements(prev => 
      prev.includes(id)
        ? prev.filter(selId => selId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = (list: Announcement[]) => {
    const listIds = list.map(a => a.id);
    const allSelectedFromList = listIds.length > 0 && listIds.every(id => selectedAnnouncements.includes(id));

    if (allSelectedFromList) {
      setSelectedAnnouncements(prev => prev.filter(selId => !listIds.includes(selId)));
    } else {
      // Use Array.from for Set to Array conversion
      setSelectedAnnouncements(prev => Array.from(new Set([...prev, ...listIds]))); 
    }
  };

  const handleBulkAction = (action: 'pin' | 'unpin' | 'archive' | 'delete') => {
    setAnnouncements(prev => 
      prev.map(ann => {
        if (selectedAnnouncements.includes(ann.id)) {
          switch (action) {
            case 'pin': return { ...ann, isPinned: true };
            case 'unpin': return { ...ann, isPinned: false };
            case 'archive': return { ...ann, isArchived: true };
            // Delete is handled differently below
            default: return ann;
          }
        }
        return ann;
      }).filter(ann => action === 'delete' ? !selectedAnnouncements.includes(ann.id) : true)
    );
    
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
    <div className="p-6 space-y-8"> 
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Announcements</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsDialogOpen(true)} variant="default">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
          <Button variant="outline" onClick={() => setAutoRefresh(prev => !prev)} className={autoRefresh ? "text-green-600" : ""}>
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? "Stop Refresh" : "Auto Refresh"}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="space-y-1">
          <Label htmlFor="search" className="text-sm font-medium">Search</Label>
          <Input
            id="search"
            type="text"
            placeholder="Search by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category" className="text-sm font-medium">Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.keys(categoryConfig).map(key => (
                <SelectItem key={key} value={key}>{categoryConfig[key as keyof typeof categoryConfig].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger id="priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.keys(priorityConfig).map(key => (
                <SelectItem key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2 justify-self-start md:justify-self-end pt-5">
          <Switch id="showArchived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="showArchived" className="text-sm font-medium">Show Archived</Label>
        </div>
      </div>
      
      {/* Bulk Actions Toolbar */}
      {selectedAnnouncements.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-200">
            {selectedAnnouncements.length} announcement{selectedAnnouncements.length > 1 ? 's' : ''} selected.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('pin')}>Pin Selected</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('unpin')}>Unpin Selected</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>Archive Selected</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="bg-red-500 hover:bg-red-600">Delete Selected</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Announcements?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedAnnouncements.length} announcement{selectedAnnouncements.length > 1 ? 's' : ''}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleBulkAction('delete')} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Pinned Announcements Section */}
      {pinnedAnnouncements.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center">
              <Pin className="h-6 w-6 mr-2 text-primary" /> Pinned Announcements
            </h2>
            {pinnedAnnouncements.length > 0 && (
               <Button variant="ghost" size="sm" onClick={() => handleSelectAll(pinnedAnnouncements)}>
                {pinnedAnnouncements.every(a => selectedAnnouncements.includes(a.id)) && pinnedAnnouncements.length > 0 ? 'Deselect All Pinned' : 'Select All Pinned'}
              </Button>
            )}
          </div>
          {pinnedAnnouncements.length === 0 && !showArchived && (
             <p className="text-muted-foreground">No pinned announcements. Pin important messages to display them here.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pinnedAnnouncements.map(announcement => renderAnnouncementCard(announcement))}
          </div>
        </section>
      )}

      {/* Other Announcements Section */}
      <section>
        <div className="flex justify-between items-center mb-4 mt-8"> 
          <h2 className="text-2xl font-semibold">
            {selectedCategory !== 'all' || selectedPriority !== 'all' || searchTerm !== '' ? 'Filtered Announcements' : 'Recent Announcements'}
          </h2>
           {otherAnnouncements.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => handleSelectAll(otherAnnouncements)}>
              {otherAnnouncements.every(a => selectedAnnouncements.includes(a.id)) && otherAnnouncements.length > 0 ? 'Deselect All Others' : 'Select All Others'}
            </Button>
           )}
        </div>
        {otherAnnouncements.length === 0 && (
          <p className="text-muted-foreground">
            {baseFilteredAnnouncements.length === 0 && searchTerm === "" && selectedCategory === "all" && selectedPriority === "all" 
              ? "No announcements yet. Create one to get started!" 
              : "No announcements match your current filters."}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {otherAnnouncements.map(announcement => renderAnnouncementCard(announcement))}
        </div>
      </section>

      {/* Dialog for New/Edit Announcement */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Announcement</DialogTitle>
            <DialogDescription>
              Fill in the details for your new announcement. You can use markdown for content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            {/* Template Selector */}
            <div className="space-y-1">
              <Label htmlFor="template" className="text-sm font-medium">Apply Template (Optional)</Label>
              <Select onValueChange={(value) => applyTemplate(value)}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.isActive).map(template => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="title" className="text-sm font-medium">Title</Label>
              <Input 
                id="title" 
                value={newAnnouncement.title} 
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                placeholder="Announcement Title"
              />
            </div>
            
            {/* Rich Text / Markdown Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="content" className="text-sm font-medium">Content</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="richTextMode" 
                  checked={isRichTextMode} 
                  onCheckedChange={setIsRichTextMode} 
                />
                <Label htmlFor="richTextMode" className="text-sm">
                  {isRichTextMode ? "Formatted Text" : "Plain Text"}
                </Label>
              </div>
            </div>

            {/* Rich Text Editor Controls (simplified) */}
            {isRichTextMode && (
              <div className="border rounded-md p-2 space-x-1 bg-gray-50 dark:bg-gray-700">
                <Button variant="ghost" size="sm" onClick={() => applyFormat('bold')} className={textFormat.bold ? 'bg-muted' : ''}><Bold size={16}/></Button>
                <Button variant="ghost" size="sm" onClick={() => applyFormat('italic')} className={textFormat.italic ? 'bg-muted' : ''}><Italic size={16}/></Button>
                <Button variant="ghost" size="sm" onClick={() => applyFormat('underline')} className={textFormat.underline ? 'bg-muted' : ''}><Underline size={16}/></Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEmojiPicker(prev => !prev)}><SmilePlus size={16}/></Button>
                {/* Basic Align (conceptual) */}
                {/* <Button variant="ghost" size="sm" onClick={() => applyFormat('align', 'left')} className={textFormat.align === 'left' ? 'bg-muted' : ''}><AlignLeft size={16}/></Button>
                <Button variant="ghost" size="sm" onClick={() => applyFormat('align', 'center')} className={textFormat.align === 'center' ? 'bg-muted' : ''}><AlignCenter size={16}/></Button>
                <Button variant="ghost" size="sm" onClick={() => applyFormat('align', 'right')} className={textFormat.align === 'right' ? 'bg-muted' : ''}><AlignRight size={16}/></Button> */}
              </div>
            )}
            {showEmojiPicker && (
              <div className="border rounded-md p-2 grid grid-cols-6 gap-1 bg-white dark:bg-gray-800 shadow-lg">
                {emojiShortcuts.map(emoji => (
                  <Button 
                    key={emoji.name} 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { insertText(emoji.emoji); setShowEmojiPicker(false); }}
                    title={emoji.name}
                  >
                    {emoji.emoji}
                  </Button>
                ))}
              </div>
            )}
            <Textarea 
              id="content"
              value={newAnnouncement.content} 
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              placeholder={isRichTextMode ? "Type your formatted content here... (use **bold**, *italic*)" : "Type your announcement content here..."}
              rows={6}
              className="min-h-[120px]"
            />
            {isRichTextMode && (
              <div className="text-xs text-muted-foreground p-2 border rounded bg-gray-50 dark:bg-gray-700">
                <h4 className="font-semibold mb-1">Live Preview:</h4>
                <div dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(formatContent(newAnnouncement.content)) || "<p><em>Preview will appear here...</em></p>" }} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="priority-new" className="text-sm font-medium">Priority</Label>
                <Select value={newAnnouncement.priority} onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, priority: value as Announcement['priority'] })}>
                  <SelectTrigger id="priority-new"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(priorityConfig).map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="category-new" className="text-sm font-medium">Category</Label>
                <Select value={newAnnouncement.category} onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, category: value as Announcement['category'] })}>
                  <SelectTrigger id="category-new"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(categoryConfig).map(c => <SelectItem key={c} value={c}>{categoryConfig[c as keyof typeof categoryConfig].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="authorName" className="text-sm font-medium">Author Name</Label>
              <Input 
                id="authorName" 
                value={newAnnouncement.authorName} 
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, authorName: e.target.value })}
                placeholder="Author's Name (e.g., Tournament Admin)"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="expiresAt" className="text-sm font-medium">Expires At (Optional)</Label>
                <Input 
                  id="expiresAt" 
                  type="datetime-local"
                  value={newAnnouncement.expiresAt}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiresAt: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch 
                  id="isScheduled" 
                  checked={newAnnouncement.isScheduled} 
                  onCheckedChange={(checked) => setNewAnnouncement({ ...newAnnouncement, isScheduled: checked, scheduledFor: checked ? newAnnouncement.scheduledFor : "" })}
                />
                <Label htmlFor="isScheduled" className="text-sm font-medium">Schedule Post</Label>
              </div>
            </div>

            {newAnnouncement.isScheduled && (
              <div className="space-y-1">
                <Label htmlFor="scheduledFor" className="text-sm font-medium">Scheduled For</Label>
                <Input 
                  id="scheduledFor" 
                  type="datetime-local"
                  value={newAnnouncement.scheduledFor}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, scheduledFor: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAnnouncement}>Add Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsPage;