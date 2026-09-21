import React, { useState, useEffect } from 'react';
import { assignClient } from '../api/client';
import { SLAComplianceStats, AgentMetric } from '../types';
import { CheckCircle2, AlertTriangle, Users } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [slaStats, setSlaStats] = useState<SLAComplianceStats | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [slaRes, perfRes] = await Promise.all([
        assignClient.get('/reports/sla-compliance'),
        assignClient.get('/reports/agent-performance'),
      ]);
      setSlaStats(slaRes.data);
      setAgentMetrics(perfRes.data.metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-slate-800">Operational Analytics</h1>
        <p className="text-sm text-slate-500">Real-time metrics on SLA compliance and agent resolution velocity.</p>
      </div>

      {/* KPI Cards */}
      {slaStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Tickets</div>
            <div className="text-2xl font-bold text-slate-800 mt-2">{slaStats.total_tickets}</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-emerald-600 uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Compliant</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">{slaStats.compliant_tickets}</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-red-600 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SLA Breached</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">{slaStats.breached_tickets}</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-indigo-600 uppercase">Compliance Rate</div>
            <div className="text-2xl font-bold text-slate-800 mt-2">{slaStats.compliance_rate_percentage}%</div>
          </div>
        </div>
      )}

      {/* Agent Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Users className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-800">Agent Resolution Velocity</h2>
        </div>

        {agentMetrics.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No assigned ticket metrics available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Agent ID</th>
                  <th className="py-3 px-4">Assigned Tickets</th>
                  <th className="py-3 px-4">Resolved Count</th>
                  <th className="py-3 px-4">Avg Resolution (Hours)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentMetrics.map(m => (
                  <tr key={m.agent_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium text-indigo-600">Agent #{m.agent_id}</td>
                    <td className="py-3 px-4 text-slate-700">{m.assigned_count}</td>
                    <td className="py-3 px-4 text-emerald-600 font-semibold">{m.resolved_count}</td>
                    <td className="py-3 px-4 text-slate-700">{m.avg_resolution_hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
