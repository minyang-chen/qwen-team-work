import React, { useState } from 'react';
import { Project } from '../../../types/team.types';

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

interface ProjectMembersProps {
  activeProject: Project;
  onUpdateProject: (project: Project) => void;
}

const ProjectMembers: React.FC<ProjectMembersProps> = ({
  activeProject,
  onUpdateProject,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>(activeProject.members || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState<{ name: string; email: string; role: ProjectMember['role'] }>({ name: '', email: '', role: 'member' });

  const handleAddMember = () => {
    if (!newMember.name || !newMember.email) return;
    
    const member: ProjectMember = {
      id: Date.now().toString(),
      ...newMember,
      joinedAt: new Date().toISOString(),
    };
    
    const updatedMembers = [...members, member];
    setMembers(updatedMembers);
    onUpdateProject({ ...activeProject, members: updatedMembers });
    setNewMember({ name: '', email: '', role: 'member' });
    setShowAddForm(false);
  };

  const handleRemoveMember = (id: string) => {
    const updatedMembers = members.filter(m => m.id !== id);
    setMembers(updatedMembers);
    onUpdateProject({ ...activeProject, members: updatedMembers });
  };

  const handleRoleChange = (id: string, role: ProjectMember['role']) => {
    const updatedMembers = members.map(m => m.id === id ? { ...m, role } : m);
    setMembers(updatedMembers);
    onUpdateProject({ ...activeProject, members: updatedMembers });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Project Members</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Member
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h4 className="font-medium mb-3">Add New Member</h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="px-3 py-2 border rounded"
            />
            <input
              type="email"
              placeholder="Email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              className="px-3 py-2 border rounded"
            />
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value as ProjectMember['role'] })}
              className="px-3 py-2 border rounded"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button onClick={handleAddMember} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
              Add
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">{member.name}</div>
              <div className="text-sm text-gray-600">{member.email}</div>
              <div className="text-xs text-gray-500">Joined {new Date(member.joinedAt).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value as ProjectMember['role'])}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <button
                onClick={() => handleRemoveMember(member.id)}
                className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No members added yet. Click "Add Member" to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectMembers;
