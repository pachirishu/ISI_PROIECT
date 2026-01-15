import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MapComponent from './components/MapComponent';
import UserProfile from './components/UserProfile';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import InsightsPage from './components/InsightsPage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';

const RequireAuth = ({ children }) => {
  const [authState, setAuthState] = useState({ loading: true, user: null });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthState({ loading: false, user });
    });
    return () => unsub();
  }, []);

  if (authState.loading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  if (!authState.user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const Layout = () => {
    const location = useLocation();
    const showNavbar = !!authUser && location.pathname !== '/';

    if (loading) {
      return <div style={{ padding: '24px' }}>Loading...</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
        {showNavbar && <Navbar />}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Routes>
            <Route
              path="/"
              element={
                authUser ? <Navigate to="/profile" replace /> : <LoginPage />
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <UserProfile />
                </RequireAuth>
              }
            />
            <Route
              path="/map"
              element={
                <RequireAuth>
                  <MapComponent />
                </RequireAuth>
              }
            />
            <Route
              path="/insights"
              element={
                <RequireAuth>
                  <InsightsPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
