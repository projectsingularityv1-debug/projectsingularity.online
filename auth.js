// ============================================================
//  SINGULARITY — Auth Helper (Supabase)
// ============================================================

import { supabase } from "./supabase-config.js";

// ── Register ─────────────────────────────────────────────────
export async function register(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username,
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=000&color=fff`
            }
        }
    });
    if (error) throw error;
    return data;
}

export async function loginWithDiscord() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: window.location.origin + '/index.html'
        }
    });
    if (error) throw error;
    return data;
}

// ── Login ─────────────────────────────────────────────────────
export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data.user;
}

// ── Logout ────────────────────────────────────────────────────
export async function logout() {
    await supabase.auth.signOut();
    window.location.href = "login.html";
}

// ── Get Current User Profile ──────────────────────────────────
export async function getCurrentUserProfile() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Derive sensible fallbacks from auth.user directly
    const authEmail = user.email || '';
    const authUsername = user.user_metadata?.username
        || user.user_metadata?.full_name
        || user.user_metadata?.name
        || authEmail.split('@')[0]
        || 'User';
    const authAvatar = user.user_metadata?.avatar_url
        || user.user_metadata?.picture
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUsername)}&background=1a1a2e&color=ff8000&bold=true`;

    // Fetch profile data from 'profiles' table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.warn('[Auth] profiles fetch error:', profileError.message);
    }

    // If profile row exists, merge with auth data (auth data wins for email)
    if (profile) {
        let avatar = profile.avatar_url;
        // Fall back to auth avatar if profile avatar is missing or a ui-avatars placeholder
        if (!avatar || avatar.includes('ui-avatars.com') || avatar === 'null') {
            avatar = authAvatar;
        }
        return {
            ...profile,
            avatar_url: avatar,
            email: authEmail,          // always use auth email (most reliable)
            username: profile.username || authUsername,
            uid: user.id,
        };
    }

    // No profile row — use auth data only
    return {
        uid: user.id,
        email: authEmail,
        username: authUsername,
        avatar_url: authAvatar,
        country: 'ยังตรวจไม่พบ',
        language: 'ไทย',
        created_at: user.created_at,
    };
}

// ── Password Reset ──────────────────────────────────────────────
export async function resetPasswordForEmail(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
    });
    if (error) throw error;
    return data;
}

export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
}

// ── Guard: Redirect if not logged in ─────────────────────────
export async function requireAuth(redirectTo = "login.html") {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = redirectTo;
        throw new Error("Not authenticated");
    }
    return session.user;
}
