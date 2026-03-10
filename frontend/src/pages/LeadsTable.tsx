import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import {
  Search,
  Filter,
  Download,
  Upload,
  Phone,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  MessageCircle,
  AlertTriangle,
  Mic,
  MicOff,
  Save,
  Languages,
  FileText,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import AddLeadModal from '../components/modals/AddLeadModal';

// ─── Voice Remark Modal ──────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { code: 'en-IN', label: 'English', flag: '🇬🇧' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'mr-IN', label: 'मराठी (Marathi)', flag: '🇮🇳' },
];

interface RemarkModalProps {
  lead: any;
  onClose: () => void;
  onSaved: (id: number, notes: string) => void;
}

const RemarkModal = ({ lead, onClose, onSaved }: RemarkModalProps) => {
  const [remark, setRemark] = useState(lead.notes || '');
  const [isListening, setIsListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [saving, setSaving] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };
    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsListening(false);
      setInterimText('');
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalTranscript) {
        setRemark(prev => prev ? prev + ' ' + finalTranscript : finalTranscript);
      }
      setInterimText(interim);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/leads/${lead.id}`, { notes: remark });
      onSaved(lead.id, remark);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save remark');
    } finally {
      setSaving(false);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ animation: 'fadeInUp 0.2s ease' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Voice Remark</h3>
              <p className="text-white/80 text-sm truncate max-w-[200px]">{lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Language Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Languages size={12} className="inline mr-1" />
              Language
            </label>
            <div className="flex gap-2">
              {LANG_OPTIONS.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLang(lang.code);
                    if (isListening) { stopListening(); }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${selectedLang === lang.code
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Remark Text Area */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Remark</label>
            <div className="relative">
              <textarea
                value={remark + (interimText ? ' ' + interimText : '')}
                onChange={(e) => setRemark(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm resize-none"
                placeholder="Click the mic button and start speaking, or type here..."
              />
              {interimText && (
                <div className="absolute bottom-3 left-4 right-16 text-xs text-indigo-400 italic truncate">
                  🎙️ Listening: {interimText}
                </div>
              )}
            </div>
          </div>

          {/* Mic Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={toggleListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isListening
                ? 'bg-red-500 text-white shadow-red-200 animate-pulse scale-110'
                : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:scale-105'
                }`}
              title={isListening ? 'Stop Listening' : 'Start Voice Input'}
            >
              {isListening ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
          </div>
          <p className="text-center text-xs text-slate-400">
            {isListening
              ? `🔴 Listening in ${LANG_OPTIONS.find(l => l.code === selectedLang)?.label}... tap to stop`
              : 'Tap the mic to start recording your voice remark'
            }
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !remark.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              Save Remark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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

// ─── WhatsApp Icon SVG ────────────────────────────────────────────────────────
const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// ─── Format phone number for WhatsApp ────────────────────────────────────────
const formatPhoneForWhatsApp = (phone: string): string => {
  // Remove everything except digits and leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // Remove leading +
  cleaned = cleaned.replace(/^\+/, '');
  // If starts with 0, assume it's Indian and replace with 91
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1);
  // If no country code (10 digits), assume India +91
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
};

// ─── WhatsApp Modal ───────────────────────────────────────────────────────────
interface WhatsAppModalProps {
  phone: string;
  name: string;
  onClose: () => void;
}

