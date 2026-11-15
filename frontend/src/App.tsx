// src/App.tsx
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import { stackClientApp } from "./stack";
import { StackHandler, StackProvider, StackTheme } from "@stackframe/react";
import Album from "./pages/Album";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { RedirectIfSignedIn, RequireAuth } from "./auth/RequireAuth";
import ConsentGate from "./auth/ConsentGate";

function HandlerRoutes() {
  const location = useLocation();
  return (
    <StackHandler app={stackClientApp} location={location.pathname} fullPage />
  );
}

function App() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <Routes>
          <Route path="/*" element={<HandlerRoutes />} />
          <Route
            path="/"
            element={
              <ConsentGate>
                <Home />
              </ConsentGate>
            }
          />
          <Route
            path="/login"
            element={
              <RedirectIfSignedIn>
                <Login />
              </RedirectIfSignedIn>
            }
          />
          <Route
            path="/registar"
            element={
              <RedirectIfSignedIn>
                <Register />
              </RedirectIfSignedIn>
            }
          />
          <Route
            path="/Albums"
            element={
              <RequireAuth>
                <ConsentGate>
                  <Album />
                </ConsentGate>
              </RequireAuth>
            }
          />
        </Routes>
      </StackTheme>
    </StackProvider>
  );
}

export default App;
