import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const MeetingsSection = ({ meetings, onUpdate, onDelete, onCreate, activeProject }) => {
    const [newMeeting, setNewMeeting] = useState({
        type: 'Planning',
        status: 'Scheduled'
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const handleCreate = () => {
        if (newMeeting.title && activeProject) {
            onCreate({
                title: newMeeting.title,
                description: newMeeting.description || '',
                type: newMeeting.type || 'Planning',
                status: newMeeting.status || 'Scheduled',
                projectId: activeProject.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                startTime: newMeeting.startTime,
                endTime: newMeeting.endTime,
                location: newMeeting.location,
                attendees: newMeeting.attendees || [],
                agenda: newMeeting.agenda,
                notes: newMeeting.notes,
                actionItems: newMeeting.actionItems || []
            });
            setNewMeeting({ type: 'Planning', status: 'Scheduled' });
        }
    };
    const handleEdit = (meeting) => {
        setEditingId(meeting._id);
        setEditData(meeting);
    };
    const handleSave = () => {
        if (editingId) {
            onUpdate(editingId, { ...editData, updatedAt: new Date().toISOString() });
            setEditingId(null);
            setEditData({});
        }
    };
    const getTypeColor = (type) => {
        switch (type) {
            case 'Standup': return 'bg-blue-100 text-blue-800';
            case 'Planning': return 'bg-green-100 text-green-800';
            case 'Review': return 'bg-purple-100 text-purple-800';
            case 'Retrospective': return 'bg-yellow-100 text-yellow-800';
            case 'Stakeholder': return 'bg-red-100 text-red-800';
            case 'Other': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Scheduled': return 'bg-blue-100 text-blue-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Meetings" }), _jsxs("span", { className: "text-sm text-gray-500", children: [meetings.length, " meetings"] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Schedule New Meeting" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Meeting title", value: newMeeting.title || '', onChange: (e) => setNewMeeting({ ...newMeeting, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newMeeting.type || 'Planning', onChange: (e) => setNewMeeting({ ...newMeeting, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Standup", children: "Daily Standup" }), _jsx("option", { value: "Planning", children: "Planning Meeting" }), _jsx("option", { value: "Review", children: "Review Meeting" }), _jsx("option", { value: "Retrospective", children: "Retrospective" }), _jsx("option", { value: "Stakeholder", children: "Stakeholder Meeting" }), _jsx("option", { value: "Other", children: "Other" })] })] }), _jsx("textarea", { placeholder: "Meeting description", value: newMeeting.description || '', onChange: (e) => setNewMeeting({ ...newMeeting, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 2 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx("input", { type: "datetime-local", placeholder: "Start time", value: newMeeting.startTime || '', onChange: (e) => setNewMeeting({ ...newMeeting, startTime: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "datetime-local", placeholder: "End time", value: newMeeting.endTime || '', onChange: (e) => setNewMeeting({ ...newMeeting, endTime: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "text", placeholder: "Location/URL", value: newMeeting.location || '', onChange: (e) => setNewMeeting({ ...newMeeting, location: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("input", { type: "text", placeholder: "Attendees (comma-separated)", value: newMeeting.attendees?.join(', ') || '', onChange: (e) => setNewMeeting({
                                        ...newMeeting,
                                        attendees: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                                    }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { placeholder: "Agenda", value: newMeeting.agenda || '', onChange: (e) => setNewMeeting({ ...newMeeting, agenda: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsx("button", { onClick: handleCreate, disabled: !newMeeting.title, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300", children: "Schedule Meeting" })] })] }), _jsxs("div", { className: "space-y-4", children: [meetings.map((meeting) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: editingId === meeting._id ? (_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { value: editData.notes || '', onChange: (e) => setEditData({ ...editData, notes: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3, placeholder: "Meeting notes" }), _jsxs("select", { value: editData.status || '', onChange: (e) => setEditData({ ...editData, status: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Scheduled", children: "Scheduled" }), _jsx("option", { value: "In Progress", children: "In Progress" }), _jsx("option", { value: "Completed", children: "Completed" }), _jsx("option", { value: "Cancelled", children: "Cancelled" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSave, className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700", children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), className: "px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-md font-medium", children: meeting.title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getTypeColor(meeting.type)}`, children: meeting.type }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getStatusColor(meeting.status)}`, children: meeting.status })] })] }), _jsx("p", { className: "text-gray-600 mb-3", children: meeting.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 mb-3", children: [meeting.startTime && (_jsxs("div", { children: ["Start: ", _jsx("span", { className: "font-medium", children: new Date(meeting.startTime).toLocaleString() })] })), meeting.endTime && (_jsxs("div", { children: ["End: ", _jsx("span", { className: "font-medium", children: new Date(meeting.endTime).toLocaleString() })] })), meeting.location && (_jsxs("div", { children: ["Location: ", _jsx("span", { className: "font-medium", children: meeting.location })] }))] }), meeting.attendees && meeting.attendees.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Attendees:" }), _jsx("div", { className: "flex flex-wrap gap-1", children: meeting.attendees.map((attendee, index) => (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs", children: attendee }, index))) })] })), meeting.agenda && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Agenda:" }), _jsx("div", { className: "text-sm text-gray-600 bg-gray-50 p-2 rounded", children: meeting.agenda })] })), meeting.notes && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Notes:" }), _jsx("div", { className: "text-sm text-gray-600 bg-yellow-50 p-2 rounded", children: meeting.notes })] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Created: ", new Date(meeting.createdAt).toLocaleDateString()] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(meeting), className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(meeting._id), className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Delete" })] })] })] })) }, meeting._id))), meetings.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No meetings scheduled. Schedule your first meeting above." }))] })] }) }));
};
