import { Request, Response } from "express";
import { Project } from '../models/UnifiedModels.js';

export const projectController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { method } = req;
    const teamId = req.params.teamId || req.query.teamId;
    
    if (method === 'POST') {
      // Create project
      if (!req.user?.id) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      if (!teamId) {
        res.status(400).json({ error: 'teamId is required' });
        return;
      }
      
      const { name, description, status } = req.body;
      const project = await Project.create({
        name,
        description,
        status: status || 'active',
        teamId,
        createdBy: req.user.id
      });
      res.status(201).json({ _id: project._id.toString(), name: project.name });
    } else if (method === 'GET' && req.params.projectId) {
      // Get single project
      const project = await Project.findById(req.params.projectId);
      res.json(project);
    } else if (method === 'GET') {
      // List projects
      const projects = await Project.find({ teamId });
      res.json(projects);
    } else if (method === 'PUT') {
      // Update project
      const projectId = req.params.projectId || req.params.id;
      const project = await Project.findByIdAndUpdate(projectId, req.body, { new: true });
      res.json(project);
    } else {
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Project operation error:', error);
    res.status(500).json({ error: 'Project operation failed' });
  }
};
