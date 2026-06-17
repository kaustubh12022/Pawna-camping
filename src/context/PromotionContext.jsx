import { createContext, useContext, useState, useEffect } from 'react';

const PromotionContext = createContext();

export const usePromotion = () => useContext(PromotionContext);

export const PromotionProvider = ({ children }) => {
    const [promotion, setPromotion] = useState({
        discountPercent: 15,
        bannerMessage: "🌧️ Monsoon Flash Sale! Get up to 15% OFF on selected properties.",
        isLoading: true,
        error: null
    });

    useEffect(() => {
        const fetchPromotion = async () => {
            try {
                // Determine API URL (fallback for development if needed)
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                
                const response = await fetch(`${apiUrl}/api/promotions/current`);
                if (!response.ok) {
                    throw new Error('Failed to fetch promotion');
                }
                
                const data = await response.json();
                setPromotion({
                    discountPercent: data.discountPercent,
                    bannerMessage: data.bannerMessage,
                    isLoading: false,
                    error: null
                });
            } catch (error) {
                console.error("Promotion Error:", error);
                // Graceful fallback to static defaults if the server is unreachable
                setPromotion(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error.message
                }));
            }
        };

        fetchPromotion();
    }, []);

    // Helper function to calculate MRP safely
    const calculateMRP = (actualPrice) => {
        if (!actualPrice || isNaN(actualPrice)) return 0;
        // e.g. actual = 1000, discount = 20%, MRP = 1000 / (1 - 0.20) = 1250
        return Math.round(actualPrice / (1 - (promotion.discountPercent / 100)));
    };

    return (
        <PromotionContext.Provider value={{ ...promotion, calculateMRP }}>
            {children}
        </PromotionContext.Provider>
    );
};
