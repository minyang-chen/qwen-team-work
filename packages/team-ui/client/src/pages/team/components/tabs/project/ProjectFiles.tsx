import React, { useState, useEffect } from 'react';
import { Project } from '../../../types/team.types';

interface ProjectFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: string;
  path: string;
}

interface NFSFolder {
  name: string;
  path: string;
  created: boolean;
  lastModified?: string;
}

interface ProjectFilesProps {
  activeProject: Project;
  onUpdateProject: (project: Project) => void;
}

const ProjectFiles: React.FC<ProjectFilesProps> = ({
  activeProject,
  onUpdateProject,
}) => {
  const [folders, setFolders] = useState<NFSFolder[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'folders' | 'explorer'>('folders');
  const [viewingFile, setViewingFile] = useState<ProjectFile | null>(null);
  const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isCheckingNFS, setIsCheckingNFS] = useState(false);

  // Mock file data
  const mockFiles: ProjectFile[] = [
    { id: '1', name: 'requirements.pdf', type: 'file', size: 2048576, modified: '2024-12-14T10:30:00Z', path: '/requirements/' },
    { id: '2', name: 'architecture.drawio', type: 'file', size: 1024000, modified: '2024-12-13T15:45:00Z', path: '/architecture/' },
    { id: '3', name: 'designs', type: 'folder', modified: '2024-12-12T09:20:00Z', path: '/design/' },
    { id: '4', name: 'meeting-notes.md', type: 'file', size: 15360, modified: '2024-12-14T08:15:00Z', path: '/meetings/' },
  ];

  const sectionFolders = [
    'requirements', 'plan', 'deliverable', 'analysis', 'architecture',
    'design', 'implementation', 'code', 'tasks', 'issues', 'testing',
    'meetings', 'documents', 'notes', 'research', 'report', 'support'
  ];

  // Early return if no active project
  if (!activeProject) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">
          No project selected. Please select a project to manage files.
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!activeProject) return;
    
    // Check all possible ID properties
    const projectId = activeProject?.id || 
                     activeProject?.projectId || 
                     activeProject?._id ||
                     activeProject?.ID;
                     
      const projectData = {
        id: activeProject.id,
        projectId: activeProject.projectId,
        _id: activeProject._id,
        ID: activeProject.ID
      };
    
    if (!projectId) {
      return;
    }
    
    
    // Check NFS server for existing project folders
    checkNFSProjectFolders(projectId);
    
    // Initialize folder structure
    const initialFolders: NFSFolder[] = sectionFolders.map(section => ({
      name: section,
      path: `/nfs/projects/${projectId}/${section}`,
      created: activeProject.nfsFolders?.includes(section) || false,
    }));
    setFolders(initialFolders);
  }, [activeProject?._id]); // Only depend on the actual ID to prevent infinite loop

  const checkNFSProjectFolders = async (projectId: string) => {
    setIsCheckingNFS(true);
    try {
      // Check if project folder exists on NFS server
      
      // Mock API call to check NFS server
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate NFS server response - check which folders exist
      const existingFolders = ['requirements', 'architecture', 'meetings', 'documents']; // Mock existing folders
      
      if (existingFolders.length > 0) {
        
        // Update folder states based on NFS server
        setFolders(prevFolders => 
          prevFolders.map(folder => ({
            ...folder,
            created: existingFolders.includes(folder.name),
            lastModified: existingFolders.includes(folder.name) ? new Date().toISOString() : undefined
          }))
        );
        
        // Load files from first existing folder for file explorer
        if (existingFolders.length > 0) {
          loadFilesFromNFS(projectId, existingFolders[0]);
        }
      } else {
      }
    } catch (error) {
    } finally {
      setIsCheckingNFS(false);
    }
  };

  const loadFilesFromNFS = async (projectId: string, folderName: string) => {
    try {
      
      // Mock API call to get files from NFS server
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock files found on NFS server
      const nfsFiles: ProjectFile[] = [
        { id: 'nfs1', name: 'project-requirements.pdf', type: 'file', size: 2048576, modified: '2024-12-14T10:30:00Z', path: `/${folderName}/` },
        { id: 'nfs2', name: 'system-architecture.drawio', type: 'file', size: 1024000, modified: '2024-12-13T15:45:00Z', path: `/${folderName}/` },
        { id: 'nfs3', name: 'meeting-notes-dec.md', type: 'file', size: 15360, modified: '2024-12-14T08:15:00Z', path: `/${folderName}/` },
        { id: 'nfs4', name: 'config.json', type: 'file', size: 2048, modified: '2024-12-12T14:20:00Z', path: `/${folderName}/` },
      ];
      
      setFiles(nfsFiles);
      setSelectedFolder(folderName);
    } catch (error) {
    }
  };

  const handleCreateAllFolders = async () => {
    const projectId = activeProject?.id || activeProject?.projectId || activeProject?._id || activeProject?.ID;
    if (!projectId) return;
    
    setIsCreating(true);
    try {
      // Simulate NFS folder creation API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedFolders = folders.map(folder => ({
        ...folder,
        created: true,
        lastModified: new Date().toISOString(),
      }));
      
      setFolders(updatedFolders);
    } catch (error) {
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    const projectId = activeProject?.id || activeProject?.projectId || activeProject?._id || activeProject?.ID;
    if (!projectId) return;
    
    try {
      // Simulate individual folder creation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedFolders = folders.map(folder =>
        folder.name === folderName
          ? { ...folder, created: true, lastModified: new Date().toISOString() }
          : folder
      );
      
      setFolders(updatedFolders);
    } catch (error) {
    }
  };

  const allFoldersCreated = folders.length > 0 && folders.every(f => f.created);
  const createdCount = folders.filter(f => f.created).length;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFolderSelect = (folderName: string) => {
    setSelectedFolder(folderName);
    const projectId = activeProject?.id || activeProject?.projectId || activeProject?._id || activeProject?.ID;
    if (projectId) {
      loadFilesFromNFS(projectId, folderName);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedFolder) {
      try {
        // Simulate NFS server upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', selectedFolder);
        formData.append('projectId', activeProject?.id || activeProject?.projectId || activeProject?._id || '');
        
        // Mock API call to NFS server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newFile: ProjectFile = {
          id: Date.now().toString(),
          name: file.name,
          type: 'file',
          size: file.size,
          modified: new Date().toISOString(),
          path: `/${selectedFolder}/`
        };
        setFiles([...files, newFile]);
        setShowUpload(false);
      } catch (error) {
      }
    }
  };

  const isEditableFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['txt', 'md', 'json', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'xml', 'yaml', 'yml'].includes(ext || '');
  };

  const handleViewFile = async (file: ProjectFile) => {
    setViewingFile(file);
    try {
      // Simulate NFS server file content retrieval
      const projectId = activeProject?.id || activeProject?.projectId || activeProject?._id || '';
      const response = await fetch(`/api/nfs/files/${projectId}/${selectedFolder}/${file.name}`);
      
      // Mock response - simulate getting content from NFS server
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockContent = file.name.endsWith('.json') 
        ? '{\n  "name": "example",\n  "version": "1.0.0",\n  "description": "Sample JSON file from NFS server"\n}'
        : file.name.endsWith('.md')
        ? '# Sample Markdown from NFS\n\nThis content was loaded from the **NFS server**.\n\n## Features\n- Server-side storage\n- Real-time sync'
        : file.name.endsWith('.html')
        ? '<!DOCTYPE html>\n<html>\n<head>\n  <title>NFS HTML File</title>\n</head>\n<body>\n  <h1>Content from NFS Server</h1>\n</body>\n</html>'
        : 'This is actual file content loaded from NFS server.';
      
      setFileContent(mockContent);
    } catch (error) {
      setFileContent('Error loading file content from NFS server.');
    }
  };

  const handleEditFile = async (file: ProjectFile) => {
    if (!isEditableFile(file.name)) return;
    setEditingFile(file);
    
    try {
      // Load current content from NFS server
      const projectId = activeProject?.id || activeProject?.projectId || activeProject?._id || '';
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockContent = file.name.endsWith('.json') 
        ? '{\n  "name": "example",\n  "version": "1.0.0",\n  "description": "Editable JSON from NFS server"\n}'
        : file.name.endsWith('.md')
        ? '# Editable Markdown\n\nEdit this content and save to NFS server.\n\n## Features\n- Live editing\n- NFS persistence'
        : file.name.endsWith('.html')
        ? '<!DOCTYPE html>\n<html>\n<head>\n  <title>Editable HTML</title>\n</head>\n<body>\n  <h1>Edit and Save to NFS</h1>\n</body>\n</html>'
        : 'Editable text content from NFS server.';
      
      setFileContent(mockContent);
    } catch (error) {
    }
  };

  const handleSaveFile = async () => {
    if (editingFile) {
      try {
        // Save to NFS server
        const projectId = activeProject?.id || activeProject?.projectId || activeProject?._id || '';
        const saveData = {
          projectId,
          folder: selectedFolder,
          fileName: editingFile.name,
          content: fileContent
        };
        
        // Mock API call to save to NFS server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update file modification time
        const updatedFiles = files.map(f => 
          f.id === editingFile.id 
            ? { ...f, modified: new Date().toISOString() }
            : f
        );
        setFiles(updatedFiles);
        setEditingFile(null);
        setFileContent('');
      } catch (error) {
      }
    }
  };

  const handleDownloadFile = async (file: ProjectFile) => {
    try {
      // Get full file content from NFS server
      const projectId = activeProject?.id || activeProject?.projectId || activeProject?._id || '';
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock getting full content from NFS server
      const fullContent = file.name.endsWith('.json') 
        ? '{\n  "name": "complete-example",\n  "version": "1.0.0",\n  "description": "Complete JSON file from NFS server",\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}'
        : file.name.endsWith('.md')
        ? '# Complete Markdown from NFS\n\nThis is the full markdown content.'
        : file.name.endsWith('.html')
        ? '<!DOCTYPE html>\n<html>\n<head>\n  <title>Complete HTML from NFS</title>\n  <style>\n    body { font-family: Arial; }\n  </style>\n</head>\n<body>\n  <h1>Complete File from NFS Server</h1>\n  <p>This is the full content.</p>\n</body>\n</html>'
        : 'Complete file content downloaded from NFS server.\n\nThis includes all the actual file data stored on the server.';
      
      // Create blob and download
      const blob = new Blob([fullContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
    }
  };

  const handleDeleteFile = async (file: ProjectFile) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        // Delete from NFS server
        const projectId = activeProject?.id || activeProject?.projectId || activeProject?._id || '';
        await new Promise(resolve => setTimeout(resolve, 500));
        
        
        // Remove from local state
        setFiles(files.filter(f => f.id !== file.id));
      } catch (error) {
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">Project Files & NFS Storage</h3>
          <p className="text-gray-600">
            Manage project folders and files on NFS server
            {isCheckingNFS && <span className="ml-2 text-blue-600">• Checking NFS server...</span>}
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveSubTab('folders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'folders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Project Folders
          </button>
          <button
            onClick={() => setActiveSubTab('explorer')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'explorer'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            File Explorer
          </button>
        </nav>
      </div>

      {/* Project Folders Tab */}
      {activeSubTab === 'folders' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-3">
              <div className="text-sm text-gray-600">
                {createdCount}/{folders.length} folders created
              </div>
              <button
                onClick={handleCreateAllFolders}
                disabled={isCreating || allFoldersCreated}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isCreating ? 'Creating...' : allFoldersCreated ? 'All Created' : 'Create All Folders'}
              </button>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">NFS Project Path</h4>
            <code className="text-sm text-blue-700">/nfs/projects/{activeProject?.id || activeProject?.projectId || activeProject?._id || activeProject?.ID || 'undefined'}/</code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <div key={folder.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${folder.created ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="font-medium capitalize">{folder.name}</span>
                  </div>
                  {!folder.created && (
                    <button
                      onClick={() => handleCreateFolder(folder.name)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Create
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {folder.path}
                </div>
                {folder.created && folder.lastModified && (
                  <div className="text-xs text-green-600">
                    Created {new Date(folder.lastModified).toLocaleString()}
                  </div>
                )}
                {folder.created && (
                  <div className="mt-2 flex space-x-2">
                    <button className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                      Browse
                    </button>
                    <button className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                      Upload
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!allFoldersCreated && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Setup Required</h4>
              <p className="text-sm text-yellow-700">
                Create project folders on the NFS server to enable file management for each section.
              </p>
            </div>
          )}
        </div>
      )}

      {/* File Explorer Tab */}
      {activeSubTab === 'explorer' && (
        <div>
          {!allFoldersCreated ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Folders Available</h3>
              <p className="text-gray-600 mb-4">Create project folders first to access the file explorer.</p>
              <button
                onClick={() => setActiveSubTab('folders')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Project Folders
              </button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-semibold">Browse Project Files</h4>
                {selectedFolder && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload File
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Folder Navigation */}
                <div className="bg-white rounded-lg border p-4">
                  <h5 className="font-medium mb-3">Folders</h5>
                  <div className="space-y-1">
                    {folders.filter(f => f.created).map((folder) => (
                      <button
                        key={folder.name}
                        onClick={() => handleFolderSelect(folder.name)}
                        className={`w-full text-left p-2 rounded flex items-center gap-2 ${
                          selectedFolder === folder.name ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <span className="capitalize text-sm">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File List */}
                <div className="lg:col-span-2 bg-white rounded-lg border">
                  <div className="p-4 border-b">
                    <h5 className="font-medium">
                      {selectedFolder ? `Files in ${selectedFolder}` : 'Select a folder to view files'}
                    </h5>
                  </div>
                  <div className="p-4">
                    {selectedFolder ? (
                      files.length > 0 ? (
                        <div className="space-y-2">
                          {files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <div className="text-blue-500">
                                  {file.type === 'folder' ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{file.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {file.size && formatFileSize(file.size)} • Modified {new Date(file.modified).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleViewFile(file)}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  View
                                </button>
                                {isEditableFile(file.name) && (
                                  <button 
                                    onClick={() => handleEditFile(file)}
                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDownloadFile(file)}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  Download
                                </button>
                                <button 
                                  onClick={() => handleDeleteFile(file)}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <p>No files in this folder</p>
                          <button
                            onClick={() => setShowUpload(true)}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Upload your first file
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <p>Select a folder from the left to browse files</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Upload File to {selectedFolder}</h3>
            <input
              type="file"
              onChange={handleFileUpload}
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View File Modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-4/5 h-4/5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Viewing: {viewingFile.name}</h3>
              <div className="flex gap-2">
                {isEditableFile(viewingFile.name) && (
                  <button
                    onClick={() => {
                      setViewingFile(null);
                      handleEditFile(viewingFile);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDownloadFile(viewingFile)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Download
                </button>
                <button
                  onClick={() => setViewingFile(null)}
                  className="px-3 py-1 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 border rounded p-4 bg-gray-50 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">{fileContent}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Edit File Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-4/5 h-4/5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Editing: {editingFile.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveFile}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingFile(null);
                    setFileContent('');
                  }}
                  className="px-3 py-1 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="flex-1 border rounded p-4 font-mono text-sm resize-none"
              placeholder="File content..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFiles;
