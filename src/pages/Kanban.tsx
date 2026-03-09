import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Phone, 
  MapPin, 
  Star, 
  MoreVertical, 
  Plus,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';

const PIPELINE_STATUSES = [
  'not_called',
  'follow_up',
  'interested',
  'converted',
  'closed'
];

const LeadCard = ({ lead, onDragStart }: any) => (
  <div 
    draggable
    onDragStart={(e) => onDragStart(e, lead.id)}
    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-grab active:cursor-grabbing group"
  >
    <div className="flex items-start justify-between mb-2">
      <Link to={`/leads/${lead.id}`} className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{lead.name}</Link>
      <button className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
        <MoreVertical size={14} />
      </button>
    </div>
    
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Phone size={12} />
        <span>{lead.phone}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <MapPin size={12} />
        <span className="truncate">{lead.address}</span>
      </div>
      <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
        <Star size={12} className="fill-amber-500" />
        <span>{lead.rating}</span>
        <span className="text-slate-400 font-normal">({lead.reviews})</span>
      </div>
    </div>

    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
      <a href={`tel:${lead.phone}`} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
        <Phone size={14} />
      </a>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {lead.main_category}
      </div>
    </div>
  </div>
);

export default function Kanban() {
  const { searchQuery } = useSearch();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leads', { params: { limit: 100, search: searchQuery } });
      setLeads(data.leads);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchQuery]);

  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('leadId', id.toString());
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, status: string) => {
    const leadId = e.dataTransfer.getData('leadId');
    try {
      await api.put(`/leads/${leadId}`, { status });
      setLeads(leads.map(l => l.id === parseInt(leadId) ? { ...l, status } : l));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Kanban</h1>
          <p className="text-slate-500 text-sm">Drag and drop leads to update their status.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} className="mr-2" />
          Add New Stage
        </button>
      </div>

      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 min-h-[70vh] snap-x">
        {PIPELINE_STATUSES.map((status) => (
          <div 
            key={status} 
            className="flex-shrink-0 w-[85vw] sm:w-80 flex flex-col gap-4 snap-center"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status)}
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 capitalize">{status.replace('_', ' ')}</h3>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {leads.filter(l => l.status === status).length}
                </span>
              </div>
              <button className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <Plus size={16} />
              </button>
            </div>

            <div className="flex-1 bg-slate-100/50 rounded-2xl p-3 space-y-3 min-h-[200px] border-2 border-dashed border-transparent hover:border-slate-200 transition-all">
              {leads
                .filter(l => l.status === status)
                .map(lead => (
                  <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} />
                ))}
              {leads.filter(l => l.status === status).length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                  <p>No leads here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
