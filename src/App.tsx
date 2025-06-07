import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { hasYoutubeOAuthToken, validateToken as validateYoutubeToken } from "./services/youtubeService";
import { hasTwitchOAuthToken } from "./services/twitchService";
import Loading from "./components/Loading";

// Lazy load page components to improve startup time
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Initialize QueryClient with better performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1, // Only retry once
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
    
    // Reset demo mode on startup
    if (!twitchAuth && !youtubeAuth) {
      localStorage.removeItem('youtube_demo_mode');
    }
    
    // Async validation of YouTube token if present
    const validateAuth = async () => {
      try {
        const startTime = performance.now();
        console.log('Validating authentication...');
        
        // Use mutable variables to track auth state
        let validTwitchAuth = twitchAuth;
        let validYoutubeAuth = youtubeAuth;
        
        if (validYoutubeAuth) {
          const token = localStorage.getItem('youtube_oauth_token');
          if (token) {
            try {
              // Validate YouTube token in background
              console.log('Validating YouTube token...');
              const isValid = await validateYoutubeToken(token);
              if (!isValid) {
                console.warn('YouTube token validation failed on startup');
                // Clear YouTube token if invalid to prevent auth issues
                localStorage.removeItem('youtube_oauth_token');
                validYoutubeAuth = false;
              } else {
                console.log('YouTube token validated successfully');
              }
            } catch (err) {
              console.error('Error validating YouTube token:', err);
              // On error, consider the token invalid
              localStorage.removeItem('youtube_oauth_token');
              validYoutubeAuth = false;
            }
          }
        }
        
        const authed = validTwitchAuth || validYoutubeAuth;
        setIsAuthed(authed);
        setIsChecking(false);
        
        const endTime = performance.now();
        console.log(`Authentication validated in ${(endTime - startTime).toFixed(2)}ms. Authenticated: ${authed}`);
      } catch (error) {
        console.error('Unexpected error during auth validation:', error);
        // On unexpected error, fall back to local token check
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Suspense fallback={<Loading isStartup={true} message="Loading RusEcho..." />}>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </Suspense>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
