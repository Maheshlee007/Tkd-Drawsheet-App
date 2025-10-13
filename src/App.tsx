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
import LogoutPage from "@/pages/LogoutPage";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  return (
    <>
      <Switch>
        {/* Public routes */}
        <Route path="/login">
          <LoginPage />
        </Route>
        <Route path="/logout">
          <LogoutPage />
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
