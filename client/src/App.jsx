import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoadmapGraph from './pages/RoadmapGraph'; // <--- NEW NAME

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Update the element below */}
        <Route path="/roadmap/:topic" element={<RoadmapGraph />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;