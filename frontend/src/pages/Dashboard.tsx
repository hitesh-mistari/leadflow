import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users,
  PhoneCall,
  Heart,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="card p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{Math.abs(trend)}% from last week</span>
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

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
    </div>
  </div>;

  const conversionRate = stats?.totalLeads ? ((stats.converted / stats.totalLeads) * 100).toFixed(1) : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto">
          <TrendingUp size={18} className="mr-2" />
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads}
          icon={Users}
          color="bg-indigo-600 shadow-indigo-200"
          trend={12}
        />
        <StatCard
          title="Calls Today"
          value={stats?.callsToday}
          icon={PhoneCall}
          color="bg-amber-500 shadow-amber-200"
          trend={-5}
        />
        <StatCard
          title="Interested"
          value={stats?.interested}
          icon={Heart}
          color="bg-rose-500 shadow-rose-200"
          trend={8}
        />
        <StatCard
          title="Converted"
          value={stats?.converted}
          icon={CheckCircle2}
          color="bg-emerald-600 shadow-emerald-200"
          trend={15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900">Call Activity</h3>
            <select className="text-sm bg-slate-50 border-none rounded-lg px-3 py-1 focus:ring-0">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.callsPerDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  dy={10}
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h3 className="font-bold text-slate-900 mb-8">Call Outcomes</h3>
          <div className="h-[200px] sm:h-[250px] relative flex items-center justify-center">
            {stats?.outcomeDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.outcomeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="outcome"
                  >
                    {stats.outcomeDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-sm">
                <p>No calls logged yet</p>
                <p className="text-[10px] mt-1">Start making calls to see analytics</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {stats?.outcomeDistribution?.map((entry: any, index: number) => (
              <div key={entry.outcome} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-slate-600 capitalize">{entry.outcome.replace('_', ' ')}</span>
                </div>
                <span className="font-semibold text-slate-900">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <h3 className="font-bold text-slate-900">Conversion Performance</h3>
          <div className="text-sm font-medium text-slate-500">
            Overall Rate: <span className="text-indigo-600 font-bold">{conversionRate}%</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 sm:h-4 overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-1000"
            style={{ width: `${conversionRate}%` }}
          ></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Follow-up Success</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-900">64%</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Avg. Rating (Converted)</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-900">4.8</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Avg. Call Duration</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-900">{formatDuration(stats?.avgDuration || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
