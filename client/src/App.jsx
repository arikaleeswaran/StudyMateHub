import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import RoadmapGraph from './pages/RoadmapGraph';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/roadmap/:topic" element={<RoadmapGraph />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;