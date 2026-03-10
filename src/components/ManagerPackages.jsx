import { useState, useEffect } from 'react';

const ManagerPackages = ({ tokenKey = 'managerToken' }) => {
    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Added base URL
    const API_URL = import.meta.env.VITE_API_URL || '';

    const fetchPackages = async () => {
        try {
            const response = await fetch(`${API_URL}/api/packages`);
            if (!response.ok) throw new Error('Failed to fetch packages');
            const data = await response.json();
            setPackages(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setEditFormData({ ...editFormData, [e.target.name]: value });
    };

    const handleFeatureChange = (index, value) => {
        const newFeatures = [...editFormData.features];
        newFeatures[index] = value;
        setEditFormData({ ...editFormData, features: newFeatures });
    };

    const handleEditClick = (pkg) => {
        setIsEditing(pkg._id);
        setEditFormData({ ...pkg });
    };

    const handleCancelEdit = () => {
        setIsEditing(null);
        setEditFormData({});
    };

    const handleSave = async (id) => {
        const token = localStorage.getItem(tokenKey);
        if (!token) {
            alert("No authorization token found. Please sign in again.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/packages/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editFormData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to update package');
            }

            alert("Package updated successfully!");
            setIsEditing(null);
            fetchPackages();
        } catch (err) {
            alert(err.message);
        }
    };

    if (isLoading) return <div className="text-center py-12 text-stone-500">Loading packages...</div>;
    if (error) return <div className="text-center py-12 text-red-500">Error: {error}</div>;

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden p-8">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Manage Packages</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {packages.map(pkg => (
                    <div key={pkg._id} className="border border-stone-200 rounded-2xl p-6 bg-stone-50/30">
                        {isEditing === pkg._id ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">Title</label>
                                    <input type="text" name="title" value={editFormData.title} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all font-medium text-stone-900" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">Display Price text</label>
                                        <input type="text" name="price" value={editFormData.price} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all text-sm" placeholder="₹1,200" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">Total Available Units</label>
                                        <input type="number" name="maxCapacity" min="0" value={editFormData.maxCapacity} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all text-sm" />
                                        <p className="text-xs text-stone-400 mt-1">0 = Unlimited. Bookings won't exceed this count.</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">Description</label>
                                    <textarea name="description" value={editFormData.description} onChange={handleChange} rows="2" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all text-sm text-stone-600 block"></textarea>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">Features (List)</label>
                                    {editFormData.features.map((feature, idx) => (
                                        <input key={idx} type="text" value={feature} onChange={(e) => handleFeatureChange(idx, e.target.value)} className="w-full px-4 py-2 mb-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-all text-sm text-stone-600" />
                                    ))}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => handleSave(pkg._id)} className="flex-1 py-2.5 bg-[#25D366] text-white font-bold rounded-xl text-sm hover:bg-[#1DA851] transition-colors">SAVE CHANGES</button>
                                    <button onClick={handleCancelEdit} className="py-2.5 px-6 border border-stone-200 text-stone-600 font-bold rounded-xl text-sm hover:bg-stone-50 transition-colors">CANCEL</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-stone-900">{pkg.title}</h3>
                                        <div className="text-[#1DA851] font-medium mt-1">{pkg.price}</div>
                                    </div>
                                    <button onClick={() => handleEditClick(pkg)} className="px-4 py-1.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-50 transition-colors">
                                        EDIT
                                    </button>
                                </div>
                                <p className="text-sm border-l-2 border-stone-200 pl-3 text-stone-600 font-light mb-4">{pkg.description}</p>

                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Features</h4>
                                <ul className="space-y-1 mb-4">
                                    {pkg.features.map((feature, idx) => (
                                        <li key={idx} className="text-sm font-light text-stone-700 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-stone-300"></div> {feature}
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex gap-2 mt-4">
                                    <div className="text-xs font-medium text-stone-500 bg-stone-100 inline-block px-3 py-1 rounded-md">
                                        Available Units: {pkg.maxCapacity === 0 ? 'Unlimited' : pkg.maxCapacity}
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManagerPackages;
