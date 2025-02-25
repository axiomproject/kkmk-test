import React, { useState, useRef, useEffect } from 'react';
import { BsBell, BsBellFill } from 'react-icons/bs'; // Add BsBellFill import
import '../../styles/Header.css';
import logo from '../img/kmlogo.png';
import { Link } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import { User } from '../types/auth';
import defaultAvatar from '../img/volunteer/defaultProfile.png'; // Add a default avatar image
import packageIcon from '../img/donate-icon.png'; // Add this new import - You'll need to add this image
import Button from '@mui/material/Button';
import axios from 'axios';
import { toast } from 'react-toastify';

interface HeaderProps {
  onNavigate: (page: string) => void;
}

interface Notification {
  id: string;
  type: string;
  content: string;
  related_id: string;
  read: boolean;
  created_at: string;
  actor_name: string;
  actor_avatar: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // Add this state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const markAllNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map(notification =>
          fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
            method: 'POST'
          })
        )
      );
      
      // Update local state to mark all as read
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Add this helper function
  const markUnreadNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      // Send request to mark all notifications as read for this user
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) return;

      await fetch(`${API_URL}/api/notifications/user/${user.id}/read-all`, {
        method: 'POST'
      });
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Add toggle function for mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Close other dropdowns when opening mobile menu
    setShowProfileDropdown(false);
    setShowNotifications(false);
  };

  // Add handler for navigation items
  const handleNavigation = (path: string) => {
    onNavigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  // Update click outside handler
  useEffect(() => {
    const handleClickOutside = async (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        if (showNotifications) {
          await markUnreadNotificationsAsRead();
          setShowNotifications(false);
        }
      }
      if (isMobileMenuOpen && !(event.target as Element).closest('.nav-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, notifications, isMobileMenuOpen]);

  React.useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user) return;

      try {
        const response = await fetch(`${API_URL}/api/notifications/user/${user.id}`);  // Updated URL
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.read).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    // Set up polling for new notifications
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    // Trigger a custom event that VolunteerProfile can listen to
    window.dispatchEvent(new Event('userLoggedOut'));
    
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    onNavigate('/');
  };


  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
        method: 'POST'
      });
  
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Navigate based on notification type
      if (notification.type.includes('post') || notification.type.includes('comment')) {
        // Add postId to the URL as a query parameter
        onNavigate(`Forum?postId=${notification.related_id}`);
      }
      
      setShowNotifications(false);
  
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleEventResponse = async (notification: Notification, confirmed: boolean) => {
    try {
      // Add debug logging
      console.log('Notification data:', notification);
      console.log('Event ID from notification:', notification.related_id);
  
      const eventId = notification.type === 'event_reminder' 
        ? notification.related_id  // Use related_id directly for event reminders
        : parseInt(notification.related_id);
  
      console.log('Processing event response:', {
        notificationId: notification.id,
        userId: user?.id,
        eventId: eventId,
        confirmed
      });
  
      const response = await axios.post(`${API_URL}/api/notifications/event-response`, {
        notificationId: notification.id,
        userId: user?.id,
        eventId: eventId.toString(), // Convert to string for API request
        confirmed
      });
  
      if (response.data.success) {
        // Update local notification state
        setNotifications(prevNotifications =>
          prevNotifications.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
  
        // Show feedback to user
        toast.success(confirmed ? 
          'You have confirmed your participation' : 
          'You have been removed from the event'
        );
  
        // Close notifications dropdown after action
        setShowNotifications(false);
      }
    } catch (error) {
      console.error('Error handling event response:', error);
      toast.error('Failed to process your response');
    }
  };

  const handleDonateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(`${PATHS.HELP}?tab=donate`);
    setTimeout(() => {
      const donationForm = document.querySelector('.donation-form-container');
      if (donationForm) {
        donationForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  };

  return (
    <header className="header-container">
      <div className="logo-container">
        <img 
          src={logo} 
          alt="KM Logo" 
          className="logo-image" 
          onClick={() => onNavigate('/')}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <nav className={`nav-container ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          {!user ? (
            <div className="mobile-auth-buttons two-buttons">
              <div className="signup-button sign-up" onClick={() => {
                handleNavigation('Login');
                setIsMobileMenuOpen(false);
              }}>
                Sign Up
              </div>
              <div className="donate-button donate">
                <Link 
                  to={`${PATHS.HELP}?tab=donate`} 
                  className="donate-button donate"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Donate
                </Link>
              </div>
            </div>
          ) : (
            <div className="mobile-auth-buttons single-button">
              <div className="donate-button donate">
                <Link 
                  to={`${PATHS.HELP}?tab=donate`} 
                  className="donate-button donate"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Donate
                </Link>
              </div>
            </div>
          )}

          <li className="nav-item dropdown">
            <div className="nav-link-about">
              About Us <span className="dropdown-arrow">&#9662;</span>
            </div>
            <ul className="dropdown-menu">
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Story')}>
                  Our Story
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Partner')}>
                  Partners and Sponsors
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Team')}>
                  Meet the Team
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Events')}>
                  Events
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Map')}>
                  Map
                </a>
              </li>
            </ul>
          </li>
          <li className="nav-item" >
            <a className="nav-link" onClick={() => handleNavigation('Life')}>
              Life with KM
            </a>
          </li>
          <li className="nav-item dropdown">
            <div className="nav-link-testimonials">
              Testimonials <span className="dropdown-arrow">&#9662;</span>
            </div>
            <ul className="dropdown-menu">
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Graduates')}>
                  Our Graduates
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Community')}>
                  Our Community
                </a>
              </li>
            </ul>
          </li>
          <li className="nav-item dropdown">
            <div className="nav-link-help">
              How can you help? <span className="dropdown-arrow">&#9662;</span>
            </div>
            <ul className="dropdown-menu">
            <li>
            <a className="dropdown-link" onClick={() => handleNavigation('Help')}>
              Help
            </a>
          </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation(PATHS.STUDENTPROFILE)}>
                  Sponsor A Student
                </a>
              </li>
             
             
            </ul>
          </li>
          <li className="nav-item">
            <a className="nav-link" onClick={() => onNavigate('Contact')}>
              Contact Us
            </a>
          </li>
        </ul>
      </nav>

      <div className="actions-container">
        {user ? (
          <div className="user-actions">
            {/* Move donate button to hamburger menu on mobile */}
            <div className="donate-button donate desktop-only">
              <a 
                href="#"
                className="donate-button donate"
                onClick={handleDonateClick}
              >
                Donate
              </a>
            </div>
            <div className="notification-container" ref={notificationRef}>
              <div className="notification-icon" onClick={() => setShowNotifications(!showNotifications)}>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
                {showNotifications ? <BsBellFill size={20} /> : <BsBell size={20} />}
              </div>
              <div className={`notifications-dropdown ${showNotifications ? 'active' : ''}`}>
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  {notifications.length > 0 && (
                    <Button
                      size="small"
                      onClick={markAllNotificationsAsRead}
                      sx={{
                        fontSize: '12px',
                        fontFamily: 'Poppins',
                        color: '#f99407',
                        '&:hover': {
                          backgroundColor: 'rgba(249, 148, 7, 0.1)',
                        }
                      }}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="no-notifications">No notifications</div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      >
                        <img 
                          src={notification.type === 'distribution' ? packageIcon : notification.actor_avatar} 
                          alt={notification.type === 'distribution' ? "Package" : "User avatar"}
                          className="notification-avatar"
                        />
                        <div className="notification-content">
                          <p className="notification-text">{notification.content}</p>
                          {notification.type === 'event_reminder' && !notification.read && (
                            <div className="notification-actions">
                              <div 
                                className="event-confirm-action"
                                onClick={() => handleEventResponse(notification, true)}
                              >
                                Yes, I'll attend
                              </div>
                              <div 
                                className="event-decline-action"
                                onClick={() => handleEventResponse(notification, false)}
                              >
                                No, remove me
                              </div>
                            </div>
                          )}
                          <span className="notification-time">
                            {formatTimeAgo(new Date(notification.created_at))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="profile-dropdown-container" ref={dropdownRef}>
              <div 
                className="profile-trigger" 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <img 
                  src={user.profilePhoto || defaultAvatar} 
                  alt="Profile" 
                  className="profile-avatar" 
                />
              </div>
              <div className={`profile-dropdown-menu ${showProfileDropdown ? 'active' : ''}`}>
                <div className="profile-header">
                  <img 
                    src={user.profilePhoto || defaultAvatar} 
                    alt="Profile" 
                    className="dropdown-avatar"
                  />
                    <div className="profile-info">
                      <span className="profile-name">{user.name}</span>
                      <span className="profile-email">{user.email}</span>
                    </div>
                  </div>
                
                  <div className="dropdown-item" onClick={() => {
                    onNavigate('Profile');
                    setShowProfileDropdown(false);
                  }}>
                    My Profile
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    onNavigate('Forum');
                    setShowProfileDropdown(false);
                  }}>
                    Forum
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    onNavigate('Settings');
                    setShowProfileDropdown(false);
                  }}>
                    Settings
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    handleLogout();
                    setShowProfileDropdown(false);
                  }}>
                    Logout
                  </div>
                </div>
              </div>
            </div>
        ) : (
          <div className="desktop-auth-buttons">
            <div className="signup-button sign-up" onClick={() => onNavigate('Login')}>
              Sign Up
            </div>
            <div className="donate-button donate">
              <a 
                href="#"
                className="donate-button donate"
                onClick={handleDonateClick}
              >
                Donate
              </a>
            </div>
          </div>
        )}
      </div>

      <button 
        className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`} 
        onClick={toggleMobileMenu}
      >
        <div></div>
        <div></div>
        <div></div>
      </button>
    </header>
  );
};

// Helper function to format time
const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export default Header;