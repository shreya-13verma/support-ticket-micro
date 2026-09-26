import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { assignClient } from '../api/client';
import { NotificationItem } from '../types';
import { Bell, Ticket, BarChart3, Shield, LogOut, BookOpen } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (user) {
      assignClient.get('/notifications')
        .then(res => setNotifications(res.data))
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: number) => {
    try {
      await assignClient.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-8">
        <Link to="/" className="flex items-center space-x-2 text-indigo-600 font-bold text-xl">
          <Ticket className="w-6 h-6" />
          <span>Support Desk</span>
        </Link>
        <div className="flex items-center space-x-6 text-sm font-medium text-slate-600">
          {user && <Link to="/" className="hover:text-indigo-600">Tickets</Link>}
          <Link to="/docs" className="flex items-center space-x-1 hover:text-indigo-600">
            <BookOpen className="w-4 h-4" />
            <span>Knowledge Base</span>
          </Link>
          {user && (user.role === 'admin' || user.role === 'agent') && (
            <Link to="/reports" className="flex items-center space-x-1 hover:text-indigo-600">
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin" className="flex items-center space-x-1 hover:text-indigo-600">
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </div>

      {user ? (
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2 text-slate-500 hover:text-slate-700 relative rounded-full hover:bg-slate-100"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                <div className="px-4 py-2 font-semibold border-b border-slate-100 text-sm">Notifications</div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`px-4 py-2.5 text-xs cursor-pointer border-b border-slate-50 hover:bg-slate-50 ${!n.is_read ? 'bg-indigo-50/50' : ''}`}
                      >
                        <div className="font-semibold text-slate-800">{n.title}</div>
                        <div className="text-slate-600 mt-0.5">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm font-semibold text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">{user.role}</div>
          </div>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="space-x-3">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600">Login</Link>
          <Link to="/register" className="text-sm font-medium bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-indigo-700">Register</Link>
        </div>
      )}
    </nav>
  );
};
