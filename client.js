 // DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const authContainer = document.getElementById('auth-container');
const appContainer = document.querySelector('.app-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabBtns = document.querySelectorAll('.tab-btn');
const switchTabLinks = document.querySelectorAll('.switch-tab');
const themeToggle = document.getElementById('theme-toggle');
const logoutBtn = document.getElementById('logout-btn');
const roomElements = document.querySelectorAll('.room');
const currentRoomName = document.getElementById('current-room-name');
const onlineCount = document.getElementById('online-count');
const roomUserCount = document.getElementById('room-user-count');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const usersList = document.getElementById('users-list');
const userAvatar = document.getElementById('user-avatar');
const usernameDisplay = document.getElementById('username-display');
const newRoomBtn = document.getElementById('new-room-btn');
const newRoomModal = document.getElementById('new-room-modal');
const newRoomForm = document.getElementById('new-room-form');
const closeModal = document.querySelector('.close-modal');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');

// App State
let currentUser = null;
let currentRoom = 'general';
let socket = null;
let theme = localStorage.getItem('theme') || 'light';
let authToken = localStorage.getItem('authToken');

// Initialize the app
function init() {
    // Set theme
    setTheme(theme);
    
    // Check if user is already logged in
    if (authToken) {
        // Verify token with server (in real app)
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            showApp();
        }, 2000);
    } else {
        // Show auth screen
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                authContainer.classList.remove('hidden');
            }, 500);
        }, 2000);
    }
    
    // Event Listeners
    themeToggle.addEventListener('click', toggleTheme);
    logoutBtn.addEventListener('click', handleLogout);
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    messageForm.addEventListener('submit', handleMessageSubmit);
    newRoomBtn.addEventListener('click', () => showModal(newRoomModal));
    closeModal.addEventListener('click', () => hideModal(newRoomModal));
    newRoomForm.addEventListener('submit', handleNewRoom);
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    
    // Switch tab links
    switchTabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    
    // Room selection
    roomElements.forEach(room => {
        room.addEventListener('click', () => {
            const roomName = room.getAttribute('data-room');
            switchRoom(roomName);
        });
    });
    
    // Toggle password visibility
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
    
    // Close modal on outside click
    newRoomModal.addEventListener('click', (e) => {
        if (e.target === newRoomModal) {
            hideModal(newRoomModal);
        }
    });

    // Initialize new features
    initializeNewFeatures();
}

