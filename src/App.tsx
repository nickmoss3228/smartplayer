import './i18n';
import { ReactNode } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
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

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <>
      <AuthProvider>
        <ProgressProvider>
          <Provider store={store}>
            <Router>
              <Navbar />
              <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/how-to-use" element={<HowToUse />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Levels overview */}
                <Route
                  path="/levels"
                  element={
                    <ProtectedRoute>
                      <Levels />
                    </ProtectedRoute>
                  }
                />

                {/* Story list per difficulty — single dynamic route */}
              <Route
                path="/levels/:difficulty"
                element={
                  <ProtectedRoute>
                    <List />
                  </ProtectedRoute>
                }
              />

              {/* Story detail (LevelProgress grid) — single dynamic route */}
              <Route
                path="/levels/:difficulty/:storySlug"
                element={
                  <ProtectedRoute>
                    <DifficultyDetail />
                  </ProtectedRoute>
                }
              />

              {/* Player with track number */}
              <Route
                path="/levels/:difficulty/:storySlug/:trackNumber"
                element={
                  <ProtectedRoute>
                    <Player />
                  </ProtectedRoute>
                }
              />

              {/* Legacy player route */}
              <Route
                path="/player"
                element={
                  <ProtectedRoute>
                    <Player />
                  </ProtectedRoute>
                }
              />

                {/* Legacy player route (keep for backward compat if needed) */}
                <Route
                  path="/player"
                  element={
                    <ProtectedRoute>
                      <Player />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </Provider>
        </ProgressProvider>
      </AuthProvider>
    </>
  );
}

export default App;