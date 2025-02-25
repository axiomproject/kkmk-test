import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/AdminSettings.css';  // Import the new CSS file

const AdminSettings = () => {
  const { user, updateUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isMpinEnabled, setIsMpinEnabled] = useState(false);
  const [mpin, setMpin] = useState('');
  const [showMpin, setShowMpin] = useState(false);
  const [mpinError, setMpinError] = useState<string | null>(null);

  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchMpinStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5175/api/admin/mpin-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsMpinEnabled(response.data.isMpinEnabled);
        setMpin(''); // Clear MPIN when status changes
      } catch (error) {
        console.error('Failed to fetch MPIN status:', error);
      }
    };

    fetchMpinStatus();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setPhotoError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('profilePhoto', selectedFile);

      const endpoint = isAdmin ? '/api/admin/profile-photo' : '/api/staff/profile-photo';
      console.log('Using endpoint:', endpoint);

      const response = await axios.post(
        `http://localhost:5175${endpoint}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data?.user) {
        console.log('Profile photo update response:', response.data);
        // Ensure we're updating all necessary user data
        updateUser({
          ...response.data.user,
          profilePhoto: response.data.user.profile_photo // Ensure this matches the backend response
        });
        alert('Profile photo updated successfully');
        setSelectedFile(null);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      if (error.response?.status === 401) {
        navigate('/admin/login');
      } else {
        setPhotoError(error.response?.data?.error || 'Failed to upload profile photo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (profileData.newPassword !== profileData.confirmPassword) {
      setProfileError("New passwords don't match");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const endpoint = user?.role === 'admin' 
        ? '/api/admin/profile' 
        : '/api/staff/profile';

      console.log('Using endpoint:', endpoint); // Debug log
      console.log('Profile data being sent:', {
        ...profileData,
        newPassword: profileData.newPassword ? '[FILTERED]' : undefined
      });

      const response = await axios.put(
        `http://localhost:5175${endpoint}`,
        {
          name: profileData.name,
          email: profileData.email,
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword || undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Profile update response:', response.data); // Debug log

      if (response.data.user) {
        updateUser(response.data.user);
        alert('Profile updated successfully');
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }
    } catch (error: any) {
      console.error('Profile update error:', error.response || error);
      setProfileError(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleMpinToggle = async () => {
    if (isMpinEnabled) {
      // If trying to disable MPIN, show password confirmation dialog
      setShowPasswordConfirm(true);
    } else {
      // If enabling MPIN, proceed as normal
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          'http://localhost:5175/api/admin/toggle-mpin',
          { enabled: !isMpinEnabled },
          { headers: { Authorization: `Bearer ${token}` }}
        );
        setIsMpinEnabled(response.data.isMpinEnabled);
        if (!response.data.isMpinEnabled) {
          setMpin('');
        }
      } catch (error: any) {
        setMpinError(error.response?.data?.error || 'Failed to toggle MPIN');
      }
    }
  };

  const handleConfirmDisableMpin = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5175/api/admin/toggle-mpin',
        { 
          enabled: false,
          password: confirmPassword 
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setIsMpinEnabled(response.data.isMpinEnabled);
      setMpin('');
      setShowPasswordConfirm(false);
      setConfirmPassword('');
      setPasswordError(null);
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Invalid password');
    }
  };

  const handleMpinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpin || mpin.length !== 4 || !/^\d+$/.test(mpin)) {
      setMpinError('MPIN must be exactly 4 digits');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5175/api/admin/set-mpin',
        { mpin },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setMpinError(null);
      alert('MPIN updated successfully');
      setMpin('');
    } catch (error: any) {
      setMpinError(error.response?.data?.error || 'Failed to update MPIN');
    }
  };

  return (
    <div className="admin-pages">
      <h1>Settings</h1>
      <div className="settings-container">
        {/* Photo Upload Section */}
        <section className="settings-section">
          <h2>Profile Photo</h2>
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <input
                type="file"
                id="profilePhoto"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="admin-input"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={handleButtonClick}
                className="upload-button"
              >
                Choose Photo
              </button>
              {selectedFile && (
                <div className="selected-file">
                  Selected: {selectedFile.name}
                </div>
              )}
            </div>
            {photoError && (
              <div className="error-message">
                {photoError}
              </div>
            )}
            <div className="form-actions">
              <button 
                type="submit" 
                className="save-button"
                disabled={!selectedFile || loading}
              >
                {loading ? 'Uploading...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Profile Information Section */}
        <section className="settings-section">
          <h2>Profile Information</h2>
          <form onSubmit={handleProfileSubmit} className="settings-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleProfileChange}
                className="admin-input"
                placeholder="Enter your name"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleProfileChange}
                className="admin-input"
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={profileData.currentPassword}
                  onChange={handleProfileChange}
                  className="admin-input"
                  placeholder="Enter current password"
                />
                {profileData.currentPassword && (
                  <span 
                    className="password-toggle-icon" 
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={profileData.newPassword}
                  onChange={handleProfileChange}
                  className="admin-input"
                  placeholder="Enter new password"
                />
                {profileData.newPassword && (
                  <span 
                    className="password-toggle-icon" 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={profileData.confirmPassword}
                  onChange={handleProfileChange}
                  className="admin-input"
                  placeholder="Confirm new password"
                />
                {profileData.confirmPassword && (
                  <span 
                    className="password-toggle-icon" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </span>
                )}
              </div>
            </div>
            {profileError && (
              <div className="error-message">
                {profileError}
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="save-button">
                Update Profile
              </button>
            </div>
          </form>
        </section>

        {/* MPIN Settings Section */}
        {isAdmin && (
          <section className="settings-section">
            <h2>MPIN Settings</h2>
            <div className="mpin-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isMpinEnabled}
                  onChange={handleMpinToggle}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                {isMpinEnabled ? 'MPIN Login Enabled' : 'MPIN Login Disabled'}
              </span>
            </div>

            {isMpinEnabled && (
              <form onSubmit={handleMpinSubmit} className="settings-form">
                <div className="form-group">
                  <label>Set 4-Digit MPIN</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showMpin ? "text" : "password"}
                      value={mpin}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
                          setMpin(value);
                          setMpinError(null);
                        }
                      }}
                      placeholder="Enter 4-digit MPIN"
                      maxLength={4}
                      pattern="\d{4}"
                      className="admin-input"
                    />
                    {mpin && (
                      <span 
                        className="password-toggle-icon" 
                        onClick={() => setShowMpin(!showMpin)}
                        title={showMpin ? "Hide MPIN" : "Show MPIN"}
                      >
                        {showMpin ? (
                          <svg viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24">
                            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                {mpinError && (
                  <div className="error-message">
                    {mpinError}
                  </div>
                )}
                <div className="form-actions">
                  <button type="submit" className="save-button">
                    Save MPIN
                  </button>
                </div>
              </form>
            )}
          </section>
        )}
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordConfirm && (
        <div className="admin-mpin-modal-overlay">
          <div className="admin-mpin-modal-content">
            <h3 className="admin-mpin-modal-title">Confirm Password</h3>
            <p className="admin-mpin-modal-description">Please enter your password to disable MPIN</p>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="admin-input"
              placeholder="Enter your password"
            />
            {passwordError && (
              <div className="error-message">
                {passwordError}
              </div>
            )}
            <div className="admin-mpin-modal-actions">
              <button 
                className="admin-mpin-cancel-button"
                onClick={() => {
                  setShowPasswordConfirm(false);
                  setConfirmPassword('');
                  setPasswordError(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="admin-mpin-confirm-button"
                onClick={handleConfirmDisableMpin}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
