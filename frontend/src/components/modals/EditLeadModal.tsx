import React, { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import api from '../../services/api';

interface EditLeadModalProps {
    lead: any;
    onClose: () => void;
    onSuccess: (updatedLead: any) => void;
}

export default function EditLeadModal({ lead, onClose, onSuccess }: EditLeadModalProps) {
    const [loading, setLoading] = useState(false);
    const [stages, setStages] = useState<any[]>([]);
    const [error, setError] = useState('');

    React.useEffect(() => {
        api.get('/stages').then(res => setStages(res.data)).catch(console.error);
    }, []);

    const [formData, setFormData] = useState({
        name: lead.name || '',
        phone: lead.phone || '',
        address: lead.address || '',
        categories: lead.categories || '',
        main_category: lead.main_category || '',
        website: lead.website || '',
        rating: lead.rating || '',
        reviews: lead.reviews || '',
        workday_timing: lead.workday_timing || '',
        description: lead.description || '',
        status: lead.status || 'not_called'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                categories: formData.categories,
                main_category: formData.main_category,
                website: formData.website,
                rating: formData.rating ? parseFloat(formData.rating.toString()) : null,
                reviews: formData.reviews ? parseInt(formData.reviews.toString(), 10) : null,
                workday_timing: formData.workday_timing,
                description: formData.description,
                status: formData.status
            };

            const { data } = await api.put(`/leads/${lead.id}`, payload);
            onSuccess(data);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to update lead');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                style={{ animation: 'fadeInUp 0.2s ease' }}
            >
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex items-center justify-between shrink-0">
                    <h3 className="text-white font-bold text-lg">Edit Lead Profile</h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form id="edit-lead-form" onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Business Name *</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="input w-full" placeholder="e.g. Acme Corp" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number *</label>
                                <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="input w-full" placeholder="e.g. +91 98765 43210" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Main Category</label>
                                <input type="text" name="main_category" value={formData.main_category} onChange={handleChange} className="input w-full" placeholder="e.g. Software" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">All Categories (comma separated)</label>
                                <input type="text" name="categories" value={formData.categories} onChange={handleChange} className="input w-full" placeholder="e.g. Software, IT, Services" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Address</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} className="input w-full" placeholder="Full address" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Website</label>
                                <input type="url" name="website" value={formData.website} onChange={handleChange} className="input w-full" placeholder="https://" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="input w-full bg-white">
                                    {stages.length > 0 ? (
                                        stages.map(s => (
                                            <option key={s.name} value={s.name}>{s.label || s.name}</option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="not_called">Not Called</option>
                                            <option value="called">Called</option>
                                            <option value="called_no_response">Called (No Response)</option>
                                            <option value="called_busy">Called (Busy)</option>
                                            <option value="follow_up">Follow Up</option>
                                            <option value="interested">Interested</option>
                                            <option value="converted">Converted</option>
                                            <option value="not_interested">Not Interested</option>
                                            <option value="message_sent">Message Sent</option>
                                            <option value="closed">Closed</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rating</label>
                                <input type="number" step="0.1" name="rating" value={formData.rating} onChange={handleChange} className="input w-full" placeholder="e.g. 4.5" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reviews Count</label>
                                <input type="number" name="reviews" value={formData.reviews} onChange={handleChange} className="input w-full" placeholder="e.g. 120" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Workday Timing</label>
                                <input type="text" name="workday_timing" value={formData.workday_timing} onChange={handleChange} className="input w-full" placeholder="e.g. 9 AM - 6 PM" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Notes</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="input w-full resize-none" placeholder="Details about this lead..."></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-lead-form"
                        disabled={loading || !formData.name || !formData.phone}
                        className="btn btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-200"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                        Update Lead
                    </button>
                </div>
            </div>
        </div>
    );
}
