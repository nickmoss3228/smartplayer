import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Player from './pages/Player'
import Homepage from './pages/Homepage';
import { Provider } from "react-redux";
import { store } from "./store/store";
import Levels from './pages/Levels';
import Easy from './pages/Easy';
import Medium from './pages/Medium';
import Hard from './pages/Hard';
import './App.css'
import LevelProgress from './pages/LevelProgress';
import Login from './auth/Login'
import SignUp from './auth/SignUp'
// import Dashboard from './auth/Dashboard'
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({children}) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <>
      <AuthProvider>
        <Provider store={store}>
          <Router>
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />

              <Route path="/levels" element={<ProtectedRoute><Levels /></ProtectedRoute>} />
              <Route path="/levels/easy" element={<ProtectedRoute><Easy /></ProtectedRoute>} />
              <Route path="/levels/medium" element={<ProtectedRoute><Medium /></ProtectedRoute>} />
              <Route path="/levels/hard" element={<ProtectedRoute><Hard /></ProtectedRoute>} />
              <Route path="/levelschoice" element={<ProtectedRoute><LevelProgress /></ProtectedRoute>} />
              <Route path="/player" element={<ProtectedRoute><Player /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/levels" replace />} /> {/* Ловит все неизвестные пути */}

            </Routes>
          </Router> 
        </Provider>
      </AuthProvider>
    </>
  )
}

export default App

{/* <Route path="/dashboard" element={<Dashboard />} /> */}