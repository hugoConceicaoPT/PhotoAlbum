// src/App.tsx
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import { stackClientApp } from "./scripts/stack";
import { StackHandler, StackProvider, StackTheme } from "@stackframe/react";
import Album from "./pages/Album";

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
          <Route path="/" element={<Home />} />
          <Route path="/Albums" element={<Album />} />
        </Routes>
      </StackTheme>
    </StackProvider>
  );
}

export default App;
