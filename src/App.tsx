import './i18n';
import { ReactNode, Suspense, lazy } from 'react';
import { MotionConfig } from 'framer-motion';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Homepage from "./pages/Homepage";
// Eager, unlike the routes below. It is a handful of elements, and a 404 that
// has to fetch its own chunk before it can tell you it is a 404 spends a
// network round-trip to display an error.
import NotFound from "./pages/NotFound";
import { Provider } from "react-redux";
import { store } from "./store/store";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProgressProvider } from "./context/ProgressContext";
import { ProfileProvider } from './context/ProfileContext';
import { WalletProvider } from './context/WalletContext';
import { CatalogProvider } from './context/CatalogContext';
import { SHOP_ENABLED } from './config/features';
import { EntitlementsProvider } from './context/EntitlementsContext';
import { CartProvider } from './context/CartContext';
import { CharacterProvider } from './context/CharacterContext';
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

const Stories = lazy(() => import("./pages/Stories"));
// Public and unauthenticated on purpose — see the note in Legal.tsx.
const Legal = lazy(() => import("./pages/Legal"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const FakeCheckout = lazy(() =>
  import("./pages/CheckoutReturn").then((m) => ({ default: m.FakeCheckout })),
);

interface ProtectedRouteProps {
  children: ReactNode;
}

/** Hard gate — user must be authenticated. */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};



function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <WalletProvider>
        <CatalogProvider>
        <EntitlementsProvider>
        <CartProvider>
        <CharacterProvider>
        <ProgressProvider>
          <Provider store={store}>
            <Router>
              {/* One switch for every framer-motion animation in the app:
                  with the phone's "reduce motion" on, movement is dropped
                  and only fades remain. The CSS side is handled by the
                  prefers-reduced-motion rule in App.css. */}
              <MotionConfig reducedMotion="user">
              <Layout>
              {/* <Navbar /> */}
              <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                {/* ── Fully public ── */}
                <Route path="/"                element={<Homepage />} />
                <Route path="/how-to-use" element={<HowToUse />} />
                <Route path="/legal/:docId" element={<Legal />} />
                {/* The storefront, switched off while the idea is being tested
                    (config/features.ts). The pages are untouched and still work;
                    they are simply unreachable, and every old link now lands on
                    the level picker rather than a 404. */}
                <Route
                  path="/stories"
                  element={SHOP_ENABLED ? <Stories /> : <Navigate to="/levels" replace />}
                />
                <Route
                  path="/shop"
                  element={SHOP_ENABLED ? <Stories /> : <Navigate to="/levels" replace />}
                />
                <Route
                  path="/library"
                  element={
                    SHOP_ENABLED ? <Stories initialFilter="mine" /> : <Navigate to="/levels" replace />
                  }
                />
                {/* Where the payment provider sends the buyer back to. Grants
                    nothing: it polls the server, and the WEBHOOK is what
                    actually settles the purchase. */}
                <Route
                  path="/checkout/return"
                  element={SHOP_ENABLED ? <CheckoutReturn /> : <Navigate to="/levels" replace />}
                />
                {/* The fake acquirer's page; every endpoint it calls 404s under a driver
                    that moves real money. */}
                <Route
                  path="/checkout/fake"
                  element={SHOP_ENABLED ? <FakeCheckout /> : <Navigate to="/levels" replace />}
                />
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

                {/* ── Player: open to everyone. Which parts play is decided
                    in Player.tsx and enforced by the server. While the shop is
                    off, signing in IS what opens the rest of a story. ── */}
                <Route
                  path="/levels/:difficulty/:storySlug/:trackNumber"
                  element={<Player />}
                />

                {/* ── Legacy player — fully protected ── */}
                <Route
                  path="/player"
                  element={<ProtectedRoute><Player /></ProtectedRoute>}
                />

                {/* ── Catch-all ──
                    A real 404 page, NOT `<Navigate to="/" />`. The redirect
                    that used to live here made every mistyped URL render the
                    homepage, which hid the error from users and — together
                    with nginx answering 200 for those paths — presented search
                    engines with an unbounded set of duplicate pages. nginx.conf
                    now returns a 404 status for anything outside the route list
                    above; this renders the body that goes with it. */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
                </Layout>
              </MotionConfig>
            </Router>
          </Provider>
        </ProgressProvider>
        </CharacterProvider>
        </CartProvider>
        </EntitlementsProvider>
        </CatalogProvider>
        </WalletProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default App;