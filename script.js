document.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const href = tab.getAttribute('href');
            if (!href || href === '#') {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
            }
        });
    });

    // Ultra-lightweight Starfield Animation
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    let animationFrameId = null;
    let isPageVisible = !document.hidden;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 100);
    });
    resize();
    
    const numStars = 60;
    const stars = [];
    
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() > 0.8 ? 2 : 1,
            vx: Math.random() * 0.3 - 0.15,
            vy: Math.random() * 0.3 - 0.15,
            alpha: Math.random() * 0.7 + 0.3
        });
    }
    
    function animate() {
        if (!isPageVisible) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        
        for (let i = 0; i < numStars; i++) {
            const star = stars[i];
            star.x += star.vx;
            star.y += star.vy;
            
            if (star.x < 0) star.x = canvas.width;
            else if (star.x > canvas.width) star.x = 0;
            if (star.y < 0) star.y = canvas.height;
            else if (star.y > canvas.height) star.y = 0;
            
            ctx.globalAlpha = star.alpha;
            ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size);
        }
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    document.addEventListener('visibilitychange', () => {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            cancelAnimationFrame(animationFrameId);
            animate();
        } else {
            cancelAnimationFrame(animationFrameId);
        }
    });

    animate();
});

// ── Toast Notifications System ─────────────────────────────────
window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ph-info';
    if (type === 'success') icon = 'ph-check-circle';
    if (type === 'error') icon = 'ph-warning-circle';

    toast.innerHTML = `<i class="ph ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300); // Wait for transition
    }, 3000);
};
