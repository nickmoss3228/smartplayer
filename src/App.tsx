import './i18n';
import { ReactNode } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import Player from "./pages/Player";
import Homepage from "./pages/Homepage";
import { Provider } from "react-redux";
import { store } from "./store/store";
import Levels from "./pages/Levels";
// import Easy from "./pages/Easy";
// import Medium from "./pages/Medium";
// import Hard from "./pages/Hard";
import HowToUse from "./pages/HowToUse";
import "./App.css";
import Login from "./auth/Login/Login";
import SignUp from "./auth/SignUp/SignUp";
import Navbar from "./components/Navbar/Navbar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./auth/Dashboard/Dashboard";
import { ProgressProvider } from "./context/ProgressContext";
import ForgotPassword from "./auth/ForgetPassword/ForgetPassword";
import List from './pages/List';
import DifficultyDetail from './modules/levelprogress/DifficultyDetail';
import { ProfileProvider } from './context/ProfileContext';
import { FREE_TRIAL_STORIES } from './constants/trial';

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
              <Navbar />
              <Routes>
                {/* ── Fully public ── */}
                <Route path="/"                element={<Homepage />} />
                <Route path="/how-to-use"      element={<HowToUse />} />
                <Route path="/login"           element={<Login />} />
                <Route path="/signup"          element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* ── Auth-only ── */}
                <Route
                  path="/dashboard"
                  element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
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
            </Router>
          </Provider>
        </ProgressProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default App;