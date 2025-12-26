import React, { useState } from 'react';

interface Meeting {
  _id: string;
  title: string;
  description: string;
  type: 'Standup' | 'Planning' | 'Review' | 'Retrospective' | 'Stakeholder' | 'Other';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees?: string[];
  agenda?: string;
  notes?: string;
  actionItems?: string[];
  recordingUrl?: string;
}

interface MeetingsSectionProps {
  meetings: Meeting[];
  onUpdate: (id: string, data: Partial<Meeting>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Meeting, '_id'>) => void;
  activeProject: { id: string; name: string } | null;
}

export const MeetingsSection: React.FC<MeetingsSectionProps> = ({
  meetings,
  onUpdate,
  onDelete,
  onCreate,
  activeProject
}) => {
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    type: 'Planning',
    status: 'Scheduled'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Meeting>>({});

  const handleCreate = () => {
    if (newMeeting.title && activeProject) {
      onCreate({
        title: newMeeting.title,
        description: newMeeting.description || '',
        type: newMeeting.type as Meeting['type'] || 'Planning',
        status: newMeeting.status as Meeting['status'] || 'Scheduled',
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

  const handleEdit = (meeting: Meeting) => {
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

  const getTypeColor = (type: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Meetings</h2>
          <span className="text-sm text-gray-500">{meetings.length} meetings</span>
        </div>

        {/* Create New Meeting */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Schedule New Meeting</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Meeting title"
                value={newMeeting.title || ''}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newMeeting.type || 'Planning'}
                onChange={(e) => setNewMeeting({ ...newMeeting, type: e.target.value as Meeting['type'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Standup">Daily Standup</option>
                <option value="Planning">Planning Meeting</option>
                <option value="Review">Review Meeting</option>
                <option value="Retrospective">Retrospective</option>
                <option value="Stakeholder">Stakeholder Meeting</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <textarea
              placeholder="Meeting description"
              value={newMeeting.description || ''}
              onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="datetime-local"
                placeholder="Start time"
                value={newMeeting.startTime || ''}
                onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="datetime-local"
                placeholder="End time"
                value={newMeeting.endTime || ''}
                onChange={(e) => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Location/URL"
                value={newMeeting.location || ''}
                onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Attendees (comma-separated)"
              value={newMeeting.attendees?.join(', ') || ''}
              onChange={(e) => setNewMeeting({ 
                ...newMeeting, 
                attendees: e.target.value.split(',').map(a => a.trim()).filter(a => a) 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Agenda"
              value={newMeeting.agenda || ''}
              onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <button
              onClick={handleCreate}
              disabled={!newMeeting.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Schedule Meeting
            </button>
          </div>
        </div>

        {/* Meetings List */}
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <div key={meeting._id} className="border border-gray-200 rounded-lg p-4">
              {editingId === meeting._id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Meeting notes"
                  />
                  <select
                    value={editData.status || ''}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as Meeting['status'] })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-md font-medium">{meeting.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(meeting.type)}`}>
                        {meeting.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(meeting.status)}`}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{meeting.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 mb-3">
                    {meeting.startTime && (
                      <div>Start: <span className="font-medium">{new Date(meeting.startTime).toLocaleString()}</span></div>
                    )}
                    {meeting.endTime && (
                      <div>End: <span className="font-medium">{new Date(meeting.endTime).toLocaleString()}</span></div>
                    )}
                    {meeting.location && (
                      <div>Location: <span className="font-medium">{meeting.location}</span></div>
                    )}
                  </div>

                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Attendees:</div>
                      <div className="flex flex-wrap gap-1">
                        {meeting.attendees.map((attendee, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {attendee}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {meeting.agenda && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Agenda:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{meeting.agenda}</div>
                    </div>
                  )}

                  {meeting.notes && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Notes:</div>
                      <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">{meeting.notes}</div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Created: {new Date(meeting.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(meeting)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(meeting._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {meetings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No meetings scheduled. Schedule your first meeting above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
