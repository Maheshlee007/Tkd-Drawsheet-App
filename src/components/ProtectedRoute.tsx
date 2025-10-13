import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocation, Redirect } from 'wouter';
import { AppLayout } from '@/components/AppLayout';
import { ToastProvider } from '@/components/ToastProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const [location] = useLocation();

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to redirect them back to the original page
    // after a successful login.
    return <Redirect to={`/login?redirect=${location}`} />;
  }

  return (
    <>
      <AppLayout>
        {children}
      </AppLayout>
      <ToastProvider />
    </>
  );
};

export default ProtectedRoute;
