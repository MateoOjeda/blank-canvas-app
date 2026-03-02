import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import StudentsPage from "@/pages/trainer/StudentsPage";
import StudentDetailPage from "@/pages/trainer/StudentDetailPage";
import RoutinesPage from "@/pages/trainer/RoutinesPage";
import PlansPage from "@/pages/trainer/PlansPage";
import TrackingPage from "@/pages/trainer/TrackingPage";
import TodayRoutinePage from "@/pages/student/TodayRoutinePage";
import MyPlansPage from "@/pages/student/MyPlansPage";
import ProgressPage from "@/pages/student/ProgressPage";
import StudentFeedPage from "@/pages/student/StudentFeedPage";
import PersonalChangePage from "@/pages/student/PersonalChangePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={role === "trainer" ? "/trainer/students" : "/student/today"} replace />;
}

function AuthRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={role === "trainer" ? "/trainer/students" : "/student/today"} replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<AuthRedirect />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/trainer/students" element={<ProtectedRoute requiredRole="trainer"><StudentsPage /></ProtectedRoute>} />
              <Route path="/trainer/students/:studentId" element={<ProtectedRoute requiredRole="trainer"><StudentDetailPage /></ProtectedRoute>} />
              <Route path="/trainer/routines" element={<ProtectedRoute requiredRole="trainer"><RoutinesPage /></ProtectedRoute>} />
              <Route path="/trainer/plans" element={<ProtectedRoute requiredRole="trainer"><PlansPage /></ProtectedRoute>} />
              <Route path="/trainer/tracking" element={<ProtectedRoute requiredRole="trainer"><TrackingPage /></ProtectedRoute>} />
              <Route path="/student/feed" element={<ProtectedRoute requiredRole="student"><StudentFeedPage /></ProtectedRoute>} />
              <Route path="/student/today" element={<ProtectedRoute requiredRole="student"><TodayRoutinePage /></ProtectedRoute>} />
              <Route path="/student/plans" element={<ProtectedRoute requiredRole="student"><MyPlansPage /></ProtectedRoute>} />
              <Route path="/student/progress" element={<ProtectedRoute requiredRole="student"><ProgressPage /></ProtectedRoute>} />
              <Route path="/student/personal-change" element={<ProtectedRoute requiredRole="student"><PersonalChangePage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
