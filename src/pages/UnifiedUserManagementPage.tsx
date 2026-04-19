import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, UserCog, ShieldCheck, Gavel, KeyRound } from 'lucide-react';
import AdminUsersPage from '@/pages/AdminUsersPage';
import StaffAssignmentPage from '@/pages/StaffAssignmentPage';
import JuryManagementPage from '@/pages/JuryManagementPage';
import PasswordResetPage from '@/pages/PasswordResetPage';

type UserManagementTab = 'accounts' | 'staff' | 'jury' | 'passwords';

function resolveTabFromLocation(): UserManagementTab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'staff' || tab === 'jury' || tab === 'passwords') {
    return tab;
  }
  return 'accounts';
}

export default function UnifiedUserManagementPage() {
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<UserManagementTab>(() => resolveTabFromLocation());

  useEffect(() => {
    setActiveTab(resolveTabFromLocation());
  }, [location]);

  function handleTabChange(tab: string) {
    const resolved: UserManagementTab =
      tab === 'staff' || tab === 'jury' || tab === 'passwords' ? tab : 'accounts';
    setActiveTab(resolved);
    navigate(resolved === 'accounts' ? '/admin/users' : `/admin/users?tab=${resolved}`);
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Unified User Management</h1>
            <p className="text-sm text-muted-foreground">Manage accounts, staff assignments, jury members, and password operations in one place.</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">Admin Console</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto flex flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="accounts" className="gap-1.5 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserCog className="h-3.5 w-3.5" /> Accounts
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Staff Assignment
          </TabsTrigger>
          <TabsTrigger value="jury" className="gap-1.5 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Gavel className="h-3.5 w-3.5" /> Jury Management
          </TabsTrigger>
          <TabsTrigger value="passwords" className="gap-1.5 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <KeyRound className="h-3.5 w-3.5" /> Passwords
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-0">
          <AdminUsersPage />
        </TabsContent>

        <TabsContent value="staff" className="mt-0">
          <StaffAssignmentPage />
        </TabsContent>

        <TabsContent value="jury" className="mt-0">
          <JuryManagementPage />
        </TabsContent>

        <TabsContent value="passwords" className="mt-0">
          <PasswordResetPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
