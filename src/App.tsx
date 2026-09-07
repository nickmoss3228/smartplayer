import './i18n';
import { ReactNode, Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import Homepage from "./pages/Homepage";
// Eager, unlike the lazy routes below. It is a handful of elements, and a 404
// that has to fetch its own chunk before it can say it is a 404 spends a
// network round-trip to display an error.
import NotFound from "./pages/NotFound";
import { Provider } from "react-redux";
import { store } from "./store/store";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProgressProvider } from "./context/ProgressContext";
import { ProfileProvider } from './context/ProfileContext';
import { WalletProvider } from './context/WalletContext';
import { CharacterProvider } from './context/CharacterContext';
import { FREE_TRIAL_STORIES } from './constants/trial';
import { Layout } from "./Layout"

// Lazy-loaded — each becomes its own chunk, fetched only when its route is
// actually visited, instead of shipping in the single main bundle everyone
// downloads on first load (Room alone pulls in all of three.js/@react-three).
const Player = lazy(() => import("./pages/Player"));
const Levels = lazy(() => import("./pages/Levels"));
const HowToUse = lazy(() => import("./pages/HowToUse"));
const Login = lazy(() => import("./auth/Login/Login"));
const SignUp = lazy(() => import("./auth/SignUp/SignUp"));
const Dashboard = lazy(() => import("./auth/Dashboard/Dashboard"));
const ForgotPassword = lazy(() => import("./auth/ForgetPassword/ForgetPassword"));
const List = lazy(() => import('./pages/List'));
const DifficultyDetail = lazy(() => import('./modules/levelprogress/DifficultyDetail'));
const AdminPanel = lazy(() => import("./components/Admin/AdminPanel"));
const Room = lazy(() => import("./pages/Room"));
const Players = lazy(() => import("./pages/Players"));
const PlayerRoom = lazy(() => import("./pages/PlayerRoom"));
// Public and unauthenticated on purpose — see the note in Legal.tsx.
const Legal = lazy(() => import("./pages/Legal"));

interface ProtectedRouteProps {
  children: ReactNode;
}

/** Hard gate — user must be authenticated. */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

/**
 * Soft gate — guests may access tracks 1–FREE_TRIAL_STORIES.
 * Anything beyond that redirects to /signup with trial context.
 */
const TrackProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { trackNumber } = useParams<{ trackNumber: string }>();
  if (loading) return <div>Loading...</div>;
  const track = parseInt(trackNumber ?? '1', 10);
  if (!user && track > FREE_TRIAL_STORIES) {
    return <Navigate to="/signup" state={{ fromTrial: true }} replace />;
  }
  return <>{children}</>;
};



function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <WalletProvider>
        <CharacterProvider>
        <ProgressProvider>
          <Provider store={store}>
            <Router>
              <Layout>
              {/* <Navbar /> */}
              <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                {/* ── Fully public ── */}
                <Route path="/"                element={<Homepage />} />
                <Route path="/how-to-use" element={<HowToUse />} />
                <Route path="/legal/:docId" element={<Legal />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/login"           element={<Login />} />
                <Route path="/signup"          element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* ── Auth-only ── */}
                <Route
                  path="/dashboard"
                  element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                />
                <Route
                  path="/room"
                  element={<ProtectedRoute><Room /></ProtectedRoute>}
                />
                <Route
                  path="/players"
                  element={<ProtectedRoute><Players /></ProtectedRoute>}
                />
                <Route
                  path="/players/:userId"
                  element={<ProtectedRoute><PlayerRoom /></ProtectedRoute>}
                />

                {/* ── Trial-accessible (open to guests) ── */}
                <Route path="/levels"                        element={<Levels />} />
                <Route path="/levels/:difficulty"            element={<List />} />
                <Route path="/levels/:difficulty/:storySlug" element={<DifficultyDetail />} />

                {/* ── Player: free for tracks ≤ FREE_TRIAL_STORIES, auth required beyond ── */}
                <Route
                  path="/levels/:difficulty/:storySlug/:trackNumber"
                  element={
                    <TrackProtectedRoute>
                      <Player />
                    </TrackProtectedRoute>
                  }
                />

                {/* ── Legacy player — fully protected ── */}
                <Route
                  path="/player"
                  element={<ProtectedRoute><Player /></ProtectedRoute>}
                />

                {/* ── Catch-all ── */}
                {/* A real NotFound page, not <Navigate to="/">. The redirect
                    made every wrong URL answer 200 with the homepage, which is
                    a soft 404: crawlers see an infinite space of "real" pages
                    with duplicate content. nginx.conf now returns a genuine 404
                    status for unknown paths and serves this shell as the body. */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
                </Layout>
            </Router>
          </Provider>
        </ProgressProvider>
        </CharacterProvider>
        </WalletProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default App;