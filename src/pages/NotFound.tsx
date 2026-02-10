import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stream-bg">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-stream-accent to-stream-highlight bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-xl text-muted-foreground mb-6">Page not found</p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-stream-accent hover:text-stream-highlight transition-colors"
        >
          <Home size={18} />
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
