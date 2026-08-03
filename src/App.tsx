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
import { Provider } from "react-redux";
import { store } from "./store/store";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProgressProvider } from "./context/ProgressContext";
import { ProfileProvider } from './context/ProfileContext';
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
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
                </Layout>
            </Router>
          </Provider>
        </ProgressProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default App;