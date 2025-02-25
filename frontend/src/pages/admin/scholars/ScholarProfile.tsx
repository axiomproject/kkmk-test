import React, { useState, useEffect, useRef } from 'react';
import { FiUpload } from 'react-icons/fi';
import { FaSearch, FaTimes } from 'react-icons/fa';
import '../../../styles/Scholar.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

interface ScholarForm {
  firstName: string;
  lastName: string;
  address: string;
  dateOfBirth: string;
  gradeLevel: string;
  school: string;
  guardianName: string;
  guardianPhone: string;
  gender: string;
  favoriteSubject: string;
  favoriteActivity: string;
  favoriteColor: string;
  otherDetails: string;
  image: File | null;
  imagePreview: string;
  status: string;
  assignedUserId?: number;
  currentAmount: number;
  amountNeeded: number;
}

interface Scholar {
  id: number;
  first_name: string;
  last_name: string;
  grade_level: string;
  school: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  address: string;
  date_of_birth: string;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  favorite_subject: string;
  favorite_activity: string;
  favorite_color: string;
  other_details: string;
  status: 'active' | 'inactive' | 'graduated';  // Add this line
  assigned_user?: {
    id: number;
    name: string;
    email: string;
    profile_photo?: string;
  };
  // Add these new fields that come from the database
  assigned_user_id?: number;
  assigned_user_name?: string;
  assigned_user_email?: string;
  assigned_user_profile_photo?: string;
  current_amount: number;
  amount_needed: number;
}

interface ScholarUser {
  id: number;
  name: string;
  email: string;
  profile_photo?: string;
  role: string;
}

const initialFormState: ScholarForm = {
  firstName: '',
  lastName: '',
  address: '',
  dateOfBirth: '',
  gradeLevel: '',
  school: '',
  guardianName: '',
  guardianPhone: '',
  gender: '',
  favoriteSubject: '',
  favoriteActivity: '',
  favoriteColor: '',
  otherDetails: '',
  image: null,
  imagePreview: '',
  status: 'active',
  assignedUserId: undefined,
  currentAmount: 0,
  amountNeeded: 0
};

const ProgressBar: React.FC<{ currentAmount: number; amountNeeded: number }> = ({ currentAmount, amountNeeded }) => {
  const percentage = Math.min((currentAmount / amountNeeded) * 100, 100);
  
  return (
    <div className="scholar-progress-container">
      <div className="scholar-progress-bar">
        <div 
          className="scholar-progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="scholar-progress-text">
        <span>₱{currentAmount.toLocaleString()}</span>
        <span>₱{amountNeeded.toLocaleString()}</span>
      </div>
    </div>
  );
};

