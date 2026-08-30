import { createHashRouter, Outlet } from "react-router-dom";
import { KidLayout, ManifestProvider } from "./context/KidContext";
import { ErrorScreen } from "./components/ErrorScreen";
import { KidPicker } from "./pages/KidPicker";
import { KidHome } from "./pages/KidHome";
import { Shootout } from "./pages/modes/Shootout";
import { Scramble } from "./pages/modes/Scramble";
import { MissingLetters } from "./pages/modes/MissingLetters";
import { Practice } from "./pages/modes/Practice";

function Root() {
  return (
    <ManifestProvider>
      <div className="app-shell">
        <Outlet />
      </div>
    </ManifestProvider>
  );
}

// HashRouter: deep links and refreshes work on GitHub Pages without a 404 shim.
export const router = createHashRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorScreen />,
    children: [
      { index: true, element: <KidPicker /> },
      {
        path: "kid/:kidId",
        element: <KidLayout />,
        children: [
          { index: true, element: <KidHome /> },
          { path: "shootout", element: <Shootout /> },
          { path: "scramble", element: <Scramble /> },
          { path: "missing", element: <MissingLetters /> },
          { path: "practice", element: <Practice /> },
        ],
      },
    ],
  },
]);
