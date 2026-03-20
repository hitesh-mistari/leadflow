import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import {
  Search, Filter, Download, Upload, Phone, Star, MapPin,
  ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink,
  Loader2, X, MessageCircle, AlertTriangle, Mic, Save,
  FileText, History, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, ChevronRight as ChevronRightIcon,
  ArrowUpDown, ArrowUp, ArrowDown, Tag, Calendar
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import AddLeadModal from '../components/modals/AddLeadModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  not_called: 'Not Called',
  called_no_response: 'Called — No Response',
  called_busy: 'Called — Busy',
  follow_up: 'Follow Up',
  interested: 'Interested',
  converted: 'Converted',
  not_interested: 'Not Interested',
  closed: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  not_called: 'bg-purple-100 text-purple-700',
  called_no_response: 'bg-orange-100 text-orange-700',
  called_busy: 'bg-amber-100 text-amber-700',
  follow_up: 'bg-sky-100 text-sky-700',
  interested: 'bg-pink-100 text-pink-700',
  converted: 'bg-emerald-100 text-emerald-700',
  not_interested: 'bg-red-100 text-red-700',
  closed: 'bg-slate-200 text-slate-700',
};

const statusLabel = (s: string) => STATUS_LABELS[s] || s.replace(/_/g, ' ');

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
    {statusLabel(status)}
  </span>
);

const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.115 1.522 5.843L.044 23.956l6.268-1.646A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.792-.53-5.373-1.456l-.383-.228-3.726.978.997-3.637-.25-.4A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

