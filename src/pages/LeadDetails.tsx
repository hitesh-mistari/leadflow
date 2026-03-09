import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Phone, 
  MapPin, 
  Star, 
  Globe, 
  Calendar, 
  Clock, 
  Tag, 
  FileText, 
  History, 
  ChevronLeft,
  ExternalLink,
  Save,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Timer,
  Mic,
  MicOff
} from 'lucide-react';

const STATUS_OPTIONS = [
  'not_called',
  'called_no_response',
  'follow_up',
  'interested',
  'converted',
  'not_interested',
  'closed'
];

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [callRemark, setCallRemark] = useState('');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const { data } = await api.get(`/leads/${id}`);
        setLead(data);
        setNotes(data.notes || '');
        setStatus(data.status);
        
        const callsRes = await api.get(`/leads/${id}/calls`);
        setCallHistory(callsRes.data);
      } catch (err) {
        console.error(err);
        navigate('/leads');
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [id, navigate]);

  const startCall = () => {
    setIsCalling(true);
    setCallDuration(0);
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  const stopCall = () => {
    clearInterval(timerInterval);
    setIsCalling(false);
    setShowOutcomeModal(true);
  };

  const logCall = async (outcome: string) => {
    try {
      await api.post('/calls', {
        lead_id: id,
        duration: callDuration,
        outcome,
        notes: callRemark || `Call outcome: ${outcome}`
      });
      setShowOutcomeModal(false);
      setCallRemark('');
      
      // Refresh lead data and history
      const { data } = await api.get(`/leads/${id}`);
      setLead(data);
      const callsRes = await api.get(`/leads/${id}/calls`);
      setCallHistory(callsRes.data);
    } catch (err) {
      console.error(err);
      alert('Failed to log call');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCallRemark(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.start();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/leads/${id}`, { 
        notes, 
        status,
        last_called: status !== lead.status ? new Date().toISOString() : lead.last_called,
        call_attempts: status !== lead.status ? (lead.call_attempts || 0) + 1 : lead.call_attempts
      });
      setLead({ ...lead, notes, status });
      alert('Lead updated successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      navigate('/leads');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/leads" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{lead.name}</h1>
            <p className="text-slate-500 text-xs sm:text-sm flex items-center gap-1">
              <Tag size={12} />
              {lead.main_category}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={deleteLead} className="btn btn-secondary text-red-600 hover:bg-red-50 border-red-100 flex-1 sm:flex-none">
            <Trash2 size={18} />
          </button>
          {!isCalling ? (
            <button onClick={startCall} className="btn bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex-1 sm:flex-none">
              <Play size={18} className="mr-2" />
              Call
            </button>
          ) : (
            <button onClick={stopCall} className="btn bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 animate-pulse flex-1 sm:flex-none">
              <Square size={18} className="mr-2" />
              {formatDuration(callDuration)}
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 sm:flex-none">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          </button>
        </div>
      </div>

      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-300">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Call Finished</h3>
            <p className="text-slate-500 mb-6 text-sm">Duration: <span className="font-bold text-indigo-600">{formatDuration(callDuration)}</span></p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Call Remarks</label>
              <div className="relative">
                <textarea
                  className="input min-h-[100px] pr-12 resize-none"
                  placeholder="Add a remark about this call..."
                  value={callRemark}
                  onChange={(e) => setCallRemark(e.target.value)}
                ></textarea>
                <button
                  onClick={toggleListening}
                  className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${
                    isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-indigo-600'
                  }`}
                  title={isListening ? "Stop Listening" : "Start Speech-to-Text"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-3">Select Outcome</p>
            <div className="grid grid-cols-2 gap-3">
              {STATUS_OPTIONS.map(outcome => (
                <button
                  key={outcome}
                  onClick={() => logCall(outcome)}
                  className="px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 text-sm font-medium capitalize transition-all"
                >
                  {outcome.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowOutcomeModal(false)}
              className="w-full mt-6 py-3 text-slate-500 font-medium hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-4 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              Business Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-indigo-600 font-bold mt-1 text-lg">
                    <Phone size={20} />
                    {lead.phone}
                  </a>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website</label>
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 font-medium mt-1 hover:text-indigo-600 truncate">
                      <Globe size={18} />
                      <span className="truncate">{lead.website}</span>
                      <ExternalLink size={14} className="flex-shrink-0" />
                    </a>
                  ) : (
                    <p className="text-slate-400 text-sm mt-1">Not available</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</label>
                  <div className="flex items-start gap-2 text-slate-700 font-medium mt-1 text-sm">
                    <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                    <span>{lead.address}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rating & Reviews</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-bold text-sm">
                      <Star size={14} className="fill-amber-700" />
                      {lead.rating}
                    </div>
                    <span className="text-slate-500 text-xs">({lead.reviews} reviews)</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categories</label>
                  <p className="text-slate-700 text-sm mt-1">{lead.categories}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Hours</label>
                  <div className="flex items-center gap-2 text-slate-700 text-xs mt-1">
                    <Clock size={14} />
                    {lead.workday_timing}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                {lead.description || "No description provided for this business."}
              </p>
            </div>
          </div>

          <div className="card p-4 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <History className="text-indigo-600" size={20} />
              Call History
            </h3>
            <div className="space-y-4">
              {callHistory.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No calls logged yet.</p>
              ) : (
                callHistory.map((call) => (
                  <div key={call.id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
                      <Phone size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-900 capitalize truncate">{call.outcome.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(call.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Timer size={10} />
                          {formatDuration(call.duration)}
                        </span>
                        {call.notes && <span className="line-clamp-2 italic">"{call.notes}"</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              Notes
            </h3>
            <textarea
              className="input min-h-[200px] resize-none p-4"
              placeholder="Add your notes from the call here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <p>Last updated: {lead.last_called ? new Date(lead.last_called).toLocaleString() : 'Never'}</p>
              <p>Call attempts: <span className="font-bold text-slate-900">{lead.call_attempts || 0}</span></p>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Map */}
        <div className="space-y-8">
          <div className="card p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Pipeline Status</h3>
            <div className="space-y-3">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    status === s 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="capitalize">{s.replace('_', ' ')}</span>
                  {status === s && <CheckCircle2 size={18} />}
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={18} className="text-indigo-600" />
                Location Map
              </h3>
            </div>
            <div className="h-64 bg-slate-200 relative flex items-center justify-center">
              <div className="text-center p-6">
                <MapPin size={32} className="text-red-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">{lead.latitude}, {lead.longitude}</p>
                <p className="text-xs text-slate-500 mt-1">Map view would be integrated here using Leaflet or Google Maps.</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-secondary mt-4 text-xs"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-indigo-600 text-white shadow-xl shadow-indigo-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} />
              <h3 className="font-bold">Next Follow-up</h3>
            </div>
            <p className="text-sm text-indigo-100 mb-6">Schedule your next call with this lead to keep the momentum going.</p>
            <input 
              type="datetime-local" 
              className="w-full bg-indigo-700 border-none rounded-xl px-4 py-3 text-white placeholder-indigo-300 focus:ring-2 focus:ring-white transition-all"
            />
            <button className="w-full mt-4 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
              Schedule Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
