import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RedirectIfSignedIn, RequireAuth } from "./RequireAuth";
import { makeUser, session } from "../test/sessionMock";

vi.mock("./session", async () => (await import("../test/sessionMock")).sessionMock);

function renderRoutes(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfSignedIn>
              <p>Ecrã de login</p>
            </RedirectIfSignedIn>
          }
        />
        <Route path="/" element={<p>Página inicial</p>} />
        <Route
          path="/Albums"
          element={
            <RequireAuth>
              <p>Os teus álbuns</p>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("route guards", () => {
  beforeEach(() => {
    session.user = null;
  });

  it("sends a signed-out visitor from a protected page to /login", () => {
    renderRoutes("/Albums");
    expect(screen.getByText("Ecrã de login")).toBeInTheDocument();
    expect(screen.queryByText("Os teus álbuns")).not.toBeInTheDocument();
  });

  it("renders the protected page for a signed-in user", () => {
    session.user = makeUser();
    renderRoutes("/Albums");
    expect(screen.getByText("Os teus álbuns")).toBeInTheDocument();
  });

  it("sends a signed-in user from /login to Home (not /Albums)", () => {
    session.user = makeUser();
    renderRoutes("/login");
    expect(screen.getByText("Página inicial")).toBeInTheDocument();
    expect(screen.queryByText("Os teus álbuns")).not.toBeInTheDocument();
    expect(screen.queryByText("Ecrã de login")).not.toBeInTheDocument();
  });
});
