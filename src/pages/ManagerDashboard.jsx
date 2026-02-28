import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const ManagerDashboard = () => {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
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
                                {bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-stone-500">
                                            No bookings found yet.
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map((booking) => (
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
            </div>
        </div>
    );
};

export default ManagerDashboard;
