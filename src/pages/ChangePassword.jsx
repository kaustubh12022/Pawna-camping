import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

/**
 * Forced password change.
 *
 * Reached in two situations:
 *  1. A manager or owner signed in with a manager-issued temporary password
 *     (`mustChangePassword`), which the API restricts to /api/auth/* until
 *     the password is replaced.
 *  2. A user follows the link after a security reset.
 *
 * The endpoint requires the current password, so possession of a token alone
 * is not enough to take over the account.
 */
const ChangePassword = () => {
    const navigate = useNavigate();

    const tokenKey = localStorage.getItem('managerToken')
        ? 'managerToken'
        : (localStorage.getItem('ownerToken') ? 'ownerToken' : null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const homeFor = (key) => (key === 'ownerToken' ? '/owner' : '/manager');

    if (!tokenKey) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-stone-100 text-center">
                    <h1 className="text-xl font-bold text-stone-900">Session expired</h1>
                    <p className="text-stone-500 text-sm mt-2">Please sign in again to continue.</p>
                    <button
                        onClick={() => navigate('/manager/login')}
                        className="mt-6 w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-bold"
                    >
                        Go to sign in
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('The two new passwords do not match.');
            return;
        }
        if (newPassword === currentPassword) {
            setError('The new password must be different from the current password.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem(tokenKey)}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401 && data.code !== 'PASSWORD_CHANGE_REQUIRED') {
                    localStorage.removeItem(tokenKey);
                    navigate('/manager/login');
                    return;
                }
                throw new Error(data.message || 'Unable to update the password');
            }

            // Every previous session is now revoked; store the fresh token.
            if (data.token) {
                localStorage.setItem(tokenKey, data.token);
            }

            navigate(homeFor(tokenKey), { replace: true });
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
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Set a new password</h1>
                    <p className="text-stone-500 mt-2 text-sm">
                        Your account is using a temporary password. Choose your own to continue.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Current Password</label>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-stone-50 rounded-xl border-none text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-[#25D366] transition-all"
                            placeholder="The password you just used"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">New Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-stone-50 rounded-xl border-none text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-[#25D366] transition-all"
                            placeholder="At least 8 characters, with a letter and a number"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-stone-50 rounded-xl border-none text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-[#25D366] transition-all"
                            placeholder="Repeat the new password"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 mt-2 bg-stone-900 text-white rounded-xl text-sm font-bold tracking-wide hover:bg-stone-800 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            'SAVE PASSWORD'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
