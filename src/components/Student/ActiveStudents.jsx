import React, { useState, useEffect } from 'react';
import socketService from '../../services/socketService';
import { Users } from 'lucide-react';

const ActiveStudents = ({ examId }) => {
  const [activeStudents, setActiveStudents] = useState([]);

  useEffect(() => {
    const handleActiveStudents = (data) => {
      if (data.examId === examId) {
        setActiveStudents(data.students);
      }
    };

    socketService.subscribeToActiveStudents(handleActiveStudents);

    return () => {
      socketService.unsubscribeFromActiveStudents(handleActiveStudents);
    };
  }, [examId]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <Users className="w-5 h-5 text-blue-400 mr-2" />
        <h3 className="text-sm font-medium text-gray-200">
          Students Taking Exam ({activeStudents.length})
        </h3>
      </div>
      
      <div className="space-y-2">
        {activeStudents.map((student) => (
          <div 
            key={student.rollNumber}
            className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2"
          >
            <span className="text-sm text-gray-300">{student.name}</span>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
              Active
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveStudents;