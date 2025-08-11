import { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { SideNav } from "./SideNav";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  
  const [collapsed, setCollapsed] = useState(true);
  
  // Don't show the navigation on the initial home page
  const showNavigation = location !== "/";

  // Listen for collapse state changes from SideNav
  const handleCollapse = (isCollapsed: boolean) => {
    setCollapsed(isCollapsed);
  };
  return (
    <div className="flex h-screen flex-col overflow-auto scroll-smooth scrollbar-hide">
      <Navbar />      <div className="flex flex-1 scrollbar-hide">
        {/* Sidebar for desktop */}
        {showNavigation && (
          <aside className={cn("hidden border-r bg-muted/40 md:block ",collapsed ? "w-20" : "w-64")}>
            <SideNav className="w-full" onCollapse={handleCollapse}  />
          </aside>
        )}

        {/* Mobile sheet navigation - REMOVED since navigation is now consolidated in Navbar */}
        
        {/* Main content */}
        <main className={cn("flex-1 container", showNavigation ? "md:ml-0" : "")}>
          {children}
        </main>
      </div>
    </div>
  );
}