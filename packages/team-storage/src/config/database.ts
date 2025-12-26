// @ts-nocheck
import mongoose from 'mongoose';
import { MONGODB_URI } from './env.js';

export const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });
    
    console.log('MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    // Create vector search indexes if supported
    await createVectorIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

async function createVectorIndexes() {
  try {
    const db = mongoose.connection.db;
    
    if (db) {
      // Create vector search index for file embeddings (MongoDB 8.0+ Community Edition)
      await db.collection('fileembeddings').createIndex(
        { embedding: "2dsphere" },
        { 
          name: 'file_vector_index',
          background: true 
        }
      );
      
      // Create vector search index for image embeddings
      await db.collection('fileembeddings').createIndex(
        { imageEmbedding: "2dsphere" },
        { 
          name: 'image_vector_index',
          background: true,
          partialFilterExpression: { isImage: true }
        }
      );
      
      // Create full-text search index for file content
      await db.collection('fileembeddings').createIndex(
        { 
          content: "text",
          fileName: "text",
          "metadata.description": "text"
        },
        { 
          name: 'file_text_index',
          background: true,
          weights: {
            fileName: 10,
            content: 5,
            "metadata.description": 1
          }
        }
      );
      
      // Create index for image files
      await db.collection('fileembeddings').createIndex(
        { isImage: 1, fileType: 1 },
        { 
          name: 'image_type_index',
          background: true 
        }
      );
      
      console.log('Vector search, image search, and full-text search indexes created successfully for MongoDB Community Edition');
    }
  } catch (error) {
    console.log('Search indexes will be created when MongoDB is available');
    console.log('Error details:', (error as Error).message);
  }
}

export const getMongoClient = () => {
  return mongoose.connection.getClient();
};

export const testMongoConnection = async () => {
  try {
    const db = mongoose.connection.db;
    if (db) {
      await db.admin().ping();
      console.log('MongoDB connection test successful');
    }
  } catch (error) {
    console.error('MongoDB connection test failed:', error);
    process.exit(1);
  }
};

// Helper function to check if MongoDB is connected
export const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Graceful error handler for database operations
export const withMongoErrorHandling = async <T>(operation: () => Promise<T>): Promise<T | null> => {
  try {
    if (!isMongoConnected()) {
      console.log('MongoDB not connected, attempting reconnection...');
      await mongoose.connect(MONGODB_URI);
    }
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error);
    return null;
  }
};
