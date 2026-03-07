import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const TranscriptBox = ({ transcript, isRecording }) => {
  return (
    <div className="card h-full">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="text-primary" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">Live Transcript</h3>
        {isRecording && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center space-x-2 ml-auto"
          >
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-sm text-red-500 font-medium">Recording</span>
          </motion.div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto border border-gray-200">
        {transcript ? (
          <div className="text-gray-700 leading-relaxed space-y-3">
            {transcript.split('\n\n').filter(line => line.trim()).map((line, index) => {
              const isDoctor = line.startsWith('Doctor:');
              const isPatient = line.startsWith('Patient:');
              
              if (isDoctor || isPatient) {
                const speaker = isDoctor ? 'Doctor' : 'Patient';
                const text = line.replace(/^(Doctor:|Patient:)\s*/, '');
                
                return (
                  <div key={index} className="mb-2">
                    <span className={`font-semibold ${isDoctor ? 'text-blue-600' : 'text-green-600'}`}>
                      {speaker}:
                    </span>
                    <span className="ml-2 text-gray-700">{text}</span>
                  </div>
                );
              }
              
              return (
                <p key={index} className="text-gray-700">
                  {line}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center mt-20">
            {isRecording
              ? 'Listening... Start speaking to see transcript'
              : 'No transcript yet. Start recording to begin.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default TranscriptBox;
