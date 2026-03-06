import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; 

// 1. Eagerly load the Homepage so it appears instantly
import HomePage from './pages/HomePage';

// 2. Lazy load the rest of the heavy pages
const RoadmapGraph = React.lazy(() => import('./pages/RoadmapGraph'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const AdminLoginPage = React.lazy(() => import('./pages/AdminLoginPage'));
const SquadsPage = React.lazy(() => import('./pages/SquadsPage'));

// A beautiful dynamic-themed loader to show while chunks are downloading
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', background: 'var(--bg-solid)' }}>
    <div style={{ width: '50px', height: '50px', border: '5px solid var(--card-border)', borderTop: '5px solid var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider> 
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/roadmap/:topic" element={<RoadmapGraph />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/dashboard" element={<AdminPage />} />
              <Route path="/squads" element={<SquadsPage />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;