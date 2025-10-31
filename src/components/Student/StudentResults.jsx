import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Award, BookOpen, AlertCircle } from 'lucide-react';
import axios from 'axios';

const StudentResults = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await axios.get(
          'http://192.168.29.44:5000/api/student/results',
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            params: {
              rollNumber: user.rollNumber
            }
          }
        );

        // Transform the data to show correct score format
        const transformedResults = response.data.map(result => ({
          ...result,
          totalQuestions: result.totalQuestions || 0,  // Total number of questions
          totalMarks: result.correctAnswers || 0       // Correct answers (marks obtained)
        }));

        setResults(transformedResults);
        setError(null);
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load your results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.rollNumber) {
      fetchResults();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center">
        <Award className="h-7 w-7 text-green-400 mr-3" />
        Your Exam Results
      </h2>

      {results.length > 0 ? (
        <div className="space-y-6">
          {results.map((result) => (
            <div
              key={result._id}
              className="bg-gray-700/50 rounded-lg p-6 hover:bg-gray-700/70 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-xl font-semibold text-gray-100 flex items-center">
                    <BookOpen className="h-5 w-5 text-green-400 mr-2" />
                    {result.subject}
                  </h3>
                  <div className="mt-2 text-sm text-gray-400 space-x-4">
                    <span>Year: {result.year}</span>
                    <span>•</span>
                    <span>Semester: {result.semester}</span>
                    <span>•</span>
                    <span>Date: {new Date(result.completedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Score</p>
                    <p className="text-2xl font-bold text-green-400">
                      {result.totalMarks}/{result.totalQuestions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-700/30 rounded-lg">
          <Award className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Results Yet</h3>
          <p className="text-gray-500">
            Complete some exams to see your results here.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentResults;