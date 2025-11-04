 require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// MongoDB Connection - YOUR ATLAS CONNECTION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://arjunmarjun74_db_user:aGlhyjbCobrxQu87@clusteraj.uqfj2vb.mongodb.net/ajs_wave?retryWrites=true&w=majority&appName=ClusterAJ';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB Atlas - ClusterAJ'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  room: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// User Schema
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  avatar: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate avatar from username
userSchema.pre('save', function(next) {
  if (!this.avatar) {
    this.avatar = this.username.charAt(0).toUpperCase();
  }
  next();
});

const User = mongoose.model('User', userSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Store active users and rooms
const users = {};
const roomUsers = {};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Socket.io connection handling with authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.username);

  // Join room
  socket.on('joinRoom', async ({ room }) => {
    try {
      // Add user to room
      socket.join(room);
      
      // Store user data
      users[socket.id] = { 
        id: socket.id, 
        username: socket.username, 
        room,
        userId: socket.userId
      };
      
      // Add user to room users
      if (!roomUsers[room]) {
        roomUsers[room] = [];
      }
      roomUsers[room].push(users[socket.id]);
      
      // Send welcome message
      socket.emit('message', {
        username: 'AJ\'S WAVE Bot',
        message: `Welcome to ${room}, ${socket.username}!`,
        time: new Date().toLocaleTimeString()
      });
      
      // Broadcast user joined
      socket.broadcast.to(room).emit('message', {
        username: 'AJ\'S WAVE Bot',
        message: `${socket.username} has joined the chat`,
        time: new Date().toLocaleTimeString()
      });
      
      // Send room users
      io.to(room).emit('roomUsers', {
        room,
        users: roomUsers[room]
      });
      
      // Send last 50 messages from this room
      const messages = await Message.find({ room })
        .sort({ timestamp: -1 })
        .limit(50)
        .exec();
      
      // Send messages in chronological order
      messages.reverse().forEach(msg => {
        socket.emit('message', {
          username: msg.username,
          message: msg.message,
          time: new Date(msg.timestamp).toLocaleTimeString()
        });
      });
      
      console.log(`${socket.username} joined room: ${room}`);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  // Listen for chat messages
  socket.on('chatMessage', async (data) => {
    try {
      const user = users[socket.id];
      if (!user) return;
      
      // Create and save message to YOUR MongoDB Atlas
      const message = new Message({
        username: data.username,
        room: data.room,
        message: data.message
      });
      
      await message.save();
      console.log(`💾 Message saved to MongoDB Atlas - ClusterAJ`);
      
      // Emit message to room
      io.to(data.room).emit('message', {
        username: data.username,
        message: data.message,
        time: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // ========== ENHANCED FEATURES SOCKET HANDLERS ==========

  // File message
  socket.on('fileMessage', async (data) => {
    try {
      const user = users[socket.id];
      if (!user) return;
      
      const messageData = {
        id: Date.now().toString(),
        username: data.username,
        room: data.room,
        file: data.file,
        time: new Date().toLocaleTimeString()
      };
      
      io.to(data.room).emit('fileMessage', messageData);
    } catch (error) {
      console.error('Error handling file message:', error);
    }
  });

  // Voice message
  socket.on('voiceMessage', async (data) => {
    try {
      const user = users[socket.id];
      if (!user) return;
      
      const messageData = {
        id: Date.now().toString(),
        username: data.username,
        room: data.room,
        voice: data.voice,
        time: new Date().toLocaleTimeString()
      };
      
      io.to(data.room).emit('voiceMessage', messageData);
    } catch (error) {
      console.error('Error handling voice message:', error);
    }
  });

  // Message reactions
  socket.on('messageReaction', (data) => {
    try {
      io.to(data.room).emit('messageReaction', data);
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  });

  // Video calls
  socket.on('startCall', (data) => {
    try {
      socket.broadcast.to(data.room).emit('incomingCall', {
        username: data.username
      });
    } catch (error) {
      console.error('Error handling call start:', error);
    }
  });

  socket.on('endCall', (data) => {
    try {
      io.to(data.room).emit('callEnded', {
        username: data.username
      });
    } catch (error) {
      console.error('Error handling call end:', error);
    }
  });

  // WhatsApp-like features
  socket.on('imageMessage', async (data) => {
    try {
      const user = users[socket.id];
      if (!user) return;
      
      const messageData = {
        id: Date.now().toString(),
        username: data.username,
        room: data.room,
        image: data.image,
        time: new Date().toLocaleTimeString()
      };
      
      io.to(data.room).emit('imageMessage', messageData);
    } catch (error) {
      console.error('Error handling image message:', error);
    }
  });

  socket.on('contactMessage', async (data) => {
    try {
      const user = users[socket.id];
      if (!user) return;
      
      const messageData = {
        id: Date.now().toString(),
        username: data.username,
        room: data.room,
        contact: data.contact,
        time: new Date().toLocaleTimeString()
      };
      
      io.to(data.room).emit('contactMessage', messageData);
    } catch (error) {
      console.error('Error handling contact message:', error);
    }
  });

  socket.on('pollMessage', async (data) => {
    try {
      const user = users[socket.id];
      if (!user) return;
      
      const messageData = {
        id: Date.now().toString(),
        username: data.username,
        room: data.room,
        poll: data.poll,
        time: new Date().toLocaleTimeString()
      };
      
      io.to(data.room).emit('pollMessage', messageData);
    } catch (error) {
      console.error('Error handling poll message:', error);
    }
  });

  socket.on('locationMessage', async (data) => {
    try {
      const user = users[socket.id];
      if (!user) return;
      
      const messageData = {
        id: Date.now().toString(),
        username: data.username,
        room: data.room,
        location: data.location,
        time: new Date().toLocaleTimeString()
      };
      
      io.to(data.room).emit('locationMessage', messageData);
    } catch (error) {
      console.error('Error handling location message:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    const user = users[socket.id];
    if (user) {
      const { username, room, userId } = user;
      
      // Remove user from room
      if (roomUsers[room]) {
        roomUsers[room] = roomUsers[room].filter(u => u.id !== socket.id);
        
        // Broadcast user left
        io.to(room).emit('message', {
          username: 'AJ\'S WAVE Bot',
          message: `${username} has left the chat`,
          time: new Date().toLocaleTimeString()
        });
        
        // Update room users
        io.to(room).emit('roomUsers', {
          room,
          users: roomUsers[room]
        });
      }
      
      // Remove user from users object
      delete users[socket.id];
      
      // Update user status in database
      if (userId) {
        await User.findByIdAndUpdate(userId, { 
          isOnline: false,
          lastSeen: new Date()
        });
      }
      
      console.log(`${username} disconnected from room: ${room}`);
    }
  });
});

// API Routes
app.get('/api/messages/:room', async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await Message.find({ room })
      .sort({ timestamp: -1 })
      .limit(100)
      .exec();
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/rooms', (req, res) => {
  const rooms = Object.keys(roomUsers);
  res.json(rooms);
});

// Protected route example
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌊 AJ'S WAVE server running on port ${PORT}`);
  console.log(`📊 MongoDB: Connected to ClusterAJ - ajs_wave database`);
});