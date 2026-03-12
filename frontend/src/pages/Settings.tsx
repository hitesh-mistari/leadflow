import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { 
  User, 
  Mail, 
  Lock, 
  Upload, 
  Save, 
  Loader2, 
  Shield, 
  FileJson,
  CheckCircle2,
  AlertCircle,
  Trash2,
  MapPin,
  History as LucideHistory
} from 'lucide-react';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { success, error: toastError } = useToast();
  const { tab } = useParams();
  const navigate = useNavigate();
  
  const activeTab = (tab === 'uploader' ? 'uploader' : 'profile') as 'profile' | 'uploader';
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Uploader state
  const [importing, setImporting] = useState(false);
  const [city, setCity] = useState('');
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImportHistory = async () => {
    try {
      const { data } = await api.get('/imports');
      setImportHistory(data);
    } catch {}
  };

  React.useEffect(() => {
    if (activeTab === 'uploader') fetchImportHistory();
  }, [activeTab]);

  const handleDeleteImport = async (id: number) => {
    if (!confirm('Are you sure you want to delete this import record?')) return;
    try {
      await api.delete(`/imports/${id}`);
      success('Import record deleted');
      fetchImportHistory();
    } catch {
      toastError('Failed to delete import record');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      return toastError('Passwords do not match');
    }

    setSavingProfile(true);
    try {
      const payload: any = { name, email };
      if (password) payload.password = password;
      
      const { data } = await api.put('/auth/profile', payload);
      
      // Update global auth state and local storage
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      success('Profile updated successfully');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
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
        const { data } = await api.post('/leads/import', { 
          leads: arr, 
          filename: file.name,
          size: file.size,
          city: city
        });
        success(`Imported ${data.imported} leads`, `${data.skipped} skipped from ${file.name}`);
        fetchImportHistory();
      } catch (err: any) {
        toastError('Import failed', err.response?.data?.error || 'Invalid JSON file');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-black">Settings</h1>
              <p className="text-black text-xs mt-1 font-bold">Manage your account and data</p>
            </div>
            
            <nav className="flex flex-col gap-1">
              <button 
                onClick={() => navigate('/settings/profile')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'profile' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-black hover:bg-slate-100 font-bold'
                }`}
              >
                <User size={18} />
                User Profile
              </button>
              
              <button 
                onClick={() => navigate('/settings/uploader')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'uploader' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-black hover:bg-slate-100 font-bold'
                }`}
              >
                <Upload size={18} />
                Data Uploader
              </button>
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {activeTab === 'profile' && (
            <div className="card max-w-2xl animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-bold text-black">Account Security</h3>
                <p className="text-xs text-black font-bold">Update your personal information and password</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-black uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    className="input pl-10 w-full" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-black uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="email" 
                    className="input pl-10 w-full" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-black uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="password" 
                      placeholder="Leave blank to keep current"
                      className="input pl-10 w-full" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-black uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="password" 
                      placeholder="Repeat new password"
                      className="input pl-10 w-full" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                type="submit" 
                disabled={savingProfile}
                className="btn btn-primary px-8"
              >
                {savingProfile ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
          )}

          {activeTab === 'uploader' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="card max-w-2xl">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <FileJson size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-black">Lead Uploader</h3>
                  <p className="text-xs text-black font-bold">Import leads from external JSON sources</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-black uppercase tracking-wider">Default City (Optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="e.g. Mumbai, New York..."
                      className="input pl-10 w-full" 
                      value={city} 
                      onChange={e => setCity(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Used if a lead in the JSON doesn't specify its own city.</p>
                </div>

                <div className="max-w-sm mx-auto p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 flex flex-col items-center justify-center transition-all hover:border-indigo-300 hover:bg-indigo-50/30 group">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload size={32} />
                  </div>
                  <h4 className="font-bold text-black mb-1">Upload JSON File</h4>
                  <p className="text-xs text-black font-bold mb-6">Select a .json file containing lead data.</p>
                  
                  <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="btn btn-primary w-full shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="animate-spin mr-2" size={18} /> : <Upload size={18} className="mr-2" />}
                    {importing ? 'Importing...' : 'Select File'}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-left flex gap-3">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Pro Tip: Smart Field Mapping</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Our algorithm automatically detects fields like <strong>Business Name</strong>, <strong>Phone</strong>, and <strong>Website</strong> from your JSON. Just upload and we'll handle the rest!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-black flex items-center gap-2">
                <LucideHistory size={18} className="text-indigo-600" />
                Upload History
              </h3>
              {importHistory.length > 0 && (
                <button 
                  onClick={() => {
                    if (confirm('Clear all upload history? This will not delete the leads already imported.')) {
                      api.delete('/imports/-1').then(() => {
                        success('History cleared');
                        fetchImportHistory();
                      });
                    }
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            {importHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No imports found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">File Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-center">Rows</th>
                      <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-center">Size</th>
                      <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Uploaded By</th>
                      <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Time</th>
                      <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${entry.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                              {entry.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            </div>
                            <span className="font-bold text-sm text-black break-words" title={entry.filename}>
                              {entry.filename}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-black text-center font-bold">{entry.imported_count}</td>
                        <td className="px-6 py-4 text-sm text-black text-center font-bold">{entry.file_size ? formatSize(parseInt(entry.file_size)) : '—'}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{entry.imported_by}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-black font-bold">
                          {new Date(entry.imported_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteImport(entry.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  </div>
</div>
);
}
