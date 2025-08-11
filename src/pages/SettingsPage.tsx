import { useState, useEffect } from "react";
import { useTournamentStore } from "@/store/useTournamentStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Settings, 
  Trophy, 
  Palette, 
  Bell, 
  Database, 
  User, 
  Download, 
  Upload, 
  RefreshCw, 
  Save,
  Eye,
  EyeOff,
  Monitor,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Trash2,
  FileText,
  Shield,
  Zap,
  RotateCcw
} from "lucide-react";

// Types for settings
interface TournamentSettings {
  tournamentName: string;
  roundsPerMatch: number;
  seedType: 'random' | 'ordered' | 'as-entered';
  allowParticipantModification: boolean;
  autoAdvanceWinners: boolean;
  // New tournament features
  enableTimerMode: boolean;
  defaultMatchDuration: number; // in minutes
  breakDuration: number; // in minutes between matches
  enableLiveFeed: boolean;
  enableStatistics: boolean;
}

interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  colorScheme: 'default' | 'blue' | 'green' | 'purple' | 'orange';
  showMatchNumbers: boolean;
  highlightCurrentMatch: boolean;
  compactView: boolean;
  showParticipantPhotos: boolean;
  // New display features
  fontSize: 'small' | 'medium' | 'large';
  animationSpeed: 'slow' | 'normal' | 'fast' | 'disabled';
  showProgressBars: boolean;
  enableFullscreenMode: boolean;
  showMatchDuration: boolean;
  enableHighContrast: boolean; // Accessibility
  showKeyboardShortcuts: boolean;
}

interface NotificationSettings {
  enableSounds: boolean;
  enableToasts: boolean;
  autoSaveInterval: number; // in minutes
  matchCompletionSound: boolean;
  errorNotifications: boolean;
  // New notification features
  enableBrowserNotifications: boolean;
  notificationVolume: number; // 0-100
  enableVibration: boolean; // For mobile devices
  emailNotifications: boolean;
  discordWebhook: string;
  slackWebhook: string;
  enableMatchReminders: boolean;
  reminderMinutes: number;
}

interface DataSettings {
  autoBackup: boolean;
  backupInterval: number; // in hours
  retainHistory: boolean;
  exportFormat: 'json' | 'csv' | 'pdf';
  // New data features
  enableCloudSync: boolean;
  cloudProvider: 'google' | 'dropbox' | 'onedrive' | 'none';
  maxBackupCount: number;
  enableDataCompression: boolean;
  enableEncryption: boolean;
  enableAuditLog: boolean;
}

// New interface for performance settings
interface PerformanceSettings {
  enableLazyLoading: boolean;
  cacheSize: number; // in MB
  enableOfflineMode: boolean;
  optimizeForLargeScreens: boolean;
  enableVirtualization: boolean;
  maxParticipantsWarning: number;
  enablePerformanceMonitoring: boolean;
}

// New interface for accessibility settings
interface AccessibilitySettings {
  enableScreenReader: boolean;
  highContrastMode: boolean;
  largeClickTargets: boolean;
  enableKeyboardNavigation: boolean;
  screenReaderAnnouncements: boolean;
  reduceMotion: boolean;
  enableFocusIndicators: boolean;
}

