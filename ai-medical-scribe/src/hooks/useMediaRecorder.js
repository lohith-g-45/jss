import { useState, useRef, useCallback } from 'react';

export const useMediaRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorder = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const audioChunks = useRef([]);
  const timerInterval = useRef(null);
  const animationFrame = useRef(null);
  const stream = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: 16000 },
        },
      });
      
      mediaRecorder.current = new MediaRecorder(stream.current);
      audioChunks.current = [];

      // Set up audio analysis
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      const source = audioContext.current.createMediaStreamSource(stream.current);
      source.connect(analyser.current);
      analyser.current.fftSize = 256;

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      
      // Start timer
      timerInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start audio level animation
      const updateLevel = () => {
        if (analyser.current) {
          const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
          analyser.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          animationFrame.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
          
          // Cleanup
          if (stream.current) {
            stream.current.getTracks().forEach(track => track.stop());
          }
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
          }
          if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
          }
          if (audioContext.current) {
            audioContext.current.close();
          }

          resolve(audioBlob);
        };

        mediaRecorder.current.stop();
        setIsRecording(false);
      } else {
        resolve(null);
      }
    });
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    setRecordingTime(0);
    setAudioLevel(0);
    audioChunks.current = [];
  }, []);

  return {
    isRecording,
    recordingTime,
    audioLevel,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
