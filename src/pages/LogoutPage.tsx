import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, LogIn, Shield } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const LogoutPage = () => {
  const [, navigate] = useLocation();
  const { logout, user } = useAuthStore();

  // Automatically logout when component mounts
  useEffect(() => {
    logout();
  }, [logout]);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Professional background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-slate-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-400/15 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 left-3/4 w-48 h-48 bg-slate-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Decorative bracket-themed elements */}
      <div className="absolute top-1/5 left-1/6 w-20 h-20 border-2 border-slate-300/30 rounded-lg rotate-12 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/6 w-16 h-16 border border-slate-400/25 rounded-full animate-pulse delay-500"></div>
      <div className="absolute top-1/2 right-1/4 text-slate-400/20 animate-pulse delay-700">
        <Shield className="w-12 h-12" />
      </div>

      <Card className="w-full max-w-md relative shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800">
              Successfully Logged Out
            </CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              You have been safely logged out of your account. Thank you for using Tournament Manager!
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700">
                <strong>Security Note:</strong> For your security, all session data has been cleared from this device.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleLoginRedirect}
                className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In Again
              </Button>

              <p className="text-xs text-slate-500">
                Need to access your tournaments? Sign in with your credentials.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Quick Actions:</p>
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = 'mailto:support@tournamentmanager.com'}
                  className="text-slate-600 hover:text-slate-800 border-slate-300 hover:border-slate-400"
                >
                  Contact Support
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.open('https://docs.tournamentmanager.com', '_blank')}
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                >
                  View Documentation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogoutPage;
