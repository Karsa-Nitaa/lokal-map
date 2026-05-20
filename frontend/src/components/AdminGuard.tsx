import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Wraps admin routes. If the user is not authenticated they are sent to
 * /admin/login. While the session is still loading a blank screen is shown
 * so we don't flash the login page for already-logged-in users.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
}
