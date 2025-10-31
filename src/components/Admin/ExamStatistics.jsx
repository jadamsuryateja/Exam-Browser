import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Calculator, Users, Award, TrendingUp, X, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import socketService from '../../services/socketService';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const RADIAN = Math.PI / 180;

const BRANCH_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const SECTION_COLORS = ['#06B6D4', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const StatsCard = ({ title, value, icon: Icon, color }) => (
  <div className={`bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${color}`}>
          {value === '-' ? '-' : value}
        </h3>
      </div>
      <div className={`p-3 rounded-full ${color.replace('text', 'bg')}/10`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </div>
);

const ExamStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    branch: '',
    section: '',
    year: '',
    semester: '',
    subject: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    branches: [],
    sections: [],
    years: [],
    semesters: [],
    subjects: []
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: '-',
    averageScore: '-',
    highestScore: '-',
    lowestScore: '-',
    branchStats: {},
    sectionStats: {}
  });
  const [selectedStudentStats, setSelectedStudentStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch filter options when component mounts
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/admin/filter-options', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setFilterOptions({
          branches: response.data.branches || [],
          sections: response.data.sections || [],
          years: response.data.years || [],
          semesters: response.data.semesters || [],
          subjects: response.data.subjects || []
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching filter options:', error);
        setError('Failed to load filter options');
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleSearchInputChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:5000/api/admin/student-suggestions?query=${query}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setSuggestions(response.data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = async (student) => {
    setSearchQuery(student.rollNumber);
    setShowSuggestions(false);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/admin/filtered-results?rollNumber=${student.rollNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.results) {
        const results = response.data.results;
        
        // Find highest and lowest scoring exams
        let highestExam = null;
        let lowestExam = null;
        let totalMarks = 0;
        let totalQuestions = 0;

        results.forEach(exam => {
          const marks = exam.totalMarks || 0;
          const questions = exam.totalQuestions || exam.answers?.length || 0;
          
          totalMarks += marks;
          totalQuestions += questions;

          if (!highestExam || marks > highestExam.totalMarks) {
            highestExam = exam;
          }
          if (!lowestExam || marks < lowestExam.totalMarks) {
            lowestExam = exam;
          }
        });

        const studentStats = {
          name: student.name,
          rollNumber: student.rollNumber,
          totalExams: results.length,
          // Calculate percentage only if there are questions
          averageScore: totalQuestions > 0 
            ? ((totalMarks / totalQuestions) * 100).toFixed(1)
            : '0.0',
          highestScore: highestExam?.totalMarks || 0,
          highestTotal: highestExam?.totalQuestions || highestExam?.answers?.length || 0,
          lowestScore: lowestExam?.totalMarks || 0,
          lowestTotal: lowestExam?.totalQuestions || lowestExam?.answers?.length || 0,
          exams: results.map(exam => ({
            subject: exam.subject,
            totalMarks: exam.totalMarks || 0,
            totalQuestions: exam.totalQuestions || exam.answers?.length || 0,
            completedAt: exam.completedAt
          })).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        };

        console.log('Calculated student stats:', studentStats); // Debug log
        setSelectedStudentStats(studentStats);
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
      setError('Failed to fetch student statistics');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter submission
  const handleFilterSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(
        `http://localhost:5000/api/admin/filtered-results?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        const { results, stats: responseStats, branchStats, sectionStats } = response.data;
        
        setStats({
          totalStudents: results.length,
          averageScore: parseFloat(responseStats.avgMarks || 0).toFixed(1),
          highestScore: responseStats.highestMarks || 0,
          lowestScore: responseStats.lowestMarks || 0,
          branchStats: branchStats || {},
          sectionStats: sectionStats || {}
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.response?.data?.message || 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  // Update the filter change handler
  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      console.log('New filters:', newFilters);
      return newFilters;
    });
  };

  // Add this helper function at the top of your component, after the state declarations
  const getScoreDisplay = (marks, total) => {
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        marks >= (total * 0.75)
          ? 'bg-green-900 text-green-300'
          : marks >= (total * 0.5)
          ? 'bg-yellow-900 text-yellow-300'
          : 'bg-red-900 text-red-300'
      }`}>
        {marks}/{total}
      </span>
    );
  };

  const modalOverlayStyles = {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50
  };

  useEffect(() => {
    const handleResultUpdate = () => {
      // Refresh statistics when new results come in
      if (Object.values(filters).some(Boolean)) {
        handleFilterSubmit();
      }
    };

    socketService.subscribeToResultsUpdates(handleResultUpdate);
    return () => socketService.unsubscribeFromResultsUpdates(handleResultUpdate);
  }, [filters, handleFilterSubmit]);

  return (
    <div className="space-y-6 p-6">
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        {/* Move Search Form to top */}
        <form className="mb-8">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search by Roll Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (suggestions.length > 0) {
                        handleSuggestionSelect(suggestions[0]);
                      } else if (searchQuery.trim()) {
                        handleSuggestionSelect({ rollNumber: searchQuery.trim() });
                      }
                    }
                  }}
                  placeholder="Enter Roll Number"
                  className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg">
                    {suggestions.map((student) => (
                      <div
                        key={student.rollNumber}
                        onClick={() => handleSuggestionSelect(student)}
                        className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-gray-200"
                      >
                        <div>{student.name}</div>
                        <div className="text-sm text-gray-400">{student.rollNumber}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStudentStats(null);
                }}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
              {/* Keep only the filter button in the search form at the top */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                <Filter className="h-5 w-5" />
                Filters
                {Object.values(filters).some(v => v) && (
                  <span className="bg-blue-500 text-xs px-2 py-1 rounded-full">
                    {Object.values(filters).filter(v => v).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Loader */}
        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Stats Cards with Animations */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="transform transition-all duration-500 ease-out animate-slide-right">
            <StatsCard
              title="Total Students"
              value={loading ? '-' : stats.totalStudents}
              icon={Users}
              color="text-blue-500"
            />
          </div>
          <div className="transform transition-all duration-500 ease-out animate-slide-up delay-150">
            <StatsCard
              title="Average Score"
              value={loading ? '-' : stats.averageScore}
              icon={Calculator}
              color="text-green-500"
            />
          </div>
          <div className="transform transition-all duration-500 ease-out animate-slide-down delay-300">
            <StatsCard
              title="Highest Score"
              value={loading ? '-' : stats.highestScore}
              icon={Award}
              color="text-yellow-500"
            />
          </div>
          <div className="transform transition-all duration-500 ease-out animate-slide-left delay-450">
            <StatsCard
              title="Lowest Score"
              value={loading ? '-' : stats.lowestScore}
              icon={TrendingUp}
              color="text-red-500"
            />
          </div>
        </div>

        {/* Branch and Section Performance */}
        {(Object.keys(stats.branchStats).length > 0 || Object.keys(stats.sectionStats).length > 0) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Branch Performance */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 transform transition-all duration-500 ease-out animate-slide-right">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">Branch Performance</h3>
              <div className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart
                      data={Object.entries(stats.branchStats).map(([branch, data]) => ({
                        name: branch,
                        average: parseFloat(data.avg),
                        students: data.count
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.375rem'
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="average"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                        name="Average Score"
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={1500}
                      />
                      <Bar
                        dataKey="students"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                        name="Number of Students"
                        isAnimationActive={true}
                        animationBegin={500}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {Object.entries(stats.branchStats || {}).map(([branch, data], index) => (
                    <div key={branch} className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="text-gray-200 font-medium mb-2">{branch}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Average</p>
                          <p className="text-xl font-bold text-blue-500">{data.avg}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Students</p>
                          <p className="text-xl font-bold text-green-500">{data.count}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section Performance */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 transform transition-all duration-500 ease-out animate-slide-left">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">Section Performance</h3>
              <div className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={Object.entries(stats.sectionStats).map(([section, data]) => ({
                          name: `Section ${section}`,
                          value: parseFloat(data.avg)
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={1500}
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      >
                        {Object.entries(stats.sectionStats).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={SECTION_COLORS[index % SECTION_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.375rem'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {Object.entries(stats.sectionStats || {}).map(([section, data], index) => (
                    <div key={section} className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="text-gray-200 font-medium mb-2">Section {section}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Average</p>
                          <p className="text-xl font-bold text-blue-500">{data.avg}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Students</p>
                          <p className="text-xl font-bold text-green-500">{data.count}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Stats and History */}
        {selectedStudentStats && (
          <div className="mt-8 transform transition-all duration-500 ease-in-out">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-200">
                  Student Statistics - {selectedStudentStats.name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedStudentStats(null);
                    setSearchQuery('');
                  }}
                  className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-200" />
                </button>
              </div>
                    
              {/* Student Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Exams</p>
                  <p className="text-2xl font-bold text-blue-500">{selectedStudentStats.totalExams}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Highest Score</p>
                  <div className="flex items-baseline space-x-1">
                    <p className="text-2xl font-bold text-yellow-500">
                      {selectedStudentStats.highestScore}
                    </p>
                    <span className="text-sm text-gray-400">/{selectedStudentStats.highestTotal}</span>
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Lowest Score</p>
                  <div className="flex items-baseline space-x-1">
                    <p className="text-2xl font-bold text-red-500">
                      {selectedStudentStats.lowestScore}
                    </p>
                    <span className="text-sm text-gray-400">/{selectedStudentStats.lowestTotal}</span>
                  </div>
                </div>
              </div>

              {/* Exam History Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                  {selectedStudentStats.exams.map((exam, index) => (
  <tr 
    key={index}
    className="transform transition-colors duration-200 hover:bg-gray-700"
  >
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
      {exam.subject}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        exam.totalMarks >= (exam.totalQuestions * 0.75)
          ? 'bg-green-900 text-green-300'
          : exam.totalMarks >= (exam.totalQuestions * 0.5)
          ? 'bg-yellow-900 text-yellow-300'
          : 'bg-red-900 text-red-300'
      }`}>
        {exam.totalMarks}/{exam.totalQuestions || '-'}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
      {new Date(exam.completedAt).toLocaleDateString()}
    </td>
  </tr>
))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add this section for charts */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Exam Performance Pie Chart */}
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Exam Performance</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Passed', value: selectedStudentStats.exams.filter(exam => exam.totalMarks >= (exam.totalQuestions * 0.5)).length },
                          { name: 'Failed', value: selectedStudentStats.exams.filter(exam => exam.totalMarks < (exam.totalQuestions * 0.5)).length }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {[
                          { name: 'Passed', color: '#10B981' },
                          { name: 'Failed', color: '#EF4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Score Distribution Bar Chart */}
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Score Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={selectedStudentStats.exams}>
                      <XAxis dataKey="subject" stroke="#8884d8" />
                      <YAxis stroke="#8884d8" />
                      <Tooltip />
                      <Bar dataKey="totalMarks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showFilters && (
  <div style={modalOverlayStyles} onClick={() => setShowFilters(false)}>
    <div 
      className="bg-gray-800 p-6 rounded-lg w-full max-w-md"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Filters</h3>
        <button
          onClick={() => setShowFilters(false)}
          className="text-gray-400 hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Branch Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Branch
          </label>
          <select
            value={filters.branch}
            onChange={(e) => handleFilterChange('branch', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200"
          >
            <option value="">All Branches</option>
            {filterOptions.branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Section
          </label>
          <select
            value={filters.section}
            onChange={(e) => handleFilterChange('section', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200"
          >
            <option value="">All Sections</option>
            {filterOptions.sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Year
          </label>
          <select
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200"
          >
            <option value="">All Years</option>
            {filterOptions.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Semester Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Semester
          </label>
          <select
            value={filters.semester}
            onChange={(e) => handleFilterChange('semester', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200"
          >
            <option value="">All Semesters</option>
            {filterOptions.semesters.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Subject
          </label>
          <select
            value={filters.subject}
            onChange={(e) => handleFilterChange('subject', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200"
          >
            <option value="">All Subjects</option>
            {filterOptions.subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={() => {
              setFilters({
                branch: '',
                section: '',
                year: '',
                semester: '',
                subject: ''
              });
              handleFilterSubmit();
              setShowFilters(false);
            }}
            className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md"
          >
            Clear All
          </button>
          <button
            onClick={() => {
              handleFilterSubmit();
              setShowFilters(false);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default ExamStatistics;