const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkAuthSessions() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:changeme@localhost:27017/qwen_code?authSource=admin';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('qwen_code');
    
    // Check authsessions collection
    const authSessions = db.collection('authsessions');
    const authCount = await authSessions.countDocuments();
    console.log(`AuthSessions collection: ${authCount} records`);
    
    if (authCount > 0) {
      const sessions = await authSessions.find({}).toArray();
      sessions.forEach((session, i) => {
        console.log(`${i + 1}. ${session.sessionId} - Status: ${session.status}`);
      });
    }
    
    // Check sessions collection  
    const sessions = db.collection('sessions');
    const sessionCount = await sessions.countDocuments();
    console.log(`\nSessions collection: ${sessionCount} records`);
    
  } catch (error) {
    console.error('Check error:', error);
  } finally {
    await client.close();
  }
}

checkAuthSessions();
