import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
                    icon: <CheckCircle size={20} className="text-white" />,
                    border: 'border-green-400'
                };
            case 'error':
                return {
                    bg: 'bg-gradient-to-r from-red-500 to-rose-600',
                    icon: <AlertCircle size={20} className="text-white" />,
                    border: 'border-red-400'
                };
            case 'info':
                return {
                    bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                    icon: <Info size={20} className="text-white" />,
                    border: 'border-blue-400'
                };
        }
    };

    const styles = getStyles();

    return (
        <div 
            className={`${styles.bg} ${styles.border} border-2 rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md flex items-center gap-3 animate-slide-down`}
            style={{
                animation: 'slideDown 0.3s ease-out'
            }}
        >
            <div className="flex-shrink-0">
                {styles.icon}
            </div>
            <div className="flex-1 text-white font-medium text-sm">
                {message}
            </div>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
}