const ScholarProfile: React.FC = () => {
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ScholarForm>(initialFormState);
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [scholarSearchTerm, setScholarSearchTerm] = useState('');
  const [scholarUsers, setScholarUsers] = useState<ScholarUser[]>([]);
  const [searchResults, setSearchResults] = useState<ScholarUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchScholars = async () => {
      try {
        const response = await fetch(`${API_URL}/api/scholars`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch scholars');
        const data = await response.json();
        
        // Transform the data to match the Scholar interface
        const transformedData = data.map((scholar: any) => ({
          ...scholar,
          assigned_user: scholar.assigned_user_id ? {
            id: scholar.assigned_user_id,
            name: scholar.assigned_user_name,
            email: scholar.assigned_user_email,
            profile_photo: scholar.assigned_user_profile_photo
          } : undefined
        }));
        
        setScholars(transformedData);
      } catch (error) {
        console.error('Error fetching scholars:', error);
      }
    };

    fetchScholars();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      
      // Add this check to only include assignedUserId if it exists
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'image' && value) {
          formDataToSend.append('image', value);
        } else if (key === 'assignedUserId' && value) {
          // Only append if assignedUserId has a value
          formDataToSend.append('userId', value.toString());
        } else if (key !== 'imagePreview') {
          formDataToSend.append(key, value as string);
        }
      });

      const response = await fetch(`${API_URL}/api/scholars/create`, {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create scholar profile');
      }

      const result = await response.json();
      console.log('Scholar created:', result);
      
      // Refresh the scholars list
      const updatedScholars = await fetch(`${API_URL}/api/scholars`, {
        credentials: 'include'
      }).then(res => res.json());
      setScholars(updatedScholars);
      
      // Reset form and close modal
      setFormData(initialFormState);
      setShowModal(false);
      
      // Optional: Show success message
      alert('Scholar profile created successfully!');
      
    } catch (error) {
      console.error('Error creating scholar:', error);
      alert(error instanceof Error ? error.message : 'Failed to create scholar profile. Please try again.');
    }
  };

  const handleViewScholar = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/scholars/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch scholar details');
      const data = await response.json();
      setSelectedScholar(data);
      setIsViewMode(true);
    } catch (error) {
      console.error('Error fetching scholar details:', error);
      alert('Failed to load scholar details');
    }
  };

  const handleEditScholar = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/scholars/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch scholar details');
      const data = await response.json();
      
      // Format the date to YYYY-MM-DD for the input field
      const formattedDate = data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : '';
      
      setFormData({
        firstName: data.first_name,
        lastName: data.last_name,
        address: data.address,
        dateOfBirth: formattedDate, // Use the formatted date
        gradeLevel: data.grade_level,
        school: data.school,
        guardianName: data.guardian_name,
        guardianPhone: data.guardian_phone,
        gender: data.gender,
        favoriteSubject: data.favorite_subject,
        favoriteActivity: data.favorite_activity,
        favoriteColor: data.favorite_color,
        otherDetails: data.other_details,
        image: null,
        imagePreview: data.image_url ? `${API_URL}${data.image_url}` : '',
        status: data.status || 'active',
        assignedUserId: data.assigned_user_id,
        currentAmount: data.current_amount || 0,
        amountNeeded: data.amount_needed || 0
      });
      
      setSelectedScholar(data);
      setIsEditMode(true);
    } catch (error) {
      console.error('Error fetching scholar details:', error);
      alert('Failed to load scholar details');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScholar) return;

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'image' && value) {
          formDataToSend.append('image', value);
        } else if (key !== 'imagePreview') {
          formDataToSend.append(key, value as string);
        }
      });

      const response = await fetch(`${API_URL}/api/scholars/${selectedScholar.id}`, {
        method: 'PUT',
        body: formDataToSend,
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to update scholar');

      // Refresh scholar list
      const updatedScholars = await fetch(`${API_URL}/api/scholars`, {
        credentials: 'include'
      }).then(res => res.json());
      
      setScholars(updatedScholars);
      setIsEditMode(false);
      setSelectedScholar(null);
      alert('Scholar updated successfully!');
    } catch (error) {
      console.error('Error updating scholar:', error);
      alert('Failed to update scholar');
    }
  };

  const handleScholarSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScholarSearchTerm(e.target.value);
  };

  const filteredScholars = scholars.filter(scholar => {
    // Apply search filter
    const searchStr = scholarSearchTerm.toLowerCase();
    const matchesSearch = (
      scholar.first_name.toLowerCase().includes(searchStr) ||
      scholar.last_name.toLowerCase().includes(searchStr) ||
      scholar.school.toLowerCase().includes(searchStr) ||
      scholar.grade_level.toLowerCase().includes(searchStr)
    );

    // Update status filter logic
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && scholar.status === 'active' && scholar.is_active) ||
      (statusFilter === 'inactive' && (scholar.status === 'inactive' || !scholar.is_active)) ||
      (statusFilter === 'graduated' && scholar.status === 'graduated');

    return matchesSearch && matchesStatus;
  });

  // Add status filter handler
  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  // Group scholars by status
  const groupedScholars = filteredScholars.reduce((acc, scholar) => {
    const status = scholar.status || 'active';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(scholar);
    return acc;
  }, {} as Record<string, Scholar[]>);

  const StatusDropdown = () => (
    <div className="admin-scholar-form-group">
      <label>Status</label>
      <select 
        name="status" 
        value={formData.status} 
        onChange={handleInputChange} 
        required
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="graduated">Graduated</option>
      </select>
    </div>
  );

  const fetchScholarUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/role/scholar`);
      const data = await response.json();
      setScholarUsers(data);
    } catch (error) {
      console.error('Error fetching scholar users:', error);
    }
  };

  const handleAssignScholar = async (userId: number) => {
    try {
      // Update form data with the assigned user ID
      setFormData(prev => ({
        ...prev,
        assignedUserId: userId
      }));

      // If we're in create mode, just update the form state
      if (!selectedScholar) {
        setUserSearchTerm('');
        setShowSuggestions(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/scholars/${selectedScholar?.id}/assign-user`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to assign user');

      const updatedScholar = await response.json();
      
      // Update the local state immediately
      if (selectedScholar) {
        const updatedAssignedUser = {
          id: updatedScholar.assigned_user_id,
          name: updatedScholar.assigned_user_name,
          email: updatedScholar.assigned_user_email,
          profile_photo: updatedScholar.assigned_user_profile_photo
        };

        // Update the selected scholar
        setSelectedScholar(prev => prev ? {
          ...prev,
          assigned_user: updatedAssignedUser
        } : null);

        // Update the scholars list
        setScholars(prevScholars => prevScholars.map(scholar => 
          scholar.id === selectedScholar.id ? {
            ...scholar,
            assigned_user: updatedAssignedUser
          } : scholar
        ));
      }

      setUserSearchTerm('');
      setShowSuggestions(false);
      alert('Scholar user assigned successfully');
    } catch (error) {
      console.error('Error assigning scholar:', error);
      alert('Failed to assign scholar user');
    }
  };

  const handleUnassignUser = async () => {
    if (!selectedScholar) return;
    
    if (window.confirm('Are you sure you want to remove this user assignment?')) {
      try {
        const response = await fetch(`${API_URL}/api/scholars/${selectedScholar.id}/unassign-user`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to unassign user');

        const updatedScholar = await response.json();
        
        // Update the scholars list
        setScholars(prevScholars => prevScholars.map(scholar => 
          scholar.id === updatedScholar.id ? { ...updatedScholar, assigned_user: undefined } : scholar
        ));

        // Update the selected scholar
        setSelectedScholar(prev => prev ? { ...prev, assigned_user: undefined } : null);
        
      } catch (error) {
        console.error('Error unassigning user:', error);
        alert('Failed to remove user assignment');
      }
    }
  };

  const handleDeleteScholar = async (scholarId: number) => {
    if (window.confirm('Are you sure you want to delete this scholar? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API_URL}/api/scholars/${scholarId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to delete scholar');

        // Update the scholars list by removing the deleted scholar
        setScholars(prevScholars => prevScholars.filter(scholar => scholar.id !== scholarId));
        
        alert('Scholar deleted successfully');
      } catch (error) {
        console.error('Error deleting scholar:', error);
        alert('Failed to delete scholar');
      }
    }
  };

  const renderScholarUserSearch = () => (
    <div className="scholar-user-search">
      <div className="search-input-wrapper">
        <FaSearch className="search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search scholar users..."
          value={userSearchTerm}
          onChange={(e) => {
            const value = e.target.value;
            setUserSearchTerm(value);
            const filtered = scholarUsers.filter(user => 
              user.name.toLowerCase().includes(value.toLowerCase()) ||
              user.email.toLowerCase().includes(value.toLowerCase())
            );
            setSearchResults(filtered);
            setShowSuggestions(true);
          }}
          className="search-input"
        />
        {userSearchTerm && (
          <FaTimes 
            className="clear-search" 
            onClick={() => {
              setUserSearchTerm('');
              setSearchResults([]);
              setShowSuggestions(false);
            }}
          />
        )}
      </div>

      {showSuggestions && searchResults.length > 0 && (
        <div className="search-suggestions">
          {searchResults.map(user => (
            <div 
              key={user.id} 
              className="suggestion-item"
              onClick={() => handleAssignScholar(user.id)}
            >
              <img 
                src={user.profile_photo || '/images/default-avatar.jpg'} 
                alt={user.name}
                className="suggestion-avatar"
              />
              <div className="suggestion-info">
                <div className="suggestion-name">{user.name}</div>
                <div className="suggestion-email">{user.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="divider"></div>

      {selectedScholar?.assigned_user && (
        <div className="current-assignment">
          <h4>Currently Assigned User:</h4>
          <div className="assigned-user-info">
            <img 
              src={selectedScholar.assigned_user.profile_photo || '/images/default-avatar.jpg'} 
              alt={selectedScholar.assigned_user.name}
              className="assigned-user-avatar"
            />
            <div className="assigned-user-details">
              <p><strong>Name:</strong> {selectedScholar.assigned_user.name}</p>
              <p><strong>Email:</strong> {selectedScholar.assigned_user.email}</p>
            </div>
            <button 
              className="remove-assignment-btn"
              onClick={handleUnassignUser}
              title="Remove assignment"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderScholarCardActions = (scholar: Scholar) => (
    <div className="admin-scholar-card-actions">
      <button 
        className="admin-scholar-view-btn"
        onClick={() => handleViewScholar(scholar.id)}
      >
        View Details
      </button>
      <button 
        className="admin-scholar-edit-btn"
        onClick={() => handleEditScholar(scholar.id)}
      >
        Edit Profile
      </button>
      <button 
        className="admin-scholar-assign-btn"
        onClick={() => {
          setSelectedScholar(scholar);
          setShowAssignUserModal(true);
          fetchScholarUsers();
        }}
      >
        Assign User
      </button>
      <button 
        className="admin-scholar-delete-btn"
        onClick={() => handleDeleteScholar(scholar.id)}
      >
        Delete
      </button>
    </div>
  );

  const renderAssignUserModal = () => (
    <div className="admin-scholar-modal-overlay" onClick={() => setShowAssignUserModal(false)}>
      <div className="admin-scholar-modal" onClick={e => e.stopPropagation()}>
        <h2>Assign User Account</h2>
        <div className="scholar-user-search-container">
          {renderScholarUserSearch()}
        </div>
        <button 
          className="admin-scholar-cancel-btn"
          onClick={() => setShowAssignUserModal(false)}
        >
          Close
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (showModal || isEditMode) {
      fetchScholarUsers();
    }
  }, [showModal, isEditMode]);

  const renderViewModal = () => {
    // Add early return if selectedScholar is null
    if (!selectedScholar) return null;

    return (
      <div className="admin-scholar-modal-overlay" onClick={() => setIsViewMode(false)}>
        <div className="admin-scholar-modal" onClick={e => e.stopPropagation()}>
          <h2>Scholar Details</h2>
          <div className="admin-scholar-details">
            <img 
              src={`${API_URL}${selectedScholar.image_url}` || "https://via.placeholder.com/150"}
              alt={`${selectedScholar.first_name} ${selectedScholar.last_name}`}
              className="admin-scholar-detail-image"
            />
            <div className="admin-scholar-info-details">
              <p><strong>Name:</strong> {selectedScholar.first_name} {selectedScholar.last_name}</p>
              <p><strong>Address:</strong> {selectedScholar.address}</p>
              <p><strong>Date of Birth:</strong> {new Date(selectedScholar.date_of_birth).toLocaleDateString()}</p>
              <p><strong>Gender:</strong> {selectedScholar.gender}</p>
              <p><strong>Education Level:</strong> {selectedScholar.grade_level}</p>
              <p><strong>School:</strong> {selectedScholar.school}</p>
              <p><strong>Guardian Name:</strong> {selectedScholar.guardian_name}</p>
              <p><strong>Guardian Phone:</strong> {selectedScholar.guardian_phone}</p>
              <p><strong>Favorite Subject:</strong> {selectedScholar.favorite_subject}</p>
              <p><strong>Favorite Activity:</strong> {selectedScholar.favorite_activity}</p>
              <p><strong>Favorite Color:</strong> {selectedScholar.favorite_color}</p>
              {selectedScholar.other_details && (
                <div className="admin-scholar-other-details">
                  <p><strong>Other Details:</strong></p>
                  <p>{selectedScholar.other_details}</p>
                </div>
              )}
              <p><strong>Status:</strong> <span className={`status-${selectedScholar.is_active ? 'active' : 'inactive'}`}>
                {selectedScholar.is_active ? 'Active' : 'Inactive'}
              </span></p>
              <p><strong>Current Amount:</strong> ₱{selectedScholar.current_amount.toLocaleString()}</p>
              <p><strong>Amount Needed:</strong> ₱{selectedScholar.amount_needed.toLocaleString()}</p>
              </div>
            </div>
            <button 
              className="admin-scholar-close-btn"
              onClick={() => setIsViewMode(false)}
            >
              Close
            </button>
          </div>
        </div>

    );
  };

  const renderAssignedUser = (scholar: Scholar) => {
    if (!scholar.assigned_user) return null;
    
    return (
      <div className="assigned-user-badge">
        <img 
          src={scholar.assigned_user.profile_photo || '/images/default-avatar.jpg'} 
          alt={scholar.assigned_user.name}
          className="assigned-user-avatar-small"
        />
        <span>{scholar.assigned_user.name}</span>
      </div>
    );
  };

  // Add these handlers for modal controls
  const handleCloseAddModal = () => {
    setShowModal(false);
    setFormData(initialFormState); // Reset to initial state
  };

  const handleCloseEditModal = () => {
    setIsEditMode(false);
    setSelectedScholar(null);
    setFormData(initialFormState); // Reset to initial state
  };

  return (
    <div className="admin-scholar-container">
      <div className="admin-scholar-header">
        <h1>Scholar Profiles</h1>
        <div className="admin-scholar-actions">
          <input 
            type="text" 
            placeholder="Search scholars..." 
            className="admin-scholar-search" 
            value={scholarSearchTerm}
            onChange={handleScholarSearch}
          />
          <select 
            className="admin-scholar-filter"
            value={statusFilter}
            onChange={handleStatusFilter}
          >
            <option value="all">All Scholars</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
          </select>
          <button 
            className="admin-scholar-add-btn"
            onClick={() => setShowModal(true)}
          >
            Add Scholar Profile
          </button>
        </div>
      </div>

      <div className="admin-scholar-sections">
        {/* Active Scholars */}
        <div className="admin-scholar-grid">
          {filteredScholars
            .filter(scholar => 
              (statusFilter === 'all' || statusFilter === 'active') && 
              scholar.status === 'active' && 
              scholar.is_active
            )
            .map((scholar) => (
              <div key={scholar.id} className="admin-scholar-card">
                {/* ...existing card content... */}
                <img 
                src={`${API_URL}${scholar.image_url}` || '/images/default-avatar.jpg'} 
                alt={`${scholar.first_name} ${scholar.last_name}`} 
                className="admin-scholar-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/default-avatar.jpg';
                }}
              />
              <div className="admin-scholar-info">
                <h3>{scholar.first_name} {scholar.last_name}</h3>
                <ProgressBar 
                  currentAmount={scholar.current_amount} 
                  amountNeeded={scholar.amount_needed}
                />
                <p>Status: {scholar.is_active ? 'Active' : 'Inactive'}</p>
                <p>Education Level: {scholar.grade_level}</p>
                <p>School: {scholar.school}</p>
                {renderAssignedUser(scholar)}
                {renderScholarCardActions(scholar)}
              </div>
              </div>
          ))}
        </div>

        {/* Inactive Scholars */}
        {filteredScholars.some(scholar => !scholar.is_active || scholar.status === 'inactive') && (
          <>
            <h2 className="section-title">Inactive Scholars</h2>
            <div className="admin-scholar-grid">
              {filteredScholars
                .filter(scholar => !scholar.is_active || scholar.status === 'inactive')
                .map((scholar) => (
                  <div key={scholar.id} className="admin-scholar-card inactive">
                    {/* ...existing card content... */}
                    <img 
                src={`${API_URL}${scholar.image_url}` || '/images/default-avatar.jpg'} 
                alt={`${scholar.first_name} ${scholar.last_name}`} 
                className="admin-scholar-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/default-avatar.jpg';
                }}
              />
              <div className="admin-scholar-info">
                <h3>{scholar.first_name} {scholar.last_name}</h3>
                <ProgressBar 
                  currentAmount={scholar.current_amount} 
                  amountNeeded={scholar.amount_needed}
                />
                <p>Status: {scholar.is_active ? 'Active' : 'Inactive'}</p>
                <p>Year Level: {scholar.grade_level}</p>
                <p>School: {scholar.school}</p>
                {renderAssignedUser(scholar)}
                {renderScholarCardActions(scholar)}
              </div>
                  </div>
              ))}
            </div>
          </>
        )}

        {/* Graduated Scholars */}
        {filteredScholars.some(scholar => scholar.status === 'graduated') && (
          <>
            <h2 className="graduated-section-title">Graduated Scholars</h2>
            <div className="admin-scholar-grid">
              {filteredScholars
                .filter(scholar => scholar.status === 'graduated')
                .map((scholar) => (
                  <div key={scholar.id} className="admin-scholar-card graduated">
                    {/* ...existing card content... */}
                    <img 
                src={`${API_URL}${scholar.image_url}` || '/images/default-avatar.jpg'} 
                alt={`${scholar.first_name} ${scholar.last_name}`} 
                className="admin-scholar-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/default-avatar.jpg';
                }}
              />
              <div className="admin-scholar-info">
                <h3>{scholar.first_name} {scholar.last_name}</h3>
                <ProgressBar 
                  currentAmount={scholar.current_amount} 
                  amountNeeded={scholar.amount_needed}
                />
                <p>Status: {scholar.is_active ? 'Active' : 'Inactive'}</p>
                <p>Year Level: {scholar.grade_level}</p>
                <p>School: {scholar.school}</p>
                {renderAssignedUser(scholar)}
                {renderScholarCardActions(scholar)}
              </div>
                  </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* View Modal */}
      {isViewMode && selectedScholar && renderViewModal()}

      {/* Edit Modal */}
      {isEditMode && selectedScholar && (
        <div className="admin-scholar-modal-overlay" onClick={handleCloseEditModal}>
          <div className="admin-scholar-modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Scholar</h2>
            <form onSubmit={handleUpdate} className="admin-scholar-form">
              {/* Same form fields as add scholar form */}
              <div className="admin-scholar-image-upload">
                <input
                  type="file"
                  id="scholarImage"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="admin-scholar-image-input"
                  hidden
                />
                <label htmlFor="scholarImage" className="admin-scholar-image-label">
                  {formData.imagePreview ? (
                    <img 
                      src={formData.imagePreview} 
                      alt="Preview" 
                      className="admin-scholar-image-preview" 
                    />
                  ) : (
                    <div className="admin-scholar-image-placeholder">
                      <FiUpload size={24} />
                      <span>Upload Photo</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="admin-scholar-form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Education Level</label>
                  <select
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Education Level</option>
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="K to 12">K to 12</option>
                    <option value="Tertiary">Tertiary</option>
                  </select>
                </div>
                <div className="admin-scholar-form-group">
                  <label>School</label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Guardian Name</label>
                  <input
                    type="text"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Guardian Phone</label>
                  <input
                    type="tel"
                    name="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Favorite Subject</label>
                  <input
                    type="text"
                    name="favoriteSubject"
                    value={formData.favoriteSubject}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Favorite Activity</label>
                  <input
                    type="text"
                    name="favoriteActivity"
                    value={formData.favoriteActivity}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Favorite Color</label>
                  <input
                    type="text"
                    name="favoriteColor"
                    value={formData.favoriteColor}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="admin-scholar-form-group">
                <label>Other Details</label>
                <textarea
                  name="otherDetails"
                  value={formData.otherDetails}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              <div className="admin-scholar-form-row">
                <StatusDropdown />
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Current Amount</label>
                  <input
                    type="number"
                    name="currentAmount"
                    value={formData.currentAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Amount Needed</label>
                  <input
                    type="number"
                    name="amountNeeded"
                    value={formData.amountNeeded}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="admin-scholar-form-actions">
                <button 
                  type="button" 
                  className="admin-scholar-cancel-btn"
                  onClick={handleCloseEditModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="admin-scholar-save-btn"
                >
                  Update Scholar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="admin-scholar-modal-overlay" onClick={handleCloseAddModal}>
          <div className="admin-scholar-modal" onClick={e => e.stopPropagation()}>
            <h2>Add New Scholar</h2>
            <form onSubmit={handleSubmit} className="admin-scholar-form">
              <div className="admin-scholar-image-upload">
                <input
                  type="file"
                  id="scholarImage"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="admin-scholar-image-input"
                  hidden
                />
                <label htmlFor="scholarImage" className="admin-scholar-image-label">
                  {formData.imagePreview ? (
                    <img 
                      src={formData.imagePreview} 
                      alt="Preview" 
                      className="admin-scholar-image-preview" 
                    />
                  ) : (
                    <div className="admin-scholar-image-placeholder">
                      <FiUpload size={24} />
                      <span>Upload Photo</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="admin-scholar-form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter complete address"
                  required
                />
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    placeholder="Select date of birth"
                    required
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Education Level</label>
                  <select
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Education Level</option>
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="K to 12">K to 12</option>
                    <option value="Tertiary">Tertiary</option>
                  </select>
                </div>
                <div className="admin-scholar-form-group">
                  <label>School</label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleInputChange}
                    placeholder="Enter school name"
                    required
                  />
                </div>
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Guardian Name</label>
                  <input
                    type="text"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleInputChange}
                    placeholder="Enter guardian's full name"
                    required
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Guardian Phone</label>
                  <input
                    type="tel"
                    name="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={handleInputChange}
                    placeholder="Enter guardian's phone number"
                    required
                  />
                </div>
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Favorite Subject</label>
                  <input
                    type="text"
                    name="favoriteSubject"
                    value={formData.favoriteSubject}
                    onChange={handleInputChange}
                    placeholder="Enter favorite subject"
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Favorite Activity</label>
                  <input
                    type="text"
                    name="favoriteActivity"
                    value={formData.favoriteActivity}
                    onChange={handleInputChange}
                    placeholder="Enter favorite activity"
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Favorite Color</label>
                  <input
                    type="text"
                    name="favoriteColor"
                    value={formData.favoriteColor}
                    onChange={handleInputChange}
                    placeholder="Enter favorite color"
                  />
                </div>
              </div>

              <div className="admin-scholar-form-group">
                <label>Other Details</label>
                <textarea
                  name="otherDetails"
                  value={formData.otherDetails}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Enter any additional details about the scholar"
                />
              </div>

              <div className="admin-scholar-form-row">
                <StatusDropdown />
              </div>

              <div className="admin-scholar-form-row">
                <div className="admin-scholar-form-group">
                  <label>Current Amount</label>
                  <input
                    type="number"
                    name="currentAmount"
                    value={formData.currentAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter current amount"
                  />
                </div>
                <div className="admin-scholar-form-group">
                  <label>Amount Needed</label>
                  <input
                    type="number"
                    name="amountNeeded"
                    value={formData.amountNeeded}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter amount needed"
                  />
                </div>
              </div>

              <div className="admin-scholar-form-actions">
                <button 
                  type="button" 
                  className="admin-scholar-cancel-btn"
                  onClick={handleCloseAddModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="admin-scholar-save-btn"
                >
                  Save Scholar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignUserModal && selectedScholar && renderAssignUserModal()}
    </div>
  );
};

export default ScholarProfile;
