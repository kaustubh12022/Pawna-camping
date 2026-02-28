import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ManagerLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // ==========================================
            // AUTH LOGIC
            // ==========================================
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // ROLE VALIDATION: BLOCK NON-MANAGERS
            if (data.role !== 'manager') {
                throw new Error('Access Denied: Manager role required');
            }

            // SAVE TOKEN AND NAVIGATE TO DASHBOARD
            localStorage.setItem('managerToken', data.token);
            navigate('/manager');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-stone-100">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Manager Portal</h1>
                    <p className="text-stone-500 mt-2 text-sm">Sign in to manage Pawna Camping bookings</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-stone-50 rounded-xl border-none text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-[#25D366] transition-all"
                            placeholder="manager@pawna.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-stone-50 rounded-xl border-none text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-[#25D366] transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 mt-4 bg-stone-900 text-white rounded-xl text-sm font-bold tracking-wide hover:bg-stone-800 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            'ACCESS DASHBOARD'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManagerLogin;
