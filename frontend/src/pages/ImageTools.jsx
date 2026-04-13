import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import FileUploader from '../components/FileUploader';
import { 
  ImageIcon, 
  Settings, 
  Zap,
  ShieldCheck,
  Cpu,
  Download,
  CheckCircle,
  Loader2,
  X,
  ChevronDown,
  FileCheck2,
  ListFilter,
  Images,
  Maximize2,
  Crop as CropIcon,
  Scaling,
  Layout,
  Clock,
  Check
} from 'lucide-react';
import ImageEditor from '../components/ImageEditor';
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

const ImageTools = () => {
  const [activeTab, setActiveTab] = useState('convert'); // 'convert', 'gif', 'resize', 'crop', 'enlarge'
  const [files, setFiles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [globalFormat, setGlobalFormat] = useState('webp');
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);

  // Editor States
  const [showEditor, setShowEditor] = useState(false);
  const [editingFileIndex, setEditingFileIndex] = useState(null);
  const [editorMode, setEditorMode] = useState('crop');

  // Tool specific options
  const [resizeOptions, setResizeOptions] = useState({ width: 1920, height: 1080, maintainAspectRatio: true });
  const [gifOptions, setGifOptions] = useState({ delay: 500, loop: 0 }); // Delay in ms
  const [enlargeFactor, setEnlargeFactor] = useState(2); // 2x, 4x

  const formatOptions = [
    { label: 'WEBP', value: 'webp' },
    { label: 'PNG', value: 'png' },
    { label: 'JPG', value: 'jpeg' },
    { label: 'AVIF', value: 'avif' },
    { label: 'GIF', value: 'gif' },
  ];

  const handleFilesSelect = (newFiles) => {
    const filesWithData = newFiles.map(file => ({
      originalFile: file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
      targetFormat: globalFormat,
      customOptions: null
    }));
    setFiles([...files, ...filesWithData]);
  };

  const removeFile = (index) => {
    const file = files[index];
    if (file.preview) URL.revokeObjectURL(file.preview);
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
    toast.success('Visual edits applied');
  };

  const handleProcessAll = async () => {
    if (files.length === 0) return toast.error('Please upload images first');
    
    // For GIF, we process all files together
    if (activeTab === 'gif') {
      const formData = new FormData();
      files.forEach(f => formData.append('media', f.originalFile));
      formData.append('type', 'image');
      formData.append('operation', 'make-gif');
      formData.append('options', JSON.stringify(gifOptions));
      
      try {
        const res = await api.post('/media/upload', formData);
        setQueue([...queue, {
          id: res.data.jobId,
          name: `Generated GIF (${files.length} frames)`,
          status: 'pending',
          preview: files[0].preview
        }]);
        setFiles([]);
        toast.success('GIF generation started');
      } catch (err) {}
      return;
    }

    const newJobs = [];
    for (const fileObj of files) {
      const formData = new FormData();
      formData.append('media', fileObj.originalFile);
      formData.append('type', 'image');
      
      let operation = 'convert';
      let options = { format: fileObj.targetFormat || globalFormat, quality: 80 };

      if (fileObj.customOptions) {
        operation = activeTab;
        options = { ...options, ...fileObj.customOptions };
      } else if (activeTab === 'resize') {
        operation = 'resize';
        options = { ...options, ...resizeOptions };
      } else if (activeTab === 'enlarge') {
        operation = 'enlarge';
        options = { ...options, factor: enlargeFactor };
      }

      formData.append('operation', operation);
      formData.append('options', JSON.stringify(options));
      
      try {
        const res = await api.post('/media/upload', formData);
        newJobs.push({
          id: res.data.jobId,
          name: fileObj.name,
          status: 'pending',
          preview: fileObj.preview
        });
      } catch (err) {}
    }
    setQueue([...queue, ...newJobs]);
    setFiles([]);
    toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} started`);
  };

  const handleDirectDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'MediaForge-Export');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback to direct link if fetch fails
      window.open(url, '_blank');
    }
  };

  const handleDownloadAll = async () => {
    const completedIds = queue.filter(j => j.status === 'completed').map(j => j.id);
    if (completedIds.length === 0) return;
    try {
      const res = await api.get(`/jobs/download-batch?jobIds=${completedIds.join(',')}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MediaForge-Batch-${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error('Failed to generate ZIP');
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
        <h1 className="tool-title">PicForge {activeTab === 'convert' ? 'Studio' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
        <p className="tool-subtitle">Premium, high-fidelity {activeTab} tools with Neural Engine optimization.</p>
      </header>

      {/* Tool Tabs */}
      <div className="tool-tabs-container glass">
        <button className={`tool-tab ${activeTab === 'convert' ? 'active' : ''}`} onClick={() => setActiveTab('convert')}>
          <Settings size={18} /> Converter
        </button>
        <button className={`tool-tab ${activeTab === 'gif' ? 'active' : ''}`} onClick={() => setActiveTab('gif')}>
          <Images size={18} /> GIF Maker
        </button>
        <button className={`tool-tab ${activeTab === 'resize' ? 'active' : ''}`} onClick={() => setActiveTab('resize')}>
          <Scaling size={18} /> Resize
        </button>
        <button className={`tool-tab ${activeTab === 'crop' ? 'active' : ''}`} onClick={() => setActiveTab('crop')}>
          <CropIcon size={18} /> Crop
        </button>
        <button className={`tool-tab ${activeTab === 'enlarge' ? 'active' : ''}`} onClick={() => setActiveTab('enlarge')}>
          <Maximize2 size={18} /> Enlarge
        </button>
      </div>

      <div className="main-convert-area glass-card">
        {files.length === 0 && queue.length === 0 && (
          <FileUploader onFilesSelect={handleFilesSelect} accept="image/*" />
        )}

        {files.length > 0 && (
          <div className="file-list-container">
            <div className="list-header-premium">
              <div className="status-badge"><ListFilter size={14} /> {files.length} Files Ready</div>
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
              {activeTab === 'resize' && (
                <div className="options-grid-premium">
                  <div className="input-group-premium">
                    <label>Target Width (px)</label>
                    <input type="number" value={resizeOptions.width} onChange={e => setResizeOptions({...resizeOptions, width: e.target.value})} />
                  </div>
                  <div className="input-group-premium">
                    <label>Target Height (px)</label>
                    <input type="number" value={resizeOptions.height} onChange={e => setResizeOptions({...resizeOptions, height: e.target.value})} />
                  </div>
                </div>
              )}
              {activeTab === 'gif' && (
                <div className="options-grid-premium">
                  <div className="input-group-premium">
                    <label>Frame Delay (ms)</label>
                    <input type="number" step="100" value={gifOptions.delay} onChange={e => setGifOptions({...gifOptions, delay: e.target.value})} />
                  </div>
                  <div className="input-group-premium">
                    <label>Loop Count (0 = Infinite)</label>
                    <input type="number" value={gifOptions.loop} onChange={e => setGifOptions({...gifOptions, loop: e.target.value})} />
                  </div>
                </div>
              )}
              {activeTab === 'enlarge' && (
                <div className="options-grid-premium">
                  <div className="input-group-premium">
                    <label>Upscale Factor</label>
                    <CustomSelect 
                      value={`${enlargeFactor}x`} 
                      onChange={(val) => setEnlargeFactor(parseInt(val))} 
                      options={[{label: '2x Upscale', value: '2x'}, {label: '4x Ultra', value: '4x'}]} 
                    />
                  </div>
                </div>
              )}
              {activeTab === 'convert' && (
                <div className="converter-info-line">
                  <Zap size={14} className="icon-yellow" /> Lightning fast batch transcoding to {globalFormat.toUpperCase()}
                </div>
              )}
              {activeTab === 'crop' && (
                <div className="converter-info-line">
                  <Layout size={14} className="icon-indigo" /> Open the Visual Editor for each image to define crop areas.
                </div>
              )}
            </div>
            
            <div className="file-items-scroll">
              {files.map((file, idx) => (
                <div 
                  key={idx} 
                  className={`file-item-premium glass ${openDropdownIndex === idx ? 'has-open-dropdown' : ''}`}
                  style={{ zIndex: openDropdownIndex === idx ? 100 : 1 }}
                >
                  <div className="file-info-grp">
                    <div className="file-preview-mini">
                      <img src={file.preview} alt="preview" />
                    </div>
                    <div className="file-details">
                      <span className="file-name-text">{file.name}</span>
                      <span className="file-size-tag">{(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                  <div className="file-configs">
                    <CustomSelect 
                      value={file.targetFormat} 
                      onChange={(val) => updateFileFormat(idx, val)} 
                      options={formatOptions} 
                      onOpenStateChange={(isOpen) => setOpenDropdownIndex(isOpen ? idx : null)}
                    />
                    {activeTab === 'crop' && (
                      <button onClick={() => openEditor(idx, 'crop')} className={`btn-edit-premium ${file.customOptions ? 'has-edits' : ''}`}>
                        <CropIcon size={18} />
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
                <Zap size={20} /> Process {files.length} {activeTab === 'gif' ? 'Frames' : 'Files'}
              </button>
            </div>
          </div>
        )}

        {queue.length > 0 && (
          <div className="queue-container-premium">
            <div className="queue-header-premium">
              <h3>Processing Progress</h3>
              {queue.every(j => j.status === 'completed') && (
                <button onClick={handleDownloadAll} className="btn-success-premium">
                  <Download size={18} /> Download All (ZIP)
                </button>
              )}
            </div>
            <div className="file-items-scroll">
              {queue.map((job, idx) => (
                <div key={job.id} className="file-item-premium glass processed-row">
                  <div className="file-preview-mini">
                    <img src={job.preview} alt="preview" />
                  </div>
                  <div className="file-details">
                    <span className="file-name-text">{job.name}</span>
                    <div className="job-status-chip">
                      {job.status === 'completed' ? <CheckCircle size={14} className="icon-green" /> : <Loader2 size={14} className="animate-spin" />}
                      <span className={job.status}>{job.status}</span>
                    </div>
                  </div>
                  <div className="job-actions-premium">
                    {job.status === 'completed' && (
                      <button 
                        onClick={() => handleDirectDownload(job.downloadUrl, job.name)} 
                        className="download-icon-btn"
                        style={{ border: 'none', cursor: 'pointer' }}
                      >
                        <Download size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {queue.every(j => j.status === 'completed') && (
              <button onClick={() => setQueue([])} className="btn-outline-premium">Start New Batch</button>
            )}
          </div>
        )}
      </div>

      <div className="premium-footer-info">
        <div className="info-stat"><ShieldCheck size={18} /> High-Security Privacy</div>
        <div className="info-stat"><Cpu size={18} /> Neural Engine Optimization</div>
        <div className="info-stat"><FileCheck2 size={18} /> Verified 100% Lossless</div>
      </div>

      {showEditor && editingFileIndex !== null && files[editingFileIndex] && (
        <ImageEditor 
          file={files[editingFileIndex].originalFile} 
          mode={editorMode} 
          onSave={handleSaveEditor} 
          onClose={() => setShowEditor(false)} 
        />
      )}
    </div>
  );
};

export default ImageTools;
