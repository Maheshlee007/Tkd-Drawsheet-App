import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  FileText, 
  Home, 
  Users, 
  Award, 
  Megaphone, 
  BarChart2, 
  ClipboardList,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTournamentStore } from '@/store/useTournamentStore';
import { Button } from './ui/button';

type SideNavProps = {
  className?: string;
  onClose?: () => void;
  onCollapse?: (isCollapsed: boolean) => void;
};

export function SideNav({ className, onClose, onCollapse }: SideNavProps) {
  const [location, navigate] = useLocation();
  const bracketData = useTournamentStore((state) => state.bracketData);
  const [collapsed, setCollapsed] = useState(true);
  // Keep isOpen state for mobile only
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
    },
    {
      name: 'View Tournament',
      href: '/view',
      icon: ClipboardList,
      disabled: !bracketData,
    },
    {
      name: 'Participants',
      href: '/participants',
      icon: Users,
      disabled: !bracketData,
    },
    {
      name: 'Statistics',
      href: '/statistics',
      icon: BarChart2,
      disabled: !bracketData,
    },
    {
      name: 'Announcements',
      href: '/announcements',
      icon: Megaphone,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const toggleCollapsed = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    // Notify parent component of collapse state change
    if (onCollapse) {
      onCollapse(newCollapsed);
    }
  };

  // Listen for route changes to close the menu on mobile
  useEffect(() => {
    if (isOpen && onClose) {
      setIsOpen(false);
    }
  }, [location]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // For mobile version (in a sheet), we'll use a different approach
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
            <div className="px-3 py-2">
              <h2 className="mb-4 px-4 text-lg font-semibold tracking-tight text-slate-800 border-b border-slate-200 py-2">
                Tournament Menu
              </h2>
              <div className="space-y-1">
                {navItems.map((item) => (
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
          </div>
        </div>
      </div>
    );
  }

  // For desktop version, we'll use this approach
  return (
    <div className={cn(
      'h-full transition-all duration-300 ease-in-out bg-white',
      collapsed ? 'w-20' : 'w-64', // Fixed width based on collapsed state
      className
    )}>
      <div className=" pb-12 h-full relative ">
        {/* Collapsible toggle button */}
        <div className="flex justify-center right-2 top-2 z-20 py-2">
        {!collapsed && (
              <h2 className="mb-4 px-4 text-lg font-semibold tracking-tight text-slate-800 border-b border-slate-200 py-2">
                Tournament Menu
              </h2>
            )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCollapsed}
            className="transition-all duration-300 hover:bg-slate-100 rounded-full"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-slate-600" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            )}
            <span className="sr-only">{collapsed ? 'Expand' : 'Collapse'}</span>
          </Button>
        </div>

        <div className="space-y-4 py-2">
          <div className={cn("px-3 py-2", collapsed ? "px-0" : "")}>
            
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    if (!item.disabled) {
                      navigate(item.href);
                    }
                  }}
                  className={cn(
                    ' flex items-center justify-start gap-3 rounded-lg py-2 text-sm font-medium transition-all mx-auto',
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
        </div>
      </div>
    </div>
  );
}