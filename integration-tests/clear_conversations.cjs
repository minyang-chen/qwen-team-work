const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearConversations() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:changeme@localhost:27017/qwen_code?authSource=admin';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('qwen_code');
    const sessions = db.collection('sessions');
    
    // Delete all conversation sessions
    const result = await sessions.deleteMany({});
    console.log(`Deleted ${result.deletedCount} conversation records`);
    
  } catch (error) {
    console.error('Clear error:', error);
  } finally {
    await client.close();
    console.log('Cleanup completed');
  }
}

clearConversations();
