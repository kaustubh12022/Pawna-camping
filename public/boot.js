// ==========================================
// BOOT SCRIPT
// ==========================================
// Kept as an external file (instead of an inline <script>) so the site can
// enforce a strict Content-Security-Policy without 'unsafe-inline'.
// ==========================================

(function () {
    // ---- PWA standalone redirect (runs before React mounts) ----
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    if (isStandalone && window.location.pathname === '/') {
        var managerToken = null;
        var ownerToken = null;
        try { managerToken = localStorage.getItem('managerToken'); } catch (e) { /* storage blocked */ }
        try { ownerToken = localStorage.getItem('ownerToken'); } catch (e) { /* storage blocked */ }
        if (managerToken) { window.location.replace('/manager'); return; }
        if (ownerToken) { window.location.replace('/owner'); return; }
    }

    // ---- Capture the install prompt for the custom PWA button ----
    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        window.deferredPrompt = event;
    });
})();
