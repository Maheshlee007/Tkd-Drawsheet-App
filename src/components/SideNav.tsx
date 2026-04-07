import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Home,
  Users,
  Megaphone,
  BarChart2,
  ClipboardList,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  RadioTower,
  UserPlus,
  Scale,
  BarChart3,
  Trophy,
  Shield,
  Monitor,
  QrCode,
  Gavel,
  FileText,
  UserCog,
  LayoutGrid,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTournamentStore } from '@/store/useTournamentStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from './ui/button';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  roles?: string[]; // visible to these roles only; undefined = visible to all
};

type NavSection = {
  title: string;
  items: NavItem[];
  roles?: string[]; // visible to these roles only; undefined = visible to all
};

type SideNavProps = {
  className?: string;
  onClose?: () => void;
  onCollapse?: (isCollapsed: boolean) => void;
};

export function SideNav({ className, onClose, onCollapse }: SideNavProps) {
  const [location, navigate] = useLocation();
  const bracketData = useTournamentStore((state) => state.bracketData);
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const userRoles = user?.roles ?? [];
  const hasMultipleRoles = userRoles.length > 1;
  // When activeRole is set, filter nav by that role; otherwise use all roles
  const effectiveRoles = activeRole ? [activeRole] : userRoles;

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 1280;
    return true;
  });

  useEffect(() => {
    if (onCollapse) onCollapse(collapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeRole) return;
    if (!userRoles.includes(activeRole)) {
      setActiveRole(userRoles[0] ?? null);
    }
  }, [activeRole, userRoles, setActiveRole]);

  const navSections: NavSection[] = [
    {
      title: 'Main',
      roles: ['admin', 'organizer'],
      items: [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Create Tournament', href: '/create', icon: Plus },
      ],
    },
    {
      title: 'Tournament',
      items: [
        { name: 'View Bracket', href: '/view', icon: ClipboardList, disabled: !bracketData, roles: ['admin', 'organizer', 'jury', 'verification_officer', 'coach'] },
        { name: 'Participants', href: '/participants', icon: Users, disabled: !bracketData, roles: ['admin', 'organizer', 'verification_officer', 'coach'] },
        { name: 'Players List', href: '/players', icon: Users, roles: ['admin', 'organizer', 'verification_officer', 'coach'] },
        { name: 'Match Overview', href: '/match-overview', icon: BarChart3, roles: ['admin', 'organizer', 'jury', 'board'] },
        { name: 'Statistics', href: '/statistics', icon: BarChart2, disabled: !bracketData, roles: ['admin', 'organizer'] },
      ],
    },
    {
      title: 'Management',
      roles: ['admin', 'organizer'],
      items: [
        { name: 'Weight Categories', href: '/weight-categories', icon: Scale },
        { name: 'Staff Assignment', href: '/staff-assignment', icon: LayoutGrid },
        { name: 'Jury Management', href: '/jury-management', icon: Shield },
        { name: 'Match Dashboard', href: '/match-dashboard', icon: BarChart3 },
        { name: 'Password Reset', href: '/password-reset', icon: UserCog },
      ],
    },
    {
      title: 'Registration',
      roles: ['admin', 'organizer', 'coach', 'player'],
      items: [
        { name: 'Player Registration', href: '/register', icon: UserPlus, roles: ['admin', 'organizer', 'coach', 'player'] },
        { name: 'Coach Registration', href: '/coach-register', icon: UserCog, roles: ['admin', 'organizer'] },
      ],
    },
    {
      title: 'Portals',
      roles: ['admin', 'organizer', 'verification_officer', 'jury'],
      items: [
        { name: 'Check-in / Verify', href: '/verify', icon: QrCode, roles: ['admin', 'organizer', 'verification_officer'] },
        { name: 'Jury Portal', href: '/jury', icon: Gavel, roles: ['admin', 'organizer', 'jury'] },
        { name: 'Live Board', href: '/board', icon: Monitor, roles: ['admin', 'organizer', 'board', 'jury', 'verification_officer', 'coach', 'player'] },
      ],
    },
    {
      title: 'Admin',
      roles: ['admin'],
      items: [
        { name: 'Tournaments', href: '/admin/tournaments', icon: Trophy },
        { name: 'User Management', href: '/admin/users', icon: UserCog },
        { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
      ],
    },
    {
      title: 'Other',
      roles: ['admin', 'organizer'],
      items: [
        { name: 'Announcements', href: '/announcements', icon: Megaphone },
        { name: 'Live Feed', href: '/live-feed', icon: RadioTower },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  // Filter sections and items by effective role(s)
  const visibleSections = navSections
    .map((section) => {
      const sectionAllowed = !section.roles || (effectiveRoles?.length > 0 && section.roles.some(r => effectiveRoles.includes(r)));
      if (!sectionAllowed) return null;

      const items = section.items.filter((item) => {
        if (!item.roles) return true;
        if (!effectiveRoles || effectiveRoles.length === 0) return false;
        return item.roles.some(r => effectiveRoles.includes(r));
      });

      if (items.length === 0) return null;
      return { ...section, items };
    })
    .filter((section): section is NavSection => section !== null);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (onCollapse) onCollapse(next);
  };

  // Mobile version (in a sheet)
  if (onClose) {
    return (
      <div className={cn("h-full", className)}>
        <div className="pb-12 h-full relative">
          <div className="md:hidden absolute right-4 top-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Role switcher for mobile multi-role users */}
          {hasMultipleRoles && (
            <div className="px-4 pt-12 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Active Role</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveRole(null)}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-all',
                    !activeRole ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  All
                </button>
                {userRoles.map(role => (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role === activeRole ? null : role)}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-all capitalize',
                      activeRole === role ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {role.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={cn("space-y-4 py-4", hasMultipleRoles ? "pt-2" : "")}>
            {visibleSections.map((section) => (
              <div key={section.title} className="px-3 py-1">
                <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => {
                        if (!item.disabled) {
                          navigate(item.href);
                          if (onClose) onClose();
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-start gap-3 rounded-lg py-2 px-3 text-sm font-medium transition-all',
                        location === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-primary',
                        item.disabled && 'pointer-events-none opacity-50'
                      )}
                      disabled={item.disabled}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className={cn(
      'h-full flex flex-col transition-all duration-300 ease-in-out bg-white',
      collapsed ? 'w-20' : 'w-64',
      className
    )}>
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Collapse toggle — fixed header */}
        <div className="flex justify-center items-center py-2 flex-shrink-0">
          {!collapsed && (
            <h2 className="flex-1 px-4 text-lg font-semibold tracking-tight text-slate-800">
              Menu
            </h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="transition-all duration-300 hover:bg-slate-100 rounded-full"
          >
            {collapsed ? <ChevronRight className="h-5 w-5 text-slate-600" /> : <ChevronLeft className="h-5 w-5 text-slate-600" />}
            <span className="sr-only">{collapsed ? 'Expand' : 'Collapse'}</span>
          </Button>
        </div>

        {/* Role switcher for multi-role users */}
        {hasMultipleRoles && !collapsed && (
          <div className="px-3 pb-2 flex-shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Active Role</p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveRole(null)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-all',
                  !activeRole ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                All
              </button>
              {userRoles.map(role => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role === activeRole ? null : role)}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-all capitalize',
                    activeRole === role ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {role.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
        {hasMultipleRoles && collapsed && (
          <div className="flex justify-center pb-2 flex-shrink-0">
            <button
              onClick={() => {
                // Cycle through roles on click in collapsed mode
                const idx = activeRole ? userRoles.indexOf(activeRole) : -1;
                const nextIdx = (idx + 1) % (userRoles.length + 1);
                setActiveRole(nextIdx === userRoles.length ? null : userRoles[nextIdx]);
              }}
              className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
              title={`Active: ${activeRole || 'All roles'}`}
            >
              {activeRole ? activeRole.charAt(0).toUpperCase() : '★'}
            </button>
          </div>
        )}

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
        <div className="space-y-3 py-2">
          {visibleSections.map((section) => (
            <div key={section.title} className={cn("px-3", collapsed ? "px-1" : "")}>
              {!collapsed && (
                <h3 className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      if (!item.disabled) navigate(item.href);
                    }}
                    className={cn(
                      'flex items-center justify-start gap-3 rounded-lg py-2 text-sm font-medium transition-all mx-auto',
                      collapsed ? 'w-2/3 justify-center px-0' : 'w-full px-3',
                      location === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-primary',
                      item.disabled && 'pointer-events-none opacity-50'
                    )}
                    disabled={item.disabled}
                    title={collapsed ? item.name : ''}
                  >
                    <item.icon className={cn("h-4 w-4", collapsed ? "h-5 w-5" : "")} />
                    {!collapsed && item.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
