import './i18n'
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
import Easy from "./pages/Easy";
import Medium from "./pages/Medium";
import Hard from "./pages/Hard";
import HowToUse from "./pages/HowToUse"
import "./App.css";
import LevelProgress from "./pages/LevelProgress";
import Login from "./auth/Login";
import SignUp from "./auth/SignUp";
import Navbar from "./modules/Navbar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./auth/Dashboard";
import { ProgressProvider } from "./context/ProgressContext";
import ForgotPassword from "./auth/ForgetPassword";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute= ({ children }: ProtectedRouteProps) => {
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
                <Route
                  path="/levels"
                  element={
                    <ProtectedRoute>
                      <Levels />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/levels/easy"
                  element={
                    <ProtectedRoute>
                      <Easy />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/levels/medium"
                  element={
                    <ProtectedRoute>
                      <Medium />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/levels/hard"
                  element={
                    <ProtectedRoute>
                      <Hard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/levelschoice"
                  element={
                    <ProtectedRoute>
                      <LevelProgress />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/player"
                  element={
                    <ProtectedRoute>
                      <Player />
                    </ProtectedRoute>
                  }
                />
                 {/* Ловит все неизвестные пути */}
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
