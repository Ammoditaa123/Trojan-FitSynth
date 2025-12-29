export function showToast(message, { duration = 3000, variant = 'info', actionText = null, action = null } = {}) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed bottom-4 right-4 flex flex-col items-end gap-3 z-50 p-2';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'max-w-xs w-full bg-white/95 border rounded-lg shadow-md px-4 py-2 text-sm text-gray-800 flex items-center gap-3 transform transition-all duration-300';
    if (variant === 'success') toast.classList.add('border-green-200');
    if (variant === 'error') toast.classList.add('border-red-200');

    toast.style.opacity = '0';

    // build inner content
    const content = document.createElement('div');
    content.className = 'flex-1';
    content.innerText = message;
    toast.appendChild(content);

    if (actionText && typeof action === 'function') {
        const actBtn = document.createElement('button');
        actBtn.className = 'ml-2 text-indigo-600 hover:text-indigo-800 px-3 py-1 rounded bg-indigo-50 text-xs';
        actBtn.innerText = actionText;
        actBtn.addEventListener('click', () => {
            try { action(); } catch (e) { console.error(e); }
            hide();
        });
        toast.appendChild(actBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ml-2 text-gray-500 hover:text-gray-700 close-btn';
    closeBtn.innerText = '✕';
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    // entrance
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });

    const hide = () => {
        toast.style.opacity = '0';
        setTimeout(() => { toast.remove(); }, 300);
    };

    const timeoutId = setTimeout(hide, duration);
    closeBtn.addEventListener('click', () => { clearTimeout(timeoutId); hide(); });

    return {
        dismiss: hide
    };
}

export function confirmModal({ title = 'Confirm', message = '', confirmText = 'Yes', cancelText = 'Cancel' } = {}) {
    return new Promise((resolve) => {
        // prevent multiple modals
        if (document.getElementById('confirmModal')) {
            resolve(false); return;
        }
        const overlay = document.createElement('div');
        overlay.id = 'confirmModal';
        overlay.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4';

        const dialog = document.createElement('div');
        dialog.className = 'bg-white rounded-lg shadow-lg max-w-lg w-full p-6';
        dialog.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">${title}</h3>
            <div class="text-sm text-gray-700 mb-4">${message}</div>
            <div class="flex justify-end gap-2">
              <button id="confirmCancel" class="px-3 py-2 rounded bg-gray-100">${cancelText}</button>
              <button id="confirmOk" class="px-3 py-2 rounded bg-red-600 text-white">${confirmText}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const cleanup = (val) => {
            overlay.remove();
            resolve(val);
        };

        document.getElementById('confirmCancel').focus();
        document.getElementById('confirmCancel').addEventListener('click', () => cleanup(false));
        document.getElementById('confirmOk').addEventListener('click', () => cleanup(true));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
        document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); cleanup(false); } });
    });
}

// Cursor-driven blob parallax (updates CSS vars). Respects reduced motion and pointer type.
(function initBlobParallax() {
    const root = document.documentElement;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Only attach for fine pointers or when touch + explicit pointer movement
    const pointerFine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (prefersReduced) return;

    // target/current states (percent offsets)
    let tgt = { ax: -40, ay: -10, bx: 40, by: 10 };
    let cur = { ax: -40, ay: -10, bx: 40, by: 10 };
    let ticking = false;

    const strengthA = 6; // how much blob A moves with cursor
    const strengthB = 10; // blob B moves slightly more

    function onPointerMove(clientX, clientY) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const nx = (clientX - cx) / cx; // -1..1
        const ny = (clientY - cy) / cy;
        // move blob A slightly opposite direction for depth
        tgt.ax = -40 - (nx * strengthA);
        tgt.ay = -10 - (ny * strengthA);
        // blob B moves with cursor a bit
        tgt.bx = 40 - (nx * strengthB);
        tgt.by = 10 - (ny * strengthB);
        requestTick();
    }

    function onMouse(e) { onPointerMove(e.clientX, e.clientY); }
    function onTouch(e) { if (e.touches && e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY); }

    function requestTick() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }

    function update() {
        // lerp towards targets
        cur.ax += (tgt.ax - cur.ax) * 0.12;
        cur.ay += (tgt.ay - cur.ay) * 0.12;
        cur.bx += (tgt.bx - cur.bx) * 0.12;
        cur.by += (tgt.by - cur.by) * 0.12;

        root.style.setProperty('--blobA-x', `${cur.ax}%`);
        root.style.setProperty('--blobA-y', `${cur.ay}%`);
        root.style.setProperty('--blobB-x', `${cur.bx}%`);
        root.style.setProperty('--blobB-y', `${cur.by}%`);

        // keep animating while not yet at target
        const dx = Math.abs(tgt.ax - cur.ax) + Math.abs(tgt.ay - cur.ay) + Math.abs(tgt.bx - cur.bx) + Math.abs(tgt.by - cur.by);
        if (dx > 0.1) requestAnimationFrame(update);
        else ticking = false;
    }

    // Reset to base when leaving window
    function reset() {
        tgt = { ax: -40, ay: -10, bx: 40, by: 10 };
        requestTick();
    }

    // Attach handlers (both mouse and touch). Only attach mousemove for pointer:fine, but also allow touch.
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('mouseleave', reset);
    window.addEventListener('blur', reset);
})();

// Micro-interactions: staggered entrance and button ripple
(function initMicroInteractions() {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Staggered entrance using IntersectionObserver
    function applyStagger(el) {
        const children = Array.from(el.children);
        children.forEach((child, i) => {
            child.classList.add('animated-entrance');
            // stagger by index
            child.style.animationDelay = `${i * 80}ms`;
        });
        // actually trigger by adding in-view
        setTimeout(() => el.classList.add('in-view'), 10);
    }

    if ('IntersectionObserver' in window && !prefersReduced) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    applyStagger(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        document.querySelectorAll('.staggered').forEach(el => io.observe(el));
    } else {
        // Fallback: apply immediately (or without animation when reduced motion)
        document.querySelectorAll('.staggered').forEach(el => {
            if (prefersReduced) {
                // simply make visible
                el.classList.add('in-view');
                Array.from(el.children).forEach(child => { child.style.opacity = '1'; child.style.transform = 'none'; });
            } else applyStagger(el);
        });
    }

    // Button ripple (delegated)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        if (prefersReduced) return;
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('div');
        ripple.className = 'btn-ripple';
        const x = (e.clientX || (rect.left + rect.width / 2)) - rect.left;
        const y = (e.clientY || (rect.top + rect.height / 2)) - rect.top;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
        // remove after a safe timeout in case animationend not fired
        setTimeout(() => ripple.remove(), 700);
    }, { passive: true });

    // Icon bounce touch-friendly: add class on touchstart for small pop
    document.addEventListener('touchstart', (e) => {
        const ic = e.target.closest('.icon-bounce');
        if (!ic) return;
        ic.classList.add('touched');
        setTimeout(() => ic.classList.remove('touched'), 500);
    }, { passive: true });
})();
