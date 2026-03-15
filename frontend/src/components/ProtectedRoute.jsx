import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLoader from "./AppLoader";

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <AppLoader />; 

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Allow multiple roles
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
