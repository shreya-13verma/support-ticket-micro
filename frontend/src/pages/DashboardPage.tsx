import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignClient } from '../api/client';
import { Ticket } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { Plus, Search, AlertCircle, Clock } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await assignClient.get('/tickets/');
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                          t.description.toLowerCase().includes(search.toLowerCase()) ||
                          t.category.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
          <p className="text-sm text-slate-500">
            {user?.role === 'user' ? 'Track and manage your requests' : 'Manage and resolve customer tickets'}
          </p>
        </div>
        <Link
          to="/tickets/new"
          className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Ticket</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search tickets by title, category, description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">No tickets found</p>
          <p className="text-xs text-slate-400 mt-1">Try changing search filters or create a new ticket.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Link
              key={t.id}
              to={`/tickets/${t.id}`}
              className="block bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 transition shadow-sm hover:shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#{t.id}</span>
                    <h3 className="font-semibold text-slate-800 hover:text-indigo-600 text-base">{t.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{t.description}</p>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 pt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{t.category}</span>
                    <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                    {t.due_at && (
                      <span className={`flex items-center space-x-1 ${t.sla_breached ? 'text-red-500 font-semibold' : ''}`}>
                        <Clock className="w-3 h-3" />
                        <span>Due: {new Date(t.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
