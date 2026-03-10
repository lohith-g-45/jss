import { motion } from 'framer-motion';
import { Stethoscope, User, Clock, BarChart2 } from 'lucide-react';

/**
 * ConsultationReport – renders the AssemblyAI speaker-diarization result
 * as a visual Doctor / Patient conversation with per-speaker statistics.
 *
 * Props:
 *   utterances: Array<{ speaker: 'Doctor'|'Patient', text: string, start: number, end: number }>
 */
const ConsultationReport = ({ utterances }) => {
  if (!utterances || utterances.length === 0) return null;

  const doctorUtts = utterances.filter((u) => u.speaker === 'Doctor');
  const patientUtts = utterances.filter((u) => u.speaker === 'Patient');

  // Total speaking duration in ms
  const totalDuration = (speaker) =>
    utterances
      .filter((u) => u.speaker === speaker)
      .reduce((sum, u) => sum + ((u.end ?? 0) - (u.start ?? 0)), 0);

  const doctorMs = totalDuration('Doctor');
  const patientMs = totalDuration('Patient');
  const totalMs = doctorMs + patientMs || 1;

  const formatDur = (ms) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const fmtStart = (ms) => {
    if (ms == null) return '';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <BarChart2 className="text-purple-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Consultation Report</h3>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
            AssemblyAI Diarization
          </span>
        </div>
        <span className="text-xs text-gray-400">{utterances.length} utterances</span>
      </div>

      {/* Speaker Statistics */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Doctor */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Stethoscope size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Doctor</p>
              <p className="text-sm font-bold text-blue-800">{doctorUtts.length} turns</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-blue-600">
            <Clock size={11} />
            <span>{formatDur(doctorMs)}</span>
            <span className="ml-auto text-blue-400">
              {Math.round((doctorMs / totalMs) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-blue-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${(doctorMs / totalMs) * 100}%` }}
            />
          </div>
        </div>

        {/* Patient */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <User size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-500 font-medium uppercase tracking-wide">Patient</p>
              <p className="text-sm font-bold text-green-800">{patientUtts.length} turns</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-green-600">
            <Clock size={11} />
            <span>{formatDur(patientMs)}</span>
            <span className="ml-auto text-green-400">
              {Math.round((patientMs / totalMs) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-green-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(patientMs / totalMs) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Conversation Timeline */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {utterances.map((u, i) => {
          const isDoctor = u.speaker === 'Doctor';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: isDoctor ? -8 : 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.6) }}
              className={`flex ${isDoctor ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
                  isDoctor
                    ? 'bg-blue-50 border border-blue-100 rounded-tl-sm'
                    : 'bg-green-50 border border-green-100 rounded-tr-sm'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  {isDoctor ? (
                    <Stethoscope size={11} className="text-blue-500" />
                  ) : (
                    <User size={11} className="text-green-500" />
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      isDoctor ? 'text-blue-600' : 'text-green-600'
                    }`}
                  >
                    {u.speaker}
                  </span>
                  {u.start != null && (
                    <span className="text-xs text-gray-400 ml-1">{fmtStart(u.start)}</span>
                  )}
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{u.text}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ConsultationReport;
