import React, { useState, useEffect } from 'react';
import { userClient, assignClient } from '../api/client';
import { User, SLAPolicy } from '../types';
import { Shield, Clock } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([]);
  const [priority, setPriority] = useState('urgent');
  const [responseHours, setResponseHours] = useState(1);
  const [resolutionHours, setResolutionHours] = useState(4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, slaRes] = await Promise.all([
        userClient.get('/users/'),
        assignClient.get('/sla/policies'),
      ]);
      setUsers(usersRes.data);
      setSlaPolicies(slaRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await userClient.put(`/users/${userId}`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      alert('User role updated!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleSaveSLA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignClient.post('/sla/policies', {
        priority,
        response_time_hours: Number(responseHours),
        resolution_time_hours: Number(resolutionHours),
      });
      alert('SLA policy saved!');
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update SLA policy');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Control Center</h1>
        <p className="text-sm text-slate-500">Manage user roles and configure service level agreements (SLAs).</p>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-800">User Role Management</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs">{u.id}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{u.name}</td>
                  <td className="py-3 px-4 text-slate-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-xs uppercase font-semibold bg-slate-100 text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="user">User</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA Management */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-800">SLA Policy Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">Active Policies</h3>
            <div className="space-y-2">
              {slaPolicies.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs bg-slate-50">
                  <span className="uppercase font-bold text-slate-700">{p.priority}</span>
                  <div className="space-x-4 text-slate-600">
                    <span>Response: <strong>{p.response_time_hours}h</strong></span>
                    <span>Resolution: <strong>{p.resolution_time_hours}h</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveSLA} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase">Add / Update Policy</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Response (Hours)</label>
                <input
                  type="number"
                  min="1"
                  value={responseHours}
                  onChange={e => setResponseHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Resolution (Hours)</label>
                <input
                  type="number"
                  min="1"
                  value={resolutionHours}
                  onChange={e => setResolutionHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              Save SLA Policy
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
