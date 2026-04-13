import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Check, 
  RotateCcw, 
  Maximize, 
  Play, 
  Pause, 
  Scissors, 
  Layout, 
  Clock,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './VideoEditor.css';

const VideoEditor = ({ file, mode, onSave, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Crop States
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [aspectRatio, setAspectRatio] = useState('free');
  const [resizeDir, setResizeDir] = useState(null);
  const [videoBox, setVideoBox] = useState({ width: 0, height: 0, left: 0, top: 0 });

  // Trim States
  const [trim, setTrim] = useState({ start: 0, end: 100 }); // Percentages

  const updateVideoBox = () => {
    if (!containerRef.current || !videoRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const video = videoRef.current;
    if (video.videoWidth === 0) return;

    const containerRatio = container.width / container.height;
    const videoRatio = video.videoWidth / video.videoHeight;
    
    let w, h, l = 0, t = 0;
    if (videoRatio > containerRatio) {
      w = container.width;
      h = container.width / videoRatio;
      t = (container.height - h) / 2;
    } else {
      h = container.height;
      w = container.height * videoRatio;
      l = (container.width - w) / 2;
    }
    setVideoBox({ width: w, height: h, left: l, top: t });
  };

  useEffect(() => {
    window.addEventListener('resize', updateVideoBox);
    return () => window.removeEventListener('resize', updateVideoBox);
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady) setIsReady(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isReady]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsReady(true);
      setTimeout(updateVideoBox, 100);
      if (mode === 'trim') setTrim({ start: 0, end: 100 });
    }
  };

  const handleVideoError = (e) => {
    console.error('[VideoEditor] Video Load Error:', videoRef.current?.error || e);
    toast.error('Supported formats: MP4, WebM. Preview failed.');
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (mode === 'trim') {
        const startSec = (trim.start / 100) * duration;
        const endSec = (trim.end / 100) * duration;
        if (videoRef.current.currentTime >= endSec) {
          videoRef.current.currentTime = startSec;
        }
      }
    }
  };

  const seekTo = (percent) => {
    if (videoRef.current) {
      const time = (percent / 100) * duration;
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const applyPreset = (ratio) => {
    setAspectRatio(ratio);
    if (!videoRef.current) return;
    
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
    const options = {};
    if (mode === 'crop') {
      const { videoWidth, videoHeight } = videoRef.current;
      options.width = Math.round((crop.width / 100) * videoWidth);
      options.height = Math.round((crop.height / 100) * videoHeight);
      options.x = Math.round((crop.x / 100) * videoWidth);
      options.y = Math.round((crop.y / 100) * videoHeight);
    } else {
      const startSec = (trim.start / 100) * duration;
      const endSec = (trim.end / 100) * duration;
      options.start = Number(startSec.toFixed(2));
      options.end = Number(endSec.toFixed(2));
    }
    onSave(options);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00.00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const startResizing = (dir) => (e) => {
    e.stopPropagation();
    setResizeDir(dir);
  };

  const resetEdits = () => {
    setCrop({ x: 10, y: 10, width: 80, height: 80 });
    setAspectRatio('free');
    setTrim({ start: 0, end: 100 });
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
        
        if (resizeDir.includes('r')) n.width = Math.max(10, x - n.x);
        if (resizeDir.includes('b')) n.height = Math.max(10, y - n.y);
        
        if (resizeDir.includes('l')) {
          const delta = n.x - x;
          n.x = Math.max(0, Math.min(n.x + n.width - 10, x));
          n.width = Math.max(10, n.width + delta);
        }
        if (resizeDir.includes('t')) {
          const delta = n.y - y;
          n.y = Math.max(0, Math.min(n.y + n.height - 10, y));
          n.height = Math.max(10, n.height + delta);
        }

        if (aspectRatio !== 'free') {
          let targetRatio = 1;
          if (aspectRatio === '16:9') targetRatio = 16/9;
          else if (aspectRatio === '9:16') targetRatio = 9/16;
          else if (aspectRatio === '4:5') targetRatio = 4/5;
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
    <div className="video-editor-overlay">
      {!isReady && (
        <div className="loader-container" style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}>
          <Loader2 className="animate-spin" size={64} color="#818cf8" />
          <h2 className="mt-8 text-2xl font-bold tracking-tight">Igniting Video Engine...</h2>
          <p className="opacity-50 mt-2">Preparing your editing studio</p>
        </div>
      )}
      
      <header className="editor-header">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="btn-remove-premium"><X /></button>
          <h2 className="text-xl font-bold">{mode === 'crop' ? 'Video Crop Studio' : 'Timeline Trimmer'}</h2>
        </div>
        <div className="flex gap-4">
          <button onClick={resetEdits} className="btn-outline-premium" style={{ marginTop: 0, padding: '0.75rem 1.5rem' }}>
            <RotateCcw size={18} /> Reset
          </button>
          <button onClick={handleFinalSave} className="btn-primary-premium" style={{ padding: '0.75rem 2rem' }}>
            <Check size={20} /> Apply Edits
          </button>
        </div>
      </header>

      <div className="editor-main">
        <div className="video-preview-container">
          <div 
            ref={containerRef}
            className="video-content-wrapper" 
            style={{ 
              position: 'relative', 
              width: videoBox.width || '100%', 
              height: videoBox.height || '100%',
              marginTop: videoBox.top || 0,
              marginLeft: videoBox.left || 0,
              display: 'block'
            }}
          >
            <video 
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onError={handleVideoError}
              onClick={togglePlay}
              muted
              playsInline
              autoPlay
              style={{ 
                pointerEvents: mode === 'crop' ? 'none' : 'auto',
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            
            {mode === 'crop' && (
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
                  zIndex: 20
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
                
                {/* Rule of Thirds Guides */}
                <div className="cropper-guide-h h-1" />
                <div className="cropper-guide-h h-2" />
                <div className="cropper-guide-v v-1" />
                <div className="cropper-guide-v v-2" />
                
                {/* Center Guide */}
                <div className="center-guide" />
              </motion.div>
            )}
          </div>

          <div className="video-controls-mini glass">
             <button onClick={togglePlay} className="play-btn">
               {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
             </button>
             <div className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</div>
          </div>
        </div>

        <aside className="editor-sidebar glass-card">
          {mode === 'crop' ? (
            <div className="editor-section">
              <h3 className="section-title"><Layout size={18} /> Crop Settings</h3>
              <p className="section-desc">Drag the overlay or select a preset aspect ratio.</p>
              
              <div className="preset-grid mt-4">
                <button className={`preset-btn ${aspectRatio === 'free' ? 'active' : ''}`} onClick={() => setAspectRatio('free')}>
                  <div className="preset-icon" /> Free
                </button>
                <button className={`preset-btn ${aspectRatio === '1:1' ? 'active' : ''}`} onClick={() => applyPreset('1:1')}>
                  <div className="preset-icon" style={{ width: 20, height: 20 }} /> 1:1 Square
                </button>
                <button className={`preset-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => applyPreset('16:9')}>
                  <div className="preset-icon" style={{ width: 24, height: 13.5 }} /> 16:9 HD
                </button>
                <button className={`preset-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => applyPreset('9:16')}>
                  <div className="preset-icon" style={{ width: 13.5, height: 24 }} /> 9:16 Reel
                </button>
              </div>

              <div className="manual-inputs mt-8">
                 <div className="input-group-premium">
                   <label>Crop Intensity</label>
                   <input 
                    type="range" min="10" max="100" 
                    value={crop.width} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCrop(prev => ({ ...prev, width: val, height: aspectRatio === '1:1' ? val : prev.height }));
                    }}
                   />
                 </div>
              </div>
            </div>
          ) : (
            <div className="editor-section">
              <h3 className="section-title"><Clock size={18} /> Trimming Range</h3>
              <p className="section-desc">Set the start and end points for your final clip.</p>
              
              <div className="trim-stats mt-4">
                <div className="stat-row">
                   <span>Start:</span>
                   <span className="font-mono text-indigo-400">{formatTime((trim.start / 100) * duration)}</span>
                </div>
                <div className="stat-row">
                   <span>End:</span>
                   <span className="font-mono text-indigo-400">{formatTime((trim.end / 100) * duration)}</span>
                </div>
                <div className="stat-row total-row">
                   <span>Total Duration:</span>
                   <span className="text-green-400 font-bold">{formatTime(((trim.end - trim.start) / 100) * duration)}</span>
                </div>
              </div>

              <div className="timeline-container mt-8">
                <div className="timeline-track" onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const p = ((e.clientX - rect.left) / rect.width) * 100;
                  seekTo(p);
                }}>
                  <div className="timeline-shroud timeline-shroud-left" style={{ width: `${trim.start}%` }} />
                  <div className="timeline-shroud timeline-shroud-right" style={{ width: `${100 - trim.end}%` }} />
                  
                  <motion.div 
                    className="timeline-handle"
                    drag="x"
                    dragMomentum={false}
                    dragConstraints={{ left: 0, right: (trim.end / 100) * 300 }} // Approximated, will fix relative
                    style={{ left: `${trim.start}%`, x: '-50%' }}
                    onDrag={(e, info) => {
                      const rect = document.querySelector('.timeline-track').getBoundingClientRect();
                      const p = Math.max(0, Math.min(trim.end - 1, ((info.point.x - rect.left) / rect.width) * 100));
                      setTrim(t => ({ ...t, start: p }));
                      seekTo(p);
                    }}
                  />
                  
                  <motion.div 
                    className="timeline-handle"
                    drag="x"
                    dragMomentum={false}
                    style={{ left: `${trim.end}%`, x: '-50%' }}
                    onDrag={(e, info) => {
                      const rect = document.querySelector('.timeline-track').getBoundingClientRect();
                      const p = Math.max(trim.start + 1, Math.min(100, ((info.point.x - rect.left) / rect.width) * 100));
                      setTrim(t => ({ ...t, end: p }));
                      seekTo(p);
                    }}
                  />

                  <div className="timeline-current-marker" style={{ left: `${(currentTime / duration) * 100}%` }} />
                </div>
              </div>
            </div>
          )}
          
          <div className="sidebar-footer mt-auto">
             <div className="glass help-tip">
                <RotateCcw size={14} /> Click video to play/pause preview
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default VideoEditor;
