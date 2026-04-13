import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import FileUploader from '../components/FileUploader';
import AudioEditor from '../components/AudioEditor';
import { 
  Music, 
  Settings, 
  Zap,
  ShieldCheck,
  Cpu,
  Download,
  CheckCircle,
  Loader2,
  X,
  ChevronDown,
  Volume2,
  Mic2,
  Scissors,
  Repeat
} from 'lucide-react';
import './Tools.css';
import './FreeConvert.css';

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

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <div className="custom-select-trigger" onClick={() => {setIsOpen(!isOpen); if (onOpenStateChange) onOpenStateChange(!isOpen);}}>
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

const AudioTools = () => {
  const [activeTab, setActiveTab] = useState('convert');
  const [files, setFiles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [globalFormat, setGlobalFormat] = useState('mp3');
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
  const [editingFile, setEditingFile] = useState(null);

  const formatOptions = [
    { label: 'MP3', value: 'mp3' },
    { label: 'WAV', value: 'wav' },
    { label: 'OGG', value: 'ogg' },
    { label: 'FLAC', value: 'flac' },
    { label: 'AAC', value: 'aac' },
  ];

  const handleFilesSelect = (newFiles) => {
    if (activeTab === 'trim') {
      setEditingFile(newFiles[0]);
      return;
    }
    const filesWithData = newFiles.map(file => {
      file.targetFormat = globalFormat;
      return file;
    });
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

  const handleProcessAll = async (trimOptions = null) => {
    const filesToProcess = trimOptions ? [editingFile] : files;
    if (filesToProcess.length === 0) return toast.error('Please upload audio files first');
    
    const newJobs = [];
    for (const fileObj of filesToProcess) {
      const formData = new FormData();
      formData.append('media', fileObj);
      formData.append('type', 'audio');
      formData.append('operation', trimOptions ? 'trim-audio' : 'convert');
      
      const options = trimOptions || { format: fileObj.targetFormat || globalFormat };
      formData.append('options', JSON.stringify(options));
      
      try {
        const res = await api.post('/media/upload', formData);
        newJobs.push({
          id: res.data.jobId,
          name: fileObj.name,
          status: 'pending'
        });
      } catch (err) {
        toast.error(`Failed to process ${fileObj.name}`);
      }
    }
    setQueue([...queue, ...newJobs]);
    setFiles([]);
    setEditingFile(null);
    toast.success(trimOptions ? 'Trimming initialized' : 'Conversion initialized');
  };

  const handleDirectDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'AudioForge-Export');
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
        <h1 className="tool-title">AudioForge Studio</h1>
        <p className="tool-subtitle">Premium acoustic suite for high-fidelity trimming and format optimization.</p>
      </header>

      <div className="tool-tabs-container glass">
        <button 
          className={`tool-tab ${activeTab === 'convert' ? 'active' : ''}`}
          onClick={() => {setActiveTab('convert'); setFiles([]); setEditingFile(null);}}
        >
          <Repeat size={18} /> Batch Convert
        </button>
        <button 
          className={`tool-tab ${activeTab === 'trim' ? 'active' : ''}`}
          onClick={() => {setActiveTab('trim'); setFiles([]); setEditingFile(null);}}
        >
          <Scissors size={18} /> Studio Trimmer
        </button>
      </div>

      <div className="main-convert-area glass-card">
        {files.length === 0 && queue.length === 0 && !editingFile && (
          <FileUploader onFilesSelect={handleFilesSelect} accept="audio/*" />
        )}

        {editingFile && (
          <AudioEditor 
            file={editingFile} 
            onTrim={(options) => handleProcessAll(options)}
            onCancel={() => setEditingFile(null)}
          />
        )}

        {files.length > 0 && (
          <div className="file-list-container">
            <div className="list-header-premium">
              <div className="status-badge"><Music size={14} /> {files.length} Entities Ready</div>
              <div className="global-format-setter">
                <span>Output Format:</span>
                <CustomSelect 
                  value={globalFormat} 
                  onChange={setGlobalFormat} 
                  options={formatOptions} 
                />
              </div>
            </div>
            
            <div className="file-items-scroll">
              {files.map((file, idx) => (
                <div key={idx} className="file-item-premium glass">
                  <div className="file-info-grp">
                    <div className="file-preview-mini audio-thumb">
                      <Volume2 size={24} className="icon-indigo" />
                    </div>
                    <div className="file-details">
                      <span className="file-name-text">{file.name}</span>
                      <span className="file-size-tag">{(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                  <div className="file-configs">
                    <CustomSelect 
                      value={file.targetFormat || globalFormat} 
                      onChange={(val) => updateFileFormat(idx, val)} 
                      options={formatOptions} 
                      onOpenStateChange={(isOpen) => setOpenDropdownIndex(isOpen ? idx : null)}
                    />
                    <button onClick={() => removeFile(idx)} className="btn-remove-premium">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="list-footer-premium">
              <button onClick={() => handleProcessAll()} className="btn-primary-premium">
                <Zap size={20} /> Ignite Conversion
              </button>
            </div>
          </div>
        )}

        {queue.length > 0 && !editingFile && (
          <div className="queue-container-premium">
            <h3 className="section-label">Acoustic Pipeline</h3>
            <div className="file-items-scroll">
              {queue.map((job) => (
                <div key={job.id} className="file-item-premium glass processed-row">
                  <div className="file-info-grp">
                    <div className="file-preview-mini audio-thumb">
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
                       <button onClick={() => handleDirectDownload(job.downloadUrl, job.name)} className="download-icon-btn">
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

      {!editingFile && (
        <div className="premium-footer-info">
          <div className="info-stat"><Mic2 size={18} /> HD Sampling</div>
          <div className="info-stat"><Cpu size={18} /> Lossless Engine</div>
          <div className="info-stat"><ShieldCheck size={18} /> Meta-Clean</div>
        </div>
      )}
    </div>
  );
};

export default AudioTools;
