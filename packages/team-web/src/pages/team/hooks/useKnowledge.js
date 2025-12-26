import { useState } from 'react';
import { teamApi } from '../../../services/team/api';
export function useKnowledge() {
    const [files, setFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const loadFiles = async (workspaceType, selectedTeamId) => {
        try {
            const data = await teamApi.listFiles(workspaceType, selectedTeamId || undefined);
            if (data.files)
                setFiles(data.files);
        }
        catch (err) {
        }
    };
    const handleFileUpload = async (file, workspaceType, selectedTeamId, setMessage) => {
        try {
            const data = await teamApi.uploadFile(file, workspaceType, selectedTeamId || undefined);
            if (data.error) {
                setMessage(`Error: ${data.error.message}`);
            }
            else {
                setMessage('File uploaded successfully');
                loadFiles(workspaceType, selectedTeamId);
            }
        }
        catch (err) {
            setMessage('Failed to upload file');
        }
    };
    const handleDelete = async (filePath, workspaceType, selectedTeamId, setMessage) => {
        if (!confirm('Delete this file?'))
            return;
        try {
            await teamApi.deleteFile(filePath);
            setMessage('File deleted');
            loadFiles(workspaceType, selectedTeamId);
        }
        catch (err) {
            setMessage('Failed to delete file');
        }
    };
    const handleSearch = async (workspaceType, selectedTeamId, setMessage) => {
        if (!searchQuery.trim())
            return;
        try {
            const data = await teamApi.searchFiles(searchQuery, workspaceType, selectedTeamId || undefined);
            if (data.results)
                setSearchResults(data.results);
        }
        catch (err) {
            setMessage('Search failed');
        }
    };
    return {
        files,
        setFiles,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        loadFiles,
        handleFileUpload,
        handleDelete,
        handleSearch
    };
}
