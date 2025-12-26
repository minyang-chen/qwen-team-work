import React from 'react';
import { DashboardSubTab } from '../../types/team.types';

interface DashboardTabProps {
  dashboardSubTab: DashboardSubTab;
  setDashboardSubTab: (tab: DashboardSubTab) => void;
  notifications: any[];
  selectedNotification: any;
  setSelectedNotification: (notif: any) => void;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;
  handleSendReply: (selectedTeam: any, setMessage: (msg: string) => void) => void;
  todos: any[];
  setTodos: (todos: any[]) => void;
  newTodo: string;
  setNewTodo: (text: string) => void;
  addTodo: (e: React.FormEvent) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, text: string) => void;
  startEditing: (id: string) => void;
  cancelEditing: (id: string) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  calendarEvents: any[];
  setCalendarEvents: (events: any[]) => void;
  eventForm: any;
  setEventForm: (form: any) => void;
  addCalendarEvent: () => void;
  deleteCalendarEvent: (id: string) => void;
  previousMonth: () => void;
  nextMonth: () => void;
  selectedTeam: any;
  message: string;
  setMessage: (msg: string) => void;
}

export function DashboardTab(props: DashboardTabProps) {
  const {
    dashboardSubTab, setDashboardSubTab, notifications, selectedNotification, setSelectedNotification,
    replyMessage, setReplyMessage, handleSendReply, todos, setTodos, newTodo, setNewTodo,
    addTodo, toggleTodo, deleteTodo, updateTodo, startEditing, cancelEditing,
    currentMonth, calendarEvents, eventForm, setEventForm, addCalendarEvent, deleteCalendarEvent,
    previousMonth, nextMonth, selectedTeam, message, setMessage
  } = props;

  const [notifPage, setNotifPage] = React.useState(1);
  const [todoPage, setTodoPage] = React.useState(1);
  const [eventPage, setEventPage] = React.useState(1);
  const itemsPerPage = 10;

  const teamNotifications = notifications.filter(n => n.team_id === selectedTeam?.id);
  const notifTotal = teamNotifications.length;
  const notifPaginated = teamNotifications.slice((notifPage - 1) * itemsPerPage, notifPage * itemsPerPage);
  const notifTotalPages = Math.ceil(notifTotal / itemsPerPage);

  const todoTotal = (todos || []).length;
  const todoPaginated = (todos || []).slice((todoPage - 1) * itemsPerPage, todoPage * itemsPerPage);
  const todoTotalPages = Math.ceil(todoTotal / itemsPerPage);

  const eventTotal = calendarEvents.length;
  const eventPaginated = calendarEvents.slice((eventPage - 1) * itemsPerPage, eventPage * itemsPerPage);
  const eventTotalPages = Math.ceil(eventTotal / itemsPerPage);

  const onReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendReply(selectedTeam, setMessage);
  };

  return (
    <div className="flex h-full">
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <nav className="space-y-1">
          <button onClick={() => setDashboardSubTab('notifications')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${dashboardSubTab === 'notifications' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Notifications
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded-full">{notifTotal}</span>
          </button>
          <button onClick={() => setDashboardSubTab('todo-list')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${dashboardSubTab === 'todo-list' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              To-Do List
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded-full">{todoTotal}</span>
          </button>
          <button onClick={() => setDashboardSubTab('calendar')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${dashboardSubTab === 'calendar' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Calendar
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-purple-600 text-white rounded-full">{eventTotal}</span>
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-4">
        {message && <div className="mb-4 p-4 bg-blue-100 rounded">{message}</div>}

      {dashboardSubTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Team Notifications</h2>
          </div>

          {/* Stats */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                <span className="text-sm font-medium text-gray-700">Total: <span className="font-bold text-gray-900">{notifTotal}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <span className="text-sm font-medium text-gray-700">Page: <span className="font-bold text-gray-900">{notifPage} of {notifTotalPages || 1}</span></span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {!selectedTeam ? (
              <div className="text-center py-12 text-gray-500">Please select a team to view notifications</div>
            ) : notifPaginated.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No notifications</div>
            ) : (
              <>
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {notifPaginated.map((notif, i) => (
                        <tr key={notif._id || i} className="hover:bg-gray-50">
                          <td className="px-6 py-4"><span className="text-sm font-medium text-gray-900">{notif.sender}</span></td>
                          <td className="px-6 py-4"><span className="text-sm text-gray-700">{notif.message}</span></td>
                          <td className="px-6 py-4"><span className="text-sm text-gray-500">{new Date(notif.created_at).toLocaleString()}</span></td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setSelectedNotification(notif)} className="text-blue-600 hover:text-blue-900 text-sm font-medium">Reply</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {notifTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(notifPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(notifPage * itemsPerPage, notifTotal)}</span> of <span className="font-medium">{notifTotal}</span> results
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setNotifPage(p => Math.max(1, p - 1))} disabled={notifPage === 1} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                      {[...Array(notifTotalPages)].map((_, i) => (
                        <button key={i} onClick={() => setNotifPage(i + 1)} className={`px-3 py-2 text-sm font-medium rounded-lg ${notifPage === i + 1 ? 'bg-blue-600 text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}>{i + 1}</button>
                      ))}
                      <button onClick={() => setNotifPage(p => Math.min(notifTotalPages, p + 1))} disabled={notifPage === notifTotalPages} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedNotification && (
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Reply to notification</h3>
                <form onSubmit={onReplySubmit} className="flex gap-3">
                  <input type="text" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Type your reply..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Send</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {dashboardSubTab === 'todo-list' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">To-Do List</h2>
          </div>

          {/* Stats */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                <span className="text-sm font-medium text-gray-700">Total: <span className="font-bold text-gray-900">{todoTotal}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span className="text-sm font-medium text-gray-700">Completed: <span className="font-bold text-gray-900">{todos.filter(t => t.completed).length}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <span className="text-sm font-medium text-gray-700">Page: <span className="font-bold text-gray-900">{todoPage} of {todoTotalPages || 1}</span></span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={addTodo} className="mb-6">
              <div className="flex gap-3">
                <input type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="Add a new task..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Task</button>
              </div>
            </form>

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                    <th className="w-32 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todoPaginated.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">No tasks yet. Add one above!</td></tr>
                  ) : (
                    todoPaginated.map((todo) => (
                      <tr key={todo._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo._id)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer" />
                        </td>
                        <td className="px-6 py-4">
                          {todo.editing ? (
                            <input type="text" defaultValue={todo.text} onBlur={(e) => { updateTodo(todo._id, e.target.value); cancelEditing(todo._id); }} className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" autoFocus />
                          ) : (
                            <span className={`text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{todo.text}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          {todo.editing ? (
                            <button onClick={() => cancelEditing(todo._id)} className="text-gray-600 hover:text-gray-900">Cancel</button>
                          ) : (
                            <div className="flex justify-end gap-3">
                              <button onClick={() => startEditing(todo._id)} className="text-blue-600 hover:text-blue-900">Edit</button>
                              <button onClick={() => deleteTodo(todo._id)} className="text-red-600 hover:text-red-900">Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {todoTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(todoPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(todoPage * itemsPerPage, todoTotal)}</span> of <span className="font-medium">{todoTotal}</span> results
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTodoPage(p => Math.max(1, p - 1))} disabled={todoPage === 1} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  {[...Array(todoTotalPages)].map((_, i) => (
                    <button key={i} onClick={() => setTodoPage(i + 1)} className={`px-3 py-2 text-sm font-medium rounded-lg ${todoPage === i + 1 ? 'bg-blue-600 text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => setTodoPage(p => Math.min(todoTotalPages, p + 1))} disabled={todoPage === todoTotalPages} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {dashboardSubTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-700 uppercase">{day}</div>
                ))}
                {(() => {
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const today = new Date();
                  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                  const days = [];
                  for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="bg-white min-h-24"></div>);
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = calendarEvents.filter(e => e.date === dateStr);
                    days.push(
                      <div key={day} className="bg-white p-2 min-h-24 hover:bg-gray-50">
                        <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-900'}`}>{day}</div>
                        <div className="space-y-1">
                          {dayEvents.map((evt, i) => (
                            <div key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded truncate" title={`${evt.time} ${evt.title}`}>
                              <span className="font-medium">{evt.time}</span> {evt.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return days;
                })()}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Events List</h2>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                  <span className="text-sm font-medium text-gray-700">Total Events: <span className="font-bold text-gray-900">{eventTotal}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  <span className="text-sm font-medium text-gray-700">Page: <span className="font-bold text-gray-900">{eventPage} of {eventTotalPages || 1}</span></span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-hidden border border-gray-200 rounded-lg mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {eventPaginated.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No events scheduled</td></tr>
                    ) : (
                      eventPaginated.map((evt, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-4"><span className="text-sm font-medium text-gray-900">{evt.title}</span></td>
                          <td className="px-6 py-4"><span className="text-sm text-gray-700">{evt.date}</span></td>
                          <td className="px-6 py-4"><span className="text-sm text-gray-700">{evt.time}</span></td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => deleteCalendarEvent(evt.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {eventTotalPages > 1 && (
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(eventPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(eventPage * itemsPerPage, eventTotal)}</span> of <span className="font-medium">{eventTotal}</span> results
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEventPage(p => Math.max(1, p - 1))} disabled={eventPage === 1} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                    {[...Array(eventTotalPages)].map((_, i) => (
                      <button key={i} onClick={() => setEventPage(i + 1)} className={`px-3 py-2 text-sm font-medium rounded-lg ${eventPage === i + 1 ? 'bg-blue-600 text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}>{i + 1}</button>
                    ))}
                    <button onClick={() => setEventPage(p => Math.min(eventTotalPages, p + 1))} disabled={eventPage === eventTotalPages} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Event</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Event title" value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={eventForm.date} onChange={(e) => setEventForm({...eventForm, date: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <input type="time" value={eventForm.time} onChange={(e) => setEventForm({...eventForm, time: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={addCalendarEvent} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Event</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
