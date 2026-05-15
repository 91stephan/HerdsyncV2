import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PawPrint,
  GitBranch,
  Stethoscope,
  BarChart3,
  FileText,
  Users,
  LogOut,
  Settings,
  ClipboardList,
  AlertTriangle,
  Activity,
  Scan,
  UserCog,
  BookOpen,
  Shuffle,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { PageProgressBar } from "@/components/PageProgressBar";
import { NotificationBell } from "@/components/NotificationBell";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Operations",
    items: [
      { name: "Dashboard",          href: "/dashboard",         icon: LayoutDashboard },
      { name: "Livestock Registry", href: "/livestock",         icon: PawPrint },
      { name: "Farmers Registry",   href: "/farmers",           icon: Users },
      { name: "Breeding Records",   href: "/breeding",          icon: GitBranch },
      { name: "Culling & Exchange", href: "/culling-exchange",  icon: Shuffle },
    ],
  },
  {
    label: "Analytics",
    items: [
      { name: "Genetic Indices",       href: "/breeding-dashboard",    icon: BarChart3,  roles: ["system_admin","center_manager","district_officer"] },
      { name: "Reproductive Indices",  href: "/reproductive-indices",  icon: Activity,   roles: ["system_admin","center_manager","district_officer"] },
    ],
  },
  {
    label: "Health & Compliance",
    items: [
      { name: "Health Records",     href: "/health",                icon: Stethoscope },
      { name: "WOAH Disease Reports", href: "/woah-reports",       icon: AlertTriangle },
      { name: "Document Vault",     href: "/compliance/documents",  icon: FileText },
    ],
  },
  {
    label: "Field Tools",
    items: [
      { name: "RFID Settings",   href: "/rfid-settings",  icon: Scan },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Task Management",   href: "/tasks",         icon: ClipboardList,  roles: ["system_admin","center_manager","district_officer"] },
      { name: "User Management",   href: "/users",         icon: UserCog,        roles: ["system_admin"] },
      { name: "Audit Log",         href: "/audit",         icon: ShieldCheck,    roles: ["system_admin"] },
      { name: "Settings",          href: "/settings",      icon: Settings },
    ],
  },
];

const allNavPaths = navSections.flatMap((s) => s.items.map((i) => i.href));

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, role } = useProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showBackButton = !allNavPaths.includes(location.pathname);

  const navRef = useRef<HTMLElement>(null);
  const scrollPositionRef = useRef(0);

  useLayoutEffect(() => {
    if (navRef.current) {
      requestAnimationFrame(() => {
        if (navRef.current) navRef.current.scrollTop = scrollPositionRef.current;
      });
    }
  }, [location.pathname]);

  const handleNavClick = () => {
    if (navRef.current) scrollPositionRef.current = navRef.current.scrollTop;
    setSidebarOpen(false);
  };

  const isVisible = (item: NavItem) => {
    if (!item.roles) return true;
    return role ? item.roles.includes(role) : false;
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <PageProgressBar />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:transform-none overflow-hidden pt-[env(safe-area-inset-top)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <Link
            to={user ? "/dashboard" : "/"}
            className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border flex-shrink-0 hover:bg-sidebar-accent/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-sidebar-foreground leading-tight">HerdSync V2</h1>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">National Breeding System</p>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSidebarOpen(false); }}
              className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </Link>

          {/* Nav sections */}
          <nav ref={navRef} className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
            {navSections.map((section) => {
              const visibleItems = section.items.filter(isVisible);
              if (visibleItems.length === 0) return null;
              return (
                <div key={section.label}>
                  <p className="px-3 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-1">
                    {section.label}
                  </p>
                  {visibleItems.map((item) => {
                    const active = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={handleNavClick}
                        className={cn("sidebar-nav-item", active && "active")}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="px-4 py-3 border-t border-sidebar-border flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-sidebar-foreground">
                    {(profile?.full_name ?? user.email ?? "??").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {profile?.full_name ?? user.email}
                  </p>
                  {role && (
                    <p className="text-[10px] text-sidebar-foreground/60 capitalize">
                      {role.replace(/_/g, " ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-sidebar-primary text-sidebar-primary-foreground rounded-lg text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-card border-b border-border pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 flex-1">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-bold text-base">HerdSync V2</span>
          </Link>
          {user && <NotificationBell />}
        </header>

        {/* Sync status bar */}
        <SyncStatusBar />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="hidden lg:flex justify-end mb-2">
              {user && <NotificationBell />}
            </div>
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <PageErrorBoundary resetKey={location.pathname}>
              {children}
            </PageErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
