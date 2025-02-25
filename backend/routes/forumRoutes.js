const express = require('express');
const router = express.Router();
const db = require('../config/db');  // Add this import
const forumModel = require('../models/forumModel');
const multer = require('multer');
const path = require('path');
const profanityFilter = require('../utils/profanityFilter');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/forum')
  },
  filename: function (req, file, cb) {
    cb(null, 'forum-' + Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Add debug middleware
router.use((req, res, next) => {
  console.log('Forum route hit:', {
    path: req.path,
    method: req.method,
    originalUrl: req.originalUrl
  });
  next();
});

// Get all posts
router.get('/posts', async (req, res) => {
    console.log('Fetching posts...');
    try {
        const posts = await forumModel.getPosts();  // Use the model instead of direct db query
        
        // Ensure comments is always an array
        const postsWithComments = posts.map(post => ({
            ...post,
            comments: post.comments || []
        }));
        
        console.log('Posts fetched successfully:', postsWithComments.length);
        res.json(postsWithComments);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Update the post creation route to properly handle staff role
router.post('/posts', upload.single('image'), async (req, res) => {
    console.log('Creating new post:', req.body);
    try {
        // Add debug logging for author ID
        console.log('Author ID:', req.body.authorId);
        
        // Check for profanity
        if (profanityFilter.isProfane(req.body.title) || profanityFilter.isProfane(req.body.content)) {
            return res.status(400).json({ 
                error: 'Your post contains inappropriate language' 
            });
        }

        // Clean the text just in case
        const postData = {
            ...req.body,
            title: profanityFilter.clean(req.body.title),
            content: profanityFilter.clean(req.body.content),
            imageUrl: req.file ? `/uploads/forum/${req.file.filename}` : null,
            poll: req.body.poll ? JSON.parse(req.body.poll) : undefined
        };

        // Clean poll options if they exist
        if (postData.poll) {
            postData.poll = {
                ...postData.poll,
                options: postData.poll.options.map(opt => ({
                    ...opt,
                    text: profanityFilter.clean(opt.text)
                }))
            };
        }

        console.log('Processed post data:', postData);
        const post = await forumModel.createPost(postData);
        console.log('Created post:', post);
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post', details: error.message });
    }
});

// Add comment to post
router.post('/posts/:postId/comments', async (req, res) => {
    try {
        // Check for profanity
        if (profanityFilter.isProfane(req.body.content)) {
            return res.status(400).json({ 
                error: 'Your comment contains inappropriate language' 
            });
        }

        const postId = req.params.postId;
        const commentData = {
            ...req.body,
            content: profanityFilter.clean(req.body.content)
        };

        console.log('Comment data to insert:', commentData);

        const comment = await forumModel.addComment(postId, commentData);
        
        console.log('Comment created:', comment);
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ 
            error: 'Failed to add comment', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Add like comment route
router.post('/posts/:postId/comments/:commentId/like', async (req, res) => {
    console.log('Toggling comment like:', req.params);
    try {
        const { postId, commentId } = req.params;
        const { increment, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const updatedComment = await forumModel.updateCommentLike(postId, commentId, userId, increment);
        console.log('Comment like updated:', updatedComment);
        
        res.json(updatedComment);
    } catch (error) {
        if (error.message === 'User already liked this comment') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating comment like:', error);
        res.status(500).json({ error: 'Failed to update comment like' });
    }
});

// Add post like route
router.post('/posts/:postId/like', async (req, res) => {
    try {
        const { postId } = req.params;
        const { increment, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const updatedPost = await forumModel.updatePostLike(postId, userId, increment);
        res.json(updatedPost);
    } catch (error) {
        if (error.message === 'User already liked this post') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating post like:', error);
        res.status(500).json({ error: 'Failed to update post like' });
    }
});

// Add endpoint to get user's liked posts
router.get('/user-liked-posts/:userId', async (req, res) => {
    try {
        const likedPosts = await forumModel.getUserLikedPosts(req.params.userId);
        res.json(likedPosts);
    } catch (error) {
        console.error('Error fetching user liked posts:', error);
        res.status(500).json({ error: 'Failed to fetch user liked posts' });
    }
});

// Add endpoint to get user's liked comments
router.get('/user-likes/:userId', async (req, res) => {
    try {
        const likedComments = await forumModel.getUserLikedComments(req.params.userId);
        res.json(likedComments);
    } catch (error) {
        console.error('Error fetching user likes:', error);
        res.status(500).json({ error: 'Failed to fetch user likes' });
    }
});

// Add endpoint to get user's voted polls
router.get('/user-voted-polls/:userId', async (req, res) => {
    try {
        const votedPolls = await forumModel.getUserVotedPolls(req.params.userId);
        res.json(votedPolls);
    } catch (error) {
        console.error('Error fetching voted polls:', error);
        res.status(500).json({ error: 'Failed to fetch voted polls' });
    }
});

// Update poll vote route
router.post('/posts/:postId/vote/:optionId', async (req, res) => {
    try {
        const { postId, optionId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const updatedPoll = await forumModel.updatePollVote(postId, optionId, userId);
        res.json(updatedPoll);
    } catch (error) {
        if (error.message === 'User has already voted on this poll') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error recording vote:', error);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

// Update delete post route
router.delete('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;  // Changed from req.query to req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await forumModel.deletePost(postId, userId);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    if (error.message === 'Unauthorized to delete this post') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete post', details: error.message });
  }
});

// Update post route
router.put('/posts/:postId', async (req, res) => {
  console.log('Received PUT request for post:', req.params.postId);
  console.log('Request body:', req.body);
  
  try {
    const { postId } = req.params;
    const { userId, ...updateData } = req.body;

    if (!userId) {
      console.log('Missing userId');
      return res.status(400).json({ error: 'User ID is required' });
    }

    const updatedPost = await forumModel.updatePost(postId, userId, updateData);
    console.log('Updated post:', updatedPost);
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error in PUT /posts/:postId:', error);
    
    if (error.message === 'Unauthorized to edit this post') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update post', details: error.message });
  }
});

// Add new route for event-specific posts with improved error handling
router.get('/event-posts/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('Fetching event posts for eventId:', eventId);
    
    // Basic validation
    const eventIdInt = parseInt(eventId, 10);
    if (isNaN(eventIdInt) || eventIdInt <= 0) {
      console.error('Invalid event ID received:', eventId);
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    // First check if event exists
    const eventExists = await db.oneOrNone('SELECT id FROM events WHERE id = $1', [eventIdInt]);
    if (!eventExists) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const posts = await forumModel.getEventPosts(eventId);
    console.log(`Returning ${posts.length} posts for event ${eventId}`);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching event posts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch event posts', 
      details: error.message 
    });
  }
});

// Update the polls analytics endpoint to include event-related polls
router.get('/polls/analytics', async (req, res) => {
  try {
    const polls = await db.any(`
      SELECT 
        fp.id,
        fp.title,
        COALESCE(
          CASE 
            WHEN fp.event_id IS NOT NULL THEN 
              (SELECT title FROM events WHERE id = fp.event_id)
            ELSE fp.category
          END,
          fp.category
        ) as category,
        fp.created_at,
        p.total_votes as "totalVotes",
        json_agg(
          json_build_object(
            'text', po.text,
            'votes', po.votes
          )
        ) as options
      FROM forum_posts fp
      JOIN forum_polls p ON fp.id = p.post_id
      JOIN forum_poll_options po ON p.id = po.poll_id
      WHERE fp.type = 'poll' 
      AND (
        fp.category = 'announcements' 
        OR fp.event_id IS NOT NULL
        OR fp.category = 'events'
      )
      AND (
        fp.author_id IN (SELECT id FROM admin_users)
        OR fp.author_id IN (SELECT id FROM staff_users)
      )
      GROUP BY fp.id, p.id
      ORDER BY fp.created_at DESC
    `);

    res.json(polls);
  } catch (error) {
    console.error('Error fetching poll analytics:', error);
    res.status(500).json({ error: 'Failed to fetch poll analytics' });
  }
});

// Add a debug endpoint to check profile photos
router.get('/debug-profile-photos', async (req, res) => {
  try {
    const profiles = await db.any(`
      SELECT 'user' as type, id, name, role, profile_photo FROM users LIMIT 5
      UNION ALL
      SELECT 'admin' as type, id, name, 'admin' as role, profile_photo FROM admin_users LIMIT 5
      UNION ALL
      SELECT 'staff' as type, id, name, 'staff' as role, profile_photo FROM staff_users LIMIT 5
    `);
    
    res.json({
      profiles,
      apiUrl: process.env.API_URL || 'http://localhost:5175'
    });
  } catch (error) {
    console.error('Error fetching debug profile photos:', error);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

module.exports = router;
