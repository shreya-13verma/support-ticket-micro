import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignClient, userClient } from '../api/client';
import { Ticket, Comment, Attachment, User, TicketStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { SuggestedDocsWidget } from '../components/docs/SuggestedDocsWidget';
import { ArrowLeft, Send, Paperclip, UserCheck, ShieldAlert, FileText, Download } from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTicketDetails();
    if (user?.role === 'admin' || user?.role === 'agent') {
      userClient.get('/users/').then(res => {
        setAgents(res.data.filter((u: User) => u.role === 'agent' || u.role === 'admin'));
      }).catch(() => {});
    }
  }, [id, user]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    try {
      const [ticketRes, commentsRes, attachmentsRes] = await Promise.all([
        assignClient.get(`/tickets/${id}`),
        assignClient.get(`/tickets/${id}/comments`),
        assignClient.get(`/tickets/${id}/attachments`),
      ]);
      setTicket(ticketRes.data);
      setSelectedStatus(ticketRes.data.status);
      setSelectedAgent(ticketRes.data.assigned_to || '');
      setComments(commentsRes.data);
      setAttachments(attachmentsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await assignClient.post(`/tickets/${id}/comments`, {
        content: newComment,
        is_internal: isInternal,
      });
      setComments(prev => [...prev, res.data]);
      setNewComment('');
      setIsInternal(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to post comment');
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgent) return;
    try {
      const res = await assignClient.put(`/tickets/${id}/assign`, { agent_id: Number(selectedAgent) });
      setTicket(res.data);
      setSelectedStatus(res.data.status);
      alert('Ticket assigned successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign agent');
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      const res = await assignClient.put(`/tickets/${id}/status`, { status: newStatus });
      setTicket(res.data);
      setSelectedStatus(newStatus);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Invalid status transition');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await assignClient.post(`/tickets/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments(prev => [res.data, ...prev]);
      alert('Attachment uploaded successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Attachment upload failed');
    }
  };

  const handleDownload = async (attachmentId: number, filename: string) => {
    try {
      const res = await assignClient.get(`/tickets/${id}/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-red-600 font-semibold mb-4">{error || 'Ticket not found'}</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center space-x-1 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tickets</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Ticket Content & Comments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400">TICKET #{ticket.id}</span>
                <h1 className="text-xl font-bold text-slate-800 mt-1">{ticket.title}</h1>
              </div>
              <div className="flex items-center space-x-2">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
              {ticket.description}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Category: <strong className="text-slate-700">{ticket.category}</strong></span>
              <span>Created: <strong className="text-slate-700">{new Date(ticket.created_at).toLocaleString()}</strong></span>
              {ticket.due_at && (
                <span className={ticket.sla_breached ? 'text-red-600 font-semibold flex items-center gap-1' : ''}>
                  {ticket.sla_breached && <ShieldAlert className="w-3.5 h-3.5" />}
                  SLA Due: {new Date(ticket.due_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h2 className="text-base font-bold text-slate-800">Discussion & Activity</h2>

            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No comments yet.</p>
              ) : (
                comments.map(c => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                      c.is_internal ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800">{c.author_name}</span>
                        {c.is_internal && (
                          <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold">
                            Internal Note
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-700 text-sm">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="space-y-3 pt-4 border-t border-slate-100">
              <textarea
                rows={3}
                required
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment or reply..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-between">
                {(user?.role === 'agent' || user?.role === 'admin') && (
                  <label className="flex items-center space-x-2 text-xs text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={e => setIsInternal(e.target.checked)}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Post as internal agent note</span>
                  </label>
                )}
                <button
                  type="submit"
                  className="ml-auto inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Comment</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          {/* Knowledge Base Recommendations */}
          {ticket && (
            <SuggestedDocsWidget query={ticket.title} />
          )}

          {/* Status & Assignment Box (Agent/Admin) */}
          {(user?.role === 'agent' || user?.role === 'admin') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Workflow Controls</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status Transition</label>
                <select
                  value={selectedStatus}
                  onChange={e => handleStatusChange(e.target.value as TicketStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assign Agent</label>
                <div className="flex gap-2">
                  <select
                    value={selectedAgent}
                    onChange={e => setSelectedAgent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Agent...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignAgent}
                    className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    title="Assign"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Attachments</h3>
            
            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:border-indigo-200 transition">
                    <div className="flex items-center space-x-2 truncate flex-1 mr-2">
                      <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-slate-800 truncate" title={att.filename}>{att.filename}</div>
                        <div className="text-[10px] text-slate-400">{(att.file_size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(att.id, att.filename)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition flex-shrink-0"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:bg-slate-50 transition">
                <Paperclip className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs text-slate-600 font-medium">Click to upload file</span>
                <span className="text-[10px] text-slate-400">PNG, JPG, PDF up to 10MB</span>
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
