import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagerPackages from '../components/ManagerPackages';

const ManagerDashboard = () => {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [activeTab, setActiveTab] = useState('bookings'); // bookings, packages, settings
    const [bookingStatusTab, setBookingStatusTab] = useState('pending'); // pending, confirmed, cancelled
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [whatsappLoading, setWhatsappLoading] = useState(false);

    const navigate = useNavigate();

    // ==========================================
    // FETCH LOGIC
    // ==========================================
    const fetchBookings = useCallback(async () => {
        const token = localStorage.getItem('managerToken');

        if (!token) {
            navigate('/manager/login');
            return;
        }

        try {
            setError(null);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                // TOKEN EXPIRED OR INVALID ROLE
                localStorage.removeItem('managerToken');
                navigate('/manager/login');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }

            const data = await response.json();
            setBookings(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Fetch WhatsApp settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
                }
            } catch (err) {
                console.error('Failed to fetch settings', err);
            }
        };
        fetchSettings();
    }, []);

    // ==========================================
    // STATUS UPDATE LOGIC
    // ==========================================
    const handleUpdateStatus = async (id, newStatus) => {
        const token = localStorage.getItem('managerToken');
        if (!token) return navigate('/manager/login');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.status === 401) {
                localStorage.removeItem('managerToken');
                return navigate('/manager/login');
            }

            if (!response.ok) throw new Error('Failed to update status');

            // REFRESH LOCALLY TO INSTANTLY REFLECT CHANGES
            fetchBookings();
        } catch (err) {
            alert(err.message);
        }
    };

    // ==========================================
    // DELETE LOGIC
    // ==========================================
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this booking?")) return;

        const token = localStorage.getItem('managerToken');
        if (!token) return navigate('/manager/login');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('managerToken');
                return navigate('/manager/login');
            }

            if (!response.ok) throw new Error('Failed to delete booking');

            // REFRESH LOCALLY TO INSTANTLY REFLECT CHANGES
            fetchBookings();
        } catch (err) {
            alert(err.message);
        }
    };

    const handlePasswordUpdate = async (e, targetRole) => {
        e.preventDefault();
        const inputId = targetRole === 'manager' ? 'managerPassword' : 'ownerPassword';
        const newPassword = document.getElementById(inputId).value;
        const token = localStorage.getItem('managerToken'); // BUG FIX: use managerToken instead of token

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/update-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ targetRole, newPassword })
            });

            if (response.ok) {
                alert(`${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} password updated successfully.`);
                document.getElementById(inputId).value = '';
            } else {
                const errData = await response.json();
                alert(`Failed: ${errData.message}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleWhatsAppUpdate = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('managerToken');
        if (!token) return navigate('/manager/login');

        setWhatsappLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ whatsappNumber })
            });

            if (response.ok) {
                alert('WhatsApp number updated successfully!');
            } else {
                const errData = await response.json();
                alert(`Failed: ${errData.message}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setWhatsappLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('managerToken');
        navigate('/manager/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-12">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Manager Dashboard</h1>
                        <p className="text-stone-500 mt-1">Review and manage recent camping bookings.</p>
                    </div>

                    <div className="flex bg-stone-100 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'bookings' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Bookings</button>
                        <button onClick={() => setActiveTab('packages')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'packages' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Packages</button>
                        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Settings</button>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-6 py-2.5 bg-white border border-stone-200 text-stone-600 font-medium rounded-xl hover:bg-stone-50 transition-colors text-sm"
                    >
                        Sign Out
                    </button>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                        {error}
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <>
                        {/* DATE FILTER & STATUS TABS */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                            <div className="flex gap-2">
                                <button onClick={() => setBookingStatusTab('pending')} className={`px-4 py-2 text-sm font-bold rounded-lg border ${bookingStatusTab === 'pending' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>Pending</button>
                                <button onClick={() => setBookingStatusTab('confirmed')} className={`px-4 py-2 text-sm font-bold rounded-lg border ${bookingStatusTab === 'confirmed' ? 'bg-[#25D366]/10 text-[#1DA851] border-[#25D366]/30' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>Confirmed</button>
                                <button onClick={() => setBookingStatusTab('cancelled')} className={`px-4 py-2 text-sm font-bold rounded-lg border ${bookingStatusTab === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>Cancelled</button>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Date:</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-4 py-2 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 font-medium tracking-wide uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-5">Customer</th>
                                            <th className="px-6 py-5">Package</th>
                                            <th className="px-6 py-5">Dates & Guests</th>
                                            <th className="px-6 py-5">Food</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {bookings.filter(b => b.status === bookingStatusTab && new Date(b.checkIn).toISOString().split('T')[0] === selectedDate).length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center text-stone-500">
                                                    No {bookingStatusTab} bookings found for the selected date.
                                                </td>
                                            </tr>
                                        ) : (
                                            bookings
                                                .filter(b => b.status === bookingStatusTab && new Date(b.checkIn).toISOString().split('T')[0] === selectedDate)
                                                .map((booking) => (
                                                    <tr key={booking._id} className="hover:bg-stone-50/50 transition-colors">
                                                        <td className="px-6 py-5">
                                                            <div className="font-semibold text-stone-900">{booking.customerName}</div>
                                                            <div className="text-xs text-stone-500 mt-0.5">{booking.customerPhone}</div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="font-medium text-stone-700">{booking.packageType}</div>
                                                            <div className="text-xs text-stone-500 mt-0.5">{booking.nights} Night{booking.nights !== 1 ? 's' : ''}</div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="text-stone-700">{new Date(booking.checkIn).toLocaleDateString()} &rarr; {new Date(booking.checkOut).toLocaleDateString()}</div>
                                                            <div className="text-xs font-medium text-stone-500 mt-0.5">{booking.guests} Guest{booking.guests !== 1 ? 's' : ''}</div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex flex-col gap-1">
                                                                {booking.vegGuests > 0 && (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 w-max">
                                                                        {booking.vegGuests} Veg
                                                                    </span>
                                                                )}
                                                                {booking.nonVegGuests > 0 && (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 w-max">
                                                                        {booking.nonVegGuests} Non-Veg
                                                                    </span>
                                                                )}
                                                                {/* Legacy fallback if both are 0 but foodPreference exists */}
                                                                {(booking.vegGuests === 0 && booking.nonVegGuests === 0 && booking.foodPreference) && (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-700 w-max">
                                                                        {booking.foodPreference}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-[#25D366]/20 text-[#1DA851]' :
                                                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {booking.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-right space-x-2">
                                                            {booking.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleUpdateStatus(booking._id, 'confirmed')}
                                                                    className="px-3 py-1.5 bg-[#25D366] text-white text-xs font-bold rounded-lg hover:bg-[#1DA851] transition-colors"
                                                                >
                                                                    CONFIRM
                                                                </button>
                                                            )}
                                                            {booking.status !== 'cancelled' && (
                                                                <button
                                                                    onClick={() => handleUpdateStatus(booking._id, 'cancelled')}
                                                                    className="px-3 py-1.5 bg-stone-200 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-300 transition-colors"
                                                                >
                                                                    CANCEL
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(booking._id)}
                                                                className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors"
                                                            >
                                                                DELETE
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'packages' && (
                    <ManagerPackages />
                )}

                {activeTab === 'settings' && (
                    <>
                    <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden p-8">
                        <h2 className="text-xl font-bold text-stone-900 mb-6">Password Management</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <form onSubmit={(e) => handlePasswordUpdate(e, 'manager')} className="space-y-4 bg-stone-50/50 p-6 rounded-2xl border border-stone-100">
                                <div>
                                    <label className="text-sm font-medium text-stone-700">New Manager Password</label>
                                    <input type="password" id="managerPassword" placeholder="Enter new password" minLength={6} required className="w-full mt-2 px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all font-light" />
                                </div>
                                <button type="submit" className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors">
                                    Update Manager Password
                                </button>
                            </form>

                            <form onSubmit={(e) => handlePasswordUpdate(e, 'owner')} className="space-y-4 bg-stone-50/50 p-6 rounded-2xl border border-stone-100">
                                <div>
                                    <label className="text-sm font-medium text-stone-700">New Owner Password</label>
                                    <input type="password" id="ownerPassword" placeholder="Enter new password" minLength={6} required className="w-full mt-2 px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all font-light" />
                                </div>
                                <button type="submit" className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors">
                                    Update Owner Password
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* WhatsApp Number Configuration */}
                    <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden p-8 mt-6">
                        <h2 className="text-xl font-bold text-stone-900 mb-2">WhatsApp Notification Number</h2>
                        <p className="text-sm text-stone-500 font-light mb-6">This number receives booking notifications and is shown to users for direct contact via WhatsApp.</p>
                        <form onSubmit={handleWhatsAppUpdate} className="max-w-md space-y-4 bg-stone-50/50 p-6 rounded-2xl border border-stone-100">
                            <div>
                                <label className="text-sm font-medium text-stone-700">WhatsApp Number</label>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-stone-400 text-sm font-light">+</span>
                                    <input
                                        type="text"
                                        value={whatsappNumber}
                                        onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="919975526627"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all font-light"
                                    />
                                </div>
                                <p className="text-xs text-stone-400 mt-2">Enter the full number with country code, e.g. 919975526627</p>
                            </div>
                            <button
                                type="submit"
                                disabled={whatsappLoading}
                                className="w-full py-3 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#1DA851] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {whatsappLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.474-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                        </svg>
                                        Update WhatsApp Number
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ManagerDashboard;
