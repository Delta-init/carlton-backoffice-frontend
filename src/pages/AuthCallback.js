import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { processGoogleSession } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace("#", ""));
        const sessionId = params.get("session_id");

        if (!sessionId) {
          toast.error("No session ID found");
          navigate("/login");
          return;
        }

        await processGoogleSession(sessionId);
        toast.success("Login successful");

        // Clear the hash and navigate to dashboard
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/dashboard", { replace: true });
      } catch (error) {
        toast.error(error?.message || "Something went wrong. Please try again.");
        navigate("/login");
      }
    };

    processAuth();
  }, [navigate, processGoogleSession]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1FA21B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#C5C6C7]">Completing authentication...</p>
      </div>
    </div>
  );
}
