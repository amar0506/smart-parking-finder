import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/hooks/use-auth";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { LayoutDashboard, Map as MapIcon, History, ShieldAlert, LogOut, Car } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const { data: user } = useGetMe({
    query: {
      retry: false,
    }
  });
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/map", label: "Map View", icon: MapIcon },
    { href: "/my-bookings", label: "My Bookings", icon: History },
  ];

  if (user?.role === "admin") {
    navItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 text-primary font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
            <Car size={20} />
          </div>
          SmartPark
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="md:hidden bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
            <Car size={14} />
          </div>
          SmartPark
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut size={16} />
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden bg-card border-t border-border fixed bottom-0 w-full flex items-center justify-around p-2 pb-safe z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 rounded-lg ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon size={20} className="mb-1" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
