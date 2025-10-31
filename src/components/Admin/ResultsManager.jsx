import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Download, Filter, Printer, Loader2, X } from 'lucide-react';
import socketService from '../../services/socketService';

const FilterModal = ({ isOpen, onClose, filters, setFilters, branches, sections, years, semesters, subjects }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl p-6 border border-gray-700 animate-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-100">Filter Results</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Branch</label>
            <select
              value={filters.branch}
              onChange={(e) => setFilters({...filters, branch: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Branches</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section</label>
            <select
              value={filters.section}
              onChange={(e) => setFilters({...filters, section: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Semester</label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters({...filters, semester: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Semesters</option>
              {semesters.map(semester => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
            <select
              value={filters.subject}
              onChange={(e) => setFilters({...filters, subject: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
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
            Clear Filters
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

const ResultsManager = () => {
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [filters, setFilters] = useState({
    branch: '',
    section: '',
    year: '',
    semester: '',
    subject: ''
  });
  const [loading, setLoading] = useState(false);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [examConfigs, setExamConfigs] = useState({});
  const [error, setError] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []); // Fetch results when component mounts

  useEffect(() => {
    const uniqueBranches = [...new Set(results.map(r => r.branch))].sort();
    const uniqueSections = [...new Set(results.map(r => r.section))].sort();
    const uniqueYears = [...new Set(results.map(r => r.year))].sort();
    const uniqueSemesters = [...new Set(results.map(r => r.semester))].sort();
    const uniqueSubjects = [...new Set(results.map(r => r.subject))].sort();
    
    setBranches(uniqueBranches);
    setSections(uniqueSections);
    setYears(uniqueYears);
    setSemesters(uniqueSemesters);
    setSubjects(uniqueSubjects);
  }, [results]);

  useEffect(() => {
    let filtered = [...results];
    
    if (filters.branch) filtered = filtered.filter(r => r.branch === filters.branch);
    if (filters.section) filtered = filtered.filter(r => r.section === filters.section);
    if (filters.year) filtered = filtered.filter(r => r.year === filters.year);
    if (filters.semester) filtered = filtered.filter(r => r.semester === filters.semester);
    if (filters.subject) filtered = filtered.filter(r => r.subject === filters.subject);
    
    setFilteredResults(filtered);
  }, [results, filters]);

  // Add these useEffects to debug state changes
  useEffect(() => {
    console.log('Results updated:', results);
  }, [results]);

  useEffect(() => {
    console.log('Filtered results updated:', filteredResults);
  }, [filteredResults]);

  const fetchResults = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('http://localhost:5000/api/admin/results', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      console.log('Fetched Results:', response.data); // Debug log
      setResults(response.data);
    } catch (error) {
      console.error('Error fetching results:', error);
      setMessage({ 
        text: 'Failed to fetch results: ' + (error.response?.data?.message || error.message),
        type: 'error'
      });
      setResults([]); // Clear results on error
    } finally {
      setLoading(false);
    }
  };

  const fetchExamConfigs = async () => {
    setConfigsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('http://localhost:5000/api/admin/exam-configs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.data) {
        throw new Error('No exam configurations received');
      }

      const configMap = {};
      response.data.forEach(config => {
        const key = `${config.branch}-${config.subject}`;
        configMap[key] = config;
      });
      setExamConfigs(configMap);
    } catch (error) {
      console.error('Error fetching exam configs:', error);
      setError(error.message);
    } finally {
      setConfigsLoading(false);
    }
  };

  useEffect(() => {
    fetchExamConfigs();
  }, []);

  const downloadExcel = (data, filename) => {
    // Prepare the data with proper formatting
    const excelData = data.map((result, index) => ({
      'S.No': index + 1,
      'Student Name': result.name,
      'Roll Number': result.rollNumber,
      'Branch': result.branch,
      'Section': result.section,
      'Year': result.year,
      'Semester': result.semester,
      'Subject': result.subject,
      'Marks': `${result.totalMarks}/${result.numberOfQuestions}`,
      'Date': new Date(result.completedAt).toLocaleDateString(),
      'Time': new Date(result.completedAt).toLocaleTimeString()
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 30 },  // Student Name
      { wch: 15 },  // Roll Number
      { wch: 15 },  // Branch
      { wch: 10 },  // Section
      { wch: 8 },   // Year
      { wch: 12 },  // Semester
      { wch: 35 },  // Subject
      { wch: 12 },  // Marks
      { wch: 12 },  // Date
      { wch: 10 }   // Time
    ];

    // Style header row
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellRef]) worksheet[cellRef] = { v: '' };
        
        if (row === 0) {
          // Header style
          worksheet[cellRef].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };
        } else {
          // Data style
          worksheet[cellRef].s = {
            alignment: { horizontal: "left", vertical: "center" },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };

          // Center align specific columns
          if ([0, 8].includes(col)) {
            worksheet[cellRef].s.alignment.horizontal = "center";
          }

          // Color code marks
          if (col === 8) { // Marks column
            const marks = parseInt(worksheet[cellRef].v);
            worksheet[cellRef].s.fill = {
              fgColor: { rgb: marks >= 15 ? "C6E0B4" : marks >= 10 ? "FFE699" : "FFC7CE" }
            };
          }
        }
      }
    }

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    // Save the file
    XLSX.writeFile(workbook, filename);
  };

  const getFileName = (data, type = 'all') => {
    let fileName = '';

    if (type === 'all') {
      fileName = `${filters.subject || 'all'}_${filters.branch || 'all'}_${filters.section || 'all'}_${filters.semester || 'all'}`;
    } else {
      const firstResult = data[0];
      fileName = `${firstResult.subject}_${firstResult.branch}_${firstResult.section}_${firstResult.semester}`;
    }

    // Clean up the filename by removing invalid characters
    fileName = fileName.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    return `${fileName}.xlsx`;
  };

  const downloadAllResults = () => {
    const filename = getFileName(filteredResults, 'all');
    downloadExcel(filteredResults, filename);
  };

  const downloadBranchResults = () => {
    if (!filters.branch || !filters.subject) {
      setMessage({
        text: 'Please select both branch and subject first',
        type: 'error'
      });
      return;
    }
    
    const branchResults = filteredResults.filter(r => 
      r.branch === filters.branch && r.subject === filters.subject
    );
    const filename = getFileName(branchResults, 'branch');
    downloadExcel(branchResults, filename);
  };

  const downloadSectionResults = () => {
    if (!filters.branch || !filters.section || !filters.subject) {
      setMessage({
        text: 'Please select branch, section, and subject first',
        type: 'error'
      });
      return;
    }
    
    const sectionResults = filteredResults.filter(r => 
      r.branch === filters.branch && 
      r.section === filters.section && 
      r.subject === filters.subject
    );
    const filename = getFileName(sectionResults, 'section');
    downloadExcel(sectionResults, filename);
  };

  const handlePrint = () => {
    const winPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    
    // Create simplified table content
    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Name</th>
            <th>Roll Number</th>
            <th>Subject</th>
            <th>Marks</th>
          </tr>
        </thead>
        <tbody>
          ${filteredResults.map((result, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${result.name}</td>
              <td>${result.rollNumber}</td>
              <td>${result.subject}</td>
              <td>${result.totalMarks}/${result.answers?.length || result.numberOfQuestions || 20}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    winPrint.document.write(`
      <html>
        <head>
          <title>${filters.subject}_MCQ_RESULTS</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              padding: 20px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              border: 1px solid #ddd;
              padding: 10px;
              background: #f8f9fa;
            }
            .info-item {
              text-align: center;
              padding: 0 20px;
            }
            .info-label {
              font-weight: bold;
              margin-bottom: 5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${filters.subject}_MCQ_RESULTS</h1>
            <p>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="info-row">
            <div class="info-item">
              <div class="info-label">Branch</div>
              <div>${filters.branch || 'All'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Section</div>
              <div>${filters.section || 'All'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Subject</div>
              <div>${filters.subject || 'All'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Semester</div>
              <div>${filters.semester || 'All'}</div>
            </div>
          </div>

          ${tableContent}
        </body>
      </html>
    `);
    
    winPrint.document.close();
    winPrint.focus();
    winPrint.print();
    winPrint.close();
  };

  const getNumberOfQuestions = (result) => {
    if (!result) return 20;
    try {
      // First try to get from the result itself
      if (result.numberOfQuestions) {
        return result.numberOfQuestions;
      }

      // Then try to get from exam configs
      const configKey = `${result.branch}-${result.subject}`;
      if (examConfigs[configKey]?.numberOfQuestions) {
        return examConfigs[configKey].numberOfQuestions;
      }

      // If both fail, count answers if available
      if (Array.isArray(result.answers)) {
        return result.answers.length;
      }

      // Default fallback
      return 20;
    } catch (error) {
      console.error('Error getting number of questions:', error);
      return 20;
    }
  };

  useEffect(() => {
    // Subscribe to real-time updates
    const handleResultUpdate = (newResult) => {
      setResults(prevResults => {
        const index = prevResults.findIndex(r => r._id === newResult._id);
        if (index !== -1) {
          const updatedResults = [...prevResults];
          updatedResults[index] = newResult;
          return updatedResults;
        }
        return [newResult, ...prevResults];
      });
    };

    socketService.subscribeToResultsUpdates(handleResultUpdate);
    return () => socketService.unsubscribeFromResultsUpdates(handleResultUpdate);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Results & Reports</h2>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilterModal(true)}
              className="flex items-center px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              {Object.values(filters).some(Boolean) 
                ? 'Filters Applied'
                : 'Filter Results'
              }
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            {filteredResults.length > 0 && (
              <button
                onClick={downloadAllResults}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Add Filter Modal */}
        <FilterModal 
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          setFilters={setFilters}
          branches={branches}
          sections={sections}
          years={years}
          semesters={semesters}
          subjects={subjects}
        />

        {/* Messages */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'error' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Results Table */}
        {loading || configsLoading ? (
          <div className="text-center py-8">
            <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-400">
              {loading ? 'Loading results...' : 'Loading exam configurations...'}
            </p>
          </div>
        ) : error ? (
          <div className="mb-4 p-4 rounded-md bg-red-900 text-red-300">
            {error}
          </div>
        ) : message.text ? (
          <div className={`p-4 rounded-md ${
            message.type === 'error' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'
          }`}>
            {message.text}
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {results.length === 0 
              ? 'No results found in the system'
              : 'No results match the selected filters'}
          </div>
        ) : (
          <div className="overflow-x-auto" id="results-table">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredResults.map((result, index) => (
                  <tr key={result._id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                      {result.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      {result.rollNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      {result.branch}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      {result.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      {result.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      {result.semester}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      {result.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        result.totalMarks >= (getNumberOfQuestions(result) * 0.75)
                          ? 'bg-green-900 text-green-300'
                          : result.totalMarks >= (getNumberOfQuestions(result) * 0.5)
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {result.totalMarks}/{getNumberOfQuestions(result)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      {new Date(result.completedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Results Summary */}
        {filteredResults.length > 0 && (
          <div className="mt-6 bg-gray-900 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Results Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Total Students</div>
                <div className="text-2xl font-bold text-blue-600">{filteredResults.length}</div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Average Score</div>
                <div className="text-2xl font-bold text-green-600">
                  {(filteredResults.reduce((sum, r) => sum + r.totalMarks, 0) / filteredResults.length).toFixed(1)}
                  <span className="text-sm text-gray-500 ml-1">
                    /{getNumberOfQuestions(filteredResults[0])}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Highest Score</div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.max(...filteredResults.map(r => r.totalMarks))}
                  <span className="text-sm text-gray-500 ml-1">
                    /{getNumberOfQuestions(filteredResults[0])}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal 
        isOpen={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)} 
        filters={filters} 
        setFilters={setFilters}
        branches={branches}
        sections={sections}
        years={years}
        semesters={semesters}
        subjects={subjects}
      />
    </div>
  );
};

export default ResultsManager;