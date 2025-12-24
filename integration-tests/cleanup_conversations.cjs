const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanupConversations() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:changeme@localhost:27017/qwen_code?authSource=admin';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('qwen_code');
    const sessions = db.collection('sessions');
    
    // Find all conversation sessions (not auth sessions)
    const conversationSessions = await sessions.find({
      sessionId: { $regex: /^session_.*_\d+$/ } // Matches old format without 'user'
    }).toArray();
    
    console.log(`Found ${conversationSessions.length} conversation sessions to delete`);
    
    if (conversationSessions.length > 0) {
      // Delete old conversation sessions
      const result = await sessions.deleteMany({
        sessionId: { $regex: /^session_.*_\d+$/ }
      });
      
      console.log(`Deleted ${result.deletedCount} conversation sessions`);
    }
    
    // Keep auth sessions (format: session_userId_user_timestamp)
    const authSessions = await sessions.find({
      sessionId: { $regex: /^session_.*_user_\d+$/ }
    }).toArray();
    
    console.log(`Kept ${authSessions.length} authentication sessions`);
    
  } catch (error) {
    console.error('Cleanup error:', error);
  } finally {
    await client.close();
    console.log('Cleanup completed');
  }
}

cleanupConversations();
