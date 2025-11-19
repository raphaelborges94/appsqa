import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationTracker() {
    const location = useLocation();

    // Post navigation changes to parent window
    useEffect(() => {
        window.parent?.postMessage({
            type: "app_changed_url",
            url: window.location.href
        }, '*');
    }, [location]);

    // Log navigation for debugging (optional)
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('📍 Navegou para:', location.pathname);
        }
    }, [location]);

    return null;
}