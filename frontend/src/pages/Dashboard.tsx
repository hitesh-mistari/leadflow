import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users, PhoneCall, Heart, CheckCircle2, TrendingUp,
  ArrowUpRight, ArrowDownRight, Plus, Download, Calendar
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useToast } from '../context/ToastContext';

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="card p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-black mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-black">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend > 0 ? 'text-emerald-700' : trend < 0 ? 'text-red-700' : 'text-black'}`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : trend < 0 ? <ArrowDownRight size={14} /> : null}
            <span>{trend > 0 ? '+' : ''}{trend}% vs last week</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
const TIME_OPTIONS = ['7', '14', '30'];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartDays, setChartDays] = useState('7');
  const { info } = useToast();

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const chartData = React.useMemo<{ data: any[], hasActivity: boolean }>(() => {
    if (!stats) return { data: [], hasActivity: false };
    
    const days = Number(chartDays);
    const dateMap: any = {};
    
    // Fill dateMap with last N days using local date strings (YYYY-MM-DD)
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dateMap[dateStr] = { date: dateStr, calls: 0, leads: 0 };
    }

    let hasActivity = false;

    // Populate with call data
    (stats.callsPerDay || []).forEach((item: any) => {
      const d = new Date(item.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dateMap[dateStr]) {
        dateMap[dateStr].calls = parseInt(item.count);
        if (parseInt(item.count) > 0) hasActivity = true;
      }
    });

    // Populate with lead data
    (stats.leadsPerDay || []).forEach((item: any) => {
      const d = new Date(item.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dateMap[dateStr]) {
        dateMap[dateStr].leads = parseInt(item.count);
        if (parseInt(item.count) > 0) hasActivity = true;
      }
    });

    const data = Object.values(dateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
    return { data, hasActivity };
  }, [stats, chartDays]);

  const exportReport = async () => {
    if (!stats) return;
    const lines = [
      'LeadFlow CRM — Dashboard Report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Total Leads: ${stats.totalLeads}`,
      `New This Week: ${stats.newLeadsThisWeek}`,
      `Interested: ${stats.interested}`,
      `Converted: ${stats.converted}`,
      `Conversion Rate: ${stats.conversionRate}%`,
      `Avg. Call Duration: ${formatDuration(stats.avgDuration)}`,
      '',
      'Status Distribution:',
      ...(stats.statusDistribution || []).map((r: any) => `  ${r.status}: ${r.count}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leadflow_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    info('Report downloaded!');
  };

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Dashboard Overview</h1>
          <p className="text-black text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <button onClick={exportReport} className="btn btn-primary w-full sm:w-auto">
          <TrendingUp size={18} className="mr-2" />Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Total Leads" value={stats?.totalLeads} icon={Users} color="bg-indigo-600 shadow-indigo-200" trend={stats?.totalTrend} />
        <StatCard title="New This Week" value={stats?.newLeadsThisWeek} icon={Calendar} color="bg-violet-600 shadow-violet-200" trend={null} />
        <StatCard title="Called Today" value={stats?.callsToday} icon={PhoneCall} color="bg-blue-600 shadow-blue-200" trend={stats?.callsTrend} />
        <StatCard title="Interested" value={stats?.interested} icon={Heart} color="bg-rose-500 shadow-rose-200" trend={stats?.interestedTrend} />
        <StatCard title="Converted" value={stats?.converted} icon={CheckCircle2} color="bg-emerald-600 shadow-emerald-200" trend={stats?.convertedTrend} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-black flex items-center gap-2">
              Activity History
              <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Calls vs New Leads</span>
            </h3>
            <select
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 focus:ring-0"
              value={chartDays}
              onChange={e => setChartDays(e.target.value)}
            >
              <option value="7">Last 7 Days</option>
              <option value="14">Last 14 Days</option>
              <option value="30">Last 30 Days</option>
            </select>
          </div>
          <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
            {chartData.hasActivity ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={chartData.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontSize: 10, fontWeight: 'bold' }} dy={10}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#000000', fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#000' }} itemStyle={{ color: '#000', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="calls" name="Calls" stroke="#6366f1" strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-black text-sm font-bold">
                <p>No activity yet</p>
                <p className="text-[10px] mt-1 font-bold">Import leads or make calls to see data</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h3 className="font-bold text-black mb-1 flex items-center justify-between">
            {stats?.outcomeDistribution?.length > 0 ? 'Call Outcomes' : 'Pipeline Status'}
            <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Lead Distribution</span>
          </h3>
          <p className="text-[10px] text-slate-400 mb-6 font-medium uppercase tracking-tight">How your leads are distributed across states</p>
          <div className="h-[200px] sm:h-[250px] relative flex items-center justify-center w-full">
            { (stats?.outcomeDistribution?.length > 0 || stats?.statusDistribution?.length > 0) ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie 
                    data={stats?.outcomeDistribution?.length > 0 ? stats.outcomeDistribution : stats.statusDistribution} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="count" 
                    nameKey={stats?.outcomeDistribution?.length > 0 ? 'outcome' : 'status'}
                    name="Leads"
                  >
                    {(stats?.outcomeDistribution?.length > 0 ? stats.outcomeDistribution : stats.statusDistribution).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} leads`, 'Count']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#000' }} 
                    itemStyle={{ color: '#000', fontWeight: 'bold' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-black text-sm font-bold">
                <p>No data yet</p>
                <p className="text-[10px] mt-1 font-bold">Start tracking leads to see analytics</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {(stats?.outcomeDistribution?.length > 0 ? stats.outcomeDistribution : stats.statusDistribution)?.map((entry: any, index: number) => {
              const name = (entry.outcome || entry.status || 'Unknown').replace(/_/g, ' ');
              return (
                <div key={entry.outcome || entry.status || index} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-black font-medium capitalize prose-sm">
                      {name}: <span className="font-bold">{entry.count} Leads</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <h3 className="font-bold text-black">Conversion Performance</h3>
          <div className="text-sm font-bold text-black">
            Overall Rate: <span className="text-indigo-600 font-bold">{stats?.conversionRate || 0}%</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 sm:h-4 overflow-hidden">
          <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${Math.min(stats?.conversionRate || 0, 100)}%` }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">New Leads This Week</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-900">{stats?.newLeadsThisWeek || 0}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Conversion Rate</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-900">{stats?.conversionRate || 0}%</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Avg. Duration</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-900">{formatDuration(stats?.avgDuration || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
