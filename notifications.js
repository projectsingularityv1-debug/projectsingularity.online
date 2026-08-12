/**
 * notifications.js — Singularity Notification System
 * Handles: fetch, render, mark-as-read, realtime subscription
 *
 * Usage: import { initNotifications } from './notifications.js';
 *        initNotifications(supabase, userId);
 */

export async function initNotifications(supabase, userId) {
    // ── Inject HTML + CSS ─────────────────────────────────────
    injectStyles();
    const bellWrap = document.getElementById('notifBellWrap');
    if (!bellWrap) return;

    // ── Initial fetch ─────────────────────────────────────────
    await refreshNotifications(supabase, userId);

    // ── Toggle dropdown on bell click ─────────────────────────
    document.getElementById('notifBell').addEventListener('click', async (e) => {
        e.stopPropagation();
        const panel = document.getElementById('notifPanel');
        const isOpen = panel.classList.toggle('open');
        if (isOpen) {
            await refreshNotifications(supabase, userId);
        }
    });

    // ── Close on outside click ────────────────────────────────
    document.addEventListener('click', () => {
        document.getElementById('notifPanel')?.classList.remove('open');
    });

    // ── Mark all read button ──────────────────────────────────
    document.getElementById('notifMarkAll')?.addEventListener('click', async () => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);
        await refreshNotifications(supabase, userId);
    });

    // ── Realtime subscription ─────────────────────────────────
    supabase
        .channel(`notif:${userId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
        }, async (payload) => {
            // Show toast popup
            showToast(payload.new);
            // Refresh panel
            await refreshNotifications(supabase, userId);
        })
        .subscribe();
}

// ── Fetch & render ────────────────────────────────────────────
async function refreshNotifications(supabase, userId) {
    const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    const unread = (notifs || []).filter(n => !n.read).length;
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');

    // Update badge
    if (badge) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }

    // Render list
    if (!list) return;
    if (!notifs || notifs.length === 0) {
        list.innerHTML = `<div class="notif-empty"><i class="ph ph-bell-slash"></i><span>No notifications</span></div>`;
        return;
    }

    list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'} notif-type-${n.type}"
             data-id="${n.id}" data-link="${n.link || ''}">
            <div class="notif-icon">${typeIcon(n.type)}</div>
            <div class="notif-body">
                <div class="notif-title">${escHtml(n.title)}</div>
                ${n.message ? `<div class="notif-msg">${escHtml(n.message)}</div>` : ''}
                <div class="notif-time">${relTime(n.created_at)}</div>
            </div>
            ${!n.read ? '<div class="notif-dot"></div>' : ''}
        </div>
    `).join('');

    // Click to mark read + navigate
    list.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', async () => {
            const id = el.dataset.id;
            const link = el.dataset.link;
            await supabase.from('notifications').update({ read: true }).eq('id', id);
            el.classList.remove('unread');
            el.querySelector('.notif-dot')?.remove();
            const unreadNow = list.querySelectorAll('.unread').length;
            const badge = document.getElementById('notifBadge');
            if (badge) {
                badge.textContent = unreadNow > 9 ? '9+' : unreadNow;
                badge.style.display = unreadNow > 0 ? 'flex' : 'none';
            }
            if (link) window.location.href = link;
        });
    });
}

