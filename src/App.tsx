import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { hasYoutubeOAuthToken } from "./services/youtubeService";
import { hasTwitchOAuthToken } from "./services/twitchService";
import Loading from "./components/Loading";
import { AlertService } from "./services/alertsService";
import AlertNotification from "./components/AlertNotification";

// Lazy load page components to improve startup time
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  
  useEffect(() => {
    const twitchAuth = hasTwitchOAuthToken();
    const youtubeAuth = hasYoutubeOAuthToken();
    setIsAuthed(twitchAuth || youtubeAuth);
    setIsChecking(false);
  }, []);
  
  // Show loading indicator instead of blank screen
  if (isChecking) {
    return <Loading isStartup={true} message="Verifying authentication..." />;
  }
  
  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }
  
  return <Suspense fallback={<Loading message="Loading application..." />}>{children}</Suspense>;
};

const App = () => {
  useEffect(() => {
    try {
      const alertService = AlertService.getInstance();
      alertService.initialize();
      return () => alertService.cleanup();
    } catch (error) {
      console.error('Failed to initialize alert service:', error);
    }
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AlertNotification />
      <Suspense fallback={<Loading isStartup={true} message="Loading StreamTTS..." />}>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </Suspense>
    </TooltipProvider>
  );
};

export default App;
