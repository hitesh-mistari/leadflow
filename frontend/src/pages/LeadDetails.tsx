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
  MicOff,
  X,
  AlertTriangle,
  Edit,
  User
} from 'lucide-react';
import EditLeadModal from '../components/modals/EditLeadModal';

// ─── WhatsApp helpers (same as LeadsTable) ────────────────────────────────────
const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const formatPhoneForWA = (phone: string) => {
  let cleaned = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1);
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
};

const WAModal = ({ phone, name, onClose }: { phone: string; name: string; onClose: () => void }) => {
  const [msg, setMsg] = useState(`Hi ${name}, I wanted to connect with you regarding your business.`);
  const [checking, setChecking] = useState(false);
  const [notAvail, setNotAvail] = useState(false);
  const fp = formatPhoneForWA(phone);

  const open = () => {
    if (!fp || fp.length < 7) { setNotAvail(true); return; }
    setChecking(true);
    const win = window.open(`https://wa.me/${fp}?text=${encodeURIComponent(msg)}`, '_blank');
    setTimeout(() => {
      setChecking(false);
      if (!win || win.closed || typeof win.closed === 'undefined') setNotAvail(true);
      else onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'fadeInUp .2s ease' }}>
        <div className="flex items-center justify-between gap-3 px-6 py-5" style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
              <WhatsAppIcon size={22} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">WhatsApp Message</h3>
              <p className="text-white/80 text-sm">{name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {notAvail ? (
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Not on WhatsApp</h4>
                <p className="text-slate-500 text-sm mt-1">The number <span className="font-bold text-slate-700">{phone}</span> does not appear to be registered on WhatsApp.</p>
              </div>
              <button onClick={() => setNotAvail(false)} className="btn btn-secondary w-full">Try Again</button>
              <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">Close</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: '#25D36610', borderColor: '#25D36630' }}>
                <Phone size={16} style={{ color: '#25D366' }} />
                <span className="font-bold text-slate-800">{phone}</span>
                <span className="text-xs text-slate-400 ml-auto">+{fp}</span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] transition-all text-sm resize-none" />

              </div>
              <p className="text-xs text-slate-400 flex items-start gap-2">
                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" />
                If the number is not on WhatsApp, you'll see an error from WhatsApp directly.
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={open} disabled={checking} className="btn flex-1 text-white font-bold" style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                  {checking ? <Loader2 size={18} className="animate-spin mr-2" /> : <WhatsAppIcon size={18} />}
                  <span className="ml-2">{checking ? 'Opening...' : 'Send on WhatsApp'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

// Inline WhatsApp button used inside LeadDetails
const WAButtonInline = ({ phone, name }: { phone: string; name: string }) => {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(true)}
        title={`WhatsApp ${name}`}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[#25D366] hover:bg-[#25D366]/10 transition-all hover:scale-110 border border-[#25D366]/30"
      >
        <WhatsAppIcon size={18} />
      </button>
      {show && <WAModal phone={phone} name={name} onClose={() => setShow(false)} />}
    </>
  );
};



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
  const [showEditModal, setShowEditModal] = useState(false);
  const [callRemark, setCallRemark] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [stages, setStages] = useState<any[]>([]);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const { data } = await api.get(`/leads/${id}`);
        setLead(data);
        setNotes(data.notes || '');
        setStatus(data.status);

        const [callsRes, stagesRes] = await Promise.all([
          api.get(`/leads/${id}/calls`),
          api.get('/stages')
        ]);
        setCallHistory(callsRes.data);
        setStages(stagesRes.data);
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
            <h1 className="text-xl sm:text-2xl font-bold text-black truncate">{lead.name}</h1>
            <p className="text-black text-xs sm:text-sm font-bold flex items-center gap-1">
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
          <button onClick={() => setShowEditModal(true)} className="btn btn-secondary flex-1 sm:flex-none">
            <Edit size={18} />
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
                  className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-indigo-600'
                    }`}
                  title={isListening ? "Stop Listening" : "Start Speech-to-Text"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-3">Select Outcome</p>
            <div className="grid grid-cols-2 gap-3">
              {stages.map(stage => (
                <button
                  key={stage.name}
                  onClick={() => logCall(stage.name)}
                  className="px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 text-sm font-medium capitalize transition-all"
                >
                  {stage.label}
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

      {showEditModal && (
        <EditLeadModal
          lead={lead}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updatedLead) => {
            setLead(updatedLead);
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-4 sm:p-8">
            <h3 className="text-lg font-bold text-black mb-6 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              Business Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-black uppercase tracking-wider">Phone Number</label>
                  <div className="flex items-center gap-3 mt-1">
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-black font-bold text-lg whitespace-nowrap">
                      <Phone size={20} />
                      {lead.phone}
                    </a>
                    {/* WhatsApp Button */}
                    {lead.phone && <WAButtonInline phone={lead.phone} name={lead.name} />}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website</label>
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-black font-bold mt-1 hover:text-indigo-600 truncate">
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
                  <div className="flex items-start gap-2 text-black font-bold mt-1 text-sm">
                    <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                    <span>{lead.address}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-black uppercase tracking-wider">Rating & Reviews</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-bold text-sm">
                      <Star size={14} className="fill-amber-700" />
                      {lead.rating}
                    </div>
                    <span className="text-black text-xs font-bold">({lead.reviews} reviews)</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categories</label>
                  <p className="text-black text-sm font-bold mt-1">{lead.categories}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Hours</label>
                  <div className="flex items-center gap-2 text-black text-xs font-bold mt-1">
                    <Clock size={14} />
                    {lead.workday_timing}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
              <p className="text-black text-sm mt-2 leading-relaxed font-medium">
                {lead.description || "No description provided for this business."}
              </p>
            </div>
          </div>

          <div className="card p-4 sm:p-8">
            <h3 className="text-lg font-bold text-black mb-6 flex items-center gap-2">
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
                        <span className="text-sm font-bold text-black capitalize truncate">{call.outcome.replace('_', ' ')}</span>
                        <span className="text-[10px] text-black font-bold whitespace-nowrap ml-2">{new Date(call.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-[11px] text-black font-medium">
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-black flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                Notes
              </h3>
              <button
                onClick={handleSave}
                disabled={saving || notes === lead.notes}
                className="btn btn-primary btn-sm py-1.5 px-3 text-xs"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} className="mr-1" />}
                {notes === lead.notes ? 'Saved' : 'Save Notes'}
              </button>
            </div>
            <textarea
              className="input min-h-[200px] resize-none p-4"
              placeholder="Add your notes from the call here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <p>Last updated: {lead.last_called ? new Date(lead.last_called).toLocaleString() : 'Never'}</p>
              <p>Call attempts: <span className="font-bold text-black">{lead.call_attempts || 0}</span></p>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Map */}
        <div className="space-y-8">
          {/* Assignment Info */}
          <div className="card p-6 border-indigo-100 bg-indigo-50/50">
            <h3 className="text-sm font-bold text-indigo-900 mb-1 flex items-center gap-2">
              <User size={16} className="text-indigo-600" />
              Assigned To
            </h3>
            <p className="text-lg font-bold text-indigo-700">
              {lead.assigned_to_name || <span className="text-slate-400 italic font-normal text-base">Unassigned</span>}
            </p>
          </div>

          <div className="card p-8">
            <h3 className="text-lg font-bold text-black mb-6">Pipeline Status</h3>
            <div className="space-y-3">
              {stages.map((stg) => (
                <button
                  key={stg.name}
                  onClick={() => setStatus(stg.name)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${status === stg.name
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    }`}
                >
                  <span className="capitalize">{stg.label}</span>
                  {status === stg.name && <CheckCircle2 size={18} />}
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
    </div >
  );
}
