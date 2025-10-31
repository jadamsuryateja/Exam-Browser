import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Filter, Search, Download, X, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import socketService from '../../services/socketService';

const ExamReattemptManager = () => {
  const [filters, setFilters] = useState({
    branch: '',
    year: '',
    semester: '',
    section: '',
    subject: ''
  });

  const [filterOptions, setFilterOptions] = useState({
    branches: [],
    years: [],
    semesters: [],
    sections: [],
    subjects: []
  });

  const [students, setStudents] = useState({
    attempted: [],
    notAttempted: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Add submitting state

  // Make fetchStudents memoized with useCallback
  const fetchStudents = useCallback(async () => {
    if (!filters.branch || !filters.year || !filters.semester || !filters.section || !filters.subject) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://192.168.29.44:5000/api/admin/exam-attempts',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: filters
        }
      );

      setStudents({
        attempted: response.data.attempted || [],
        notAttempted: response.data.notAttempted || []
      });
    } catch (error) {
      setError('Failed to fetch student data');
      toast.error('Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load of filter options
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://192.168.29.44:5000/api/admin/filter-options', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setFilterOptions(prev => ({
          ...prev,
          branches: response.data.branches || [],
          years: response.data.years || [],
          semesters: response.data.semesters || []
        }));
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
        toast.error('Failed to load filter options');
      }
    };

    fetchInitialData();
  }, []);

  // Fetch sections and subjects when branch, year, and semester are selected
  useEffect(() => {
    if (filters.branch && filters.year && filters.semester) {
      fetchSectionsAndSubjects();
    }
  }, [filters.branch, filters.year, filters.semester]);

  // Add after other imports
  useEffect(() => {
    const handleResultUpdate = () => {
      // Refresh student lists when results are updated
      if (Object.values(filters).every(Boolean)) {
        fetchStudents();
      }
    };

    socketService.subscribeToResultsUpdates(handleResultUpdate);
    return () => socketService.unsubscribeFromResultsUpdates(handleResultUpdate);
  }, [filters, fetchStudents]);

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://192.168.29.44:5000/api/admin/filter-options', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFilterOptions(prev => ({
        ...prev,
        branches: response.data.branches,
        years: response.data.years,
        semesters: response.data.semesters
      }));
    } catch (error) {
      setError('Failed to fetch filter options');
    }
  };

  const fetchSectionsAndSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://192.168.29.44:5000/api/admin/sections-subjects?branch=${filters.branch}&year=${filters.year}&semester=${filters.semester}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setFilterOptions(prev => ({
        ...prev,
        sections: response.data.sections,
        subjects: response.data.subjects
      }));
    } catch (error) {
      setError('Failed to fetch sections and subjects');
    }
  };

  // const fetchStudents = async () => {
  //   if (!filters.branch || !filters.year || !filters.semester || !filters.section || !filters.subject) {
  //     setError('Please select all filter criteria');
  //     return;
  //   }

  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const token = localStorage.getItem('token');
  //     const response = await axios.get(
  //       'http://192.168.29.44:5000/api/admin/exam-attempts',
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //         params: filters
  //       }
  //     );

  //     setStudents({
  //       attempted: response.data.attempted,
  //       notAttempted: response.data.notAttempted
  //     });
  //   } catch (error) {
  //     setError('Failed to fetch student data');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      // Reset dependent fields
      ...(field === 'branch' && { section: '', subject: '' }),
      ...(field === 'year' && { semester: '', section: '', subject: '' }),
      ...(field === 'semester' && { section: '', subject: '' })
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const downloadExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Create empty worksheets first
      const attemptedWs = XLSX.utils.aoa_to_sheet([]);
      const notAttemptedWs = XLSX.utils.aoa_to_sheet([]);

      // Add title rows first
      addTitleRow(attemptedWs, filters);
      addTitleRow(notAttemptedWs, filters);

      // Add headers at row 5 (after title rows and empty row)
      const headers = ['S.No', 'Roll Number', 'Student Name', 'Section', 'Attempt Date', 'Status'];
      const notAttemptedHeaders = ['S.No', 'Roll Number', 'Student Name', 'Section', 'Status'];

      XLSX.utils.sheet_add_aoa(attemptedWs, [headers], { origin: 4 });
      XLSX.utils.sheet_add_aoa(notAttemptedWs, [notAttemptedHeaders], { origin: 4 });

      // Add data starting from row 5
      const attemptedData = students.attempted.map((student, index) => [
        index + 1,
        student.rollNumber,
        student.name,
        student.section,
        new Date(student.attemptDate).toLocaleDateString(),
        'Attempted'
      ]);

      const notAttemptedData = students.notAttempted.map((student, index) => [
        index + 1,
        student.rollNumber,
        student.name,
        student.section,
        'Not Attempted'
      ]);

      // Add data after headers
      XLSX.utils.sheet_add_aoa(attemptedWs, attemptedData, { origin: 5 });
      XLSX.utils.sheet_add_aoa(notAttemptedWs, notAttemptedData, { origin: 5 });

      // Set column widths
      const columnWidths = [
        { wch: 8 },   // S.No
        { wch: 15 },  // Roll Number
        { wch: 30 },  // Student Name
        { wch: 10 },  // Section
        { wch: 15 },  // Attempt Date
        { wch: 12 }   // Status
      ];

      attemptedWs['!cols'] = columnWidths;
      notAttemptedWs['!cols'] = columnWidths.slice(0, 5);

      // Style the sheets
      styleSheet(attemptedWs);
      styleSheet(notAttemptedWs);

      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(wb, attemptedWs, "Attempted Students");
      XLSX.utils.book_append_sheet(wb, notAttemptedWs, "Not Attempted Students");

      // Generate filename
      const date = new Date().toLocaleDateString().replace(/\//g, '-');
      const filename = `${filters.branch}_${filters.semester}_${filters.section}_${filters.subject}_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Excel download error:', error);
      toast.error('Failed to download Excel file');
    }
  };

  // Update the addTitleRow function
  const addTitleRow = (ws, filters) => {
    const titles = [
      [`DEPARTMENT OF ${filters.branch.toUpperCase()}`],
      [`${filters.subject.toUpperCase()} - SEMESTER ${filters.semester}`],
      [`Section: ${filters.section} | Date: ${new Date().toLocaleDateString()}`],
      [] // Empty row
    ];

    XLSX.utils.sheet_add_aoa(ws, titles, { origin: 0 });

    // Style and merge cells for each title row
    for(let i = 0; i < 3; i++) {
      const cell = XLSX.utils.encode_cell({ r: i, c: 0 });
      ws[cell].s = {
        font: { 
          bold: true, 
          size: i === 0 ? 16 : 14,
          color: { rgb: "000000" },
          name: "Arial"
        },
        alignment: { 
          horizontal: "center",
          vertical: "center"
        },
        fill: {
          fgColor: { rgb: i === 0 ? "E5E7EB" : "FFFFFF" }
        }
      };

      // Merge cells for titles
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({
        s: { r: i, c: 0 },
        e: { r: i, c: 5 }  // Merge across all columns
      });
    }
  };

  // Update the styleSheet function to handle the new row offset
  const styleSheet = (ws) => {
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;

        // Data headers style (now at row 5, after title rows and empty row)
        if (R === 5) {
          ws[cellAddress].s = {
            font: { 
              bold: true, 
              color: { rgb: "FFFFFF" }, 
              name: "Arial", 
              sz: 12 
            },
            fill: { 
              fgColor: { rgb: "4B5563" } 
            },
            alignment: { 
              horizontal: "center", 
              vertical: "center",
              wrapText: true 
            },
            border: {
              top: { style: "medium", color: { rgb: "374151" } },
              bottom: { style: "medium", color: { rgb: "374151" } },
              left: { style: "medium", color: { rgb: "374151" } },
              right: { style: "medium", color: { rgb: "374151" } }
            }
          };
        }

        // Data cells style (after headers)
        if (R > 5) {
          ws[cellAddress].s = {
            font: { name: "Arial", sz: 11 },
            alignment: { 
              horizontal: C === 0 ? "center" : "left",
              vertical: "center" 
            },
            border: {
              top: { style: "thin", color: { rgb: "D1D5DB" } },
              bottom: { style: "thin", color: { rgb: "D1D5DB" } },
              left: { style: "thin", color: { rgb: "D1D5DB" } },
              right: { style: "thin", color: { rgb: "D1D5DB" } }
            },
            fill: {
              fgColor: { rgb: R % 2 === 0 ? "F3F4F6" : "FFFFFF" }
            }
          };
        }
      }
    }
  };

  const handleReattempt = async (resultId) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      await axios.delete(`http://192.168.29.44:5000/api/admin/exam-result/${resultId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the student lists
      await fetchStudents();
      setShowConfirmation(false);
      toast.success('Student can now reattempt the exam');
      
    } catch (error) {
      console.error('Reattempt error:', error);
      toast.error('Failed to enable reattempt');
    } finally {
      setSubmitting(false);
    }
  };

  // Add before the return statement
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(students.attempted.map(student => student._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleBulkReattempt = async () => {
    try {
      setSubmitting(true); // Add this state if not already present
      const token = localStorage.getItem('token');

      // Get the first selected result to get exam details
      const firstResult = students.attempted.find(s => selectedStudents.includes(s._id));
      
      if (!firstResult) {
        toast.error('No students selected');
        return;
      }

      // Delete results for all selected students
      await Promise.all(
        selectedStudents.map(id => 
          axios.delete(`http://192.168.29.44:5000/api/admin/exam-result/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      
      // Refresh the student lists
      await fetchStudents();
      
      setSelectedStudents([]);
      setShowConfirmation(false);
      toast.success('Selected students can now reattempt the exam');

    } catch (error) {
      console.error('Bulk reattempt error:', error);
      toast.error('Failed to enable reattempts');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Modal Component
  const FilterModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-100">Filter Results</h3>
          <button 
            onClick={() => setShowFilterModal(false)}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
          setShowFilterModal(false);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Branch Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Branch
              </label>
              <select
                value={filters.branch}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Branch</option>
                {filterOptions.branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Year</option>
                {filterOptions.years.map(year => (
                  <option key={year} value={year}>Year {year}</option>
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!filters.year}
              >
                <option value="">Select Semester</option>
                {filterOptions.semesters.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!filters.semester}
              >
                <option value="">Select Section</option>
                {filterOptions.sections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!filters.semester}
              >
                <option value="">Select Subject</option>
                {filterOptions.subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setFilters({
                  branch: '',
                  year: '',
                  semester: '',
                  section: '',
                  subject: ''
                });
              }}
              className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Apply Filters'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Create a custom checkbox component
  const CustomCheckbox = ({ checked, onChange, label }) => (
    <label className="inline-flex items-center">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only" // Hide original checkbox
          checked={checked}
          onChange={onChange}
        />
        <div className={`
          w-5 h-5 border-2 rounded-md
          ${checked 
            ? 'bg-blue-500 border-blue-500' 
            : 'bg-gray-700 border-gray-600'}
          transition-colors duration-200
        `}>
          {checked && (
            <svg
              className="w-full h-full text-white p-[2px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
      {label && <span className="ml-2 text-gray-300">{label}</span>}
    </label>
  );

  // Update the header section in the return statement
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-100">Exam Reattempt Manager</h2>
            <button
              onClick={() => {
                setStudents({ attempted: [], notAttempted: [] });
                setSelectedStudents([]);
                setError(null);
                setFilters({
                  branch: '',
                  year: '',
                  semester: '',
                  section: '',
                  subject: ''
                });
                setFilterOptions(prev => ({
                  ...prev,
                  sections: [],
                  subjects: []
                }));
                toast.success('Content cleared successfully');
              }}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
              title="Clear content"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilterModal(true)}
              className="flex items-center px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
            {(students.attempted.length > 0 || students.notAttempted.length > 0) && (
              <button
                onClick={downloadExcel}
                className="flex items-center px-4 py-2 bg-green-600/90 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Show error if any */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/20 border border-red-800">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && (students.attempted.length > 0 || students.notAttempted.length > 0) && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Attempted Students Card */}
            <div className="bg-gray-900/50 backdrop-blur rounded-xl shadow-xl border border-gray-700/50">
              <div className="p-5 border-b border-gray-700">
                <div>
                  <h3 className="text-lg font-medium text-gray-100">
                    Students Who Attempted
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Total: {students.attempted.length} students
                  </p>
                </div>
              </div>
              <div className="p-5">
                <div className="overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px] scrollbar-hide">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800/80">
                        <tr>
                          <th className="sticky top-0 bg-gray-800/95 backdrop-blur px-4 py-3 text-left">
                            <CustomCheckbox
                              checked={selectedStudents.length === students.attempted.length}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th className="sticky top-0 bg-gray-800/95 backdrop-blur px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Roll Number
                          </th>
                          <th className="sticky top-0 bg-gray-800/95 backdrop-blur px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="sticky top-0 bg-gray-800/95 backdrop-blur px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Attempt Date
                          </th>
                          <th className="sticky top-0 bg-gray-800/95 backdrop-blur px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {students.attempted.map((student) => (
                          <tr key={student._id} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3">
                              <CustomCheckbox
                                checked={selectedStudents.includes(student._id)}
                                onChange={() => handleSelectStudent(student._id)}
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {student.rollNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {student.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {new Date(student.attemptDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedStudents([student._id]);
                                  setShowConfirmation(true);
                                }}
                                className="inline-flex items-center px-3 py-1 bg-blue-600/80 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors duration-200"
                              >
                                Reattempt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {selectedStudents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => setShowConfirmation(true)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                    >
                      Reattempt Selected ({selectedStudents.length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Not Attempted Students Card */}
            <div className="bg-gray-900/50 backdrop-blur rounded-xl shadow-xl border border-gray-700/50">
              <div className="p-5 border-b border-gray-700">
                <div>
                  <h3 className="text-lg font-medium text-gray-100">
                    Students Who Haven't Attempted
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Total: {students.notAttempted.length} students
                  </p>
                </div>
              </div>
              <div className="p-5">
                <div className="overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px] scrollbar-hide">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800/80">
                        <tr>
                          <th className="sticky top-0 bg-gray-800/95 backdrop-blur px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Roll Number
                          </th>
                          <th className="sticky top-0 bg-gray-800/95 backdrop-blur px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="sticky top-0 bg-gray-800/95 backdrop-blur px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Section
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {students.notAttempted.map((student) => (
                          <tr key={student._id} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {student.rollNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {student.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {student.section}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && <FilterModal />}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-100 mb-4">
              Confirm Reattempt
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to allow {selectedStudents.length} student(s) to reattempt the exam? 
              This action cannot be undone and will delete all previous attempts.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={submitting}
                className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkReattempt}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamReattemptManager;