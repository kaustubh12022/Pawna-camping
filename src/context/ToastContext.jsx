import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
};

const BORDER_ACCENTS = {
    success: 'border-emerald-500/30 text-emerald-100',
    error: 'border-rose-500/30 text-rose-100',
    warning: 'border-amber-500/30 text-amber-100',
    info: 'border-sky-500/30 text-sky-100'
};

const STRIP_COLORS = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500'
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        setToasts((prev) => [...prev.slice(-4), { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
        return id;
    }, [removeToast]);

    const toast = useMemo(() => ({
        success: (msg, dur) => showToast(msg, 'success', dur),
        error: (msg, dur) => showToast(msg, 'error', dur),
        warning: (msg, dur) => showToast(msg, 'warning', dur),
        info: (msg, dur) => showToast(msg, 'info', dur),
        dismiss: removeToast
    }), [showToast, removeToast]);

    const contextValue = useMemo(() => ({
        showToast,
        removeToast,
        toast,
        ...toast
    }), [showToast, removeToast, toast]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div
                aria-live="polite"
                className="fixed top-4 right-4 left-4 sm:left-auto sm:top-auto sm:bottom-4 sm:right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4"
            >
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            role="alert"
                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-2xl shadow-2xl bg-stone-900/95 backdrop-blur-md border ${BORDER_ACCENTS[t.type] || BORDER_ACCENTS.info}`}
                        >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${STRIP_COLORS[t.type] || STRIP_COLORS.info}`} />
                            {ICONS[t.type] || ICONS.info}
                            <div className="flex-1 text-sm font-normal text-stone-100 leading-snug break-words">
                                {t.message}
                            </div>
                            <button
                                type="button"
                                onClick={() => removeToast(t.id)}
                                className="text-stone-400 hover:text-stone-100 p-0.5 rounded-lg transition-colors shrink-0 cursor-pointer"
                                aria-label="Close notification"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    // Support both const { toast } = useToast() AND const toast = useToast()
    return {
        ...context,
        ...context.toast,
        toast: context.toast
    };
};
