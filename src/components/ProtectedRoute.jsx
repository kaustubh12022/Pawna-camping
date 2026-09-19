import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';

/**
 * Validates whether a JWT token exists, is well-formed, and has not expired.
 * Compares exp claim (seconds) * 1000 against Date.now() (milliseconds).
 *
 * @param {string|null} token - JWT token string
 * @returns {boolean} True if valid and not expired
 */
export const isTokenValid = (token) => {
    if (!token || typeof token !== 'string') return false;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        // URL-safe base64 decoding
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const payload = JSON.parse(jsonPayload);

        if (!payload || typeof payload.exp !== 'number') return false;
        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

/**
 * Declarative route guard component.
 * Validates token presence and expiration before rendering protected children.
 * If invalid or expired, clears localStorage and redirects immediately without flashing protected UI.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Child elements to render if authorized
 * @param {'manager' | 'owner'} [props.allowedRole='manager'] - Required role
 * @param {string} [props.redirectTo] - Custom redirection path
 */
const ProtectedRoute = ({ children, allowedRole = 'manager', redirectTo }) => {
    const location = useLocation();

    const tokenKey = allowedRole === 'owner' ? 'ownerToken' : 'managerToken';
    const defaultRedirect = allowedRole === 'owner' ? '/owner/login' : '/manager/login';
    const targetRedirect = redirectTo || defaultRedirect;

    const token = localStorage.getItem(tokenKey);

    if (!isTokenValid(token)) {
        if (token) {
            localStorage.removeItem(tokenKey);
        }
        return <Navigate to={targetRedirect} state={{ from: location }} replace />;
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
