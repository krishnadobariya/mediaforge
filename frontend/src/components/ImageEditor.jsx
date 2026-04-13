import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Check, 
  RotateCcw, 
  Layout, 
  Loader2,
  Maximize2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './ImageEditor.css';

const ImageEditor = ({ file, mode, onSave, onClose }) => {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgUrl, setImgUrl] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [imgBox, setImgBox] = useState({ width: 0, height: 0, left: 0, top: 0 });

  // Crop States
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [aspectRatio, setAspectRatio] = useState('free');
  const [resizeDir, setResizeDir] = useState(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const updateImgBox = () => {
    if (!containerRef.current || !imgRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const img = imgRef.current;
    
    const containerRatio = container.width / container.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    
    let w, h, l = 0, t = 0;
    if (imgRatio > containerRatio) {
      w = container.width;
      h = container.width / imgRatio;
      t = (container.height - h) / 2;
    } else {
      h = container.height;
      w = container.height * imgRatio;
      l = (container.width - w) / 2;
    }
    setImgBox({ width: w, height: h, left: l, top: t });
    setIsReady(true);
  };

  useEffect(() => {
    window.addEventListener('resize', updateImgBox);
    return () => window.removeEventListener('resize', updateImgBox);
  }, []);

  const resetEdits = () => {
    setCrop({ x: 10, y: 10, width: 80, height: 80 });
    setAspectRatio('free');
  };

  const applyPreset = (ratio) => {
    setAspectRatio(ratio);
    setCrop(prev => {
      let n = { ...prev };
      let targetRatio = 1;
      if (ratio === '1:1') targetRatio = 1;
      else if (ratio === '16:9') targetRatio = 16/9;
      else if (ratio === '9:16') targetRatio = 9/16;
      else if (ratio === '4:5') targetRatio = 4/5;
      else return prev;

      n.height = n.width / targetRatio;
      if (n.height + n.y > 100) n.y = 100 - n.height;
      if (n.y < 0) { n.y = 0; n.height = Math.min(n.height, 100); }
      return n;
    });
  };

  const handleFinalSave = () => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    const options = {
      width: Math.round((crop.width / 100) * naturalWidth),
      height: Math.round((crop.height / 100) * naturalHeight),
      x: Math.round((crop.x / 100) * naturalWidth),
      y: Math.round((crop.y / 100) * naturalHeight),
    };
    onSave(options);
  };

  const startResizing = (dir) => (e) => {
    e.stopPropagation();
    setResizeDir(dir);
  };

  useEffect(() => {
    const handleMouseUp = () => setResizeDir(null);
    const handleMouseMove = (e) => {
      if (!resizeDir || !containerRef.current) return;
      const container = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - container.left) / container.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - container.top) / container.height) * 100));

      setCrop(prev => {
        let n = { ...prev };
        if (resizeDir.includes('r')) n.width = Math.max(5, x - n.x);
        if (resizeDir.includes('b')) n.height = Math.max(5, y - n.y);
        if (resizeDir.includes('l')) {
          const delta = n.x - x;
          n.x = Math.max(0, Math.min(n.x + n.width - 5, x));
          n.width = Math.max(5, n.width + delta);
        }
        if (resizeDir.includes('t')) {
          const delta = n.y - y;
          n.y = Math.max(0, Math.min(n.y + n.height - 5, y));
          n.height = Math.max(5, n.height + delta);
        }

        if (aspectRatio !== 'free') {
          let targetRatio = 1;
          if (aspectRatio === '16:9') targetRatio = 16/9;
          else if (aspectRatio === '9:16') targetRatio = 9/16;
          else if (aspectRatio === '4:5') targetRatio = 4/5;
          else if (aspectRatio === '1:1') targetRatio = 1;
          n.height = n.width / targetRatio;
        }
        
        if (n.width + n.x > 100) n.width = 100 - n.x;
        if (n.height + n.y > 100) n.height = 100 - n.y;
        return n;
      });
    };

    if (resizeDir) {
      document.body.style.cursor = resizeDir + '-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.body.style.cursor = 'default';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeDir, aspectRatio]);

  return (
    <div className="video-editor-overlay picforge-editor-overlay">
      <header className="editor-header">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="btn-remove-premium"><X /></button>
          <h2 className="text-xl font-bold tracking-tight">Image Crop Studio</h2>
        </div>
        <div className="flex gap-4">
          <button onClick={resetEdits} className="btn-outline-premium" style={{ marginTop: 0, padding: '0.75rem 1.5rem' }}>
            <RotateCcw size={18} /> Reset
          </button>
          <button onClick={handleFinalSave} className="btn-primary-premium" style={{ padding: '0.75rem 2rem' }}>
            <Check size={20} /> Apply Crop
          </button>
        </div>
      </header>

      <div className="editor-main">
        <div className="video-preview-container image-preview-container">
           <div 
            ref={containerRef}
            className="video-content-wrapper" 
            style={{ 
              position: 'relative', 
              width: imgBox.width || 'auto', 
              height: imgBox.height || 'auto',
              maxHeight: '100%',
              marginTop: imgBox.top || 0,
              marginLeft: imgBox.left || 0,
              display: 'block'
            }}
          >
            <img 
              ref={imgRef}
              src={imgUrl}
              onLoad={updateImgBox}
              alt="edit-preview"
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
            />
            
            {isReady && (
              <motion.div 
                className="cropper-box"
                drag={!resizeDir ? "both" : false}
                dragListener={!resizeDir}
                dragMomentum={false}
                dragConstraints={containerRef}
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                }}
                onDrag={(e, info) => {
                  const rect = containerRef.current.getBoundingClientRect();
                  const x = ((info.point.x - rect.left) / rect.width) * 100;
                  const y = ((info.point.y - rect.top) / rect.height) * 100;
                  setCrop(prev => ({ 
                    ...prev, 
                    x: Math.max(0, Math.min(100 - prev.width, x)), 
                    y: Math.max(0, Math.min(100 - prev.height, y)) 
                  }));
                }}
              >
                <div className="cropper-handle handle-tl" onPointerDown={(e) => { e.stopPropagation(); startResizing('tl')(e); }} />
                <div className="cropper-handle handle-tr" onPointerDown={(e) => { e.stopPropagation(); startResizing('tr')(e); }} />
                <div className="cropper-handle handle-bl" onPointerDown={(e) => { e.stopPropagation(); startResizing('bl')(e); }} />
                <div className="cropper-handle handle-br" onPointerDown={(e) => { e.stopPropagation(); startResizing('br')(e); }} />
                
                <div className="cropper-guide-h h-1" />
                <div className="cropper-guide-h h-2" />
                <div className="cropper-guide-v v-1" />
                <div className="cropper-guide-v v-2" />
                <div className="center-guide" />
              </motion.div>
            )}
          </div>
        </div>

        <aside className="editor-sidebar glass-card">
          <div className="editor-section">
            <h3 className="section-title"><Layout size={18} /> Aspect Ratio</h3>
            <div className="preset-grid mt-4">
              <button className={`preset-btn ${aspectRatio === 'free' ? 'active' : ''}`} onClick={() => setAspectRatio('free')}>
                <div className="preset-icon" /> Free
              </button>
              <button className={`preset-btn ${aspectRatio === '1:1' ? 'active' : ''}`} onClick={() => applyPreset('1:1')}>
                <div className="preset-icon" style={{ width: 20, height: 20 }} /> 1:1 Square
              </button>
              <button className={`preset-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => applyPreset('16:9')}>
                <div className="preset-icon" style={{ width: 24, height: 13.5 }} /> 16:9 Cinema
              </button>
              <button className={`preset-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => applyPreset('9:16')}>
                <div className="preset-icon" style={{ width: 13.5, height: 24 }} /> 9:16 Story
              </button>
              <button className={`preset-btn ${aspectRatio === '4:5' ? 'active' : ''}`} onClick={() => applyPreset('4:5')}>
                <div className="preset-icon" style={{ width: 18, height: 22.5 }} /> 4:5 Portrait
              </button>
            </div>
          </div>
          
          <div className="sidebar-footer mt-auto">
             <div className="glass help-tip">
                <Maximize2 size={14} /> Neural Precision Cropping
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ImageEditor;
