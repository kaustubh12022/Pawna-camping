import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
    return (
        <div className="min-h-screen bg-[var(--listing-bg)] flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-6">
                <h1 className="text-9xl font-bold text-[var(--listing-accent)]/20">404</h1>
                <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--listing-text-primary)]">Page Not Found</h2>
                    <p className="text-[var(--listing-text-secondary)]">The page you are looking for doesn't exist or has been moved.</p>
                </div>
                <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--listing-accent)] text-white rounded-xl font-medium hover:bg-[var(--listing-accent)]/90 transition-colors">
                    <Home className="w-5 h-5" />
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
