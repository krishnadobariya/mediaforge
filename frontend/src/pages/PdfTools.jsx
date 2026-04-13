import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import FileUploader from '../components/FileUploader';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
import { 
  FileText, 
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
  Combine,
  Minimize,
  FileOutput,
  ArrowRight
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

const PdfTools = () => {
  const [activeTab, setActiveTab] = useState('pdf-to-img');
  const [files, setFiles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [globalFormat, setGlobalFormat] = useState('png'); // for pdf-to-img
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);

  const formatOptions = [
    { label: 'PNG Image', value: 'png' },
    { label: 'JPG Image', value: 'jpeg' },
    { label: 'WEBP Image', value: 'webp' },
  ];

  const handleFilesSelect = (newFiles) => {
    const filesWithData = newFiles.map(file => ({
      originalFile: file,
      name: file.name,
      size: file.size,
      targetFormat: globalFormat,
    }));
    setFiles([...files, ...filesWithData]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleProcessAll = async () => {
    if (files.length === 0) return toast.error('Please upload files first');
    
    // Batch processing (Merge or Multiple PDFs)
    if (activeTab === 'merge' || activeTab === 'img-to-pdf') {
      const formData = new FormData();
      files.forEach(f => formData.append('media', f.originalFile));
      formData.append('type', 'pdf');
      formData.append('operation', activeTab);
      formData.append('options', JSON.stringify({ name: `MediaForge-${activeTab}-${Date.now()}.pdf` }));

      try {
        const res = await api.post('/media/upload', formData);
        setQueue([...queue, {
          id: res.data.jobId,
          name: activeTab === 'merge' ? `Merged Document (${files.length} parts)` : `Image Collection (${files.length} pages)`,
          status: 'pending'
        }]);
        setFiles([]);
        toast.success(`${activeTab === 'merge' ? 'Merging' : 'Conversion'} started`);
      } catch (err) {
        console.error('[BATCH UPLOAD ERROR]', err.response?.data || err.message);
        toast.error('Processing failed. Please check file format.');
      }
      return;
    }

    // Intercept PDF to Image for client-side rendering
    if (activeTab === 'pdf-to-img') {
      for (const fileObj of files) {
        try {
          const zip = new JSZip();
          const arrayBuffer = await fileObj.originalFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          toast.success(`Bundling ${pdf.numPages} pages into ZIP...`);
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            
            // Convert to blob for zero-latency zipping
            const imgData = canvas.toDataURL(`image/${globalFormat}`);
            const base64Data = imgData.split(',')[1];
            zip.file(`${fileObj.name.split('.')[0]}-page-${i}.${globalFormat}`, base64Data, {base64: true});
          }
          
          const content = await zip.generateAsync({type: 'blob'});
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = `${fileObj.name.split('.')[0]}-MediaForge-Export.zip`;
          link.click();
          
          toast.success(`Successfully bundled all pages from ${fileObj.name}`);
        } catch (err) {
          console.error('[RENDER ERROR]', err);
          toast.error(`Failed to render ${fileObj.name}`);
        }
      }
      setFiles([]);
      return;
    }

    // Individual file processing
    const newJobs = [];
    for (const fileObj of files) {
      const formData = new FormData();
      formData.append('media', fileObj.originalFile);
      formData.append('type', 'pdf');
      formData.append('operation', activeTab);
      formData.append('options', JSON.stringify({ format: globalFormat }));

      try {
        const res = await api.post('/media/upload', formData);
        newJobs.push({
          id: res.data.jobId,
          name: fileObj.name,
          status: 'pending'
        });
      } catch (err) {
        console.error('[UPLOAD ERROR]', err.response?.data || err.message);
        toast.error(`Failed to upload ${fileObj.name}`);
      }
    }
    if (newJobs.length > 0) {
      setQueue([...queue, ...newJobs]);
      setFiles([]);
      toast.success('Document pipeline started');
    }
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
        <h1 className="tool-title">PdfForge Studio</h1>
        <p className="tool-subtitle">Premium document management with enterprise-grade encryption.</p>
      </header>

      <div className="tool-tabs-container glass">
        <button className={`tool-tab ${activeTab === 'pdf-to-img' ? 'active' : ''}`} onClick={() => setActiveTab('pdf-to-img')}>
          <FileOutput size={18} /> PDF to Image
        </button>
        <button className={`tool-tab ${activeTab === 'img-to-pdf' ? 'active' : ''}`} onClick={() => setActiveTab('img-to-pdf')}>
          <FileText size={18} /> Image to PDF
        </button>
        <button className={`tool-tab ${activeTab === 'merge' ? 'active' : ''}`} onClick={() => setActiveTab('merge')}>
          <Combine size={18} /> Merge PDF
        </button>
        <button className={`tool-tab ${activeTab === 'compress' ? 'active' : ''}`} onClick={() => setActiveTab('compress')}>
          <Minimize size={18} /> Compress
        </button>
      </div>

      <div className="main-convert-area glass-card">
        {files.length === 0 && queue.length === 0 && (
          <FileUploader 
            onFilesSelect={handleFilesSelect} 
            accept={activeTab === 'img-to-pdf' ? "image/*" : ".pdf"} 
          />
        )}

        {files.length > 0 && (
          <div className="file-list-container">
            <div className="list-header-premium">
              <div className="status-badge"><ListFilter size={14} /> {files.length} Entities Ready</div>
              {activeTab === 'pdf-to-img' && (
                <div className="global-format-setter">
                  <span>Export as:</span>
                  <CustomSelect 
                    value={globalFormat} 
                    onChange={setGlobalFormat} 
                    options={formatOptions} 
                  />
                </div>
              )}
            </div>
            
            <div className="file-items-scroll">
              {files.map((file, idx) => (
                <div key={idx} className="file-item-premium glass">
                  <div className="file-info-grp">
                    <div className="file-preview-mini audio-thumb">
                      <FileText size={24} className="icon-indigo" />
                    </div>
                    <div className="file-details">
                      <span className="file-name-text">{file.name}</span>
                      <span className="file-size-tag">{(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                  <div className="file-configs">
                    <button onClick={() => removeFile(idx)} className="btn-remove-premium">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="list-footer-premium">
              <button onClick={handleProcessAll} className="btn-primary-premium">
                <Zap size={20} /> Process Document Suite
              </button>
            </div>
          </div>
        )}

        {queue.length > 0 && (
          <div className="queue-container-premium">
            <div className="queue-header-premium"><h3>Document Pipeline</h3></div>
            <div className="file-items-scroll">
              {queue.map((job) => (
                <div key={job.id} className="file-item-premium glass processed-row">
                  <div className="file-info-grp">
                    <div className="file-preview-mini audio-thumb">
                      {job.status === 'completed' ? <CheckCircle size={20} className="icon-green" /> : <Loader2 size={20} className="animate-spin" />}
                    </div>
                    <div className="file-details">
                      <span className="file-name-text">{job.name}</span>
                      <div className="job-status-chip"><span className={job.status}>{job.status}</span></div>
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
              <button onClick={() => setQueue([])} className="btn-outline-premium">Clear Pipeline</button>
            )}
          </div>
        )}
      </div>

      <div className="premium-footer-info">
        <div className="info-stat"><ShieldCheck size={18} /> AES-256 Encryption</div>
        <div className="info-stat"><Cpu size={18} /> OCR Neural Ready</div>
        <div className="info-stat"><FileCheck2 size={18} /> ISO Certified Quality</div>
      </div>
    </div>
  );
};

export default PdfTools;
