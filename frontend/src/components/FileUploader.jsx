import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X } from 'lucide-react';
import './FileUploader.css';

const FileUploader = ({ onFilesSelect, selectedFiles = [], accept }) => {
  const getAccept = () => {
    if (!accept) return undefined;
    if (accept === '.pdf') return { 'application/pdf': ['.pdf'] };
    if (accept === 'image/*') return { 'image/*': ['.png', '.jpeg', '.jpg', '.webp', '.gif'] };
    if (accept === 'video/*') return { 'video/*': ['.mp4', '.mkv', '.avi', '.mov'] };
    if (accept === 'audio/*') return { 'audio/*': ['.mp3', '.wav', '.ogg', '.flac'] };
    return { [accept]: [] };
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => onFilesSelect([...selectedFiles, ...acceptedFiles]),
    accept: getAccept(),
    multiple: true,
  });

  return (
    <div className="uploader-container">
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <div className="upload-icon-circle">
            <Upload size={28} />
          </div>
          <div className="dropzone-text">
            <p className="dropzone-main-text">
              {isDragActive ? 'Drop files here' : 'Choose Files to Convert'}
            </p>
            <p className="dropzone-sub-text">
              or drag and drop them here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
