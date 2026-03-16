import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Car, LayoutDashboard, User, Wallet, CalendarCheck, AlertTriangle,
  Shield, Search, UserPlus, LogOut, Menu, X, ParkingCircle, Users,
  DollarSign, Ban, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ParkAIChat from '@/components/ParkAI/ParkAIChat';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Book Slot', path: '/slots', icon: <ParkingCircle className="h-5 w-5" /> },
  { label: 'My Bookings', path: '/bookings', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Wallet', path: '/wallet', icon: <Wallet className="h-5 w-5" /> },
  { label: 'Complaints', path: '/complaints', icon: <AlertTriangle className="h-5 w-5" /> },
  { label: 'Profile', path: '/profile', icon: <User className="h-5 w-5" /> },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Users', path: '/admin/users', icon: <Users className="h-5 w-5" /> },
  { label: 'Search Vehicle', path: '/admin/search', icon: <Search className="h-5 w-5" /> },
  { label: 'Parking Slots', path: '/admin/slots', icon: <ParkingCircle className="h-5 w-5" /> },
  { label: 'Complaints', path: '/admin/complaints', icon: <AlertTriangle className="h-5 w-5" /> },
  { label: 'Penalties', path: '/admin/penalties', icon: <Ban className="h-5 w-5" /> },
  { label: 'Suspended', path: '/admin/suspended', icon: <Ban className="h-5 w-5" /> },
  { label: 'Staff', path: '/admin/staff', icon: <Shield className="h-5 w-5" /> },
];

const securityNav: NavItem[] = [
  { label: 'Dashboard', path: '/security', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Search Vehicle', path: '/security/search', icon: <Search className="h-5 w-5" /> },
  { label: 'Walk-in Booking', path: '/security/walkin', icon: <UserPlus className="h-5 w-5" /> },
  { label: 'Complaints', path: '/security/complaints', icon: <AlertTriangle className="h-5 w-5" /> },
  { label: 'EPSS', path: '/security/epss', icon: <Shield className="h-5 w-5" /> },
];

const cashierNav: NavItem[] = [
  { label: 'Dashboard', path: '/cashier', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Top Up', path: '/cashier/topup', icon: <DollarSign className="h-5 w-5" /> },
];

const roleNavMap: Record<string, NavItem[]> = {
  student: studentNav,
  super_admin: adminNav,
  security: securityNav,
  cashier: cashierNav,
};

const roleLabelMap: Record<string, string> = {
  student: 'Student',
  super_admin: 'Super Admin',
  security: 'Security',
  cashier: 'Cashier',
};

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const { user, role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = roleNavMap[role || 'student'] || studentNav;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <Car className="h-8 w-8 text-sidebar-primary" />
          <div>
            <h1 className="text-lg font-heading font-bold text-sidebar-foreground">N Park</h1>
            <p className="text-xs text-sidebar-foreground/60">{roleLabelMap[role || 'student']}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {item.icon}
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm">
              {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{profile?.name || 'User'}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.student_id || role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center px-4 md:px-6 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* ParkAI Floating Chat */}
      <ParkAIChat />
    </div>
  );
}