const WhatsAppModal = ({ phone, name, onClose }: WhatsAppModalProps) => {
  const [message, setMessage] = useState(`Hi ${name}, I wanted to connect with you regarding your business.`);
  const [checking, setChecking] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);
  const formattedPhone = formatPhoneForWhatsApp(phone);

  const openWhatsApp = () => {
    if (!formattedPhone || formattedPhone.length < 7) {
      setNotAvailable(true);
      return;
    }

    const encodedMsg = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMsg}`;

    setChecking(true);
    // Open WhatsApp link
    const win = window.open(url, '_blank');

    // After a short delay, check if window failed to open (popup blocker)
    setTimeout(() => {
      setChecking(false);
      if (!win || win.closed || typeof win.closed === 'undefined') {
        setNotAvailable(true);
      } else {
        onClose();
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeInUp_0.2s_ease]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
              <WhatsAppIcon size={22} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">WhatsApp Message</h3>
              <p className="text-white/80 text-sm">{name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Not available state */}
          {notAvailable ? (
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Not on WhatsApp</h4>
                <p className="text-slate-500 text-sm mt-1">
                  The number <span className="font-bold text-slate-700">{phone}</span> does not appear to be registered on WhatsApp, or the link could not be opened.
                </p>
              </div>
              <button
                onClick={() => setNotAvailable(false)}
                className="btn btn-secondary w-full"
              >
                Try Again
              </button>
              <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Phone number */}
              <div className="flex items-center gap-3 p-3 bg-[#25D366]/10 rounded-xl border border-[#25D366]/20">
                <Phone size={16} className="text-[#25D366] shrink-0" />
                <span className="font-bold text-slate-800">{phone}</span>
                <span className="text-xs text-slate-400 ml-auto">+{formattedPhone}</span>
              </div>

              {/* Message box */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent transition-all text-sm resize-none"
                  placeholder="Type your message..."
                />
              </div>

              {/* Note */}
              <p className="text-xs text-slate-400 flex items-start gap-2">
                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" />
                If the number is not on WhatsApp, the popup will show an error automatically.
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={openWhatsApp}
                  disabled={checking}
                  className="btn flex-1 text-white font-bold"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  {checking ? (
                    <Loader2 size={18} className="animate-spin mr-2" />
                  ) : (
                    <WhatsAppIcon size={18} />
                  )}
                  <span className="ml-2">{checking ? 'Opening...' : 'Send on WhatsApp'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── WhatsApp Button ─────────────────────────────────────────────────────────
const WhatsAppButton = ({ phone, name }: { phone: string; name: string }) => {
  const [showModal, setShowModal] = useState(false);

  if (!phone) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title={`WhatsApp ${name}`}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[#25D366] hover:bg-[#25D366]/10 transition-all hover:scale-110"
      >
        <WhatsAppIcon size={16} />
      </button>
      {showModal && (
        <WhatsAppModal phone={phone} name={name} onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LeadsTable() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [remarkLead, setRemarkLead] = useState<any>(null);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRemarkSaved = (id: number, notes: string) => {
    setLeads(leads.map(l => l.id === id ? { ...l, notes } : l));
  };

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

  const fetchImportHistory = async () => {
    try {
      const { data } = await api.get('/imports');
      setImportHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    if (showHistory) fetchImportHistory();
  }, [showHistory]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = JSON.parse(event.target?.result as string);

        // Detect the shape: could be array, or { leads: [...] }, or other wrapper
        let leadsArray: any[] = [];
        if (Array.isArray(rawJson)) {
          leadsArray = rawJson;
        } else if (rawJson && typeof rawJson === 'object') {
          // Try common wrapper keys
          const possibleKeys = ['leads', 'data', 'results', 'items', 'records', 'businesses', 'contacts'];
          const foundKey = possibleKeys.find(k => Array.isArray(rawJson[k]));
          if (foundKey) {
            leadsArray = rawJson[foundKey];
          } else {
            // Single object — wrap in array
            leadsArray = [rawJson];
          }
        }

        const { data } = await api.post('/leads/import', {
          leads: leadsArray,
          filename: file.name
        });

        setImportResult({
          success: true,
          filename: file.name,
          total: data.total,
          imported: data.imported,
          skipped: data.skipped
        });
        fetchLeads();
        if (showHistory) fetchImportHistory();
      } catch (err: any) {
        const msg = err.response?.data?.error || 'Failed to import JSON.';
        setImportResult({
          success: false,
          filename: file.name,
          error: msg
        });
      } finally {
        setImporting(false);
        // Reset file input so same file can be re-imported
        if (fileInputRef.current) fileInputRef.current.value = '';
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

  const exportData = async (format: 'json' | 'csv') => {
    try {
      // Get the token from AuthContext's localStorage
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({ format });
      if (searchQuery) queryParams.append('search', searchQuery);
      if (statusFilter) queryParams.append('status', statusFilter);

      const response = await fetch(`/api/leads/export?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export data');
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
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
          <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="btn btn-secondary">
            {importing ? <Loader2 className="animate-spin mr-2" size={18} /> : <Upload size={18} className="mr-2" />}
            Import JSON
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`btn btn-secondary ${showHistory ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : ''}`}
          >
            <History size={18} className="mr-2" />
            Import History
          </button>
          <div className="relative group">
            <button className="btn btn-secondary">
              <Download size={18} className="mr-2" />Export
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={() => exportData('csv')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Export CSV</button>
              <button onClick={() => exportData('json')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-t border-slate-100">Export JSON</button>
            </div>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary"><Plus size={18} className="mr-2" />Add Lead</button>
        </div>
      </div>

      {/* Import Result Toast */}
      {importResult && (
        <div className={`rounded-2xl p-4 flex items-center justify-between ${importResult.success
          ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-red-50 border border-red-200'
          }`}>
          <div className="flex items-center gap-3">
            {importResult.success ? (
              <CheckCircle2 size={20} className="text-emerald-600" />
            ) : (
              <XCircle size={20} className="text-red-600" />
            )}
            <div>
              <p className={`font-bold text-sm ${importResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                {importResult.success
                  ? `Import Successful — ${importResult.filename}`
                  : `Import Failed — ${importResult.filename}`
                }
              </p>
              <p className={`text-xs mt-0.5 ${importResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                {importResult.success
                  ? `${importResult.imported} imported, ${importResult.skipped} skipped out of ${importResult.total} total records`
                  : importResult.error
                }
              </p>
            </div>
          </div>
          <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchLeads();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Import History Panel */}
      {showHistory && (
        <div className="card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <History size={18} className="text-indigo-600" />
              Import History
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
              <ChevronUp size={18} />
            </button>
          </div>
          {importHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No imports yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {importHistory.map((entry: any) => (
                <div key={entry.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${entry.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                      }`}>
                      {entry.status === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{entry.filename}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(entry.imported_at).toLocaleString()}
                        </span>
                        <span>• by {entry.imported_by}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {entry.imported_count} <span className="text-xs font-normal text-slate-400">imported</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {entry.skipped_count} skipped • {entry.total_records} total
                      </div>
                    </div>
                    {entry.error_message && (
                      <span className="text-xs text-red-500 max-w-[150px] truncate" title={entry.error_message}>
                        {entry.error_message}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        {/* Filters */}
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
            <select className="input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {/* Desktop Table */}
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
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-lg w-full" /></td>
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

                  {/* ── CONTACT CELL with WhatsApp button ── */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {lead.phone ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-sm font-medium text-slate-700 flex items-center gap-1 hover:text-indigo-600"
                          >
                            <Phone size={14} />
                            {lead.phone}
                          </a>
                          {/* WhatsApp Button */}
                          <WhatsAppButton phone={lead.phone} name={lead.name} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No phone</span>
                      )}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 flex items-center gap-1">
                          <ExternalLink size={12} />Website
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
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <div className="mt-1"><StatusBadge status={lead.status} /></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Remark Button */}
                      <button
                        onClick={() => setRemarkLead(lead)}
                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                        title="Add Voice Remark"
                      >
                        <Mic size={18} />
                      </button>
                      <Link to={`/leads/${lead.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <ExternalLink size={18} />
                      </Link>
                      <button onClick={() => deleteLead(lead.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
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
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 animate-pulse space-y-3">
                <div className="h-5 bg-slate-100 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
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
                <div className="flex items-center gap-2">
                  <a href={`tel:${lead.phone}`} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                    <Phone size={18} />
                  </a>
                  {/* WhatsApp button for mobile */}
                  {lead.phone && (
                    <WhatsAppButton phone={lead.phone} name={lead.name} />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{lead.phone}</span>
                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                      <Star size={10} className="fill-amber-500" />{lead.rating}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Remark Button for Mobile */}
                  <button
                    onClick={() => setRemarkLead(lead)}
                    className="p-2 text-violet-500"
                    title="Add Voice Remark"
                  >
                    <Mic size={18} />
                  </button>
                  <Link to={`/leads/${lead.id}`} className="p-2 text-slate-400">
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{leads.length}</span> of <span className="font-bold text-slate-900">{total}</span> leads
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold px-4">Page {page}</span>
            <button disabled={page * 10 >= total} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Remark Modal */}
      {remarkLead && (
        <RemarkModal
          lead={remarkLead}
          onClose={() => setRemarkLead(null)}
          onSaved={handleRemarkSaved}
        />
      )}
    </div>
  );
}
