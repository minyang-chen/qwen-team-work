import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const ProjectMembers = ({ activeProject, onUpdateProject, }) => {
    const [members, setMembers] = useState(activeProject.members || []);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'member' });
    const handleAddMember = () => {
        if (!newMember.name || !newMember.email)
            return;
        const member = {
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
    const handleRemoveMember = (id) => {
        const updatedMembers = members.filter(m => m.id !== id);
        setMembers(updatedMembers);
        onUpdateProject({ ...activeProject, members: updatedMembers });
    };
    const handleRoleChange = (id, role) => {
        const updatedMembers = members.map(m => m.id === id ? { ...m, role } : m);
        setMembers(updatedMembers);
        onUpdateProject({ ...activeProject, members: updatedMembers });
    };
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Project Members" }), _jsx("button", { onClick: () => setShowAddForm(true), className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: "Add Member" })] }), showAddForm && (_jsxs("div", { className: "mb-6 p-4 border rounded-lg bg-gray-50", children: [_jsx("h4", { className: "font-medium mb-3", children: "Add New Member" }), _jsxs("div", { className: "grid grid-cols-3 gap-3 mb-3", children: [_jsx("input", { type: "text", placeholder: "Name", value: newMember.name, onChange: (e) => setNewMember({ ...newMember, name: e.target.value }), className: "px-3 py-2 border rounded" }), _jsx("input", { type: "email", placeholder: "Email", value: newMember.email, onChange: (e) => setNewMember({ ...newMember, email: e.target.value }), className: "px-3 py-2 border rounded" }), _jsxs("select", { value: newMember.role, onChange: (e) => setNewMember({ ...newMember, role: e.target.value }), className: "px-3 py-2 border rounded", children: [_jsx("option", { value: "viewer", children: "Viewer" }), _jsx("option", { value: "member", children: "Member" }), _jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "owner", children: "Owner" })] })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: handleAddMember, className: "px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700", children: "Add" }), _jsx("button", { onClick: () => setShowAddForm(false), className: "px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600", children: "Cancel" })] })] })), _jsxs("div", { className: "space-y-3", children: [members.map((member) => (_jsxs("div", { className: "flex items-center justify-between p-4 border rounded-lg", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: member.name }), _jsx("div", { className: "text-sm text-gray-600", children: member.email }), _jsxs("div", { className: "text-xs text-gray-500", children: ["Joined ", new Date(member.joinedAt).toLocaleDateString()] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("select", { value: member.role, onChange: (e) => handleRoleChange(member.id, e.target.value), className: "px-2 py-1 border rounded text-sm", children: [_jsx("option", { value: "viewer", children: "Viewer" }), _jsx("option", { value: "member", children: "Member" }), _jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "owner", children: "Owner" })] }), _jsx("button", { onClick: () => handleRemoveMember(member.id), className: "px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Remove" })] })] }, member.id))), members.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No members added yet. Click \"Add Member\" to get started." }))] })] }));
};
export default ProjectMembers;
