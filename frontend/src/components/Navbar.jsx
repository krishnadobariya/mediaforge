import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Layers, 
  User, 
  LogOut, 
  Video, 
  Image as ImageIcon, 
  FileText,
  Music,
  ChevronDown,
  Search,
  LayoutDashboard
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <nav className="navbar-container glass">
      <div className="container nav-content">
        <div className="nav-left">
          <Link to="/" className="nav-logo">
            <Layers className="logo-icon" size={28} />
            <span>MediaForge</span>
          </Link>
        </div>

        <div className="nav-center">
          <Link to="/" className="nav-link">Convert <ChevronDown size={14} /></Link>
          <Link to="/" className="nav-link">Compress <ChevronDown size={14} /></Link>
          
          <div className="mega-trigger">
            <button className="nav-link">
              Tools <ChevronDown size={14} />
            </button>
            <div className="mega-menu glass">
              <div className="mega-grid">
                <div className="mega-column">
                  <div className="mega-header">
                    <Video size={18} /> <span>Video Tools</span>
                  </div>
                  <Link to="/tools/video" className="mega-item">Video Converter</Link>
                  <Link to="/tools/video" className="mega-item">Crop Video</Link>
                  <Link to="/tools/video" className="mega-item">Trim Video</Link>
                </div>
                
                <div className="mega-column">
                  <div className="mega-header">
                    <ImageIcon size={18} /> <span>Image Tools</span>
                  </div>
                  <Link to="/tools/image" className="mega-item">GIF Maker</Link>
                  <Link to="/tools/image" className="mega-item">Resize Image</Link>
                  <Link to="/tools/image" className="mega-item">Crop Image</Link>
                  <Link to="/tools/image" className="mega-item">Image Enlarger</Link>
                </div>

                <div className="mega-column">
                  <div className="mega-header">
                    <FileText size={18} /> <span>PDF Tools</span>
                  </div>
                  <Link to="/tools/pdf" className="mega-item">PDF Merge</Link>
                  <Link to="/tools/pdf" className="mega-item">PDF to Image</Link>
                  <Link to="/tools/pdf" className="mega-item">Image to PDF</Link>

                </div>
                
                <div className="mega-column">
                  <div className="mega-header">
                    <Music size={18} /> <span>Audio Tools</span>
                  </div>
                  <Link to="/tools/audio" className="mega-item">Audio Converter</Link>
                  <Link to="/tools/audio" className="mega-item">Sonic Trimmer</Link>
                </div>
              </div>
            </div>
          </div>

          <Link to="/" className="nav-link">API <ChevronDown size={14} /></Link>
          <Link to="/" className="nav-link">Pricing</Link>
        </div>

        <div className="nav-right">
          <button className="search-btn"><Search size={18} /></button>
          
          {isAuthenticated ? (
            <div className="user-section-premium">
              <Link to="/dashboard" className="workspace-link">
                <LayoutDashboard size={18} />
                <span>My Workspace</span>
              </Link>
              <div className="divider-vr"></div>
              <button onClick={logout} className="logout-btn-premium" title="Sign Out">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="auth-btns">
              <Link to="/login" className="login-text">Log In</Link>
              <Link to="/register" className="btn-signup">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
