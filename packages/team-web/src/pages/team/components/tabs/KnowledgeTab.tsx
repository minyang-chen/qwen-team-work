import React from 'react';
import { teamApi } from '../../../../services/team/api';
import { WorkspaceType } from '../../types/team.types';

interface KnowledgeTabProps {
  files: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  workspaceType: WorkspaceType;
  selectedTeamId: string;
  handleFileUpload: (file: File, workspaceType: WorkspaceType, selectedTeamId: string | undefined, setMessage: (msg: string) => void) => void;
  handleDelete: (filePath: string, workspaceType: WorkspaceType, selectedTeamId: string | undefined, setMessage: (msg: string) => void) => void;
  handleSearch: (workspaceType: WorkspaceType, selectedTeamId: string | undefined, setMessage: (msg: string) => void) => void;
  message: string;
  setMessage: (msg: string) => void;
}

export function KnowledgeTab({
  files,
  searchQuery,
  setSearchQuery,
  searchResults,
  workspaceType,
  selectedTeamId,
  handleFileUpload,
  handleDelete,
  handleSearch,
  message,
  setMessage
}: KnowledgeTabProps) {
  const [activeSection, setActiveSection] = React.useState<'private' | 'team' | 'search'>('private');
  const [privatePage, setPrivatePage] = React.useState(1);
  const [teamPage, setTeamPage] = React.useState(1);
  const itemsPerPage = 10;

  const privateFiles = files.filter(f => f.path?.includes('/private/'));
  const teamFiles = files.filter(f => f.path?.includes('/team/'));
  
  const privateTotal = privateFiles.length;
  const teamTotal = teamFiles.length;
  
  const privatePaginated = privateFiles.slice((privatePage - 1) * itemsPerPage, privatePage * itemsPerPage);
  const teamPaginated = teamFiles.slice((teamPage - 1) * itemsPerPage, teamPage * itemsPerPage);
  
  const privateTotalPages = Math.ceil(privateTotal / itemsPerPage);
  const teamTotalPages = Math.ceil(teamTotal / itemsPerPage);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, workspaceType, selectedTeamId || undefined, setMessage);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(workspaceType, selectedTeamId || undefined, setMessage);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <nav className="space-y-1">
          <button
            onClick={() => setActiveSection('private')}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeSection === 'private'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Private Files
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded-full">{privateTotal}</span>
          </button>
          <button
            onClick={() => setActiveSection('team')}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeSection === 'team'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Team Files
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded-full">{teamTotal}</span>
          </button>
          <button
            onClick={() => setActiveSection('search')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeSection === 'search'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Semantic Search
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {message && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">{message}</div>
          )}

          {/* Private Files Section */}
          {activeSection === 'private' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Private Files</h2>
                <label className="px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Upload File
                  <input type="file" onChange={onFileChange} className="hidden" />
                </label>
              </div>
              
              {/* Stats */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" /><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                    <span className="text-sm font-medium text-gray-700">Total Files: <span className="font-bold text-gray-900">{privateTotal}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <span className="text-sm font-medium text-gray-700">Page: <span className="font-bold text-gray-900">{privatePage} of {privateTotalPages || 1}</span></span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {privatePaginated.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No private files uploaded yet</td></tr>
                      ) : (
                        privatePaginated.map((file, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                <span className="text-sm font-medium text-gray-900">{file.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4"><span className="text-sm text-gray-500">{file.path}</span></td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <button onClick={() => teamApi.downloadFile(file.path)} className="text-green-600 hover:text-green-900 mr-4">Download</button>
                              <button onClick={() => handleDelete(file.path, 'private', selectedTeamId || undefined, setMessage)} className="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {privateTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(privatePage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(privatePage * itemsPerPage, privateTotal)}</span> of <span className="font-medium">{privateTotal}</span> results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPrivatePage(p => Math.max(1, p - 1))}
                        disabled={privatePage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {[...Array(privateTotalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPrivatePage(i + 1)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            privatePage === i + 1
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setPrivatePage(p => Math.min(privateTotalPages, p + 1))}
                        disabled={privatePage === privateTotalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team Files Section */}
          {activeSection === 'team' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Team Files</h2>
                <label className="px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Upload File
                  <input type="file" onChange={onFileChange} className="hidden" />
                </label>
              </div>

              {/* Stats */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" /><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                    <span className="text-sm font-medium text-gray-700">Total Files: <span className="font-bold text-gray-900">{teamTotal}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <span className="text-sm font-medium text-gray-700">Page: <span className="font-bold text-gray-900">{teamPage} of {teamTotalPages || 1}</span></span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamPaginated.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No team files uploaded yet</td></tr>
                      ) : (
                        teamPaginated.map((file, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                <span className="text-sm font-medium text-gray-900">{file.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4"><span className="text-sm text-gray-500">{file.path}</span></td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <button onClick={() => teamApi.downloadFile(file.path)} className="text-green-600 hover:text-green-900 mr-4">Download</button>
                              <button onClick={() => handleDelete(file.path, 'team', selectedTeamId || undefined, setMessage)} className="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {teamTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(teamPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(teamPage * itemsPerPage, teamTotal)}</span> of <span className="font-medium">{teamTotal}</span> results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTeamPage(p => Math.max(1, p - 1))}
                        disabled={teamPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {[...Array(teamTotalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setTeamPage(i + 1)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            teamPage === i + 1
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setTeamPage(p => Math.min(teamTotalPages, p + 1))}
                        disabled={teamPage === teamTotalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Semantic Search Section */}
          {activeSection === 'search' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Semantic Search</h2>
              </div>
              <div className="p-6">
                <form onSubmit={onSearch} className="mb-6">
                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search files by content..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium inline-flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Search
                    </button>
                  </div>
                </form>
                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map((result, i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                            <span className="font-semibold text-gray-900">{result.file_name}</span>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{result.similarity_score}% match</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{result.file_path}</p>
                        {result.content_preview && (
                          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="text-xs font-semibold text-gray-700 mb-2">Content Preview:</div>
                            <div className="text-sm text-gray-700 line-clamp-3">{result.content_preview}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    No results found
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