const SettingsPage = () => {
  const { 
    tournamentName, 
    internalRoundsPerMatch, 
    seedType,
    setTournamentName,
    setInternalRoundsPerMatch,
    resetTournamentData,
    exportMatchDataAsJson,
    bracketData,
    matchResults,
    showToast
  } = useTournamentStore();

  // Local state for settings
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings>({
    tournamentName: tournamentName || 'Tournament Draw Sheet',
    roundsPerMatch: internalRoundsPerMatch || 3,
    seedType: seedType || 'random',
    allowParticipantModification: true,
    autoAdvanceWinners: false,
    // New tournament features
    enableTimerMode: false,
    defaultMatchDuration: 10,
    breakDuration: 3,
    enableLiveFeed: true,
    enableStatistics: true,
  });

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    theme: 'light',
    colorScheme: 'default',
    showMatchNumbers: true,
    highlightCurrentMatch: true,
    compactView: false,
    showParticipantPhotos: false,
    // New display features
    fontSize: 'medium',
    animationSpeed: 'normal',
    showProgressBars: true,
    enableFullscreenMode: false,
    showMatchDuration: true,
    enableHighContrast: false,
    showKeyboardShortcuts: true,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enableSounds: true,
    enableToasts: true,
    autoSaveInterval: 5,
    matchCompletionSound: true,
    errorNotifications: true,
    // New notification features
    enableBrowserNotifications: false,
    notificationVolume: 70,
    enableVibration: false,
    emailNotifications: false,
    discordWebhook: '',
    slackWebhook: '',
    enableMatchReminders: false,
    reminderMinutes: 5,
  });

  const [dataSettings, setDataSettings] = useState<DataSettings>({
    autoBackup: true,
    backupInterval: 24,
    retainHistory: true,
    exportFormat: 'json',
    // New data features
    enableCloudSync: false,
    cloudProvider: 'none',
    maxBackupCount: 10,
    enableDataCompression: true,
    enableEncryption: false,
    enableAuditLog: false,
  });

  // New state for performance settings
  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>({
    enableLazyLoading: true,
    cacheSize: 50,
    enableOfflineMode: false,
    optimizeForLargeScreens: true,
    enableVirtualization: false,
    maxParticipantsWarning: 100,
    enablePerformanceMonitoring: false,
  });

  // New state for accessibility settings
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    enableScreenReader: false,
    highContrastMode: false,
    largeClickTargets: false,
    enableKeyboardNavigation: true,
    screenReaderAnnouncements: false,
    reduceMotion: false,
    enableFocusIndicators: true,
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Sync tournament store values with local state
  useEffect(() => {
    setTournamentSettings(prev => ({
      ...prev,
      tournamentName: tournamentName || 'Tournament Draw Sheet',
      roundsPerMatch: internalRoundsPerMatch || 3,
      seedType: seedType || 'random',
    }));
  }, [tournamentName, internalRoundsPerMatch, seedType]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedDisplaySettings = localStorage.getItem('displaySettings');
    const savedNotificationSettings = localStorage.getItem('notificationSettings');
    const savedDataSettings = localStorage.getItem('dataSettings');
    const savedPerformanceSettings = localStorage.getItem('performanceSettings');
    const savedAccessibilitySettings = localStorage.getItem('accessibilitySettings');

    if (savedDisplaySettings) {
      setDisplaySettings(JSON.parse(savedDisplaySettings));
    }
    if (savedNotificationSettings) {
      setNotificationSettings(JSON.parse(savedNotificationSettings));
    }
    if (savedDataSettings) {
      setDataSettings(JSON.parse(savedDataSettings));
    }
    if (savedPerformanceSettings) {
      setPerformanceSettings(JSON.parse(savedPerformanceSettings));
    }
    if (savedAccessibilitySettings) {
      setAccessibilitySettings(JSON.parse(savedAccessibilitySettings));
    }
  }, []);
  // Save settings to localStorage and tournament store
  const saveSettings = () => {
    try {
      // Validate settings before saving
      if (!tournamentSettings.tournamentName.trim()) {
        showToast({
          type: 'destructive',
          title: 'Validation Error',
          description: 'Tournament name cannot be empty'
        });
        return;
      }

      if (tournamentSettings.roundsPerMatch < 1 || tournamentSettings.roundsPerMatch > 7) {
        showToast({
          type: 'destructive',
          title: 'Validation Error',
          description: 'Rounds per match must be between 1 and 7'
        });
        return;
      }

      // Save to tournament store
      setTournamentName(tournamentSettings.tournamentName);
      setInternalRoundsPerMatch(tournamentSettings.roundsPerMatch);

      // Save to localStorage
      localStorage.setItem('displaySettings', JSON.stringify(displaySettings));
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      localStorage.setItem('dataSettings', JSON.stringify(dataSettings));
      localStorage.setItem('performanceSettings', JSON.stringify(performanceSettings));
      localStorage.setItem('accessibilitySettings', JSON.stringify(accessibilitySettings));

      setHasUnsavedChanges(false);
      
      showToast({
        type: 'success',
        title: 'Settings Saved',
        description: 'All settings have been saved successfully'
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast({
        type: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save settings. Please try again.'
      });
    }
  };

  const handleTournamentSettingChange = (key: keyof TournamentSettings, value: any) => {
    setTournamentSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleDisplaySettingChange = (key: keyof DisplaySettings, value: any) => {
    setDisplaySettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleNotificationSettingChange = (key: keyof NotificationSettings, value: any) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleDataSettingChange = (key: keyof DataSettings, value: any) => {
    setDataSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handlePerformanceSettingChange = (key: keyof PerformanceSettings, value: any) => {
    setPerformanceSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleAccessibilitySettingChange = (key: keyof AccessibilitySettings, value: any) => {
    setAccessibilitySettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const resetAllSettings = () => {
    setTournamentSettings({
      tournamentName: 'Tournament Draw Sheet',
      roundsPerMatch: 3,
      seedType: 'random',
      allowParticipantModification: true,
      autoAdvanceWinners: false,
      // New tournament features
      enableTimerMode: false,
      defaultMatchDuration: 60,
      breakDuration: 5,
      enableLiveFeed: false,
      enableStatistics: false,
    });

    setDisplaySettings({
      theme: 'light',
      colorScheme: 'default',
      showMatchNumbers: true,
      highlightCurrentMatch: true,
      compactView: false,
      showParticipantPhotos: false,
      // New display features
      fontSize: 'medium',
      animationSpeed: 'normal',
      showProgressBars: true,
      enableFullscreenMode: false,
      showMatchDuration: true,
      enableHighContrast: false,
      showKeyboardShortcuts: true,
    });

    setNotificationSettings({
      enableSounds: true,
      enableToasts: true,
      autoSaveInterval: 5,
      matchCompletionSound: true,
      errorNotifications: true,
      // New notification features
      enableBrowserNotifications: false,
      notificationVolume: 100,
      enableVibration: false,
      emailNotifications: false,
      discordWebhook: '',
      slackWebhook: '',
      enableMatchReminders: false,
      reminderMinutes: 10,
    });

    setDataSettings({
      autoBackup: true,
      backupInterval: 24,
      retainHistory: true,
      exportFormat: 'json',
      enableCloudSync: false,
      cloudProvider: 'none',
      maxBackupCount: 10,
      enableDataCompression: true,
      enableEncryption: false,
      enableAuditLog: false,
    });

    setPerformanceSettings({
      enableLazyLoading: true,
      cacheSize: 50,
      enableOfflineMode: false,
      optimizeForLargeScreens: true,
      enableVirtualization: false,
      maxParticipantsWarning: 100,
      enablePerformanceMonitoring: false,
    });

    setAccessibilitySettings({
      enableScreenReader: false,
      highContrastMode: false,
      largeClickTargets: false,
      enableKeyboardNavigation: true,
      screenReaderAnnouncements: false,
      reduceMotion: false,
      enableFocusIndicators: true,
    });

    setHasUnsavedChanges(true);
    setShowResetDialog(false);
    
    showToast({
      type: 'success',
      title: 'Settings Reset',
      description: 'All settings have been reset to default values'
    });
  };

  const exportSettings = () => {
    const allSettings = {
      tournament: tournamentSettings,
      display: displaySettings,
      notifications: notificationSettings,
      data: dataSettings,
      performance: performanceSettings,
      accessibility: accessibilitySettings,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(allSettings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        
        // Validate imported settings structure
        if (!importedSettings || typeof importedSettings !== 'object') {
          throw new Error('Invalid settings file format');
        }
        
        // Import settings with validation
        if (importedSettings.tournament) {
          if (importedSettings.tournament.tournamentName?.trim()) {
            setTournamentSettings(prev => ({ ...prev, ...importedSettings.tournament }));
          }
        }
        if (importedSettings.display) setDisplaySettings(prev => ({ ...prev, ...importedSettings.display }));
        if (importedSettings.notifications) setNotificationSettings(prev => ({ ...prev, ...importedSettings.notifications }));
        if (importedSettings.data) setDataSettings(prev => ({ ...prev, ...importedSettings.data }));
        if (importedSettings.performance) setPerformanceSettings(prev => ({ ...prev, ...importedSettings.performance }));
        if (importedSettings.accessibility) setAccessibilitySettings(prev => ({ ...prev, ...importedSettings.accessibility }));
        
        setHasUnsavedChanges(true);
        
        showToast({
          type: 'success',
          title: 'Settings Imported',
          description: 'Settings have been imported successfully'
        });
      } catch (error) {
        console.error('Failed to import settings:', error);
        showToast({
          type: 'destructive',
          title: 'Import Failed',
          description: 'Failed to import settings. Please check the file format.'
        });
      }
    };
    reader.readAsText(file);
    
    // Reset the input value so the same file can be imported again
    event.target.value = '';
  };
  const getStatistics = () => {
    const totalMatches = Object.keys(matchResults).length;
    const completedMatches = Object.values(matchResults).filter(m => m.completed).length;
    const activeMatches = Object.values(matchResults).filter(m => !m.completed && m.rounds.length > 0).length;
    
    // Calculate participant count from bracket data
    let participantCount = 0;
    if (bracketData && bracketData.length > 0) {
      const firstRound = bracketData[0];
      participantCount = firstRound.reduce((count, match) => {
        const validParticipants = match.participants.filter(p => p && p !== "(bye)").length;
        return count + validParticipants;
      }, 0);
    }

    // Calculate rounds information
    const totalRounds = bracketData ? bracketData.length : 0;
    const completedRounds = bracketData ? bracketData.reduce((count, round, index) => {
      const roundMatches = round.filter(match => {
        const p1 = match.participants[0];
        const p2 = match.participants[1];
        return p1 && p2 && p1 !== "(bye)" && p2 !== "(bye)";
      });
      const completedRoundMatches = roundMatches.filter(match => {
        const matchResult = matchResults[match.id];
        return matchResult?.completed || (match.winner && match.winner !== "NO_WINNER");
      });
      return roundMatches.length > 0 && completedRoundMatches.length === roundMatches.length ? count + 1 : count;
    }, 0) : 0;

    return {
      totalMatches,
      completedMatches,
      activeMatches,
      participantCount,
      totalRounds,
      completedRounds,
      progressPercentage: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
      tournamentStatus: totalMatches === 0 ? 'Not Started' : 
                       completedMatches === totalMatches ? 'Completed' : 
                       activeMatches > 0 ? 'In Progress' : 'Paused'
    };
  };

  const getSystemInfo = () => {
    const storageKeys = ['tournament-storage', 'displaySettings', 'notificationSettings', 'dataSettings', 'performanceSettings', 'accessibilitySettings'];
    let totalStorage = 0;
    
    storageKeys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        totalStorage += new Blob([item]).size;
      }
    });

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return {
      version: '1.3.0', // Updated version
      storageUsed: formatBytes(totalStorage),
      lastBackup: dataSettings.autoBackup ? 'Auto-backup enabled' : 'Never',
      settingsCount: Object.keys({...displaySettings, ...notificationSettings, ...dataSettings, ...performanceSettings, ...accessibilitySettings}).length,
      performanceScore: calculatePerformanceScore(),
      accessibilityScore: calculateAccessibilityScore(),
    };
  };

  // New function to calculate performance score
  const calculatePerformanceScore = () => {
    let score = 0;
    if (performanceSettings.enableLazyLoading) score += 20;
    if (performanceSettings.enableVirtualization && stats.participantCount > 50) score += 15;
    if (performanceSettings.cacheSize >= 25) score += 10;
    if (displaySettings.animationSpeed === 'fast' || displaySettings.animationSpeed === 'disabled') score += 10;
    if (displaySettings.compactView && stats.participantCount > 32) score += 15;
    if (dataSettings.enableDataCompression) score += 10;
    if (performanceSettings.optimizeForLargeScreens) score += 10;
    if (notificationSettings.autoSaveInterval >= 10) score += 10;
    return Math.min(score, 100);
  };

  // New function to calculate accessibility score
  const calculateAccessibilityScore = () => {
    let score = 0;
    if (accessibilitySettings.enableKeyboardNavigation) score += 25;
    if (accessibilitySettings.enableFocusIndicators) score += 20;
    if (accessibilitySettings.highContrastMode || displaySettings.enableHighContrast) score += 15;
    if (accessibilitySettings.largeClickTargets) score += 15;
    if (displaySettings.fontSize === 'large') score += 10;
    if (accessibilitySettings.reduceMotion && displaySettings.animationSpeed === 'disabled') score += 10;
    if (accessibilitySettings.screenReaderAnnouncements) score += 5;
    return Math.min(score, 100);
  };

  // Auto-save functionality
  useEffect(() => {
    if (notificationSettings.autoSaveInterval > 0 && hasUnsavedChanges) {
      const timeoutId = setTimeout(() => {
        saveSettings();
      }, notificationSettings.autoSaveInterval * 60 * 1000); // Convert minutes to milliseconds

      return () => clearTimeout(timeoutId);
    }
  }, [hasUnsavedChanges, notificationSettings.autoSaveInterval]);

  // Apply theme changes immediately for preview
  useEffect(() => {
    if (displaySettings.theme !== 'system') {
      document.documentElement.classList.toggle('dark', displaySettings.theme === 'dark');
    }
  }, [displaySettings.theme]);

  const refreshSystemInfo = () => {
    // Force re-render of system info
    setHasUnsavedChanges(prev => prev); // Trigger re-render without changing state
    showToast({
      type: 'success',
      title: 'System Info Refreshed',
      description: 'System information has been updated'
    });
  };

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (hasUnsavedChanges) saveSettings();
            break;
          case 'r':
            if (e.shiftKey) {
              e.preventDefault();
              setShowResetDialog(true);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges]);

  const stats = getStatistics();
  const systemInfo = getSystemInfo();
  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Tournament Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your tournament preferences and system settings
          </p>
        </div>
        
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="animate-pulse">
              Unsaved Changes
            </Badge>
          )}          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={saveSettings} disabled={!hasUnsavedChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save settings (Ctrl+S)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Tabs defaultValue="tournament" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
          <TabsTrigger value="tournament" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Tournament
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Display
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Accessibility
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Tournament Settings */}
        <TabsContent value="tournament" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Basic Tournament Settings
                </CardTitle>
                <CardDescription>
                  Configure fundamental tournament parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">                <div className="space-y-2">
                  <Label htmlFor="tournamentName">Tournament Name</Label>
                  <Input
                    id="tournamentName"
                    value={tournamentSettings.tournamentName}
                    onChange={(e) => handleTournamentSettingChange('tournamentName', e.target.value)}
                    placeholder="Enter tournament name"
                    className={!tournamentSettings.tournamentName.trim() ? "border-red-300" : ""}
                  />
                  {!tournamentSettings.tournamentName.trim() && (
                    <p className="text-sm text-red-500">Tournament name is required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roundsPerMatch">Rounds per Match</Label>
                  <Select
                    value={tournamentSettings.roundsPerMatch.toString()}
                    onValueChange={(value) => handleTournamentSettingChange('roundsPerMatch', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Round</SelectItem>
                      <SelectItem value="3">3 Rounds (Best of 3)</SelectItem>
                      <SelectItem value="5">5 Rounds (Best of 5)</SelectItem>
                      <SelectItem value="7">7 Rounds (Best of 7)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seedType">Seeding Type</Label>
                  <Select
                    value={tournamentSettings.seedType}
                    onValueChange={(value: 'random' | 'ordered' | 'as-entered') => 
                      handleTournamentSettingChange('seedType', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random Seeding</SelectItem>
                      <SelectItem value="ordered">Ordered by Skill</SelectItem>
                      <SelectItem value="as-entered">As Entered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Advanced Options
                </CardTitle>
                <CardDescription>
                  Additional tournament configuration options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowModification">Allow Participant Modification</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow changes to participants after tournament starts
                    </p>
                  </div>
                  <Switch
                    id="allowModification"
                    checked={tournamentSettings.allowParticipantModification}
                    onCheckedChange={(value) => handleTournamentSettingChange('allowParticipantModification', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoAdvance">Auto-advance Winners</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically advance winners to next round
                    </p>
                  </div>
                  <Switch
                    id="autoAdvance"
                    checked={tournamentSettings.autoAdvanceWinners}
                    onCheckedChange={(value) => handleTournamentSettingChange('autoAdvanceWinners', value)}
                  />
                </div>

                <Separator />                <div className="space-y-3">
                  <Label>Tournament Statistics</Label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Participants:</span>
                      <span className="font-medium">{stats.participantCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={stats.tournamentStatus === 'Completed' ? 'default' : 
                                   stats.tournamentStatus === 'In Progress' ? 'destructive' : 'secondary'}>
                        {stats.tournamentStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Matches:</span>
                      <span className="font-medium">{stats.totalMatches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium">{stats.completedMatches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active:</span>
                      <span className="font-medium">{stats.activeMatches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="font-medium">{stats.progressPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Rounds:</span>
                      <span className="font-medium">{stats.totalRounds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rounds Done:</span>
                      <span className="font-medium">{stats.completedRounds}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Display Settings */}
        <TabsContent value="display" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the visual appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={displaySettings.theme}
                    onValueChange={(value: 'light' | 'dark' | 'system') => 
                      handleDisplaySettingChange('theme', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorScheme">Color Scheme</Label>
                  <Select
                    value={displaySettings.colorScheme}
                    onValueChange={(value) => handleDisplaySettingChange('colorScheme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Display Options
                </CardTitle>
                <CardDescription>
                  Configure what elements are shown in the interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showMatchNumbers">Show Match Numbers</Label>
                    <p className="text-sm text-muted-foreground">
                      Display match identifiers on bracket
                    </p>
                  </div>
                  <Switch
                    id="showMatchNumbers"
                    checked={displaySettings.showMatchNumbers}
                    onCheckedChange={(value) => handleDisplaySettingChange('showMatchNumbers', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="highlightCurrent">Highlight Current Match</Label>
                    <p className="text-sm text-muted-foreground">
                      Emphasize the currently active match
                    </p>
                  </div>
                  <Switch
                    id="highlightCurrent"
                    checked={displaySettings.highlightCurrentMatch}
                    onCheckedChange={(value) => handleDisplaySettingChange('highlightCurrentMatch', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="compactView">Compact View</Label>
                    <p className="text-sm text-muted-foreground">
                      Use smaller spacing for larger tournaments
                    </p>
                  </div>
                  <Switch
                    id="compactView"
                    checked={displaySettings.compactView}
                    onCheckedChange={(value) => handleDisplaySettingChange('compactView', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showPhotos">Show Participant Photos</Label>
                    <p className="text-sm text-muted-foreground">
                      Display photos next to participant names
                    </p>
                  </div>
                  <Switch
                    id="showPhotos"
                    checked={displaySettings.showParticipantPhotos}
                    onCheckedChange={(value) => handleDisplaySettingChange('showParticipantPhotos', value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Advanced Display Settings
                </CardTitle>
                <CardDescription>
                  Fine-tune the visual experience and interface behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Select
                    value={displaySettings.fontSize}
                    onValueChange={(value) => handleDisplaySettingChange('fontSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="animationSpeed">Animation Speed</Label>
                  <Select
                    value={displaySettings.animationSpeed}
                    onValueChange={(value) => handleDisplaySettingChange('animationSpeed', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showProgressBars">Show Progress Bars</Label>
                    <p className="text-sm text-muted-foreground">
                      Display tournament and match progress indicators
                    </p>
                  </div>
                  <Switch
                    id="showProgressBars"
                    checked={displaySettings.showProgressBars}
                    onCheckedChange={(value) => handleDisplaySettingChange('showProgressBars', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showMatchDuration">Show Match Duration</Label>
                    <p className="text-sm text-muted-foreground">
                      Display elapsed time for each match
                    </p>
                  </div>
                  <Switch
                    id="showMatchDuration"
                    checked={displaySettings.showMatchDuration}
                    onCheckedChange={(value) => handleDisplaySettingChange('showMatchDuration', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableHighContrast">High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Improve visibility with high contrast colors
                    </p>
                  </div>
                  <Switch
                    id="enableHighContrast"
                    checked={displaySettings.enableHighContrast}
                    onCheckedChange={(value) => handleDisplaySettingChange('enableHighContrast', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showKeyboardShortcuts">Keyboard Shortcuts</Label>
                    <p className="text-sm text-muted-foreground">
                      Show keyboard shortcut hints in interface
                    </p>
                  </div>
                  <Switch
                    id="showKeyboardShortcuts"
                    checked={displaySettings.showKeyboardShortcuts}
                    onCheckedChange={(value) => handleDisplaySettingChange('showKeyboardShortcuts', value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableSounds">Enable Sounds</Label>
                    <p className="text-sm text-muted-foreground">
                      Play audio feedback for actions
                    </p>
                  </div>
                  <Switch
                    id="enableSounds"
                    checked={notificationSettings.enableSounds}
                    onCheckedChange={(value) => handleNotificationSettingChange('enableSounds', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableToasts">Enable Toast Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Show popup messages for important events
                    </p>
                  </div>
                  <Switch
                    id="enableToasts"
                    checked={notificationSettings.enableToasts}
                    onCheckedChange={(value) => handleNotificationSettingChange('enableToasts', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="matchCompletion">Match Completion Sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound when matches are completed
                    </p>
                  </div>
                  <Switch
                    id="matchCompletion"
                    checked={notificationSettings.matchCompletionSound}
                    onCheckedChange={(value) => handleNotificationSettingChange('matchCompletionSound', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="errorNotifications">Error Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications for errors and warnings
                    </p>
                  </div>
                  <Switch
                    id="errorNotifications"
                    checked={notificationSettings.errorNotifications}
                    onCheckedChange={(value) => handleNotificationSettingChange('errorNotifications', value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="autoSaveInterval">Auto-save Interval (minutes)</Label>
                <Select
                  value={notificationSettings.autoSaveInterval.toString()}
                  onValueChange={(value) => handleNotificationSettingChange('autoSaveInterval', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Advanced Notifications
              </CardTitle>
              <CardDescription>
                Extended notification and integration options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableBrowserNotifications">Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications even when tab is not active
                  </p>
                </div>
                <Switch
                  id="enableBrowserNotifications"
                  checked={notificationSettings.enableBrowserNotifications}
                  onCheckedChange={(value) => handleNotificationSettingChange('enableBrowserNotifications', value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notificationVolume">Notification Volume</Label>
                <div className="flex items-center gap-3">
                  <VolumeX className="h-4 w-4 text-gray-400" />
                  <input
                    type="range"
                    id="notificationVolume"
                    min="0"
                    max="100"
                    value={notificationSettings.notificationVolume}
                    onChange={(e) => handleNotificationSettingChange('notificationVolume', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <Volume2 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm w-10 text-right">{notificationSettings.notificationVolume}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableMatchReminders">Match Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Remind participants about upcoming matches
                  </p>
                </div>
                <Switch
                  id="enableMatchReminders"
                  checked={notificationSettings.enableMatchReminders}
                  onCheckedChange={(value) => handleNotificationSettingChange('enableMatchReminders', value)}
                />
              </div>

              {notificationSettings.enableMatchReminders && (
                <div className="space-y-2 ml-4">
                  <Label htmlFor="reminderMinutes">Reminder Time</Label>
                  <Select
                    value={notificationSettings.reminderMinutes.toString()}
                    onValueChange={(value) => handleNotificationSettingChange('reminderMinutes', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute before</SelectItem>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="10">10 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">External Integrations</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="discordWebhook">Discord Webhook URL</Label>
                  <Input
                    id="discordWebhook"
                    type="url"
                    value={notificationSettings.discordWebhook}
                    onChange={(e) => handleNotificationSettingChange('discordWebhook', e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Send tournament updates to your Discord server
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
                  <Input
                    id="slackWebhook"
                    type="url"
                    value={notificationSettings.slackWebhook}
                    onChange={(e) => handleNotificationSettingChange('slackWebhook', e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Send tournament updates to your Slack workspace
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Configure data backup and export settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoBackup">Auto Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup tournament data
                    </p>
                  </div>
                  <Switch
                    id="autoBackup"
                    checked={dataSettings.autoBackup}
                    onCheckedChange={(value) => handleDataSettingChange('autoBackup', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backupInterval">Backup Interval</Label>
                  <Select
                    value={dataSettings.backupInterval.toString()}
                    onValueChange={(value) => handleDataSettingChange('backupInterval', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every hour</SelectItem>
                      <SelectItem value="6">Every 6 hours</SelectItem>
                      <SelectItem value="24">Daily</SelectItem>
                      <SelectItem value="168">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exportFormat">Default Export Format</Label>
                  <Select
                    value={dataSettings.exportFormat}
                    onValueChange={(value: 'json' | 'csv' | 'pdf') => handleDataSettingChange('exportFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="retainHistory">Retain Match History</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep detailed history of match changes
                    </p>
                  </div>
                  <Switch
                    id="retainHistory"
                    checked={dataSettings.retainHistory}
                    onCheckedChange={(value) => handleDataSettingChange('retainHistory', value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Import/Export
                </CardTitle>
                <CardDescription>
                  Manage your settings and tournament data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={exportSettings} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="import-settings">Import Settings</Label>
                  <Input
                    id="import-settings"
                    type="file"
                    accept=".json"
                    onChange={importSettings}
                    className="cursor-pointer"
                  />
                </div>

                <Separator />

                <Button 
                  onClick={exportMatchDataAsJson} 
                  variant="outline" 
                  className="w-full"
                  disabled={!bracketData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Tournament Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Management
              </CardTitle>
              <CardDescription>
                Manage system-wide settings and perform maintenance tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset All Settings
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset All Settings</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset all settings to their default values. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={resetAllSettings}>
                        Reset Settings
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Tournament Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Tournament Data</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the current tournament data including all participants, 
                        matches, and results. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={resetTournamentData} className="bg-destructive">
                        Clear Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Separator />                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>System Information</Label>
                    <Button variant="outline" size="sm" onClick={refreshSystemInfo}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  </div>
                  <div className="text-sm space-y-2 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span className="font-medium">{systemInfo.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Settings Count:</span>
                      <span className="font-medium">{systemInfo.settingsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage Used:</span>
                      <span className="font-medium">{systemInfo.storageUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto Backup:</span>
                      <Badge variant={dataSettings.autoBackup ? 'default' : 'secondary'}>
                        {dataSettings.autoBackup ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Export Format:</span>
                      <span className="font-medium uppercase">{dataSettings.exportFormat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Performance Score:</span>
                      <Badge variant={systemInfo.performanceScore >= 80 ? 'default' : 
                                    systemInfo.performanceScore >= 60 ? 'secondary' : 'destructive'}>
                        {systemInfo.performanceScore}/100
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Accessibility Score:</span>
                      <Badge variant={systemInfo.accessibilityScore >= 80 ? 'default' : 
                                    systemInfo.accessibilityScore >= 60 ? 'secondary' : 'destructive'}>
                        {systemInfo.accessibilityScore}/100
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>        </TabsContent>
      </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default SettingsPage;
