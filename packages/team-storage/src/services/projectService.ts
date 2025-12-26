// @ts-nocheck
import { mongoService } from './mongoService.js';
import { Project, ProjectSection, ProjectStats } from '../models/Project.js';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.mongo;

const COLLECTIONS = {
  projects: 'projects',
  sections: 'project_sections',
  stats: 'project_stats'
};

export const projectService = {
  // Project CRUD
  async createProject(teamId: string, data: Omit<Project, '_id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      const result = await db.collection(COLLECTIONS.projects).insertOne({
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      });
      return await db.collection(COLLECTIONS.projects).findOne({ _id: result.insertedId }) as unknown as Project;
    } finally {
      await client.close();
    }
  },

  async getProject(teamId: string, projectId: string): Promise<Project | null> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      return await db.collection(COLLECTIONS.projects).findOne({ _id: new ObjectId(projectId) }) as unknown as Project | null;
    } finally {
      await client.close();
    }
  },

  async updateProject(teamId: string, projectId: string, data: Partial<Project>): Promise<Project | null> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      const { _id, created_at, ...updateData } = data as any;
      await db.collection(COLLECTIONS.projects).updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { ...updateData, updated_at: new Date() } }
      );
      return await db.collection(COLLECTIONS.projects).findOne({ _id: new ObjectId(projectId) }) as unknown as Project | null;
    } finally {
      await client.close();
    }
  },

  async listProjects(teamId: string): Promise<Project[]> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      return await db.collection(COLLECTIONS.projects).find().sort({ created_at: -1 }).toArray() as unknown as Project[];
    } finally {
      await client.close();
    }
  },

  // Project Section CRUD
  async createSection(teamId: string, data: Omit<ProjectSection, '_id' | 'created_at' | 'updated_at'>): Promise<ProjectSection> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      const result = await db.collection(COLLECTIONS.sections).insertOne({
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      });
      return await db.collection(COLLECTIONS.sections).findOne({ _id: result.insertedId }) as unknown as ProjectSection;
    } finally {
      await client.close();
    }
  },

  async getSection(teamId: string, sectionId: string): Promise<ProjectSection | null> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      return await db.collection(COLLECTIONS.sections).findOne({ _id: new ObjectId(sectionId) }) as unknown as ProjectSection | null;
    } finally {
      await client.close();
    }
  },

  async updateSection(teamId: string, sectionId: string, data: Partial<ProjectSection>): Promise<ProjectSection | null> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      const { _id, created_at, ...updateData } = data as any;
      await db.collection(COLLECTIONS.sections).updateOne(
        { _id: new ObjectId(sectionId) },
        { $set: { ...updateData, updated_at: new Date() } }
      );
      return await db.collection(COLLECTIONS.sections).findOne({ _id: new ObjectId(sectionId) }) as unknown as ProjectSection | null;
    } finally {
      await client.close();
    }
  },

  async listSections(teamId: string, projectId: string): Promise<ProjectSection[]> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      return await db.collection(COLLECTIONS.sections).find({ projectId }).sort({ order: 1 }).toArray() as unknown as ProjectSection[];
    } finally {
      await client.close();
    }
  },

  // Project Stats CRUD
  async createStats(teamId: string, data: Omit<ProjectStats, '_id' | 'created_at' | 'updated_at'>): Promise<ProjectStats> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      const result = await db.collection(COLLECTIONS.stats).insertOne({
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      });
      return await db.collection(COLLECTIONS.stats).findOne({ _id: result.insertedId }) as unknown as ProjectStats;
    } finally {
      await client.close();
    }
  },

  async getStats(teamId: string, projectId: string): Promise<ProjectStats | null> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      return await db.collection(COLLECTIONS.stats).findOne({ projectId }) as unknown as ProjectStats | null;
    } finally {
      await client.close();
    }
  },

  async updateStats(teamId: string, projectId: string, data: Partial<ProjectStats>): Promise<ProjectStats | null> {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    try {
      const { _id, created_at, ...updateData } = data as any;
      await db.collection(COLLECTIONS.stats).updateOne(
        { projectId },
        { $set: { ...updateData, updated_at: new Date() } },
        { upsert: true }
      );
      return await db.collection(COLLECTIONS.stats).findOne({ projectId }) as unknown as ProjectStats | null;
    } finally {
      await client.close();
    }
  }
};
