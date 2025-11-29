const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Data file path
const DATA_FILE = path.join(__dirname, 'baby_data.json');

// Initialize data file
function initializeData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      conversations: [],
      teachers: {},
      stats: {
        totalConversations: 0,
        totalTeachers: 0,
        createdAt: new Date().toISOString()
      }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Read data
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { conversations: [], teachers: {}, stats: { totalConversations: 0, totalTeachers: 0 } };
  }
}

// Write data
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

// API Routes
app.get('/baby', (req, res) => {
  const { text, senderID, remove, index, list, edit, replace, teach, reply } = req.query;
  
  let data = readData();
  
  // Remove conversation
  if (remove) {
    if (index) {
      const convIndex = data.conversations.findIndex(conv => conv.message === remove);
      if (convIndex !== -1 && data.conversations[convIndex].replies[index]) {
        data.conversations[convIndex].replies.splice(index, 1);
        if (data.conversations[convIndex].replies.length === 0) {
          data.conversations.splice(convIndex, 1);
        }
        writeData(data);
        return res.json({ message: `Removed reply at index ${index} from "${remove}"` });
      }
      return res.json({ message: 'Conversation or index not found' });
    } else {
      data.conversations = data.conversations.filter(conv => conv.message !== remove);
      writeData(data);
      return res.json({ message: `Removed "${remove}" from database` });
    }
  }
  
  // List conversations
  if (list) {
    if (list === 'all') {
      return res.json({
        length: data.conversations.length,
        teacher: {
          teacherList: Object.entries(data.teachers).map(([id, count]) => ({ [id]: count }))
        }
      });
    } else {
      const conv = data.conversations.find(c => c.message === list);
      return res.json({ 
        data: conv ? conv.replies.length : 0 
      });
    }
  }
  
  // Edit conversation
  if (edit && replace) {
    const convIndex = data.conversations.findIndex(conv => conv.message === edit);
    if (convIndex !== -1) {
      data.conversations[convIndex].replies = [replace];
      writeData(data);
      return res.json({ message: `Edited "${edit}" to "${replace}"` });
    }
    return res.json({ message: 'Conversation not found' });
  }
  
  // Teach new conversation
  if (teach && reply) {
    let convIndex = data.conversations.findIndex(conv => conv.message === teach);
    
    if (convIndex === -1) {
      data.conversations.push({
        message: teach,
        replies: Array.isArray(reply) ? reply : [reply],
        createdBy: senderID,
        createdAt: new Date().toISOString()
      });
    } else {
      if (Array.isArray(reply)) {
        data.conversations[convIndex].replies.push(...reply);
      } else {
        data.conversations[convIndex].replies.push(reply);
      }
    }
    
    // Update teacher count
    if (senderID) {
      data.teachers[senderID] = (data.teachers[senderID] || 0) + 1;
    }
    
    // Update stats
    data.stats.totalConversations = data.conversations.length;
    data.stats.totalTeachers = Object.keys(data.teachers).length;
    data.stats.updatedAt = new Date().toISOString();
    
    if (writeData(data)) {
      const conv = data.conversations.find(conv => conv.message === teach);
      return res.json({
        message: `Successfully taught "${teach}"`,
        teacher: senderID,
        teachs: data.teachers[senderID] || 0,
        replyCount: conv.replies.length
      });
    }
  }
  
  // Get reply for text
  if (text) {
    // Find exact match first
    let conv = data.conversations.find(c => c.message === text);
    
    // If no exact match, find partial match
    if (!conv) {
      conv = data.conversations.find(c => text.includes(c.message));
    }
    
    if (conv && conv.replies.length > 0) {
      const randomReply = conv.replies[Math.floor(Math.random() * conv.replies.length)];
      return res.json({ reply: randomReply });
    }
    
    // Default responses
    const defaultResponses = [
      "I'm still learning! Can you teach me how to respond to that?",
      "That's interesting! Tell me more.",
      "I don't understand that yet. Can you explain?",
      "Wow, that's new to me!",
      "Can you teach me what to say when someone says that?"
    ];
    
    const randomDefault = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    return res.json({ reply: randomDefault });
  }
  
  res.json({ message: 'Welcome to Baby API' });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  const data = readData();
  res.json({
    status: 'success',
    data: data.stats
  });
});

// Health check
app.get('/health', (req, res) => {
  const data = readData();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    data: {
      conversations: data.conversations.length,
      teachers: Object.keys(data.teachers).length
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const data = readData();
  res.json({ 
    status: 'OK', 
    message: 'Baby API is running!',
    version: '1.0.0',
    stats: data.stats
  });
});

// Initialize and start server
initializeData();
app.listen(PORT, () => {
  console.log(`🚀 Baby API server running on port ${PORT}`);
});
