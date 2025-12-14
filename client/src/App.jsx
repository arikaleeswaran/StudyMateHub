import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar'; // <--- Import Navbar
import HomePage from './pages/HomePage';
import RoadmapGraph from './pages/RoadmapGraph';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/roadmap/:topic" element={<RoadmapGraph />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;