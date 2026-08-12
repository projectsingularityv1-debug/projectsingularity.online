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
    
    // Fetch profile data from 'profiles' table
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
    if (profile) {
        let avatar = profile.avatar_url;
        // If the avatar is the default UI-Avatar or missing, try to use the Discord one
        if (!avatar || avatar.includes("ui-avatars.com") || avatar.includes("null")) {
            avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || avatar;
            
            // Generate a fallback avatar if still nothing
            if (!avatar) {
                avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'User')}&background=000&color=fff`;
            }
        }
        return { ...profile, avatar_url: avatar, email: user.email, uid: user.id };
    }
    
    let fallbackAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    let fallbackUsername = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.username || user.email.split('@')[0];
    
    if (!fallbackAvatar) {
        fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackUsername)}&background=000&color=fff`;
    }

    return { uid: user.id, email: user.email, username: fallbackUsername, avatar_url: fallbackAvatar };
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
