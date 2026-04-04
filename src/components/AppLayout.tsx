import { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { SideNav } from "./SideNav";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 1280;
    return true;
  });

  const handleCollapse = (isCollapsed: boolean) => {
    setCollapsed(isCollapsed);
  };

  return (
    <div className="flex h-screen flex-col overflow-auto scroll-smooth scrollbar-hide">
      <Navbar />
      <div className="flex flex-1 scrollbar-hide">
        {/* Sidebar for desktop — always visible */}
        <aside className={cn("hidden border-r bg-muted/40 md:block transition-all duration-300", collapsed ? "w-20" : "w-64")}>
          <SideNav className="w-full" onCollapse={handleCollapse} />
        </aside>

        {/* Mobile sidebar via Sheet */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed bottom-4 left-4 z-50 md:hidden rounded-full shadow-lg bg-primary text-primary-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SideNav onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}