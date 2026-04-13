import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ImageTools from './pages/ImageTools';
import VideoTools from './pages/VideoTools';
import AudioTools from './pages/AudioTools';
import PdfTools from './pages/PdfTools';

import Navbar from './components/Navbar';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();
  if (loading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <div className="app-wrapper">
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/tools/image" element={<PrivateRoute><ImageTools /></PrivateRoute>} />
            <Route path="/tools/video" element={<PrivateRoute><VideoTools /></PrivateRoute>} />
            <Route path="/tools/audio" element={<PrivateRoute><AudioTools /></PrivateRoute>} />
            <Route path="/tools/pdf" element={<PrivateRoute><PdfTools /></PrivateRoute>} />

          </Routes>
        </main>
        <Toaster position="bottom-right" />
      </div>
    </Router>
  );
}

export default App;