const WhatsAppButton = ({ phone, name, small = false }: { phone: string; name: string; small?: boolean }) => {
  const cleaned = phone.replace(/\D/g, '');
  const num = cleaned.startsWith('0') ? '91' + cleaned.slice(1) : (cleaned.length === 10 ? '91' + cleaned : cleaned);
  const msg = encodeURIComponent(`Hi ${name}, I'm reaching out regarding...`);
  return (
    <a
      href={`https://wa.me/${num}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${small ? 'w-7 h-7' : 'w-8 h-8'} bg-green-50 text-green-600 rounded-full flex items-center justify-center hover:bg-green-100`}
      title="Open WhatsApp"
    >
      <WhatsAppIcon size={small ? 12 : 14} />
    </a>
  );
};

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────
const DeleteConfirmDialog = ({ lead, onConfirm, onCancel }: { lead: any; onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" style={{ animation: 'fadeInUp 0.2s ease' }}>
      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
        <AlertTriangle className="text-red-600" size={24} />
      </div>
      <h3 className="font-bold text-slate-900 text-lg mb-1">Delete Lead?</h3>
      <p className="text-slate-500 text-sm mb-6">
        This will permanently delete <strong>{lead.name}</strong> and all their call history. This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
        <button onClick={onConfirm} className="btn flex-1 bg-red-600 text-white hover:bg-red-700 shadow-red-200">Delete</button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadsTable() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error: toastError, info } = useToast();
  const { user } = useAuth();

  // Read URL state
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stages, setStages] = useState<any[]>([]);
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [pageSize, setPageSize] = useState(Number(searchParams.get('limit') || 10));
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>((searchParams.get('order') as 'ASC' | 'DESC') || 'DESC');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [pendingCount, setPendingCount] = useState<number>(-1);
  const [importing, setImporting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || '');
  const [teammates, setTeammates] = useState<any[]>([]);
  const [calledByFilter, setCalledByFilter] = useState(searchParams.get('called_by') || '');
  const [assignedToFilter, setAssignedToFilter] = useState(
    searchParams.has('assigned_to') ? (searchParams.get('assigned_to') || '') : (user?.id?.toString() || '')
  );

  useEffect(() => {
    if (user?.id && !searchParams.has('assigned_to') && !assignedToFilter) {
      setAssignedToFilter(user.id.toString());
    }
  }, [user?.id, searchParams, assignedToFilter]);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync URL params
  const syncURL = useCallback((overrides: Record<string, string | number | undefined> = {}) => {
    const params: Record<string, string> = {};
    if (page > 1 || overrides.page) params.page = String(overrides.page ?? page);
    if (pageSize !== 10 || overrides.limit) params.limit = String(overrides.limit ?? pageSize);
    
    const currentQ = overrides.q !== undefined ? String(overrides.q) : searchQuery;
    if (currentQ) params.q = currentQ;

    if (statusFilter || overrides.status !== undefined) params.status = String(overrides.status ?? statusFilter);
    if (cityFilter || overrides.city !== undefined) params.city = String(overrides.city ?? cityFilter);
    if (calledByFilter || overrides.called_by !== undefined) params.called_by = String(overrides.called_by ?? calledByFilter);
    if (assignedToFilter || overrides.assigned_to !== undefined) params.assigned_to = String(overrides.assigned_to ?? assignedToFilter);
    if (dateFrom || overrides.from) params.from = String(overrides.from ?? dateFrom);
    if (dateTo || overrides.to) params.to = String(overrides.to ?? dateTo);
    if (sortBy !== 'created_at') params.sort = String(overrides.sort ?? sortBy);
    if (sortOrder !== 'DESC') params.order = String(overrides.order ?? sortOrder);
    setSearchParams(params, { replace: true });
  }, [page, pageSize, statusFilter, cityFilter, calledByFilter, assignedToFilter, dateFrom, dateTo, sortBy, sortOrder, searchQuery, setSearchParams]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery !== searchInput) {
        setSearchQuery(searchInput);
        setPage(1);
        syncURL({ q: searchInput, page: 1 });
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchInput, searchQuery, syncURL]);

  const fetchPendingCount = async () => {
    try {
      const { data } = await api.get('/leads/pending-count');
      setPendingCount(data.count);
    } catch {
      // ignore
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params: any = { 
        page, 
        limit: pageSize, 
        search: searchQuery, 
        status: statusFilter, 
        city: cityFilter, 
        called_by: calledByFilter,
        assigned_to: assignedToFilter,
        sort: sortBy, 
        order: sortOrder 
      };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const { data } = await api.get('/leads', { params });
      setLeads(data?.leads || []);
      setTotal(data?.total || 0);
      setSelectedIds(new Set()); // clear selection on page change
      fetchPendingCount();
    } catch (err) {
      toastError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const { data } = await api.get('/stages');
      setStages(data.map((s: any) => ({ name: s.name, label: s.label || s.name })));
    } catch (_) { }
  };

  const fetchCities = async () => {
    try {
      const { data } = await api.get('/leads/cities');
      setCities(data);
    } catch (_) { }
  };

  const fetchTeammates = async () => {
    try {
      const { data } = await api.get('/users');
      setTeammates(data);
    } catch (_) { }
  };

  useEffect(() => { fetchLeads(); }, [page, pageSize, statusFilter, cityFilter, calledByFilter, assignedToFilter, searchQuery, sortBy, sortOrder, dateFrom, dateTo]);
  useEffect(() => {
    fetchStages();
    fetchCities();
    fetchTeammates();
  }, []);

  // ── Sort toggle ──
  const toggleSort = (col: string) => {
    if (sortBy === col) {
      const newOrder = sortOrder === 'DESC' ? 'ASC' : 'DESC';
      setSortOrder(newOrder);
      syncURL({ sort: col, order: newOrder });
    } else {
      setSortBy(col);
      setSortOrder('DESC');
      syncURL({ sort: col, order: 'DESC' });
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown size={14} className="text-slate-300" />;
    return sortOrder === 'DESC' ? <ArrowDown size={14} className="text-indigo-500" /> : <ArrowUp size={14} className="text-indigo-500" />;
  };

  // ── Bulk select ──
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setApplyingBulk(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => api.put(`/leads/${id}`, { status: bulkStatus })));
      success(`Updated ${selectedIds.size} leads`, `Status changed to "${statusLabel(bulkStatus)}"`);
      setSelectedIds(new Set());
      setBulkStatus('');
      fetchLeads();
    } catch {
      toastError('Failed to update leads');
    } finally {
      setApplyingBulk(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const previousLeads = [...leads];
    // Optimistic UI Update: change it immediately on screen!
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    
    try {
      await api.put(`/leads/${id}`, { status: newStatus });
      info('Status updated');
      
      const prevStatus = previousLeads.find(l => l.id === id)?.status;
      if (prevStatus === 'not_called' || newStatus === 'not_called') {
        fetchPendingCount();
      }
    } catch {
      // Revert the UI if the network request fails
      setLeads(previousLeads);
      toastError('Failed to update status');
    }
  };

  const loadMyBatch = () => {
    const myId = user?.id?.toString();
    if (myId) {
      setAssignedToFilter(myId);
      setPage(1);
      syncURL({ assigned_to: myId, page: 1 });
    }
  };

  const assignSelf = async () => {
    try {
      const { data } = await api.post('/leads/assign-self');
      success('Batch Assigned', data.message);
      fetchPendingCount();
      loadMyBatch();
    } catch (err: any) {
      if (err.response?.data?.error?.includes('still have not_called leads in your current batch')) {
        // If they just tried to get a new batch but haven't finished the old one, auto-filter to their existing batch to help them!
        info('Filter Applied', 'Viewing your current pending batch.');
        loadMyBatch();
      } else {
        toastError(err.response?.data?.error || 'Failed to get next batch');
      }
    }
  };

  const deleteLead = async (lead: any) => {
    setDeleteTarget(lead);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/leads/${deleteTarget.id}`);
      success('Lead deleted', deleteTarget.name);
      setDeleteTarget(null);
      fetchLeads();
    } catch {
      toastError('Failed to delete lead');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        let arr: any[] = [];
        if (Array.isArray(raw)) arr = raw;
        else {
          const key = ['leads','data','results','items','records','businesses','contacts'].find(k => Array.isArray(raw[k]));
          arr = key ? raw[key] : [raw];
        }
        const { data } = await api.post('/leads/import', { leads: arr, filename: file.name });
        success(`Imported ${data.imported} leads`, `${data.skipped} skipped from ${file.name}`);
        fetchLeads();
      } catch (err: any) {
        toastError('Import failed', err.response?.data?.error || 'Invalid JSON file');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const token = localStorage.getItem('token');
      const qp = new URLSearchParams({ format });
      if (searchQuery) qp.append('search', searchQuery);
      if (statusFilter) qp.append('status', statusFilter);
      if (cityFilter) qp.append('city', cityFilter);
      if (assignedToFilter) qp.append('assigned_to', assignedToFilter);
      if (dateFrom) qp.append('from', dateFrom);
      if (dateTo) qp.append('to', dateTo);
      const resp = await fetch(`/api/leads/export?${qp}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      info(`Exporting ${format.toUpperCase()}`, 'All matching leads included');
    } catch {
      toastError('Export failed');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-black">Leads Management</h1>
          <p className="text-black text-sm">{(total || 0).toLocaleString()} total leads in your pipeline</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingCount === 0 ? (
            <button onClick={assignSelf} className="btn btn-secondary border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold" title="Assign the next 100 leads to yourself">
              Get Next Batch
            </button>
          ) : pendingCount > 0 ? (
            <button disabled className="btn btn-secondary border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed font-semibold w-auto" title="You must finish your current leads before getting a new batch">
              Finish {pendingCount} Pending Leads First
            </button>
          ) : null}
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary hidden md:inline-flex"><Plus size={18} className="mr-2" />Add Lead</button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <span className="font-bold text-indigo-700 text-sm">{selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} selected</span>
          <select className="input py-1.5 text-sm w-48 bg-slate-50 border-slate-200" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
            <option value="" className="text-slate-600">Change status to…</option>
            {stages.map(s => <option key={s.name} value={s.name} className={STATUS_COLORS[s.name]?.split(' ')[1] || 'text-slate-600'}>{s.label}</option>)}
          </select>
          <button onClick={applyBulkStatus} disabled={!bulkStatus || applyingBulk} className="btn btn-primary py-1.5 text-sm">
            {applyingBulk ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="btn btn-secondary py-1.5 text-sm">Clear</button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 md:w-[18px] md:h-[18px] w-4 h-4" />
              <input type="text" placeholder="Search by name, phone, or category..." className="input pl-9 md:pl-10 w-full py-1.5 md:py-2 text-sm" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
              <Filter size={18} className="text-slate-400 shrink-0 hidden md:block" />
              <select 
                className={`input w-full md:w-44 font-medium transition-colors text-sm py-1.5 md:py-2 focus:ring-1 ${statusFilter && STATUS_COLORS[statusFilter] ? STATUS_COLORS[statusFilter] + ' border-transparent' : 'bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-200 text-fuchsia-900 focus:ring-fuchsia-500'}`} 
                value={statusFilter} 
                onChange={e => { setStatusFilter(e.target.value); setPage(1); syncURL({ status: e.target.value, page: 1 }); }}
              >
                <option value="" className="text-slate-600">All Status</option>
                {stages.map(s => <option key={s.name} value={s.name} className={`font-bold ${STATUS_COLORS[s.name]?.split(' ')[1] || 'text-slate-600'}`}>{s.label}</option>)}
              </select>
              <select className="input w-full md:w-40 bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-900 focus:ring-sky-500 transition-colors text-sm py-1.5 md:py-2" value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(1); syncURL({ city: e.target.value, page: 1 }); }}>
                <option value="" className="text-slate-600">All Cities</option>
                {cities.map(c => <option key={c} value={c} className="text-sky-700 font-medium">{c}</option>)}
              </select>
              <select className="input w-full md:w-40 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-900 focus:ring-indigo-500 transition-colors text-sm py-1.5 md:py-2" value={assignedToFilter} onChange={e => { setAssignedToFilter(e.target.value); setPage(1); syncURL({ assigned_to: e.target.value, page: 1 }); }}>
                <option value="" className="text-slate-600">All Assigned</option>
                <option value="unassigned" className="text-indigo-700 font-medium">Unassigned</option>
                {teammates.map(u => <option key={u.id} value={u.id} className="text-indigo-700 font-medium">{u.name}</option>)}
              </select>
              <select className="input w-full md:w-40 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900 focus:ring-emerald-500 transition-colors text-sm py-1.5 md:py-2" value={calledByFilter} onChange={e => { setCalledByFilter(e.target.value); setPage(1); syncURL({ called_by: e.target.value, page: 1 }); }}>
                <option value="" className="text-slate-600">All Callers</option>
                {teammates.map(u => <option key={u.id} value={u.id} className="text-emerald-700 font-medium">{u.name}</option>)}
              </select>
            </div>
          </div>
          {/* Date range filter */}
          <div className="hidden md:flex flex-wrap items-center gap-2 text-sm">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-slate-500 text-xs font-medium">Added between:</span>
            <input type="date" className="input py-1.5 text-sm w-40" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            <span className="text-slate-400">–</span>
            <input type="date" className="input py-1.5 text-sm w-40" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="text-xs text-red-500 hover:text-red-700">Clear dates</button>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" className="rounded" checked={selectedIds.size === leads.length && leads.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">Business Name <SortIcon col="name" /></div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('main_category')}>
                  <div className="flex items-center gap-1">Category <SortIcon col="main_category" /></div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1">Status <SortIcon col="status" /></div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center gap-1">Added <SortIcon col="created_at" /></div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-lg w-full" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No leads found. Try adjusting your filters or importing data.</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.has(lead.id) ? 'bg-indigo-50/50' : ''}`}>
                  <td className="px-4 py-4">
                    <input type="checkbox" className="rounded" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Link to={`/leads/${lead.id}`} className="font-bold text-black hover:text-indigo-600 transition-colors line-clamp-1">{lead.name}</Link>
                        {lead.rating > 0 && (
                          <div className="flex items-center gap-1 shrink-0 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-600 border border-amber-100">
                            <Star size={10} className="fill-amber-500 text-amber-500" />
                            <span>{lead.rating}</span>
                          </div>
                        )}
                      </div>
                      {lead.address && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <MapPin size={12} /><span className="truncate max-w-[200px] text-black font-medium">{lead.address}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {lead.phone ? (
                        <div className="flex items-center gap-2">
                          <a href={`tel:${lead.phone}`} className="text-sm font-bold text-black flex items-center gap-1 hover:text-indigo-600 whitespace-nowrap">
                            <Phone size={14} />{lead.phone}
                          </a>
                          <WhatsAppButton phone={lead.phone} name={lead.name} />
                        </div>
                      ) : <span className="text-xs text-slate-400">No phone</span>}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 flex items-center gap-1">
                          <ExternalLink size={12} />Website
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-black font-medium">{lead.main_category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={lead.status} />
                      <select
                        className={`text-xs font-bold bg-transparent border-none focus:ring-0 p-0 cursor-pointer mt-1 ${STATUS_COLORS[lead.status]?.split(' ')[1] || 'text-slate-600'}`}
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                      >
                        {stages.map(s => <option key={s.name} value={s.name} className={`font-bold ${STATUS_COLORS[s.name]?.split(' ')[1] || 'text-slate-600'}`}>{s.label}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-black font-medium">{new Date(lead.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-indigo-700">{lead.assigned_to_name || <span className="text-slate-400 font-normal italic">Unassigned</span>}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/leads/${lead.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <ExternalLink size={18} />
                      </Link>
                      <button onClick={() => deleteLead(lead)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="p-3 animate-pulse space-y-2">
                <div className="h-5 bg-slate-100 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
              </div>
            ))
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No leads found.</div>
          ) : leads.map((lead) => (
            <div key={lead.id} className={`p-3 transition-colors ${selectedIds.has(lead.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-start gap-2.5">
                <input type="checkbox" className="rounded mt-0.5 shrink-0" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header: Name, Category, Assigned */}
                  <div>
                    <Link to={`/leads/${lead.id}`} className="font-bold text-black block truncate text-sm">{lead.name}</Link>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-slate-500 font-medium">{lead.main_category}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                        {lead.assigned_to_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {/* Body: Contact */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {lead.phone && <a href={`tel:${lead.phone}`} className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0"><Phone size={12} /></a>}
                      {lead.phone && <WhatsAppButton phone={lead.phone} name={lead.name} small={true} />}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-black">{lead.phone || 'No phone'}</span>
                        {lead.rating > 0 && <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold"><Star size={10} className="fill-amber-500" />{lead.rating}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Footer: Status select & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex flex-col w-1/2">
                      <select
                        className={`text-[11px] font-bold bg-transparent border-none focus:ring-0 p-0 cursor-pointer w-full ${STATUS_COLORS[lead.status]?.split(' ')[1] || 'text-slate-600'}`}
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                      >
                        {stages.map(s => <option key={s.name} value={s.name} className={`font-bold ${STATUS_COLORS[s.name]?.split(' ')[1] || 'text-slate-600'}`}>{s.label}</option>)}
                      </select>
                    </div>
                    <Link to={`/leads/${lead.id}`} className="text-indigo-600 text-[11px] font-bold hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1.5 rounded-lg active:scale-95 transition-transform">
                      Details <ChevronRightIcon size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{Math.min((page - 1) * pageSize + 1, total || 0)}–{Math.min(page * pageSize, total || 0)}</span> of <span className="font-bold text-slate-900">{(total || 0).toLocaleString()}</span> leads
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { setPage(1); syncURL({ page: 1 }); }} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs px-3">«</button>
            <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); syncURL({ page: page - 1 }); }} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={18} /></button>
            <span className="text-sm font-bold px-3">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); syncURL({ page: page + 1 }); }} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={18} /></button>
            <button disabled={page >= totalPages} onClick={() => { setPage(totalPages); syncURL({ page: totalPages }); }} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs px-3">»</button>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { fetchLeads(); setShowAddModal(false); success('Lead added successfully!'); }}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          lead={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
