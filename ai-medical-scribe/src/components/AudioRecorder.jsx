import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Play } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatDuration } from '../utils/helpers';

const AudioRecorder = ({ onRecordingComplete }) => {
  const { isRecording, setIsRecording, recordingTime, setRecordingTime } = useAppContext();
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorder = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const audioChunks = useRef([]);
  const timerInterval = useRef(null);
  const animationFrame = useRef(null);

  useEffect(() => {
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (audioContext.current) audioContext.current.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      // Set up audio analysis for waveform
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(analyser.current);
      analyser.current.fftSize = 256;

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      
      // Start timer
      timerInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start animation
      updateAudioLevel();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      if (audioContext.current) {
        audioContext.current.close();
      }
    }
  };

  const updateAudioLevel = () => {
    if (analyser.current && isRecording) {
      const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
      analyser.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255);
      
      animationFrame.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const handleMainButton = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setRecordingTime(0);
      startRecording();
    }
  };

  return (
    <div className="card text-center">
      {/* Timer */}
      <div className="mb-6">
        <div className="text-5xl font-bold text-gray-900 mb-2">
          {formatDuration(recordingTime)}
        </div>
        <p className="text-sm text-gray-500">
          {isRecording ? 'Recording in progress...' : 'Ready to record'}
        </p>
      </div>

      {/* Waveform Visualization */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-1 mb-6 h-16">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: [20, (audioLevel * 60 + 20) * Math.random(), 20],
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                delay: i * 0.05,
              }}
              className="w-1 bg-primary rounded-full"
            />
          ))}
        </div>
      )}

      {/* Main Record Button */}
      <div className="flex justify-center mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMainButton}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-primary hover:bg-blue-700'
          }`}
        >
          {isRecording ? (
            <Square className="text-white" size={40} />
          ) : (
            <Mic className="text-white" size={40} />
          )}
        </motion.button>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-600">
        {isRecording
          ? 'Click the square button to stop recording'
          : 'Click the microphone to start recording'}
      </p>
    </div>
  );
};

export default AudioRecorder;
