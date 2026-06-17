import { useState, useEffect } from 'react';
import { Calendar, Trash2, Plus, AlertCircle, MapPin } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const BlockedDatesManagement = ({ selectedProperty, properties }) => {
    const [blockedDates, setBlockedDates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [propertyToBlock, setPropertyToBlock] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calendar view state
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (selectedProperty !== 'all') {
            setPropertyToBlock(selectedProperty);
        } else if (properties?.length > 0 && !propertyToBlock) {
            setPropertyToBlock(properties[0]._id);
        }
    }, [selectedProperty, properties, propertyToBlock]);

    const fetchBlockedDates = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('ownerToken');
            const url = selectedProperty !== 'all' 
                ? `${API}/api/blocked-dates?propertyId=${selectedProperty}` 
                : `${API}/api/blocked-dates`;
                
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch blocked dates');
            const data = await res.json();
            setBlockedDates(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBlockedDates();
    }, [selectedProperty]);

    const handleBlockDates = async (e) => {
        e.preventDefault();
        if (!startDate || !propertyToBlock) return alert('Property and Start Date are required');
        
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('ownerToken');
            const res = await fetch(`${API}/api/blocked-dates`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    property: propertyToBlock,
                    startDate,
                    endDate: endDate || startDate // If no end date, it's a single day
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to block dates');
            }

            // Reset form
            setStartDate('');
            setEndDate('');
            fetchBlockedDates();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnblock = async (id) => {
        if (!window.confirm('Are you sure you want to unblock these dates?')) return;
        try {
            const token = localStorage.getItem('ownerToken');
            const res = await fetch(`${API}/api/blocked-dates/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to unblock');
            setBlockedDates(prev => prev.filter(b => b._id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    // Calendar generation logic
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = [];
        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const getBlockedRecordForDate = (date) => {
        if (!date) return null;
        return blockedDates.find(b => {
            const start = new Date(b.startDate);
            start.setHours(0,0,0,0);
            const end = new Date(b.endDate);
            end.setHours(23,59,59,999);
            return date >= start && date <= end;
        });
    };

    const handleDayClick = (date) => {
        if (!date) return;
        const blockedRecord = getBlockedRecordForDate(date);
        
        if (blockedRecord) {
            handleUnblock(blockedRecord._id);
        } else {
            const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            if (!startDate || (startDate && endDate)) {
                setStartDate(dateStr);
                setEndDate('');
            } else {
                if (new Date(dateStr) < new Date(startDate)) {
                    setStartDate(dateStr);
                } else {
                    setEndDate(dateStr);
                }
            }
        }
    };

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const calendarDays = generateCalendarDays();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Left side: Form & List */}
            <div className="flex-1 space-y-8">
                {/* Block Dates Form */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                    <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-500" />
                        Block New Dates
                    </h3>
                    <form onSubmit={handleBlockDates} className="space-y-4">
                        {selectedProperty === 'all' && (
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Select Property</label>
                                <select 
                                    value={propertyToBlock} 
                                    onChange={e => setPropertyToBlock(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                >
                                    <option value="" disabled>Select a property...</option>
                                    {properties?.map(p => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Start Date</label>
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={e => {
                                        setStartDate(e.target.value);
                                        if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                                    }}
                                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">End Date <span className="text-stone-400 font-normal lowercase">(optional)</span></label>
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Block Dates
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Blocked Dates List */}
                <div>
                    <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4">Currently Blocked Dates</h3>
                    {isLoading ? (
                        <div className="p-8 flex justify-center">
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : blockedDates.length === 0 ? (
                        <div className="bg-stone-50 p-8 rounded-2xl text-center border border-stone-100">
                            <AlertCircle className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                            <p className="text-stone-500 font-medium">No dates are currently blocked.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {blockedDates.map(block => (
                                <div key={block._id} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex items-center justify-between group">
                                    <div>
                                        <div className="font-bold text-stone-800 flex items-center gap-2">
                                            {new Date(block.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            {block.startDate !== block.endDate && (
                                                <>
                                                    <span className="text-stone-300">→</span>
                                                    {new Date(block.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                                            <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-600 font-medium">
                                                {block.property?.name || 'Unknown Property'}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleUnblock(block._id)}
                                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Unblock"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right side: Calendar View */}
            <div className="flex-1">
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm sticky top-24">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-stone-900">Calendar View</h3>
                        <div className="flex items-center gap-4">
                            <button onClick={prevMonth} className="text-stone-400 hover:text-stone-800 font-bold p-1">←</button>
                            <span className="font-bold text-stone-700 w-32 text-center">
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </span>
                            <button onClick={nextMonth} className="text-stone-400 hover:text-stone-800 font-bold p-1">→</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-[10px] font-bold text-stone-400 uppercase tracking-wider py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((date, idx) => {
                            if (!date) return <div key={`empty-${idx}`} className="p-2"></div>;
                            
                            const blockedRecord = getBlockedRecordForDate(date);
                            const isBlocked = !!blockedRecord;
                            const isToday = new Date().toDateString() === date.toDateString();
                            
                            // Check if date is in selection range
                            let isSelected = false;
                            if (!isBlocked && startDate) {
                                const checkDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
                                if (endDate) {
                                    isSelected = checkDate >= startDate && checkDate <= endDate;
                                } else {
                                    isSelected = checkDate === startDate;
                                }
                            }
                            
                            return (
                                <button 
                                    key={idx}
                                    type="button"
                                    onClick={() => handleDayClick(date)}
                                    className={`
                                        aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors
                                        ${isBlocked 
                                            ? 'bg-red-50 text-red-600 font-bold border border-red-100 hover:bg-red-100 cursor-pointer' 
                                            : isSelected
                                                ? 'bg-stone-800 text-white font-bold cursor-pointer'
                                                : isToday 
                                                    ? 'bg-emerald-500 text-white font-bold shadow-sm cursor-pointer hover:bg-emerald-600' 
                                                    : 'text-stone-600 hover:bg-stone-100 cursor-pointer'
                                        }
                                    `}
                                    title={isBlocked ? 'Click to unblock' : 'Click to select'}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-6 flex items-center gap-4 text-xs font-medium text-stone-500 justify-center">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-50 border border-red-100 rounded-sm"></div> Blocked</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Today</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white border border-stone-200 rounded-sm"></div> Available</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlockedDatesManagement;
