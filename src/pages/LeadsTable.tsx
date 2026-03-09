import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreVertical, 
  Phone, 
  Star, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';

const STATUS_OPTIONS = [
  'not_called',
  'called_no_response',
  'follow_up',
  'interested',
  'converted',
  'not_interested',
  'closed'
];

const StatusBadge = ({ status }: { status: string }) => {
  const colors: any = {
    not_called: 'bg-slate-100 text-slate-600',
    called_no_response: 'bg-amber-100 text-amber-600',
    follow_up: 'bg-blue-100 text-blue-600',
    interested: 'bg-rose-100 text-rose-600',
    converted: 'bg-emerald-100 text-emerald-600',
    not_interested: 'bg-red-100 text-red-600',
    closed: 'bg-slate-800 text-white'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function LeadsTable() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leads', {
        params: { page, search: searchQuery, status: statusFilter, limit: 10 }
      });
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, searchQuery]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await api.post('/leads/import', json);
        fetchLeads();
      } catch (err) {
        alert('Failed to import JSON. Check format.');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.put(`/leads/${id}`, { status: newStatus });
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLead = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const exportData = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.json';
      a.click();
    } else {
      const headers = ['Name', 'Phone', 'Status', 'Rating', 'Category', 'Address'];
      const rows = leads.map(l => [l.name, l.phone, l.status, l.rating, l.main_category, l.address]);
      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.csv';
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads Management</h1>
          <p className="text-slate-500">Manage and track your cold calling pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
            accept=".json"
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={importing}
            className="btn btn-secondary"
          >
            {importing ? <Loader2 className="animate-spin mr-2" size={18} /> : <Upload size={18} className="mr-2" />}
            Import JSON
          </button>
          <div className="relative group">
            <button className="btn btn-secondary">
              <Download size={18} className="mr-2" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={() => exportData('csv')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Export CSV</button>
              <button onClick={() => exportData('json')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-t border-slate-100">Export JSON</button>
            </div>
          </div>
          <button className="btn btn-primary">
            <Plus size={18} className="mr-2" />
            Add Lead
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, phone, or category..." 
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select 
              className="input w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Business Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No leads found. Try importing some data!</td>
                </tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <Link to={`/leads/${lead.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">{lead.name}</Link>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <MapPin size={12} />
                        <span className="truncate max-w-[200px]">{lead.address}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <a href={`tel:${lead.phone}`} className="text-sm font-medium text-slate-700 flex items-center gap-1 hover:text-indigo-600">
                        <Phone size={14} />
                        {lead.phone}
                      </a>
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 flex items-center gap-1 mt-1">
                          <ExternalLink size={12} />
                          Website
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-700">{lead.rating}</span>
                      <span className="text-xs text-slate-400">({lead.reviews})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{lead.main_category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0 cursor-pointer"
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                    <div className="mt-1">
                      <StatusBadge status={lead.status} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/leads/${lead.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <ExternalLink size={18} />
                      </Link>
                      <button 
                        onClick={() => deleteLead(lead.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="p-4 animate-pulse space-y-3">
                <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              </div>
            ))
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No leads found.</div>
          ) : leads.map((lead) => (
            <div key={lead.id} className="p-4 active:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <Link to={`/leads/${lead.id}`} className="font-bold text-slate-900 block truncate">{lead.name}</Link>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin size={12} />
                    <span className="truncate">{lead.address}</span>
                  </div>
                </div>
                <StatusBadge status={lead.status} />
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <a href={`tel:${lead.phone}`} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                    <Phone size={18} />
                  </a>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{lead.phone}</span>
                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                      <Star size={10} className="fill-amber-500" />
                      {lead.rating}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link to={`/leads/${lead.id}`} className="p-2 text-slate-400">
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{leads.length}</span> of <span className="font-bold text-slate-900">{total}</span> leads
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold px-4">Page {page}</span>
            <button 
              disabled={page * 10 >= total}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
