import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import RoleGuard from "./components/layout/RoleGuard";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";


// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import ProfilePage from "./pages/student/ProfilePage";
import SlotsPage from "./pages/student/SlotsPage";
import BookingsPage from "./pages/student/BookingsPage";
import WalletPage from "./pages/student/WalletPage";
import ComplaintsPage from "./pages/student/ComplaintsPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminSlotsPage from "./pages/admin/AdminSlotsPage";
import AdminComplaintsPage from "./pages/admin/AdminComplaintsPage";
import AdminPenaltiesPage from "./pages/admin/AdminPenaltiesPage";
import AdminSuspendedPage from "./pages/admin/AdminSuspendedPage";
import AdminStaffPage from "./pages/admin/AdminStaffPage";
import AdminSearchPage from "./pages/admin/AdminSearchPage";

// Security pages
import SecurityDashboard from "./pages/security/SecurityDashboard";
import SecuritySearchPage from "./pages/security/SecuritySearchPage";
import SecurityWalkinPage from "./pages/security/SecurityWalkinPage";
import SecurityComplaintsPage from "./pages/security/SecurityComplaintsPage";
import SecurityEPSSPage from "./pages/security/SecurityEPSSPage";

// Cashier pages
import CashierDashboard from "./pages/cashier/CashierDashboard";
import CashierTopupPage from "./pages/cashier/CashierTopupPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          

          {/* Student routes */}
          <Route path="/dashboard" element={<RoleGuard allowedRoles={['student']}><StudentDashboard /></RoleGuard>} />
          <Route path="/profile" element={<RoleGuard allowedRoles={['student']}><ProfilePage /></RoleGuard>} />
          <Route path="/slots" element={<RoleGuard allowedRoles={['student']}><SlotsPage /></RoleGuard>} />
          <Route path="/bookings" element={<RoleGuard allowedRoles={['student']}><BookingsPage /></RoleGuard>} />
          <Route path="/wallet" element={<RoleGuard allowedRoles={['student']}><WalletPage /></RoleGuard>} />
          <Route path="/complaints" element={<RoleGuard allowedRoles={['student']}><ComplaintsPage /></RoleGuard>} />

          {/* Admin routes */}
          <Route path="/admin" element={<RoleGuard allowedRoles={['super_admin']}><AdminDashboard /></RoleGuard>} />
          <Route path="/admin/users" element={<RoleGuard allowedRoles={['super_admin']}><AdminUsersPage /></RoleGuard>} />
          <Route path="/admin/slots" element={<RoleGuard allowedRoles={['super_admin']}><AdminSlotsPage /></RoleGuard>} />
          <Route path="/admin/complaints" element={<RoleGuard allowedRoles={['super_admin']}><AdminComplaintsPage /></RoleGuard>} />
          <Route path="/admin/penalties" element={<RoleGuard allowedRoles={['super_admin']}><AdminPenaltiesPage /></RoleGuard>} />
          <Route path="/admin/suspended" element={<RoleGuard allowedRoles={['super_admin']}><AdminSuspendedPage /></RoleGuard>} />
          <Route path="/admin/staff" element={<RoleGuard allowedRoles={['super_admin']}><AdminStaffPage /></RoleGuard>} />
          <Route path="/admin/search" element={<RoleGuard allowedRoles={['super_admin']}><AdminSearchPage /></RoleGuard>} />

          {/* Security routes */}
          <Route path="/security" element={<RoleGuard allowedRoles={['security']}><SecurityDashboard /></RoleGuard>} />
          <Route path="/security/search" element={<RoleGuard allowedRoles={['security']}><SecuritySearchPage /></RoleGuard>} />
          <Route path="/security/walkin" element={<RoleGuard allowedRoles={['security']}><SecurityWalkinPage /></RoleGuard>} />
          <Route path="/security/complaints" element={<RoleGuard allowedRoles={['security']}><SecurityComplaintsPage /></RoleGuard>} />
          <Route path="/security/epss" element={<RoleGuard allowedRoles={['security']}><SecurityEPSSPage /></RoleGuard>} />

          {/* Cashier routes */}
          <Route path="/cashier" element={<RoleGuard allowedRoles={['cashier']}><CashierDashboard /></RoleGuard>} />
          <Route path="/cashier/topup" element={<RoleGuard allowedRoles={['cashier']}><CashierTopupPage /></RoleGuard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
