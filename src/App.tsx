import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { hasYoutubeOAuthToken, validateToken as validateYoutubeToken } from "./services/youtubeService";
import { hasTwitchOAuthToken } from "./services/twitchService";
import Loading from "./components/Loading";
import { AlertService } from "./services/alertsService";
import AlertNotification from "./components/AlertNotification";

// Lazy load page components to improve startup time
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Initialize QueryClient with better performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
    },
  },
});

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  
  useEffect(() => {
    // Check auth state
    const twitchAuth = hasTwitchOAuthToken();
    const youtubeAuth = hasYoutubeOAuthToken();
    
    // Simplified auth validation - just check if tokens exist
    const validateAuth = async () => {
      try {
        const startTime = performance.now();
        console.log('Validating authentication...');
        
        // Validate YouTube token if present
        let validYoutubeAuth = youtubeAuth;
        if (validYoutubeAuth) {
          const token = localStorage.getItem('youtube_oauth_token');
          if (token) {
            try {
              const isValid = await validateYoutubeToken(token);
              if (!isValid) {
                console.warn('YouTube token validation failed on startup');
                localStorage.removeItem('youtube_oauth_token');
                validYoutubeAuth = false;
              } else {
                console.log('YouTube token validated successfully');
              }
            } catch (err) {
              console.error('Error validating YouTube token:', err);
              localStorage.removeItem('youtube_oauth_token');
              validYoutubeAuth = false;
            }
          }
        }
        
        const authed = twitchAuth || validYoutubeAuth;
        setIsAuthed(authed);
        setIsChecking(false);
        
        const endTime = performance.now();
        console.log(`Authentication validated in ${(endTime - startTime).toFixed(2)}ms. Authenticated: ${authed}`);
      } catch (error) {
        console.error('Unexpected error during auth validation:', error);
        setIsAuthed(twitchAuth || youtubeAuth);
        setIsChecking(false);
      }
    };
    
    validateAuth();
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
      console.log('Initializing alert service...');
      const alertService = AlertService.getInstance();
      alertService.initialize();
      console.log('Alert service initialized successfully');
      return () => alertService.cleanup();
    } catch (error) {
      console.error('Failed to initialize alert service:', error);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
};

export default App;
