const { 
  createUser, 
  findUserByEmailOrUsername, 
  updateUserPhotos, 
  updateUserInfo, 
  updateUserDetails, 
  updateUserPassword, 
  verifyEmail,
  createPasswordResetToken,  
  verifyResetToken,         
  resetPassword,
  updateUserSocials,
  updateLastLogin,
  updateFaceData,
  findUserByFaceData  // Add this import
} = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const register = async (req, res) => {
  const { name, username, email, password, dateOfBirth, role, faceData } = req.body;
  
  try {
    console.log('Registration attempt:', { email, username, role });

    const existingUser = await findUserByEmailOrUsername(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Validate face data if provided
    if (faceData) {
      try {
        const parsed = JSON.parse(faceData);
        if (!parsed.descriptors || !Array.isArray(parsed.descriptors)) {
          return res.status(400).json({ 
            error: 'Invalid face data: descriptors must be an array' 
          });
        }
        if (!parsed.landmarks || !Array.isArray(parsed.landmarks)) {
          return res.status(400).json({ 
            error: 'Invalid face data: landmarks must be an array' 
          });
        }
      } catch (e) {
        return res.status(400).json({ 
          error: 'Invalid face data format' 
        });
      }
    }

    const { user, verificationToken } = await createUser(
      name, 
      username, 
      email, 
      password, 
      dateOfBirth, 
      role,
      faceData  // Pass face data to createUser
    );
    
    try {
      await sendVerificationEmail(email, verificationToken);
      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          hasFaceVerification: user.has_face_verification
        }
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Still create the user but inform about email issue
      res.status(201).json({
        message: 'Registration successful but failed to send verification email. Please contact support.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          hasFaceVerification: user.has_face_verification
        }
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('invalid input syntax for type json')) {
      return res.status(400).json({ error: 'Invalid face data format' });
    }
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

const verifyEmailHandler = async (req, res) => {
  const { token } = req.params;
  console.log('Received verification request for token:', token);

  if (!token) {
    console.log('No token provided');
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const result = await verifyEmail(token);
    
    if (!result) {
      console.log('Invalid token:', token);
      return res.status(400).json({ 
        error: 'Invalid verification token' 
      });
    }

    if (result.alreadyVerified) {
      console.log('User was already verified');
      return res.json({ 
        message: 'Email already verified',
        verified: true 
      });
    }

    console.log('Successfully verified user:', result);
    return res.json({ 
      message: 'Email verified successfully',
      verified: true 
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify email',
      details: error.message 
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmailOrUsername(email);
    console.log('Found user:', user); // Add this debug log
    
    // First check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if the user account is inactive
    if (user.status === 'inactive') {
      return res.status(403).json({ 
        error: 'Your account has been deactivated. Please contact the administrator to reactivate your account.',
        inactive: true
      });
    }

    // Then check if password matches
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Verification status:', user.is_verified); // Add this debug log

    // Check verification status
    if (user.is_verified !== true) {  // Changed to explicit comparison
      return res.status(401).json({ 
        error: 'Please verify your email before logging in',
        needsVerification: true
      });
    }

    // Update last login time
    await updateLastLogin(user.id);

    // Format the date
    const formattedDate = user.date_of_birth ? 
      new Date(user.date_of_birth).toISOString().split('T')[0] : '';

    // If all checks pass, proceed with login
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      profilePhoto: user.profile_photo || null,
      coverPhoto: user.cover_photo || null,
      intro: user.intro || "",
      knownAs: user.known_as || "",
      dateOfBirth: formattedDate,
      phone: user.phone || "",  
      role: user.role,  // Add role to response
      facebookUrl: user.facebook_url || "",
      twitterUrl: user.twitter_url || "",
      instagramUrl: user.instagram_url || ""
    };
    
    console.log('Sending user response:', userResponse); // Debug log
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
    
    res.json({ 
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserByEmail = async (req, res) => {
  const { email } = req.query;
  console.log('Fetching user by email:', email);
  try {
    const user = await findUserByEmailOrUsername(email);
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('User found:', user);
    res.json({ 
      name: user.name, 
      username: user.username,
      dateOfBirth: user.date_of_birth // Include date of birth
    });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const checkSession = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username
    }});
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const logout = async (req, res) => {
  try {
    // Since we're using JWT, we don't need to do anything server-side
    // The client will handle removing the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserPhotoHandler = async (req, res) => {
  console.log('Photo update request received');
  const { userId, profilePhoto, coverPhoto } = req.body;
  
  if (!userId) {
    console.log('No userId provided');
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    console.log('Attempting to update photos for user:', userId);
    const updatedUser = await updateUserPhotos(userId, profilePhoto, coverPhoto);
    
    if (!updatedUser) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const formattedDate = updatedUser.date_of_birth ? 
      new Date(updatedUser.date_of_birth).toISOString().split('T')[0] : '';

    console.log('Photos updated successfully');
    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        username: updatedUser.username,
        profilePhoto: updatedUser.profile_photo,
        coverPhoto: updatedUser.cover_photo,
        intro: updatedUser.intro,         
        knownAs: updatedUser.known_as,
        dateOfBirth: formattedDate,
        phone: updatedUser.phone || ""  // Preserve phone
      }
    });
  } catch (error) {
    console.error('Error updating photos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserInfoHandler = async (req, res) => {
  const { userId, intro, knownAs } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const updatedUser = await updateUserInfo(userId, intro, knownAs);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const formattedDate = updatedUser.date_of_birth ? 
      new Date(updatedUser.date_of_birth).toISOString().split('T')[0] : '';

    res.json({
      user: {
        ...updatedUser,
        profilePhoto: updatedUser.profile_photo,
        coverPhoto: updatedUser.cover_photo,
        knownAs: updatedUser.known_as,
        dateOfBirth: formattedDate,
        phone: updatedUser.phone || ""  // Preserve phone
      }
    });
  } catch (error) {
    console.error('Error updating user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserDetailsHandler = async (req, res) => {
  const { userId, name, email, username, dateOfBirth, phone, intro, knownAs } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Ensure UTC date handling
    let adjustedDate = null;
    if (dateOfBirth) {
      adjustedDate = new Date(dateOfBirth);
      // Remove time component completely
      adjustedDate = new Date(adjustedDate.getUTCFullYear(), 
                            adjustedDate.getUTCMonth(), 
                            adjustedDate.getUTCDate());
    }

    const updatedUser = await updateUserDetails(
      userId, 
      name, 
      email, 
      username, 
      adjustedDate,
      phone,
      intro,    // Pass intro
      knownAs   // Pass knownAs
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Format the date without time component
    const formattedDate = updatedUser.date_of_birth ? 
      new Date(updatedUser.date_of_birth).toISOString().split('T')[0] : '';

    res.json({
      user: {
        ...updatedUser,
        profilePhoto: updatedUser.profile_photo,
        coverPhoto: updatedUser.cover_photo,
        dateOfBirth: formattedDate,
        phone: updatedUser.phone,
        intro: updatedUser.intro,         // Include intro
        knownAs: updatedUser.known_as     // Include knownAs
      }
    });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updatePasswordHandler = async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await updateUserPassword(userId, oldPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const forgotPasswordHandler = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmailOrUsername(email);
    if (!user) {
      // For security reasons, don't reveal whether the email exists
      return res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    }

    const resetToken = await createPasswordResetToken(email);
    if (!resetToken) {
      return res.status(500).json({ error: 'Failed to create reset token' });
    }

    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const resetPasswordHandler = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await verifyResetToken(token);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    await resetPassword(token, newPassword);
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserSocialsHandler = async (req, res) => {
  const { userId, facebookUrl, twitterUrl, instagramUrl } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const updatedUser = await updateUserSocials(userId, facebookUrl, twitterUrl, instagramUrl);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        username: updatedUser.username,
        profilePhoto: updatedUser.profile_photo,
        coverPhoto: updatedUser.cover_photo,
        intro: updatedUser.intro,
        knownAs: updatedUser.known_as,
        dateOfBirth: updatedUser.date_of_birth,
        phone: updatedUser.phone,
        facebookUrl: updatedUser.facebook_url,
        twitterUrl: updatedUser.twitter_url,
        instagramUrl: updatedUser.instagram_url,
        role: updatedUser.role,
        isVerified: updatedUser.is_verified
      }
    });
  } catch (error) {
    console.error('Error updating social links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const saveFaceData = async (req, res) => {
  const { userId, faceData } = req.body;

  if (!userId || !faceData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await updateFaceData(userId, faceData);
    res.json({ message: 'Face data saved successfully' });
  } catch (error) {
    console.error('Error saving face data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const loginWithFace = async (req, res) => {
  const { faceData, attemptNumber } = req.body;

  if (!faceData) {
    console.log('Face login failed: No face data provided');
    return res.status(400).json({ error: 'Face data is required' });
  }

  try {
    console.log('Starting face login process. Attempt:', attemptNumber);
    const result = await findUserByFaceData(faceData);
    
    console.log('Face recognition result:', {
      authenticated: result.authenticated,
      similarity: result.similarity,
      needsRescan: result.needsRescan,
      error: result.error
    });

    // Check if the user account is inactive
    if (result.authenticated && result.user.status === 'inactive') {
      return res.status(403).json({
        error: 'Your account has been deactivated. Please contact the administrator to reactivate your account.',
        inactive: true
      });
    }

    // Handle rescan scenario
    if (result.needsRescan) {
      return res.status(200).json({
        needsRescan: true,
        similarity: result.similarity,
        message: result.message
      });
    }

    // Handle authentication failure
    if (!result.authenticated || !result.user) {
      console.log('Face authentication failed:', result.message);
      return res.status(401).json({
        error: result.error || 'Authentication failed',
        message: result.message || 'Face not recognized'
      });
    }

    // Handle successful authentication
    console.log('Face authentication successful for user:', result.user.email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.user.id }, 
      process.env.JWT_SECRET || 'your_jwt_secret', 
      { expiresIn: '1h' }
    );

    // Update last login
    await updateLastLogin(result.user.id);

    // Return success response
    return res.json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        username: result.user.username,
        role: result.user.role,
        isVerified: result.user.is_verified
      },
      similarity: result.similarity
    });

  } catch (error) {
    console.error('Face login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during face authentication'
    });
  }
};

module.exports = { 
  register, 
  login, 
  logout, 
  getUserByEmail, 
  checkSession,
  updateUserPhotoHandler,
  updateUserInfoHandler,
  updateUserDetailsHandler,
  updatePasswordHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  updateUserSocialsHandler,
  saveFaceData,
  loginWithFace
};
