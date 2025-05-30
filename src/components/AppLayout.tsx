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
      <Navbar />

      <div className="flex flex-1 scrollbar-hide">
        {/* Sidebar for desktop */}
        {showNavigation && (
          <aside className={cn("hidden border-r bg-muted/40 md:block ",collapsed ? "w-20" : "w-64")}>
            <SideNav className="w-full" onCollapse={handleCollapse}  />
          </aside>
        )}

{/* <div className="flex flex-1 relative "> */}
        {/* Sidebar for desktop */}
        {/* {showNavigation && (
          <aside 
            className={cn(
              "h-full hidden border-r bg-white transition-all duration-300 ease-in-out md:block absolute top-0 left-0 z-30",
              collapsed ? "w-20" : "w-64"
            )}
          >
            <SideNav
              className="h-full"
              onCollapse={handleCollapse} 
            />
          </aside>
        )} */}

        {/* Mobile sheet navigation */}
        {showNavigation && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden absolute left-4 top-20 z-20">
              <Button variant="outline" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 pt-10">
              <SideNav onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        )}

        {/* Main content */}
        <main className={cn("flex-1 container", showNavigation ? "md:ml-0" : "")}>
          {children}
        </main>
      </div>
    </div>
  );
}