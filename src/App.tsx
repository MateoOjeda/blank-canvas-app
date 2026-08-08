import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { PageLoader } from "@/components/PageLoader";

const AuthPage = lazy(() => import("@/pages/AuthPage"));
const StudentsPage = lazy(() => import("@/pages/trainer/StudentsPage"));
const StudentDetailPage = lazy(() => import("@/pages/trainer/StudentDetailPage"));
const RoutinesPage = lazy(() => import("@/pages/trainer/RoutinesPage"));
const PlansPage = lazy(() => import("@/pages/trainer/PlansPage"));
const TrackingPage = lazy(() => import("@/pages/trainer/TrackingPage"));
const NotificationsPage = lazy(() => import("@/pages/trainer/NotificationsPage"));
const TrainingGroupsPage = lazy(() => import("@/pages/trainer/TrainingGroupsPage"));
const TrainerSurveysPage = lazy(() => import("@/pages/trainer/TrainerSurveysPage"));

const MyPlansPage = lazy(() => import("@/pages/student/MyPlansPage"));
const ProgressPage = lazy(() => import("@/pages/student/ProgressPage"));
const StudentFeedPage = lazy(() => import("@/pages/student/StudentFeedPage"));
const StudentRoutinesPage = lazy(() => import("@/pages/student/StudentRoutinesPage"));
const StudentDashboardPage = lazy(() => import("@/pages/student/StudentDashboardPage"));
const PersonalChangePage = lazy(() => import("@/pages/student/PersonalChangePage"));
const TransformationPage = lazy(() => import("@/pages/student/TransformationPage"));
const StudentMealsPage = lazy(() => import("@/pages/student/StudentMealsPage"));
const StudentProgressPage = lazy(() => import("@/pages/student/StudentProgressPage"));

const PublicStudentView = lazy(() => import("@/pages/PublicStudentView"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false, // Avoid refetching on window focus
      refetchOnMount: true,
      retry: 2,
    },
  },
});

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={role === "trainer" ? "/trainer/students" : "/student/home"} replace />;
}

function AuthRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={role === "trainer" ? "/trainer/students" : "/student/home"} replace />;
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthPage />
    </Suspense>
  );
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
              <Route path="/trainer/students" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><StudentsPage /></Suspense></ProtectedRoute>} />
              <Route path="/trainer/students/:studentId" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><StudentDetailPage /></Suspense></ProtectedRoute>} />
              <Route path="/trainer/routines" element={<Navigate to="/trainer/groups" replace />} />
              <Route path="/trainer/routines/:studentId" element={<Navigate to="/trainer/groups" replace />} />
              <Route path="/trainer/routines/group/:groupId" element={<Navigate to="/trainer/groups" replace />} />
              <Route path="/trainer/groups/:groupId/routine" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><RoutinesPage /></Suspense></ProtectedRoute>} />
              <Route path="/trainer/groups/student/:studentId/routine" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><RoutinesPage /></Suspense></ProtectedRoute>} />
              <Route path="/trainer/plans" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><PlansPage /></Suspense></ProtectedRoute>} />
              <Route path="/trainer/tracking" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><TrackingPage /></Suspense></ProtectedRoute>} />
              <Route path="/trainer/notifications" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense></ProtectedRoute>} />
              <Route path="/trainer/groups" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><TrainingGroupsPage /></Suspense></ProtectedRoute>} />
              <Route path="/trainer/surveys" element={<ProtectedRoute requiredRole="trainer"><Suspense fallback={<PageLoader />}><TrainerSurveysPage /></Suspense></ProtectedRoute>} />

              <Route path="/student/home" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><StudentDashboardPage /></Suspense></ProtectedRoute>} />
              <Route path="/student/feed" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><StudentFeedPage /></Suspense></ProtectedRoute>} />
              <Route path="/student/routines" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><StudentRoutinesPage /></Suspense></ProtectedRoute>} />
              <Route path="/student/plans" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><MyPlansPage /></Suspense></ProtectedRoute>} />
              <Route path="/student/progress" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><ProgressPage /></Suspense></ProtectedRoute>} />
              <Route path="/student/personal-change" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><PersonalChangePage /></Suspense></ProtectedRoute>} />
              <Route path="/student/transformation" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><TransformationPage /></Suspense></ProtectedRoute>} />
              <Route path="/student/meals" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><StudentMealsPage /></Suspense></ProtectedRoute>} />
              <Route path="/student/my-progress" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><StudentProgressPage /></Suspense></ProtectedRoute>} />
            </Route>
            <Route path="/view/:studentId" element={<Suspense fallback={<PageLoader />}><PublicStudentView /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;