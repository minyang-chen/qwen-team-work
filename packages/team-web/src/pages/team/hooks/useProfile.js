import { useState } from 'react';
import { API_BASE } from '../../../config/api';
export function useProfile() {
    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
        full_name: '',
        phone: '',
        api_key: ''
    });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastType, setBroadcastType] = useState('general');
    const loadProfile = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/user/profile`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
            });
            const data = await res.json();
            if (data.username) {
                setProfileData({
                    username: data.username || '',
                    email: data.email || '',
                    full_name: data.full_name || '',
                    phone: data.phone || '',
                    api_key: data.api_key || ''
                });
            }
        }
        catch (err) {
        }
    };
    const handleUpdateProfile = async (setMessage) => {
        try {
            const res = await fetch(`${API_BASE}/api/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('team_session_token')}`
                },
                body: JSON.stringify(profileData)
            });
            const data = await res.json();
            if (data.error) {
                setMessage(`Error: ${data.error.message}`);
            }
            else {
                setMessage('Profile updated successfully');
                setIsEditingProfile(false);
                loadProfile();
            }
        }
        catch (err) {
            setMessage('Failed to update profile');
        }
    };
    const handleRegenerateApiKey = async (setMessage) => {
        if (!confirm('Regenerate API key? The old key will be deactivated.'))
            return;
        try {
            const res = await fetch(`${API_BASE}/api/user/regenerate-api-key`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
            });
            const data = await res.json();
            if (data.error) {
                setMessage(`Error: ${data.error.message}`);
            }
            else {
                setMessage('API key regenerated successfully');
                loadProfile();
            }
        }
        catch (err) {
            setMessage('Failed to regenerate API key');
        }
    };
    const handleSendBroadcast = async (selectedTeam, setMessage, loadNotifications) => {
        if (!selectedTeam || !broadcastMessage.trim())
            return;
        try {
            const res = await fetch(`${API_BASE}/api/teams/${selectedTeam.id}/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('team_session_token')}`
                },
                body: JSON.stringify({
                    message: broadcastMessage,
                    message_type: broadcastType
                })
            });
            const data = await res.json();
            if (data.error) {
                setMessage(`Error: ${data.error.message}`);
            }
            else {
                setMessage('Broadcast sent successfully');
                setBroadcastMessage('');
                loadNotifications(selectedTeam.id);
            }
        }
        catch (err) {
            setMessage('Failed to send broadcast');
        }
    };
    return {
        profileData,
        setProfileData,
        isEditingProfile,
        setIsEditingProfile,
        broadcastMessage,
        setBroadcastMessage,
        broadcastType,
        setBroadcastType,
        loadProfile,
        handleUpdateProfile,
        handleRegenerateApiKey,
        handleSendBroadcast
    };
}
