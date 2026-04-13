import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Scissors, RotateCcw, Clock } from 'lucide-react';
import './AudioEditor.css';

const AudioEditor = ({ file, onTrim, onCancel }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleMetadata = (e) => {
    const dur = e.target.duration;
    setDuration(dur);
    setEndTime(dur);
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (audioRef.current.currentTime < startTime || audioRef.current.currentTime >= endTime) {
        audioRef.current.currentTime = startTime;
      }
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
    // Loop functionality strictly within trim bounds
    if (audioRef.current.currentTime >= endTime) {
      audioRef.current.currentTime = startTime;
      if (!isPlaying) audioRef.current.pause();
    } else if (audioRef.current.currentTime < startTime) {
      audioRef.current.currentTime = startTime;
    }
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / rect.width) * duration;
    audioRef.current.currentTime = clickedTime;
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let clickedTime = (x / rect.width) * duration;
    
    // Clamp to start and end bounds
    if (clickedTime < startTime) clickedTime = startTime;
    if (clickedTime > endTime) clickedTime = endTime;
    
    audioRef.current.currentTime = clickedTime;
    setCurrentTime(clickedTime);
  };

  return (
    <div className="audio-editor-overlay glass-card animate-in">
      <div className="audio-editor-header">
        <div className="editor-title-grp">
          <Music size={20} className="icon-indigo" />
          <h3>Sonic Trimmer</h3>
        </div>
        <button className="btn-close-editor" onClick={onCancel}>
          <X size={20} />
        </button>
      </div>

      <div className="waveform-container glass">
        {/* Simple stylized waveform bars */}
        <div className="waveform-viz">
          {Array.from({ length: 60 }).map((_, i) => (
            <div 
              key={i} 
              className="wave-bar" 
              style={{ 
                height: `${Math.random() * 60 + 20}%`,
                opacity: (currentTime / duration) * 60 > i ? 1 : 0.3
              }} 
            />
          ))}
        </div>
        <div 
          className="trim-overlay"
          style={{
            left: `${(startTime / duration) * 100}%`,
            right: `${100 - (endTime / duration) * 100}%`
          }}
        />
        <div 
          className="playback-pointer"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
           <div className="pointer-line" />
           <div className="pointer-head" />
        </div>
        <div 
          ref={progressBarRef}
          className="progress-bar-hitbox" 
          onClick={handleSeek}
        />
      </div>

      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onLoadedMetadata={handleMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="editor-controls-premium">
        <div className="time-display-grp">
          <div className="time-node">
            <span>Start</span>
            <code>{formatTime(startTime)}</code>
          </div>
          <div className="play-trigger-main" onClick={togglePlay}>
            {isPlaying ? <Pause size={28} /> : <Play size={28} />}
          </div>
          <div className="time-node">
            <span>End</span>
            <code>{formatTime(endTime)}</code>
          </div>
        </div>

        <div 
          className="timeline-slider-wrapper" 
          ref={timelineRef}
          onClick={handleTimelineClick}
        >
          <div className="timeline-track">
             <div 
               className="timeline-progress" 
               style={{
                 left: `${Math.min((startTime / duration) * 100, 100)}%`,
                 width: `${Math.max(((endTime - startTime) / duration) * 100, 0)}%`
               }}
             />
             <div 
               className="playback-pointer"
               style={{ left: `${(currentTime / duration) * 100}%` }}
             />
          </div>
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            step="0.01"
            value={startTime} 
            onChange={(e) => {
               const val = parseFloat(e.target.value);
               if (val <= endTime) setStartTime(val);
            }}
            className="timeline-thumb"
          />
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            step="0.01"
            value={endTime} 
            onChange={(e) => {
               const val = parseFloat(e.target.value);
               if (val >= startTime) setEndTime(val);
            }}
            className="timeline-thumb"
          />
        </div>
      </div>

      <div className="editor-footer-premium">
        <button className="btn-outline-premium" onClick={onCancel}>Discard</button>
        <button 
          className="btn-primary-premium" 
          onClick={() => onTrim({ startTime, endTime })}
        >
          <Scissors size={18} /> Apply Surgical Cut
        </button>
      </div>
    </div>
  );
};

// Internal icons for the component
const Music = ({ size, className }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>;
const X = ({ size }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

export default AudioEditor;
