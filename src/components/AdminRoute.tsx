import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ backgroundColor: '#0f1115' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: '#d93a3a', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only roninonedigital@gmail.com is admin
  const isAdmin = user?.email?.toLowerCase() === 'roninonedigital@gmail.com';
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
