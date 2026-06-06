import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Save, MessageSquare, Key } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const SettingsPage = () => {
    const navigate = useNavigate();
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [whatsappLoading, setWhatsappLoading] = useState(false);
    const [managerPassword, setManagerPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const token = () => localStorage.getItem('managerToken');
    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API}/api/settings`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
                }
            } catch (err) { console.error('Failed to fetch settings', err); }
        };
        fetchSettings();
    }, []);

    const handleWhatsAppUpdate = async (e) => {
        e.preventDefault();
        if (!token()) return navigate('/manager/login');
        setWhatsappLoading(true);
        try {
            const res = await fetch(`${API}/api/settings`, {
                method: 'PUT', headers: headers(), body: JSON.stringify({ whatsappNumber })
            });
            if (res.ok) { setSuccess('WhatsApp number updated!'); setTimeout(() => setSuccess(''), 3000); }
            else { const d = await res.json(); throw new Error(d.message); }
        } catch (err) { alert(err.message); }
        finally { setWhatsappLoading(false); }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (!token()) return navigate('/manager/login');
        if (managerPassword.length < 6) return alert('Password must be at least 6 characters');
        setPasswordLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/update-password`, {
                method: 'PUT', headers: headers(),
                body: JSON.stringify({ targetRole: 'manager', newPassword: managerPassword })
            });
            if (res.ok) { setManagerPassword(''); setSuccess('Password updated!'); setTimeout(() => setSuccess(''), 3000); }
            else { const d = await res.json(); throw new Error(d.message); }
        } catch (err) { alert(err.message); }
        finally { setPasswordLoading(false); }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
                <p className="text-stone-500 text-sm mt-1">Platform configuration</p>
            </div>

            {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                    ✓ {success}
                </div>
            )}

            {/* WhatsApp Settings */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-semibold text-stone-900">WhatsApp Number</h2>
                        <p className="text-xs text-stone-400">Receives booking notifications and shown on public site</p>
                    </div>
                </div>
                <form onSubmit={handleWhatsAppUpdate} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Number (with country code)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-stone-400 text-sm">+</span>
                            <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="919975526627" required
                                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                    </div>
                    <button type="submit" disabled={whatsappLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
                        {whatsappLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Update Number
                    </button>
                </form>
            </div>

            {/* Password Management */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Key className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-semibold text-stone-900">Manager Password</h2>
                        <p className="text-xs text-stone-400">Change your login password</p>
                    </div>
                </div>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">New Password</label>
                        <input type="password" value={managerPassword} onChange={e => setManagerPassword(e.target.value)}
                            placeholder="Min 6 characters" minLength={6} required
                            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <button type="submit" disabled={passwordLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-60">
                        {passwordLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Key className="w-4 h-4" />}
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
