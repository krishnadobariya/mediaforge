import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import FileUploader from '../components/FileUploader';
import VideoEditor from '../components/VideoEditor';
import { 
  Video, 
  Settings, 
  Zap,
  ShieldCheck,
  Cpu,
  Download,
  CheckCircle,
  Loader2,
  X,
  ChevronDown,
  Clock,
  Layout,
  Scissors
} from 'lucide-react';
import './Tools.css';
import './FreeConvert.css';

// Custom Select Component for Premium Look
const CustomSelect = ({ value, onChange, options, onOpenStateChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onOpenStateChange) onOpenStateChange(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onOpenStateChange) onOpenStateChange(newState);
  };

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <div className="custom-select-trigger" onClick={toggleDropdown}>
        <span>{value}</span>
        <ChevronDown size={14} className={`select-icon ${isOpen ? 'rotate' : ''}`} />
      </div>
      {isOpen && (
        <div className="custom-select-options glass">
          {options.map((opt) => (
            <div 
              key={opt.value} 
              className={`custom-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
                if (onOpenStateChange) onOpenStateChange(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VideoTools = () => {
  const [activeTab, setActiveTab] = useState('convert'); // 'convert', 'crop', 'trim'
  const [files, setFiles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [globalFormat, setGlobalFormat] = useState('mp4');
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);

  // Editor States
  const [showEditor, setShowEditor] = useState(false);
  const [editingFileIndex, setEditingFileIndex] = useState(null);
  const [editorMode, setEditorMode] = useState('crop');

  // Tool specific options
  const [cropOptions, setCropOptions] = useState({ width: 1280, height: 720, x: 0, y: 0 });
  const [trimOptions, setTrimOptions] = useState({ start: '00:00:00', end: '00:00:10' });

  const formatOptions = [
    { label: 'MP4', value: 'mp4' },
    { label: 'MKV', value: 'mkv' },
    { label: 'MOV', value: 'mov' },
    { label: 'WEBM', value: 'webm' },
    { label: 'MP3 (Audio Only)', value: 'mp3' },
  ];

  const handleFilesSelect = (newFiles) => {
    const filesWithData = newFiles.map(file => ({
      originalFile: file,
      name: file.name,
      size: file.size,
      targetFormat: globalFormat,
      customOptions: null
    }));
    setFiles([...files, ...filesWithData]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const updateFileFormat = (index, format) => {
    const newFiles = [...files];
    newFiles[index].targetFormat = format;
    setFiles(newFiles);
  };

  const openEditor = (index, mode) => {
    setEditingFileIndex(index);
    setEditorMode(mode);
    setShowEditor(true);
  };

  const handleSaveEditor = (options) => {
    const newFiles = [...files];
    newFiles[editingFileIndex].customOptions = options;
    setFiles(newFiles);
    setShowEditor(false);
    toast.success('Visual edits applied to file');
  };

  const handleProcessAll = async () => {
    if (files.length === 0) return toast.error('Please upload videos first');
    const newJobs = [];
    for (const fileObj of files) {
      const formData = new FormData();
      formData.append('media', fileObj.originalFile);
      formData.append('type', 'video');
      
      let operation = 'convert';
      let options = { format: fileObj.targetFormat };

      // Priority: Custom options > Tab-specific global options
      if (fileObj.customOptions) {
        operation = activeTab; // Use the active tab as operation
        options = { ...options, ...fileObj.customOptions };
      } else if (activeTab === 'crop') {
        operation = 'crop';
        options = { ...options, ...cropOptions };
      } else if (activeTab === 'trim') {
        operation = 'trim';
        options = { ...options, ...trimOptions };
      } else if (fileObj.targetFormat === 'mp3') {
        operation = 'extract-audio';
      }

      formData.append('operation', operation);
      formData.append('options', JSON.stringify(options));
      
      try {
        const res = await api.post('/media/upload', formData);
        newJobs.push({
          id: res.data.jobId,
          name: fileObj.name,
          status: 'pending'
        });
      } catch (err) {}
    }
    setQueue([...queue, ...newJobs]);
    setFiles([]);
    toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} processing started`);
  };

  const handleDirectDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'VideoForge-Export');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    const active = queue.filter(j => j.status === 'pending' || j.status === 'processing');
    if (active.length === 0) return;
    const interval = setInterval(async () => {
      const updatedQueue = [...queue];
      let changed = false;
      for (let i = 0; i < updatedQueue.length; i++) {
        if (updatedQueue[i].status === 'pending' || updatedQueue[i].status === 'processing') {
          try {
            const res = await api.get(`/jobs/${updatedQueue[i].id}`);
            if (res.data.job.status !== updatedQueue[i].status) {
              updatedQueue[i].status = res.data.job.status;
              if (res.data.job.status === 'completed') {
                updatedQueue[i].downloadUrl = `${api.defaults.baseURL.replace('/api', '')}/uploads/${res.data.job.outputUrl}`;
              }
              changed = true;
            }
          } catch (e) {}
        }
      }
      if (changed) setQueue(updatedQueue);
    }, 1000);
    return () => clearInterval(interval);
  }, [queue]);

  return (
    <div className="tool-container free-convert-style picflow-style">
      <header className="tool-header">
        <h1 className="tool-title">VideoForge AI</h1>
        <p className="tool-subtitle">Professional grade video editing and transcoding suite.</p>
      </header>

      {/* Tool Tabs */}
      <div className="tool-tabs-container glass">
        <button 
          className={`tool-tab ${activeTab === 'convert' ? 'active' : ''}`}
          onClick={() => setActiveTab('convert')}
        >
          <Settings size={18} /> Converter
        </button>
        <button 
          className={`tool-tab ${activeTab === 'crop' ? 'active' : ''}`}
          onClick={() => setActiveTab('crop')}
        >
          <Layout size={18} /> Video Crop
        </button>
        <button 
          className={`tool-tab ${activeTab === 'trim' ? 'active' : ''}`}
          onClick={() => setActiveTab('trim')}
        >
          <Clock size={18} /> Trim Video
        </button>
      </div>

      <div className="main-convert-area glass-card">
        {files.length === 0 && queue.length === 0 && (
          <FileUploader onFilesSelect={handleFilesSelect} accept="video/*" />
        )}

        {files.length > 0 && (
          <div className="file-list-container">
            <div className="list-header-premium">
              <div className="status-badge"><Video size={14} /> {files.length} Videos Loaded</div>
              <div className="global-format-setter">
                <span>Output Format:</span>
                <CustomSelect 
                  value={globalFormat} 
                  onChange={setGlobalFormat} 
                  options={formatOptions} 
                />
              </div>
            </div>

            {/* Tool Specific Options UI */}
            <div className="tool-options-panel glass-subcard">
              {activeTab === 'crop' && (
                <div className="options-grid-premium">
                  <div className="input-group-premium">
                    <label>Width (px)</label>
                    <input 
                      type="number" 
                      value={cropOptions.width} 
                      onChange={(e) => setCropOptions({...cropOptions, width: e.target.value})} 
                    />
                  </div>
                  <div className="input-group-premium">
                    <label>Height (px)</label>
                    <input 
                      type="number" 
                      value={cropOptions.height} 
                      onChange={(e) => setCropOptions({...cropOptions, height: e.target.value})} 
                    />
                  </div>
                  <div className="input-group-premium">
                    <label>X Offset</label>
                    <input 
                      type="number" 
                      value={cropOptions.x} 
                      onChange={(e) => setCropOptions({...cropOptions, x: e.target.value})} 
                    />
                  </div>
                  <div className="input-group-premium">
                    <label>Y Offset</label>
                    <input 
                      type="number" 
                      value={cropOptions.y} 
                      onChange={(e) => setCropOptions({...cropOptions, y: e.target.value})} 
                    />
                  </div>
                </div>
              )}
              {activeTab === 'trim' && (
                <div className="options-grid-premium">
                  <div className="input-group-premium">
                    <label>Start Time (HH:MM:SS)</label>
                    <input 
                      type="text" 
                      placeholder="00:00:00"
                      value={trimOptions.start} 
                      onChange={(e) => setTrimOptions({...trimOptions, start: e.target.value})} 
                    />
                  </div>
                  <div className="input-group-premium">
                    <label>End Time (HH:MM:SS)</label>
                    <input 
                      type="text" 
                      placeholder="00:00:10"
                      value={trimOptions.end} 
                      onChange={(e) => setTrimOptions({...trimOptions, end: e.target.value})} 
                    />
                  </div>
                </div>
              )}
              {activeTab === 'convert' && (
                <div className="converter-info-line">
                  <Zap size={14} className="icon-yellow" /> Lightning fast transcoding to {globalFormat.toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="file-items-scroll">
              {files.map((file, idx) => (
                <div 
                  key={idx} 
                  className={`file-item-premium glass`}
                  style={{ zIndex: openDropdownIndex === idx ? 100 : 1 }}
                >
                  <div className="file-info-grp">
                    <div className="file-preview-mini video-thumb">
                      <Video size={24} className="icon-indigo" />
                    </div>
                    <div className="file-details">
                      <span className="file-name-text">{file.name}</span>
                      <span className="file-size-tag">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>
                  <div className="file-configs">
                    <CustomSelect 
                      value={file.targetFormat || globalFormat} 
                      onChange={(val) => updateFileFormat(idx, val)} 
                      options={formatOptions} 
                      onOpenStateChange={(isOpen) => setOpenDropdownIndex(isOpen ? idx : null)}
                    />
                    
                    {activeTab !== 'convert' && (
                      <button 
                        onClick={() => openEditor(idx, activeTab)} 
                        className={`btn-edit-premium ${file.customOptions ? 'has-edits' : ''}`}
                        title="Open Visual Editor"
                      >
                        {activeTab === 'crop' ? <Layout size={18} /> : <Scissors size={18} />}
                      </button>
                    )}

                    <button onClick={() => removeFile(idx)} className="btn-remove-premium">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="list-footer-premium">
              <button onClick={handleProcessAll} className="btn-primary-premium">
                <Zap size={20} /> Process with {activeTab}
              </button>
            </div>
          </div>
        )}

        {queue.length > 0 && (
          <div className="queue-container-premium">
            <h3 className="section-label">Media Pipeline</h3>
            <div className="file-items-scroll">
              {queue.map((job) => (
                <div key={job.id} className="file-item-premium glass processed-row">
                  <div className="file-info-grp">
                    <div className="file-preview-mini video-thumb">
                      {job.status === 'completed' ? <CheckCircle className="icon-green" /> : <Loader2 className="animate-spin" />}
                    </div>
                    <div className="file-details">
                      <span className="file-name-text">{job.name}</span>
                      <div className="job-status-chip">
                        <span className={job.status}>{job.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="job-actions-premium">
                    {job.status === 'completed' && (
                       <button 
                        onClick={() => handleDirectDownload(job.downloadUrl, job.name)} 
                        className="download-icon-btn"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Download size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {queue.every(j => j.status === 'completed') && (
              <button onClick={() => setQueue([])} className="btn-outline-premium">Clear Workspace</button>
            )}
          </div>
        )}
      </div>

      {showEditor && editingFileIndex !== null && files[editingFileIndex] && (
        <VideoEditor 
          file={files[editingFileIndex].originalFile} 
          mode={editorMode} 
          onSave={handleSaveEditor} 
          onClose={() => setShowEditor(false)} 
        />
      )}

      <div className="premium-footer-info">
        <div className="info-stat"><Clock size={18} /> Fast Encoding</div>
        <div className="info-stat"><Cpu size={18} /> Multi-Threaded AI</div>
        <div className="info-stat"><ShieldCheck size={18} /> Secure Deletion</div>
      </div>
    </div>
  );
};

export default VideoTools;