// ── Toast popup ───────────────────────────────────────────────
function showToast(notif) {
    const toast = document.createElement('div');
    toast.className = `notif-toast notif-type-${notif.type}`;
    toast.innerHTML = `
        <div class="toast-icon">${typeIcon(notif.type)}</div>
        <div class="toast-body">
            <div class="toast-title">${escHtml(notif.title)}</div>
            ${notif.message ? `<div class="toast-msg">${escHtml(notif.message)}</div>` : ''}
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="ph ph-x"></i>
        </button>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// ── Helpers ───────────────────────────────────────────────────
function typeIcon(type) {
    const icons = {
        info: '<i class="ph ph-info"></i>',
        success: '<i class="ph ph-check-circle"></i>',
        warning: '<i class="ph ph-warning"></i>',
        error: '<i class="ph ph-x-circle"></i>'
    };
    return icons[type] || icons.info;
}

function relTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function escHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ── Inject CSS ────────────────────────────────────────────────
function injectStyles() {
    if (document.getElementById('notif-css')) return;
    const style = document.createElement('style');
    style.id = 'notif-css';
    style.textContent = `
        /* Bell wrapper */
        #notifBellWrap {
            position: relative;
        }
        #notifBell {
            position: relative;
        }
        #notifBadge {
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 18px;
            height: 18px;
            padding: 0 4px;
            background: #e53e3e;
            color: #fff;
            font-size: 0.68rem;
            font-weight: 700;
            border-radius: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }

        /* Panel */
        #notifPanel {
            display: none;
            position: absolute;
            top: calc(100% + 12px);
            right: 0;
            width: 340px;
            max-height: 480px;
            background: rgba(10,10,10,0.97);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            overflow: hidden;
            z-index: 9000;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            flex-direction: column;
        }
        #notifPanel.open { display: flex; }

        .notif-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px 10px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0;
        }
        .notif-header h4 {
            font-size: 0.9rem;
            font-weight: 700;
            color: #fff;
        }
        #notifMarkAll {
            font-size: 0.75rem;
            color: rgba(255,255,255,0.45);
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 6px;
            transition: color 0.2s, background 0.2s;
        }
        #notifMarkAll:hover { color: #fff; background: rgba(255,255,255,0.08); }

        #notifList {
            overflow-y: auto;
            flex: 1;
        }
        #notifList::-webkit-scrollbar { width: 4px; }
        #notifList::-webkit-scrollbar-track { background: transparent; }
        #notifList::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }

        .notif-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 40px 20px;
            color: rgba(255,255,255,0.3);
            font-size: 0.85rem;
        }
        .notif-empty i { font-size: 1.8rem; }

        .notif-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            transition: background 0.18s;
            position: relative;
        }
        .notif-item:hover { background: rgba(255,255,255,0.05); }
        .notif-item.unread { background: rgba(255,255,255,0.03); }

        .notif-icon {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            flex-shrink: 0;
        }
        .notif-type-info .notif-icon    { background: rgba(96,165,250,0.15); color: #60a5fa; }
        .notif-type-success .notif-icon { background: rgba(52,211,153,0.15); color: #34d399; }
        .notif-type-warning .notif-icon { background: rgba(251,191,36,0.15);  color: #fbbf24; }
        .notif-type-error .notif-icon   { background: rgba(248,113,113,0.15); color: #f87171; }

        .notif-body { flex: 1; min-width: 0; }
        .notif-title { font-size: 0.84rem; font-weight: 600; color: #fff; margin-bottom: 2px; }
        .notif-msg   { font-size: 0.78rem; color: rgba(255,255,255,0.5); line-height: 1.4; margin-bottom: 4px; }
        .notif-time  { font-size: 0.72rem; color: rgba(255,255,255,0.3); }

        .notif-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #60a5fa;
            flex-shrink: 0;
            margin-top: 4px;
        }

        /* Toast */
        .notif-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 16px;
            background: rgba(15,15,15,0.97);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 14px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
            z-index: 99999;
            max-width: 340px;
            transform: translateY(20px);
            opacity: 0;
            transition: transform 0.35s ease, opacity 0.35s ease;
        }
        .notif-toast.show { transform: translateY(0); opacity: 1; }

        .toast-icon {
            width: 32px; height: 32px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; flex-shrink: 0;
        }
        .notif-type-info .toast-icon    { background: rgba(96,165,250,0.15); color: #60a5fa; }
        .notif-type-success .toast-icon { background: rgba(52,211,153,0.15); color: #34d399; }
        .notif-type-warning .toast-icon { background: rgba(251,191,36,0.15);  color: #fbbf24; }
        .notif-type-error .toast-icon   { background: rgba(248,113,113,0.15); color: #f87171; }

        .toast-body { flex: 1; min-width: 0; }
        .toast-title { font-size: 0.85rem; font-weight: 600; color: #fff; }
        .toast-msg   { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-top: 2px; }

        .toast-close {
            background: none; border: none; cursor: pointer;
            color: rgba(255,255,255,0.4); font-size: 1rem;
            padding: 0; flex-shrink: 0; margin-top: 2px;
            transition: color 0.2s;
        }
        .toast-close:hover { color: #fff; }

        /* ── Mobile Responsive ── */
        @media (max-width: 500px) {
            #notifPanel {
                width: calc(100vw - 32px);
                right: -40px; /* Adjust based on bell position */
                max-height: 400px;
            }
            .notif-toast {
                bottom: 16px;
                right: 16px;
                left: 16px;
                max-width: none;
                width: calc(100vw - 32px);
            }
        }
    `;
    document.head.appendChild(style);
}
