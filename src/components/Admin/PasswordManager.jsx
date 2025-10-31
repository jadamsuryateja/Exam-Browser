import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Edit2, Trash2, Save } from 'lucide-react';
import axios from 'axios';
import socketService from '../../services/socketService';

const PasswordManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredPasswords, setFilteredPasswords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editedValues, setEditedValues] = useState({
    name: '',
    rollNumber: '',
    password: '',
    branch: '',
    section: ''
  });

  const searchRef = useRef(null);
  const suggestionRef = useRef(null);

  // Debounce function for search
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedFetchStudents = debounce(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/admin/student-suggestions?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(response.data);
    } catch (err) {
      setError('Failed to fetch suggestions');
    }
  }, 300);

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetchStudents(query);
    setShowSuggestions(true);
  };

  const handleSuggestionSelect = async (student) => {
    setSearchQuery(student.rollNumber);
    setShowSuggestions(false);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/admin/student-details/${student.rollNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFilteredPasswords([response.data]);
    } catch (err) {
      setError('Failed to fetch student details');
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    setFilteredPasswords([]);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditedValues({
      name: item.name,
      rollNumber: item.rollNumber,
      password: '',
      branch: item.branch,
      section: item.section
    });
  };

  const handleSave = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/update-student/${id}`, editedValues, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFilteredPasswords(prevPasswords => 
        prevPasswords.map(item => 
          item.id === id ? { ...item, ...editedValues } : item
        )
      );
      setEditingId(null);
    } catch (err) {
      setError('Failed to update student details');
    }
  };

  const handleDelete = async (id, rollNumber) => {
    if (window.confirm(`Are you sure you want to delete student with roll number ${rollNumber}?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/admin/delete-student/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFilteredPasswords([]);
        handleClear();
      } catch (err) {
        setError('Failed to delete student');
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target) &&
          suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add this useEffect hook after your other hooks
  useEffect(() => {
    // Connect to socket when component mounts
    socketService.connect();

    // Subscribe to updates
    const handleStudentUpdate = (data) => {
      // Update the student data if it's currently being displayed
      setFilteredPasswords(prevPasswords => {
        return prevPasswords.map(student => {
          if (student.id === data.id) {
            return { ...student, ...data };
          }
          return student;
        });
      });
    };

    socketService.subscribeToResultsUpdates(handleStudentUpdate);

    // Cleanup on unmount
    return () => {
      socketService.unsubscribeFromResultsUpdates(handleStudentUpdate);
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder="Search by roll number or name..."
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 focus:outline-none focus:border-blue-500 text-gray-200"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div 
            ref={suggestionRef}
            className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((student) => (
              <div
                key={student._id}
                onClick={() => handleSuggestionSelect(student)}
                className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
              >
                <div className="text-gray-200">{student.name}</div>
                <div className="text-sm text-gray-400">{student.rollNumber}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Student Details Card */}
      <div className={`transition-all duration-300 ease-in-out ${loading ? 'opacity-50' : 'opacity-100'}`}>
        {filteredPasswords.length > 0 && filteredPasswords.map((item) => (
          <div key={item.id} className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-200 mb-2">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editedValues.name}
                      onChange={(e) => setEditedValues({...editedValues, name: e.target.value})}
                      className="bg-gray-700 text-gray-200 rounded px-2 py-1"
                    />
                  ) : (
                    item.name
                  )}
                </h3>
                <p className="text-gray-400">
                  Roll Number: {
                    editingId === item.id ? (
                      <input
                        type="text"
                        value={editedValues.rollNumber}
                        onChange={(e) => setEditedValues({...editedValues, rollNumber: e.target.value})}
                        className="bg-gray-700 text-gray-200 rounded px-2 py-1 ml-2"
                      />
                    ) : (
                      item.rollNumber
                    )
                  }
                </p>
              </div>
              <div className="flex space-x-3">
                {editingId === item.id ? (
                  <>
                    <button
                      onClick={() => handleSave(item.id)}
                      className="text-green-400 hover:text-green-300 p-2 rounded-full hover:bg-gray-700"
                    >
                      <Save className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 hover:text-gray-300 p-2 rounded-full hover:bg-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-gray-700"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.rollNumber)}
                      className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-gray-400 w-24">Branch:</span>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editedValues.branch}
                      onChange={(e) => setEditedValues({...editedValues, branch: e.target.value})}
                      className="bg-gray-700 text-gray-200 rounded px-2 py-1 flex-1"
                    />
                  ) : (
                    <span className="text-gray-200">{item.branch}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="text-gray-400 w-24">Section:</span>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editedValues.section}
                      onChange={(e) => setEditedValues({...editedValues, section: e.target.value})}
                      className="bg-gray-700 text-gray-200 rounded px-2 py-1 flex-1"
                    />
                  ) : (
                    <span className="text-gray-200">{item.section}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="text-gray-400 w-24">Password:</span>
                  {editingId === item.id ? (
                    <input
                      type="password"
                      value={editedValues.password}
                      onChange={(e) => setEditedValues({...editedValues, password: e.target.value})}
                      className="bg-gray-700 text-gray-200 rounded px-2 py-1 flex-1"
                      placeholder="Enter new password"
                    />
                  ) : (
                    <span className="text-gray-200">••••••••</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordManager;