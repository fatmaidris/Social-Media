import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const { isAuthenticated, checkingSession } = useAuth();
  if (checkingSession) return <main className="boot-screen"><span className="brand-mark">C</span><p>Checking your session</p></main>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}