import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import { ToastProvider } from "@/components/ToastProvider";
import { AppLayout } from "@/components/AppLayout";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/">
          {(params) => <Home />}
        </Route>
        <Route path="/create">
          {(params) => <CreateTournament />}
        </Route>
        <Route path="/view">
          {(params) => <ViewTournament />}
        </Route>
        <Route path="/participants">
          {(params) => <ParticipantsPage />}
        </Route>
        <Route path="/participant/:name">
          {(params) => <ParticipantDetailsPage />}
        </Route>
        <Route path="/statistics">
          {(params) => <StatisticsPage />}
        </Route>
        <Route path="/announcements">
          {(params) => <AnnouncementsPage />}
        </Route>        <Route path="/live-feed">
          {(params) => <LiveFeedPage />}          
        </Route>
        <Route path="/settings">
          {(params) => <SettingsPage />}
        </Route>
        <Route path="/:rest*">
          {(params) => <NotFound />}
        </Route>
      </Switch>
    </AppLayout>    
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
      <ToastProvider />
    </QueryClientProvider>
  );
}

export default App;
