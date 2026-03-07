import { motion } from 'framer-motion';

const StatCard = ({ icon: Icon, title, value, trend, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-blue-50 text-primary',
    accent: 'bg-teal-50 text-accent',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className="card"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          {trend && (
            <p className="text-sm text-gray-600 mt-2">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
