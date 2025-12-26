import { useState } from 'react';
export function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const loadNotifications = async (teamId) => {
        try {
            const res = await fetch(`/api/teams/${teamId}/notifications`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
            });
            const data = await res.json();
            if (data.notifications) {
                setNotifications(data.notifications);
            }
        }
        catch (err) {
        }
    };
    const loadAllTeamNotifications = async (myTeams) => {
        try {
            const allNotifications = [];
            for (const team of myTeams) {
                const res = await fetch(`/api/teams/${team.id}/notifications`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
                });
                const data = await res.json();
                if (data.notifications) {
                    allNotifications.push(...data.notifications.map((n) => ({ ...n, team_name: team.name })));
                }
            }
            setNotifications(allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
        catch (err) {
        }
    };
    const handleSendReply = async (selectedTeam, setMessage) => {
        if (!selectedTeam || !selectedNotification || !replyMessage.trim())
            return;
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
            }
            else {
                setMessage('Reply sent successfully');
                setReplyMessage('');
                loadNotifications(selectedTeam.id);
            }
        }
        catch (err) {
            setMessage('Failed to send reply');
        }
    };
    const markAsRead = async (notificationId, teamId) => {
        try {
            await fetch(`/api/teams/${teamId}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
            });
            loadNotifications(teamId);
        }
        catch (err) {
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
