import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Image as ImageIcon, 
  Video, 
  Music, 
  Download, 
  Zap, 
  Shield, 
  Cpu,
  ArrowRight
} from 'lucide-react';
import './Home.css';
import { useAuthStore } from '../store/authStore';

const Home = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="badge"
        >
          All-in-One AI Media Hub
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-title"
        >
          Transform Your Media <br />
          <span className="gradient-text">Instantly with AI</span>
        </motion.h1>
        
        <div className="tool-selector-grid">
          <Link to="/tools/image" className="glass-card tool-choice-card">
            <div className="tool-choice-icon-bg icon-bg-indigo">
              <ImageIcon size={32} />
            </div>
            <h3>Image Forge</h3>
            <p>Convert, Compress, Resize</p>
            <div className="tool-arrow"><ArrowRight size={20} /></div>
          </Link>

          <Link to="/tools/video" className="glass-card tool-choice-card">
            <div className="tool-choice-icon-bg icon-bg-purple">
              <Video size={32} />
            </div>
            <h3>Video Forge</h3>
            <p>Compress, Convert, Edit</p>
            <div className="tool-arrow"><ArrowRight size={20} /></div>
          </Link>

          <Link to="/tools/audio" className="glass-card tool-choice-card">
            <div className="tool-choice-icon-bg icon-bg-green">
              <Music size={32} />
            </div>
            <h3>Audio Forge</h3>
            <p>Convert & High-Fi Trimming</p>
            <div className="tool-arrow"><ArrowRight size={20} /></div>
          </Link>


        </div>

        {!isAuthenticated && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="home-cta"
          >
            <Link to="/register" className="btn-primary hero-btn">
              Create Free Account <Zap size={20} />
            </Link>
          </motion.div>
        )}
      </section>

      {/* Benefits */}
      <section className="benefits-strip glass">
        <div className="benefit-mini">
          <Shield size={20} /> <span>End-to-End Secure</span>
        </div>
        <div className="benefit-mini">
          <Cpu size={20} /> <span>AI-Powered Quality</span>
        </div>
        <div className="benefit-mini">
          <Zap size={20} /> <span>Lightning Fast</span>
        </div>
      </section>
    </div>
  );
};

export default Home;
