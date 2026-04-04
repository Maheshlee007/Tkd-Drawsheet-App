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
  const userRoles = user?.roles ?? [];

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 1280;
    return true;
  });

  useEffect(() => {
    if (onCollapse) onCollapse(collapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Create Tournament', href: '/create', icon: Plus },
      ],
    },
    {
      title: 'Tournament',
      items: [
        { name: 'View Bracket', href: '/view', icon: ClipboardList, disabled: !bracketData },
        { name: 'Participants', href: '/participants', icon: Users, disabled: !bracketData },
        { name: 'Match Overview', href: '/match-overview', icon: BarChart3 },
        { name: 'Statistics', href: '/statistics', icon: BarChart2, disabled: !bracketData },
      ],
    },
    {
      title: 'Management',
      roles: ['admin', 'organizer'],
      items: [
        { name: 'Weight Categories', href: '/weight-categories', icon: Scale },
        { name: 'Jury Management', href: '/jury-management', icon: Shield },
      ],
    },
    {
      title: 'Registration',
      items: [
        { name: 'Player Registration', href: '/register', icon: UserPlus },
        { name: 'Coach Registration', href: '/coach-register', icon: UserCog },
      ],
    },
    {
      title: 'Portals',
      roles: ['admin', 'organizer', 'verification_officer', 'jury'],
      items: [
        { name: 'Check-in / Verify', href: '/verify', icon: QrCode },
        { name: 'Jury Portal', href: '/jury', icon: Gavel },
        { name: 'Live Board', href: '/board', icon: Monitor },
      ],
    },
    {
      title: 'Admin',
      roles: ['admin'],
      items: [
        { name: 'User Management', href: '/admin/users', icon: UserCog },
        { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
      ],
    },
    {
      title: 'Other',
      items: [
        { name: 'Announcements', href: '/announcements', icon: Megaphone },
        { name: 'Live Feed', href: '/live-feed', icon: RadioTower },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  // Filter sections by user roles
  const visibleSections = navSections.filter(section => {
    if (!section.roles) return true;
    if (userRoles.length === 0) return true; // show all if no roles set (dev mode)
    return section.roles.some(r => userRoles.includes(r));
  });

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

          <div className="space-y-4 py-4">
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
      'h-full transition-all duration-300 ease-in-out bg-white',
      collapsed ? 'w-20' : 'w-64',
      className
    )}>
      <div className="pb-12 h-full relative overflow-y-auto scrollbar-hide">
        {/* Collapse toggle */}
        <div className="flex justify-center items-center py-2">
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
  );
}
// Old desktop nav rendering removed — now handled by the role-based sections above
