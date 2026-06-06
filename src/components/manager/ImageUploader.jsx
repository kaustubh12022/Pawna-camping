import { useState, useRef } from 'react';

const ImageUploader = ({ images, setImages, coverImage, setCoverImage }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });

        try {
            const token = localStorage.getItem('managerToken');
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.message || `Upload failed with status ${res.status}`);
            }
            const uploadedFiles = await res.json();
            
            // Map to image objects
            const newImages = uploadedFiles.map((file, index) => ({
                url: file.url,
                publicId: file.publicId,
                description: '',
                order: images.length + index
            }));

            const updatedImages = [...images, ...newImages];
            setImages(updatedImages);

            // Auto-set cover image if it's the first upload and cover is not set
            if (!coverImage?.url && newImages.length > 0) {
                setCoverImage({
                    url: newImages[0].url,
                    publicId: newImages[0].publicId
                });
            }

        } catch (error) {
            console.error('Error uploading:', error);
            alert(`Failed to upload images: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (index, publicId) => {
        if (!confirm('Remove this image?')) return;
        
        // Remove from UI immediately
        const newImages = [...images];
        newImages.splice(index, 1);
        
        // Re-calculate order
        newImages.forEach((img, i) => img.order = i);
        setImages(newImages);

        // If it was the cover image, clear it
        if (coverImage?.publicId === publicId) {
            setCoverImage({ url: '', publicId: '' });
        }

        // Delete from Cloudinary if it has a publicId
        if (publicId) {
            try {
                const token = localStorage.getItem('managerToken');
                await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload/${encodeURIComponent(publicId)}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                console.error('Failed to delete from Cloudinary', err);
            }
        }
    };

    const updateDescription = (index, desc) => {
        const newImages = [...images];
        newImages[index].description = desc;
        setImages(newImages);
    };

    // DRAG AND DROP HANDLERS
    const handleDragStart = (e, index) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData('imageIndex', index);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('imageIndex'), 10);
        
        if (dragIndex === dropIndex || isNaN(dragIndex)) return;

        const newImages = [...images];
        const draggedImage = newImages[dragIndex];
        
        newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, draggedImage);

        // Re-calculate order
        newImages.forEach((img, i) => img.order = i);
        setImages(newImages);
    };

    const setAsCover = (img) => {
        setCoverImage({
            url: img.url,
            publicId: img.publicId
        });
    };

    return (
        <div className="space-y-4">
            {/* Upload Zone */}
            <div 
                className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />
                
                {isUploading ? (
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-stone-600 font-medium">Uploading media...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-stone-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-stone-700 font-medium text-lg">Click to upload images or videos</p>
                        <p className="text-stone-500 text-sm mt-1">Supports JPG, PNG, MP4 up to 50MB</p>
                    </div>
                )}
            </div>

            {/* Gallery Preview */}
            {images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    {images.map((img, index) => (
                        <div 
                            key={index} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col cursor-move transition-all hover:shadow-md ${coverImage?.publicId === img.publicId ? 'ring-2 ring-[#25D366] border-[#25D366]' : 'border-stone-200'}`}
                        >
                            {coverImage?.publicId === img.publicId && (
                                <div className="absolute top-2 left-2 z-10 bg-[#25D366] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">COVER IMAGE</div>
                            )}
                            
                            <div className="absolute top-2 right-2 z-10 flex gap-1">
                                <button 
                                    onClick={() => handleDelete(index, img.publicId)}
                                    className="p-1.5 bg-red-500 text-white rounded shadow hover:bg-red-600 transition-colors"
                                    title="Delete Image"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>

                            <div className="h-40 bg-stone-100 relative group">
                                {img.url.includes('.mp4') || img.url.includes('.mov') ? (
                                    <video src={img.url} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={img.url} alt={`Preview ${index}`} className="w-full h-full object-cover" style={{ pointerEvents: 'none' }} />
                                )}
                                
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                                    <button 
                                        onClick={() => setAsCover(img)}
                                        className="px-3 py-1.5 bg-white text-stone-900 text-xs font-bold rounded hover:bg-stone-200 pointer-events-auto"
                                    >
                                        Set as Cover
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-stone-50 flex-grow flex flex-col gap-2 border-t border-stone-100">
                                <input 
                                    type="text" 
                                    placeholder="Image description (optional)" 
                                    value={img.description || ''}
                                    onChange={(e) => updateDescription(index, e.target.value)}
                                    className="w-full text-xs px-2 py-1.5 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                                />
                                <div className="flex items-center text-stone-400 mt-2 gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9h8M8 15h8" /></svg>
                                    <span className="text-[10px] font-medium uppercase tracking-wider">Drag to reorder (Pos {index + 1})</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageUploader;
