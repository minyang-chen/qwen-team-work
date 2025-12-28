// @ts-nocheck
import OpenAI from 'openai';
import {
  EMBEDDING_API_KEY,
  EMBEDDING_BASE_URL,
  EMBEDDING_MODEL
} from '../config/env';
import { FileEmbedding } from '../models/UnifiedModels';
import * as mongoose from 'mongoose';
import { EmbeddingQuery, MongoMatchStage } from '@qwen-team/shared';
import { backendLogger } from '@qwen-team/shared';

const logger = backendLogger.child({ service: 'embeddingService' });

const openai = new OpenAI({
  apiKey: EMBEDDING_API_KEY,
  baseURL: EMBEDDING_BASE_URL,
});

export const embeddingService = {
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { error: (error as Error).message });
      throw error;
    }
  },

  async generateImageEmbedding(imagePath: string): Promise<number[]> {
    try {
      // Placeholder for image embedding generation
      // In production, this would use a vision model like CLIP
      logger.info('Image embedding generation not implemented - using placeholder');
      return new Array(512).fill(0).map(() => Math.random()); // 512-dim placeholder
    } catch (error) {
      logger.error('Failed to generate image embedding', { error: (error as Error).message });
      return [];
    }
  },

  async storeFileEmbedding(filePath: string, fileName: string, workspaceType: string, ownerId: string | null, teamId: string | null, fileHash: string, embedding: number[]) {
    // Read file content for full-text search
    const fs = require('fs').promises;
    const path = require('path');
    const { NFS_BASE_PATH } = require('../config/env');
    
    let content = '';
    let fileType = 'application/octet-stream';
    let isImage = false;
    let imageEmbedding: number[] | undefined;
    
    try {
      const fullPath = path.join(NFS_BASE_PATH, filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      // Detect file type
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      isImage = imageExtensions.includes(ext);
      
      if (isImage) {
        fileType = `image/${ext.slice(1)}`;
        content = `[Image file: ${fileName}]`; // Placeholder content for images
        imageEmbedding = await this.generateImageEmbedding(fullPath);
      } else {
        // Text file
        content = await fs.readFile(fullPath, 'utf-8');
        fileType = 'text/plain';
      }
    } catch (error) {
      logger.warn('Could not process file for search', { error: (error as Error).message, filePath });
    }
    
    const fileEmbedding = new FileEmbedding({
      filePath,
      fileName,
      content,
      fileType,
      isImage,
      workspaceType: workspaceType as 'private' | 'team',
      ownerId: ownerId ? new mongoose.Types.ObjectId(ownerId) : undefined,
      teamId: teamId ? new mongoose.Types.ObjectId(teamId) : undefined,
      contentHash: fileHash,
      embedding,
      imageEmbedding,
      metadata: { fileSize: 0, dimensions: isImage ? { width: 0, height: 0 } : undefined },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await fileEmbedding.save();
    return fileEmbedding;
  },

  async searchSimilarFiles(queryEmbedding: number[], workspaceType: string, userId: string, teamId: string | null, limit: number = 10) {
    // MongoDB vector search - requires Atlas Vector Search
    try {
      const matchStage: MongoMatchStage = {
        workspaceType,
        ownerId: new mongoose.Types.ObjectId(userId)
      };
      
      if (teamId) {
        matchStage.teamId = new mongoose.Types.ObjectId(teamId);
      }
      
      const results = await FileEmbedding.aggregate([
        { $match: matchStage },
        {
          $vectorSearch: {
            index: 'file_vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: limit * 10,
            limit: limit
          }
        }
      ]);
      
      return results;
    } catch (error) {
      logger.info('Vector search not available, falling back to basic search', { 
        error: (error as Error).message 
      });
      const query: MongoMatchStage = {
        workspaceType,
        ownerId: new mongoose.Types.ObjectId(userId)
      };
      
      if (teamId) {
        query.teamId = new mongoose.Types.ObjectId(teamId);
      }
      
      return await FileEmbedding.find(query).limit(limit);
    }
  },

  async searchSimilarImages(queryImagePath: string, workspaceType: string, userId: string, teamId: string | null, limit: number = 10) {
    try {
      // Generate embedding for query image
      const queryEmbedding = await this.generateImageEmbedding(queryImagePath);
      
      if (queryEmbedding.length === 0) {
        return [];
      }
      
      const query: any = {
        isImage: true,
        workspaceType,
        ownerId: new mongoose.Types.ObjectId(userId),
        imageEmbedding: { $exists: true }
      };
      
      if (teamId) {
        query.teamId = new mongoose.Types.ObjectId(teamId);
      }
      
      // For now, return basic search without vector similarity
      // In production, this would use vector similarity search on imageEmbedding
      return await FileEmbedding.find(query).limit(limit);
    } catch (error) {
      logger.error('Image search failed', { error: (error as Error).message });
      return [];
    }
  }
};
