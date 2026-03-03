import { Navigate } from "react-router-dom";
import useAuthStore from "../../context/useAuthStore";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If not logged in, redirect to the root (which we now mapped to Login)
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;