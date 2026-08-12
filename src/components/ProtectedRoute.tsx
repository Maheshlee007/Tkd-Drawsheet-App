import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocation, Redirect } from 'wouter';
import { AppLayout } from '@/components/AppLayout';
import { ToastProvider } from '@/components/ToastProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When set, the user must hold at least one of these roles (server remains authoritative) */
  roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const user = useAuthStore((state) => state.user);
  const [location] = useLocation();

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to redirect them back to the original page
    // after a successful login.
    return <Redirect to={`/login?redirect=${location}`} />;
  }

  // Client-side role gate (defence in depth — backend RBAC is the real guard)
  if (roles && roles.length > 0) {
    const userRoles = (user?.roles ?? []).map((r) => r.toLowerCase());
    const allowed = roles.some((r) => userRoles.includes(r.toLowerCase()));
    if (!allowed) {
      return (
        <AppLayout>
          <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
            <div>
              <h1 className="text-xl font-semibold">Access denied</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Your account does not have permission to view this page.
              </p>
            </div>
          </div>
        </AppLayout>
      );
    }
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