// Theme functions
function setTheme(newTheme) {
    theme = newTheme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update theme toggle icon
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Tab switching
function switchTab(tab) {
    // Update active tab button
    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show active form
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
        if (form.id === `${tab}-form`) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    const btn = loginForm.querySelector('.auth-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;
    
    try {
        // Simulate API call - replace with actual API
        await simulateAPICall(1000);
        
        // For demo, create mock user
        const mockUser = {
            id: '1',
            username: email.split('@')[0],
            email: email,
            avatar: email.split('@')[0].charAt(0).toUpperCase()
        };
        
        authToken = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        showNotification('Login successful!', 'success');
        setTimeout(() => {
            hideAuth();
            showApp();
            initializeSocket(mockUser);
        }, 1000);
        
    } catch (error) {
        showNotification('Login failed. Please try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (!username || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    const btn = signupForm.querySelector('.auth-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    btn.disabled = true;
    
    try {
        // Simulate API call - replace with actual API
        await simulateAPICall(1500);
        
        const mockUser = {
            id: '1',
            username: username,
            email: email,
            avatar: username.charAt(0).toUpperCase()
        };
        
        authToken = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        showNotification('Account created successfully!', 'success');
        setTimeout(() => {
            hideAuth();
            showApp();
            initializeSocket(mockUser);
        }, 1000);
        
    } catch (error) {
        showNotification('Signup failed. Please try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    
    if (socket) {
        socket.disconnect();
    }
    
    showNotification('Logged out successfully', 'success');
    setTimeout(() => {
        hideApp();
        showAuth();
    }, 1000);
}

// UI Transition functions
function hideAuth() {
    authContainer.style.opacity = '0';
    setTimeout(() => {
        authContainer.classList.add('hidden');
    }, 300);
}

function showAuth() {
    authContainer.classList.remove('hidden');
    setTimeout(() => {
        authContainer.style.opacity = '1';
    }, 50);
}

function hideApp() {
    appContainer.style.opacity = '0';
    setTimeout(() => {
        appContainer.classList.add('hidden');
    }, 300);
}

function showApp() {
    const userData = localStorage.getItem('user');
    if (userData) {
        currentUser = JSON.parse(userData);
        usernameDisplay.textContent = currentUser.username;
        userAvatar.textContent = currentUser.avatar;
        userAvatar.style.background = `linear-gradient(135deg, var(--primary-color), var(--accent-color))`;
    }
    
    appContainer.classList.remove('hidden');
    setTimeout(() => {
        appContainer.style.opacity = '1';
        initializeSocket(currentUser);
    }, 50);
}

// Modal functions
function showModal(modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 50);
}

function hideModal(modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function handleNewRoom(e) {
    e.preventDefault();
    const roomName = document.getElementById('room-name').value.trim();
    const roomDescription = document.getElementById('room-description').value.trim();
    
    if (!roomName) {
        showNotification('Please enter a room name', 'error');
        return;
    }
    
    // Add new room to the list
    const roomList = document.querySelector('.room-list');
    const newRoom = document.createElement('div');
    newRoom.className = 'room';
    newRoom.setAttribute('data-room', roomName.toLowerCase());
    newRoom.innerHTML = `
        <i class="fas fa-hashtag"></i>
        <span>${roomName}</span>
    `;
    
    newRoom.addEventListener('click', () => {
        switchRoom(roomName.toLowerCase());
    });
    
    roomList.appendChild(newRoom);
    hideModal(newRoomModal);
    newRoomForm.reset();
    
    showNotification(`Room "${roomName}" created!`, 'success');
    
    // Switch to the new room
    setTimeout(() => {
        switchRoom(roomName.toLowerCase());
    }, 500);
}

// Socket initialization
function initializeSocket(user) {
    if (!user) return;
    
    // In a real app, this would connect to your server
    // For this demo, we'll simulate the connection
    socket = {
        emit: (event, data) => {
            console.log(`Emitting ${event}:`, data);
            // Simulate server response for demo purposes
            if (event === 'joinRoom') {
                setTimeout(() => {
                    handleUserJoined({
                        username: user.username,
                        room: data.room,
                        users: [
                            { id: '1', username: user.username, room: data.room, avatar: user.avatar },
                            { id: '2', username: 'Alex', room: data.room, avatar: 'A' },
                            { id: '3', username: 'Jordan', room: data.room, avatar: 'J' },
                            { id: '4', username: 'Taylor', room: data.room, avatar: 'T' },
                            { id: '5', username: 'Casey', room: data.room, avatar: 'C' }
                        ]
                    });
                }, 500);
            } else if (event === 'chatMessage') {
                setTimeout(() => {
                    handleNewMessage({
                        id: Date.now().toString(),
                        username: data.username,
                        room: data.room,
                        message: data.message,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        avatar: user.avatar
                    });
                }, 300);
            }
        },
        on: (event, callback) => {
            // Store callbacks for simulated events
            if (!window.socketCallbacks) window.socketCallbacks = {};
            window.socketCallbacks[event] = callback;
        },
        disconnect: () => {
            console.log('Socket disconnected');
        }
    };
    
    // Set up event listeners for socket
    socket.on('message', handleNewMessage);
    socket.on('roomUsers', handleRoomUsers);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    
    // Join the default room
    socket.emit('joinRoom', { username: user.username, room: currentRoom });
}

// Room switching
function switchRoom(roomName) {
    // Update UI
    roomElements.forEach(room => {
        if (room.getAttribute('data-room') === roomName) {
            room.classList.add('active');
        } else {
            room.classList.remove('active');
        }
    });
    
    const displayName = roomName.charAt(0).toUpperCase() + roomName.slice(1);
    currentRoomName.textContent = displayName;
    currentRoom = roomName;
    
    // Clear messages
    messagesContainer.innerHTML = '';
    
    // Add welcome message for new room
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'welcome-message';
    welcomeMessage.innerHTML = `
        <div class="welcome-icon">
            <i class="fas fa-hashtag"></i>
        </div>
        <h3>Welcome to ${displayName}</h3>
        <p>This is the start of the ${roomName} room</p>
    `;
    messagesContainer.appendChild(welcomeMessage);
    
    // In a real app, we would emit a room change event to the server
    if (socket && currentUser) {
        socket.emit('joinRoom', { username: currentUser.username, room: roomName });
    }
}

// Message handling
function handleMessageSubmit(e) {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message || !currentUser) return;
    
    // Emit message to server
    socket.emit('chatMessage', {
        username: currentUser.username,
        room: currentRoom,
        message: message
    });
    
    // Clear input
    messageInput.value = '';
}

function handleNewMessage(data) {
    const messageElement = document.createElement('div');
    const isOwnMessage = data.username === currentUser.username;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${data.username}</span>
            <span class="message-time">${data.time}</span>
        </div>
        <div class="message-content">${data.message}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add animation
    messageElement.style.animation = 'messageAppear 0.3s ease-out';
}

function handleRoomUsers(data) {
    // Update online users count
    onlineCount.textContent = `(${data.users.length})`;
    roomUserCount.textContent = `${data.users.length} users in room`;
    
    // Update users list
    usersList.innerHTML = '';
    data.users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <div class="user-avatar">${user.avatar || user.username.charAt(0).toUpperCase()}</div>
            <span>${user.username}</span>
            <div class="user-status"></div>
        `;
        usersList.appendChild(userElement);
    });
}

function handleUserJoined(data) {
    // Show join notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = `${data.username} joined the room`;
    notification.style.cssText = `
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
        margin: 10px 0;
        font-size: 0.9rem;
    `;
    messagesContainer.appendChild(notification);
    
    // Update users list if this is the current user
    if (data.username === currentUser.username) {
        handleRoomUsers({ users: data.users });
    }
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function handleUserLeft(data) {
    // Show leave notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = `${data.username} left the room`;
    notification.style.cssText = `
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
        margin: 10px 0;
        font-size: 0.9rem;
    `;
    messagesContainer.appendChild(notification);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Utility functions
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function simulateAPICall(duration) {
    return new Promise(resolve => {
        setTimeout(resolve, duration);
    });
}

// ========== NEW FEATURES ==========

// Variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingStartTime = null;
let currentAudio = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isInCall = false;

// Emoji Data
const emojiData = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
    people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '👩', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '👷', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '🕴️', '👯', '🧖', '🧗', '🤺', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘', '🛀', '🛌', '👭', '👫', '👬', '💏', '💑', '👪'],
    nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁', '🍄', '🐚', '🪨', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '💨', '💧', '💦', '☔', '☂️', '🌊', '🎃', '🎄', '🎆', '🎇', '🧨', '✨', '🎈', '🎉', '🎊', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗️', '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🪁', '🎱', '🔮', '🧿', '🎮', '🕹️', '🎰', '🎲', '🧩', '🧸', '♠️', '♥️', '♦️', '♣️', '♟️', '🃏', '🀄', '🎴', '🎭', '🖼️', '🎨', '🧵', '🧶', '👓', '🕶️', '🥽', '🥼', '🦺', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩', '🎓', '🧢', '⛑️', '📿', '💄', '💍', '💎'],
    food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥨', '🥯', '🥖', '🧀', '🥗', '🥙', '🥪', '🌮', '🌯', '🥫', '🍖', '🍗', '🥩', '🍠', '🥟', '🥠', '🥡', '🦪', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽️', '🥣', '🥡', '🥢', '🧂'],
    activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩']
};

// Initialize New Features
function initializeNewFeatures() {
    initializeEmojiPicker();
    initializeFileSharing();
    initializeVoiceMessages();
    initializeVideoCalls();
    initializeMessageReactions();
}

// Emoji Picker
function initializeEmojiPicker() {
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const emojiGrid = document.getElementById('emoji-grid');
    const messageInput = document.getElementById('message-input');
    
    if (!emojiBtn || !emojiPicker) return;
    
    function populateEmojis(category = 'smileys') {
        if (!emojiGrid) return;
        emojiGrid.innerHTML = '';
        emojiData[category].forEach(emoji => {
            const emojiBtn = document.createElement('button');
            emojiBtn.className = 'emoji';
            emojiBtn.textContent = emoji;
            emojiBtn.addEventListener('click', () => {
                if (messageInput) {
                    messageInput.value += emoji;
                    messageInput.focus();
                }
            });
            emojiGrid.appendChild(emojiBtn);
        });
    }
    
    document.querySelectorAll('.emoji-category').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.emoji-category').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            populateEmojis(btn.dataset.category);
        });
    });
    
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('hidden');
        if (!emojiPicker.classList.contains('hidden')) {
            populateEmojis();
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
            emojiPicker.classList.add('hidden');
        }
    });
    
    populateEmojis();
}

// Basic implementations for other features (they'll work but are simplified)
function initializeFileSharing() {
    const fileBtn = document.getElementById('file-btn');
    const fileModal = document.getElementById('file-modal');
    
    if (!fileBtn || !fileModal) return;
    
    fileBtn.addEventListener('click', () => {
        showModal(fileModal);
    });
}

function initializeVoiceMessages() {
    const voiceBtn = document.getElementById('voice-btn');
    if (!voiceBtn) return;
    
    voiceBtn.addEventListener('click', () => {
        showNotification('Voice messages will be available soon!', 'info');
    });
}

function initializeVideoCalls() {
    const videoCallBtn = document.getElementById('video-call-btn');
    if (!videoCallBtn) return;
    
    videoCallBtn.addEventListener('click', () => {
        showNotification('Video calls will be available soon!', 'info');
    });
}

function initializeMessageReactions() {
    // Will be implemented when messages are rendered
}

// Initialize the app when DOM is loaded
// Start the app
setTimeout(init, 100);

// ========== WHATSAPP-LIKE FEATURES ==========

// Enhanced Attachment System
function initializeWhatsAppFeatures() {
    initializeAttachmentMenu();
    initializeImageSharing();
    initializeCamera();
    initializeContactSharing();
    initializePollSystem();
    initializeLocationSharing();
    initializeMessageStatus();
}

// Attachment Menu
function initializeAttachmentMenu() {
    const attachBtn = document.getElementById('file-btn');
    const attachmentMenu = document.getElementById('attachment-menu');
    
    if (!attachBtn || !attachmentMenu) return;
    
    // Rename button to attach and update icon
    attachBtn.innerHTML = '<i class="fas fa-paperclip"></i>';
    attachBtn.title = 'Attach';
    
    attachBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        attachmentMenu.classList.toggle('hidden');
        attachBtn.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!attachmentMenu.contains(e.target) && e.target !== attachBtn) {
            attachmentMenu.classList.add('hidden');
            attachBtn.classList.remove('active');
        }
    });
    
    // Handle attachment options
    document.querySelectorAll('.attachment-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const type = e.currentTarget.dataset.type;
            handleAttachmentType(type);
            attachmentMenu.classList.add('hidden');
            attachBtn.classList.remove('active');
        });
    });
}

function handleAttachmentType(type) {
    switch(type) {
        case 'image':
            document.getElementById('file-input').click();
            break;
        case 'document':
            showNotification('Document sharing coming soon!', 'info');
            break;
        case 'camera':
            openCamera();
            break;
        case 'contact':
            showModal(document.getElementById('contact-modal'));
            break;
        case 'poll':
            showModal(document.getElementById('poll-modal'));
            break;
        case 'location':
            showModal(document.getElementById('location-modal'));
            break;
    }
}

// Image Sharing with Preview
function initializeImageSharing() {
    const fileInput = document.getElementById('file-input');
    const imagePreviewModal = document.getElementById('image-preview-modal');
    const imagePreview = document.getElementById('image-preview');
    const sendImageBtn = document.getElementById('send-image');
    const cancelImageBtn = document.getElementById('cancel-image');
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                showModal(imagePreviewModal);
            };
            reader.readAsDataURL(file);
        }
    });
    
    sendImageBtn.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (file) {
            // Simulate image upload
            const imageData = {
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file),
                timestamp: new Date().toISOString()
            };
            
            socket.emit('imageMessage', {
                username: currentUser.username,
                room: currentRoom,
                image: imageData
            });
            
            hideModal(imagePreviewModal);
            fileInput.value = '';
            showNotification('Image sent!', 'success');
        }
    });
    
    cancelImageBtn.addEventListener('click', () => {
        hideModal(imagePreviewModal);
        fileInput.value = '';
    });
}

// Camera Integration
function initializeCamera() {
    const cameraModal = document.getElementById('camera-modal');
    const cameraView = document.getElementById('camera-view');
    const cameraCanvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const closeCameraBtn = cameraModal.querySelector('.close-modal');
    
    let stream = null;
    
    function openCamera() {
        showModal(cameraModal);
        startCamera();
    }
    
    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraView.srcObject = stream;
            captureBtn.classList.remove('hidden');
            retakeBtn.classList.add('hidden');
        } catch (error) {
            console.error('Error accessing camera:', error);
            showNotification('Cannot access camera', 'error');
        }
    }
    
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }
    
    captureBtn.addEventListener('click', () => {
        const context = cameraCanvas.getContext('2d');
        cameraCanvas.width = cameraView.videoWidth;
        cameraCanvas.height = cameraView.videoHeight;
        context.drawImage(cameraView, 0, 0);
        
        cameraView.classList.add('hidden');
        cameraCanvas.classList.remove('hidden');
        captureBtn.classList.add('hidden');
        retakeBtn.classList.remove('hidden');
        
        stopCamera();
    });
    
    retakeBtn.addEventListener('click', () => {
        cameraView.classList.remove('hidden');
        cameraCanvas.classList.add('hidden');
        captureBtn.classList.remove('hidden');
        retakeBtn.classList.add('hidden');
        startCamera();
    });
    
    closeCameraBtn.addEventListener('click', () => {
        stopCamera();
        hideModal(cameraModal);
    });
}

// Contact Sharing
function initializeContactSharing() {
    document.querySelectorAll('.share-contact-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const contact = e.currentTarget.dataset.contact;
            shareContact(contact);
            hideModal(document.getElementById('contact-modal'));
        });
    });
}

function shareContact(contactId) {
    // Simulate contact sharing
    const contactData = {
        id: contactId,
        name: contactId === 'alex' ? 'Alex Johnson' : 'Sarah Wilson',
        phone: contactId === 'alex' ? '+1 234 567 8900' : '+1 234 567 8901',
        timestamp: new Date().toISOString()
    };
    
    socket.emit('contactMessage', {
        username: currentUser.username,
        room: currentRoom,
        contact: contactData
    });
    
    showNotification('Contact shared!', 'success');
}

// Poll System
function initializePollSystem() {
    const pollModal = document.getElementById('poll-modal');
    const addOptionBtn = document.getElementById('add-option-btn');
    const createPollBtn = document.getElementById('create-poll');
    const cancelPollBtn = document.getElementById('cancel-poll');
    
    addOptionBtn.addEventListener('click', () => {
        const optionsContainer = document.getElementById('poll-options');
        const optionCount = optionsContainer.children.length + 1;
        const newOption = document.createElement('input');
        newOption.type = 'text';
        newOption.className = 'poll-option';
        newOption.placeholder = `Option ${optionCount}`;
        optionsContainer.appendChild(newOption);
        
        // Add animation
        newOption.style.animation = 'fadeInScale 0.3s ease-out';
    });
    
    createPollBtn.addEventListener('click', () => {
        const question = document.getElementById('poll-question').value;
        const options = Array.from(document.querySelectorAll('.poll-option'))
            .map(input => input.value)
            .filter(value => value.trim() !== '');
        
        if (!question || options.length < 2) {
            showNotification('Please add a question and at least 2 options', 'error');
            return;
        }
        
        const pollData = {
            question: question,
            options: options,
            votes: {},
            timestamp: new Date().toISOString()
        };
        
        socket.emit('pollMessage', {
            username: currentUser.username,
            room: currentRoom,
            poll: pollData
        });
        
        hideModal(pollModal);
        resetPollForm();
        showNotification('Poll created!', 'success');
    });
    
    cancelPollBtn.addEventListener('click', () => {
        hideModal(pollModal);
        resetPollForm();
    });
    
    function resetPollForm() {
        document.getElementById('poll-question').value = '';
        const optionsContainer = document.getElementById('poll-options');
        optionsContainer.innerHTML = `
            <input type="text" class="poll-option" placeholder="Option 1">
            <input type="text" class="poll-option" placeholder="Option 2">
        `;
    }
}

// Location Sharing
function initializeLocationSharing() {
    const shareLiveLocation = document.getElementById('share-live-location');
    const shareCurrentLocation = document.getElementById('share-current-location');
    
    shareLiveLocation.addEventListener('click', () => {
        showNotification('Live location sharing coming soon!', 'info');
        hideModal(document.getElementById('location-modal'));
    });
    
    shareCurrentLocation.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const locationData = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        timestamp: new Date().toISOString()
                    };
                    
                    socket.emit('locationMessage', {
                        username: currentUser.username,
                        room: currentRoom,
                        location: locationData
                    });
                    
                    hideModal(document.getElementById('location-modal'));
                    showNotification('Location shared!', 'success');
                },
                (error) => {
                    console.error('Error getting location:', error);
                    showNotification('Cannot access location', 'error');
                }
            );
        } else {
            showNotification('Geolocation not supported', 'error');
        }
    });
}

// Message Status System
function initializeMessageStatus() {
    // Add message status indicators
    document.addEventListener('click', (e) => {
        if (e.target.closest('.message-time')) {
            showMessageStatus(e.target.closest('.message'));
        }
    });
}

function showMessageStatus(messageElement) {
    const tooltip = document.getElementById('message-status-tooltip');
    const rect = messageElement.getBoundingClientRect();
    
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
    tooltip.classList.remove('hidden');
    
    // Hide tooltip after 3 seconds
    setTimeout(() => {
        tooltip.classList.add('hidden');
    }, 3000);
}

// Enhanced Message Handling for new types
function handleEnhancedMessage(data) {
    if (data.image) {
        createImageMessage(data);
    } else if (data.contact) {
        createContactMessage(data);
    } else if (data.poll) {
        createPollMessage(data);
    } else if (data.location) {
        createLocationMessage(data);
    } else {
        handleNewMessage(data); // Fallback to original
    }
}

function createImageMessage(data) {
    const messageElement = document.createElement('div');
    const isOwnMessage = data.username === currentUser.username;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${data.username}</span>
            <span class="message-time">${data.time}</span>
        </div>
        <div class="message-image">
            <img src="${data.image.url}" alt="Shared image" onclick="openImageModal('${data.image.url}')">
        </div>
        <div class="message-content">📷 Image</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
    animateMessage(messageElement);
}

function createContactMessage(data) {
    const messageElement = document.createElement('div');
    const isOwnMessage = data.username === currentUser.username;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${data.username}</span>
            <span class="message-time">${data.time}</span>
        </div>
        <div class="message-contact">
            <div class="contact-avatar">${data.contact.name.charAt(0)}</div>
            <div class="contact-info">
                <div class="contact-name">${data.contact.name}</div>
                <div class="contact-phone">${data.contact.phone}</div>
            </div>
            <button class="save-contact-btn" onclick="saveContact('${data.contact.name}', '${data.contact.phone}')">
                Save
            </button>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
    animateMessage(messageElement);
}

function createPollMessage(data) {
    const messageElement = document.createElement('div');
    const isOwnMessage = data.username === currentUser.username;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${data.username}</span>
            <span class="message-time">${data.time}</span>
        </div>
        <div class="message-poll">
            <div class="poll-question">${data.poll.question}</div>
            <div class="poll-options">
                ${data.poll.options.map((option, index) => `
                    <div class="poll-option" onclick="voteOnPoll('${data.id}', ${index})">
                        <span class="option-text">${option}</span>
                        <span class="option-votes">0 votes</span>
                    </div>
                `).join('')}
            </div>
            <div class="poll-total">0 votes total</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
    animateMessage(messageElement);
}

function createLocationMessage(data) {
    const messageElement = document.createElement('div');
    const isOwnMessage = data.username === currentUser.username;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${data.username}</span>
            <span class="message-time">${data.time}</span>
        </div>
        <div class="message-location">
            <div class="location-icon">
                <i class="fas fa-map-marker-alt"></i>
            </div>
            <div class="location-info">
                <div class="location-title">Shared Location</div>
                <div class="location-time">${new Date(data.location.timestamp).toLocaleTimeString()}</div>
            </div>
            <button class="view-location-btn" onclick="viewOnMap(${data.location.lat}, ${data.location.lng})">
                View
            </button>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
    animateMessage(messageElement);
}

function animateMessage(element) {
    element.style.animation = 'messageSent 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Utility functions for new features
function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90vw; max-height: 90vh;">
            <div class="modal-header">
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <img src="${imageUrl}" style="max-width: 100%; max-height: 80vh; border-radius: 8px;">
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveContact(name, phone) {
    showNotification(`Contact ${name} saved!`, 'success');
}

function voteOnPoll(pollId, optionIndex) {
    showNotification('Vote recorded!', 'success');
}

function viewOnMap(lat, lng) {
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
}

// Update the initializeNewFeatures function
function initializeNewFeatures() {
    initializeEmojiPicker();
    initializeFileSharing();
    initializeVoiceMessages();
    initializeVideoCalls();
    initializeMessageReactions();
    initializeWhatsAppFeatures(); // Add this line
}