import React, { useRef, useState, useEffect } from 'react';
import { X, Mic, Square, Settings, FileAudio } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onClear: () => void;
  selectedFile: File | null;
  disabled: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, onClear, selectedFile, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    cleanupRecording(); 

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      if (typeof MediaRecorder === 'undefined') {
        throw new Error("MediaRecorder is not supported in this browser.");
      }

      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        let extension = 'webm';
        if (mimeType.includes('mp4')) extension = 'mp4';
        else if (mimeType.includes('ogg')) extension = 'ogg';
        else if (mimeType.includes('wav')) extension = 'wav';

        const file = new File([blob], `recording-${new Date().toISOString()}.${extension}`, { type: mimeType });
        onFileSelect(file);
        
        cleanupRecording();
        setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      cleanupRecording();
      setIsRecording(false);

      const errorMessage = err.message || err.toString();
      
      if (
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        err.name === 'SecurityError' ||
        errorMessage.includes('Permission denied') ||
        errorMessage.includes('permission')
      ) {
        setError("Toegang tot microfoon geweigerd.");
      } else if (err.name === 'NotFoundError') {
        setError("Geen microfoon gevonden.");
      } else {
        setError(`Fout: ${errorMessage}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      setTimeout(() => {
         if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
           mediaRecorderRef.current.stop();
         }
      }, 500);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (selectedFile) {
    return (
      <div className="w-full bg-slate-50 rounded-xl border border-slate-100 p-4 shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <FileAudio className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-900 truncate max-w-[150px] sm:max-w-xs">{selectedFile.name}</h3>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (isRecording) stopRecording();
              onClear();
              setError(null);
            }}
            disabled={disabled}
            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-4">
      {!isRecording ? (
        <div className="flex flex-col items-center">
          <button
            onClick={startRecording}
            disabled={disabled}
            className="group relative flex items-center justify-center w-16 h-16 bg-red-50 rounded-full hover:bg-red-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 rounded-full border-2 border-red-200 group-hover:scale-110 transition-transform duration-500"></div>
            <Mic className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
          </button>
          
          {error && (
            <div className="mt-4 flex flex-col items-center space-y-1 text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100 max-w-xs text-center animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider">
                  <Settings className="w-3 h-3" />
                  <span>Microfoon Fout</span>
              </div>
              <span className="text-[11px] leading-tight">{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
            <div className="relative w-16 h-16 bg-white rounded-full border-4 border-red-50 flex items-center justify-center shadow-md">
              <span className="text-sm font-mono font-bold text-slate-700">
                {formatTime(recordingTime)}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-red-600">Audio opnemen...</span>
            </div>
            
            <button
              onClick={stopRecording}
              className="flex items-center px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              <Square className="w-4 h-4 mr-2 fill-current" />
              Stop Opname
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;