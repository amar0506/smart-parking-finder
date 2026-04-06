import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import MapView from "@/pages/map";
import Booking from "@/pages/booking";
import MyBookings from "@/pages/my-bookings";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/map">
        <ProtectedRoute>
          <Layout>
            <MapView />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/booking/:slotId">
        <ProtectedRoute>
          <Layout>
            <Booking />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/my-bookings">
        <ProtectedRoute>
          <Layout>
            <MyBookings />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <ProtectedRoute>
          <Layout>
            <Admin />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route>
        <Layout>
          <NotFound />
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
