import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ToastProvider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CreateTournament from "@/pages/CreateTournament";
import ViewTournament from "@/pages/ViewTournament";
import ParticipantsPage from "@/pages/ParticipantsPage";
import ParticipantDetailsPage from "@/pages/ParticipantDetailsPage";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import StatisticsPage from "@/pages/StatisticsPage";
import SettingsPage from "@/pages/SettingsPage";
import LiveFeedPage from "@/pages/LiveFeedPage";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import LogoutPage from "@/pages/LogoutPage";
import GuestPage from "@/pages/GuestPage";
import PublicTournamentPage from "@/pages/PublicTournamentPage";
import PlayerRegistrationPage from "@/pages/PlayerRegistrationPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import WeightCategoriesPage from "@/pages/WeightCategoriesPage";
import MatchOverviewPage from "@/pages/MatchOverviewPage";
import AdminAuditPage from "@/pages/AdminAuditPage";
import CoachRegistrationPage from "@/pages/CoachRegistrationPage";
import VerifyPage from "@/pages/VerifyPage";
import JuryPortalPage from "@/pages/JuryPortalPage";
import BoardPage from "@/pages/BoardPage";
import MatchDashboardPage from "@/pages/MatchDashboardPage";
import AdminTournamentPage from "@/pages/AdminTournamentPage";
import PlayersListPage from "@/pages/PlayersListPage";
import UnifiedUserManagementPage from "@/pages/UnifiedUserManagementPage";
import VerifierStatsPage from "@/pages/VerifierStatsPage";

function Router() {
  return (
    <>
      <Switch>
        {/* Public routes */}
        <Route path="/login">
          <LoginPage />
        </Route>
        <Route path="/forgot-password">
          <ForgotPasswordPage />
        </Route>
        <Route path="/logout">
          <LogoutPage />
        </Route>
        <Route path="/guest">
          <GuestPage />
        </Route>
        <Route path="/public-tournaments">
          <PublicTournamentPage />
        </Route>
        <Route path="/register">
          <PlayerRegistrationPage />
        </Route>
        <Route path="/register/:tournamentCode">
          <PlayerRegistrationPage />
        </Route>
        <Route path="/coach-register">
          <CoachRegistrationPage />
        </Route>
        <Route path="/coach-register/:tournamentCode">
          <CoachRegistrationPage />
        </Route>
        <Route path="/board">
          <BoardPage />
        </Route>

        {/* Protected routes */}
        <Route path="/">
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        </Route>
        <Route path="/create">
          <ProtectedRoute>
            <CreateTournament />
          </ProtectedRoute>
        </Route>
        <Route path="/view">
          <ProtectedRoute>
            <ViewTournament />
          </ProtectedRoute>
        </Route>
        <Route path="/participants">
          <ProtectedRoute>
            <ParticipantsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/participant/:name">
          <ProtectedRoute>
            <ParticipantDetailsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/statistics">
          <ProtectedRoute>
            <StatisticsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/announcements">
          <ProtectedRoute>
            <AnnouncementsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/live-feed">
          <ProtectedRoute>
            <LiveFeedPage />
          </ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/weight-categories">
          <ProtectedRoute>
            <WeightCategoriesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/match-overview">
          <ProtectedRoute>
            <MatchOverviewPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute>
            <UnifiedUserManagementPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/audit">
          <ProtectedRoute>
            <AdminAuditPage />
          </ProtectedRoute>
        </Route>
        <Route path="/verify">
          <ProtectedRoute>
            <VerifyPage />
          </ProtectedRoute>
        </Route>
        <Route path="/jury">
          <JuryPortalPage />
        </Route>
        <Route path="/match-dashboard">
          <ProtectedRoute>
            <MatchDashboardPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/tournaments">
          <ProtectedRoute>
            <AdminTournamentPage />
          </ProtectedRoute>
        </Route>
        <Route path="/players">
          <ProtectedRoute>
            <PlayersListPage />
          </ProtectedRoute>
        </Route>
        <Route path="/verifier-stats">
          <ProtectedRoute>
            <VerifierStatsPage />
          </ProtectedRoute>
        </Route>

        {/* 404 route */}
        <Route path="/:rest*">
          <NotFound />
        </Route>
      </Switch>
      
      {/* Global providers after routing */}
      <ToastProvider />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
