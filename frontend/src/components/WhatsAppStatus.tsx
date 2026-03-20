import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { RefreshCcw, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react';

export const WhatsAppStatus = () => {
    const [status, setStatus] = useState<{ ready: boolean; qr: string | null }>({ ready: false, qr: null });
    const [loading, setLoading] = useState(true);

    const checkStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setStatus(res.data);
        } catch (err) {
            console.error('Failed to fetch WA status', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    if (status.ready) {
        return (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 shadow-sm mt-6">
                <CheckCircle2 size={18} />
                <span className="font-semibold text-sm">WhatsApp Bot Fully Linked & Operational</span>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <Smartphone size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 text-sm">Link WhatsApp Server Node</h3>
                    <p className="text-xs text-slate-500">Scan this code using regular WhatsApp (Linked Devices) to authorize the server to automatically attach media.</p>
                </div>
                <button onClick={checkStatus} disabled={loading} className="ml-auto p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCcw size={16} className={loading && !status.qr ? 'animate-spin' : ''} />
                </button>
            </div>
            
            {status.qr ? (
                <div className="flex justify-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <img src={status.qr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl shadow-md border border-slate-200 mix-blend-multiply" />
                </div>
            ) : (
                <div className="h-56 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-sm">
                    <RefreshCcw size={24} className="mb-3 animate-spin text-slate-300" />
                    <span>Booting hidden browser on server...</span>
                    <span className="text-xs text-slate-400 mt-1">Downloading Chromium up to 150MB</span>
                </div>
            )}
        </div>
    );
};
