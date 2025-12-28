import { useState } from 'react';
import { Notification, Team } from '../types/team.types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const loadNotifications = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
      });
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
    }
  };

  const loadAllTeamNotifications = async (myTeams: Team[]) => {
    try {
      const allNotifications: any[] = [];
      for (const team of myTeams) {
        const res = await fetch(`/api/teams/${team.id}/notifications`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
        });
        const data = await res.json();
        if (data.notifications) {
          allNotifications.push(...data.notifications.map((n: any) => ({ ...n, team_name: team.name })));
        }
      }
      setNotifications(allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
    }
  };

  const handleSendReply = async (selectedTeam: Team | null, setMessage: (msg: string) => void) => {
    if (!selectedTeam || !selectedNotification || !replyMessage.trim()) return;
    
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/notifications/${selectedNotification._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('team_session_token')}`
        },
        body: JSON.stringify({ message: replyMessage })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`Error: ${data.error.message}`);
      } else {
        setMessage('Reply sent successfully');
        setReplyMessage('');
        loadNotifications(selectedTeam.id);
      }
    } catch (err) {
      setMessage('Failed to send reply');
    }
  };

  const markAsRead = async (notificationId: string, teamId: string) => {
    try {
      await fetch(`/api/teams/${teamId}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
      });
      loadNotifications(teamId);
    } catch (err) {
    }
  };

  return {
    notifications,
    setNotifications,
    selectedNotification,
    setSelectedNotification,
    replyMessage,
    setReplyMessage,
    loadNotifications,
    loadAllTeamNotifications,
    handleSendReply,
    markAsRead
  };
}
