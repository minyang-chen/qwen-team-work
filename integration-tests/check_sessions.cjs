const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkSessions() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:changeme@localhost:27017/qwen_code?authSource=admin';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('qwen_code');
    const sessions = db.collection('sessions');
    
    // Find all active sessions
    const allSessions = await sessions.find({ status: 'active' }).toArray();
    
    console.log(`\nFound ${allSessions.length} active sessions:`);
    allSessions.forEach((session, index) => {
      console.log(`${index + 1}. SessionId: ${session.sessionId}`);
      console.log(`   UserId: ${session.userId}`);
      console.log(`   Created: ${session.createdAt}`);
      console.log(`   LastActivity: ${session.lastActivity}`);
      console.log(`   Messages: ${session.conversationHistory?.length || 0}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Check error:', error);
  } finally {
    await client.close();
  }
}

checkSessions();
