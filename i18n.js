const translations = {
    en: {
        "nav.home": "Home",
        "nav.dashboard": "Dashboard",
        "nav.issues": "Issues",
        "nav.profile": "Profile",
        "nav.scripts": "Scripts Hub",
        "nav.key": "My Key",
        "nav.executors": "Executors",
        
        "sidebar.overview": `<i class="ph ph-chart-line-up"></i> Overview`,
        "sidebar.personal_info": `<i class="ph ph-user"></i> Personal Info`,
        "sidebar.security": `<i class="ph ph-lock-key"></i> Security & Login`,
        "sidebar.key_history": `<i class="ph ph-clock-counter-clockwise"></i> Key History`,
        "sidebar.roblox_accounts": `<i class="ph ph-game-controller"></i> Roblox Accounts`,
        
        "overview.title": "Activity Overview",
        "overview.subtitle": "Your activity across all hubs and scripts",
        "overview.stats.keys": "Keys Generated",
        "overview.stats.roblox": "Roblox Linked",
        "overview.stats.scripts": "Scripts Executed",
        "overview.stats.days": "Active Days",
        
        "personal.title": "Personal Information",
        "personal.subtitle": "Manage details connected to your account",
        "personal.username": "Username",
        "personal.email": "Email Address",
        "personal.created": "Account Created",
        "personal.edit": "Edit",
        
        "security.title": "Login & Security",
        "security.subtitle": "Manage your password and connected accounts",
        "security.password": "Password",
        "security.discord": "Discord Account",
        "security.link": "Link Account",
        "security.change": "Change",
        "security.delete_title": "Delete Account",
        "security.delete_desc": "Once you delete your account, there is no going back. Please be certain.",
        "security.delete_btn": "Delete your account",
        
        "keyhistory.title": "Key Usage History",
        "keyhistory.subtitle": "Tracking the 24-hour lifecycle of your recent keys",
        
        "roblox.title": "Roblox Accounts",
        "roblox.subtitle": "Accounts that have executed Singularity Hub scripts",
        "roblox.empty": "No Roblox accounts found.",
        
        "lang.title": "Language Settings",
        "lang.subtitle": "Choose your preferred language for the interface",
        "lang.label": "Website Language",
        
        "modal.cancel": "Cancel",
        "modal.save": "Save Changes"
    },
    th: {
        "nav.home": "หน้าแรก",
        "nav.dashboard": "แดชบอร์ด",
        "nav.issues": "แจ้งปัญหา",
        "nav.profile": "โปรไฟล์",
        "nav.scripts": "สคริปต์ฮับ",
        "nav.key": "คีย์ของฉัน",
        "nav.executors": "ตัวรัน",
        
        "sidebar.overview": `<i class="ph ph-chart-line-up"></i> ภาพรวม`,
        "sidebar.personal_info": `<i class="ph ph-user"></i> ข้อมูลส่วนตัว`,
        "sidebar.security": `<i class="ph ph-lock-key"></i> การเข้าสู่ระบบและความปลอดภัย`,
        "sidebar.key_history": `<i class="ph ph-clock-counter-clockwise"></i> ประวัติคีย์`,
        "sidebar.roblox_accounts": `<i class="ph ph-game-controller"></i> บัญชี Roblox ที่ใช้งาน`,
        
        "overview.title": "ภาพรวมกิจกรรม",
        "overview.subtitle": "กิจกรรมของคุณในทุกสคริปต์และฮับ",
        "overview.stats.keys": "คีย์ที่สร้างทั้งหมด",
        "overview.stats.roblox": "บัญชี Roblox ที่เชื่อมต่อ",
        "overview.stats.scripts": "จำนวนครั้งที่รันสคริปต์",
        "overview.stats.days": "จำนวนวันที่ใช้งาน",
        
        "personal.title": "ข้อมูลส่วนตัว",
        "personal.subtitle": "จัดการรายละเอียดที่เชื่อมกับบัญชีของคุณ",
        "personal.username": "ชื่อผู้ใช้",
        "personal.email": "ที่อยู่อีเมล",
        "personal.created": "สร้างบัญชีเมื่อ",
        "personal.edit": "แก้ไข",
        
        "security.title": "การเข้าสู่ระบบและความปลอดภัย",
        "security.subtitle": "จัดการรหัสผ่านและบัญชีที่เชื่อมต่อ",
        "security.password": "รหัสผ่าน",
        "security.discord": "บัญชี Discord",
        "security.link": "เชื่อมต่อบัญชี",
        "security.change": "เปลี่ยน",
        "security.delete_title": "ลบบัญชี",
        "security.delete_desc": "เมื่อคุณลบบัญชีของคุณ จะไม่สามารถกู้คืนได้ โปรดแน่ใจ",
        "security.delete_btn": "ลบบัญชีของคุณ",
        
        "keyhistory.title": "ประวัติการใช้งานคีย์",
        "keyhistory.subtitle": "ติดตามสถานะ 24 ชั่วโมงของคีย์ล่าสุดของคุณ",
        
        "roblox.title": "บัญชี Roblox ที่ใช้งาน",
        "roblox.subtitle": "บัญชีที่เคยใช้งานสคริปต์ Singularity Hub",
        "roblox.empty": "ยังไม่มีบัญชี Roblox ที่เคยใช้งาน",
        
        "lang.title": "ตั้งค่าภาษา",
        "lang.subtitle": "เลือกภาษาที่ต้องการให้แสดงผลในเว็บไซต์",
        "lang.label": "ภาษาของเว็บไซต์",
        
        "modal.cancel": "ยกเลิก",
        "modal.save": "บันทึก"
    }
};

function setLanguage(lang) {
    if (!translations[lang]) lang = 'th';
    localStorage.setItem('lang', lang);
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            // Note: Use innerHTML to parse any embedded icons/tags
            el.innerHTML = translations[lang][key];
        }
    });
    
    // Dispatch event so other scripts can re-render if needed
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
}

function initI18n() {
    const savedLang = localStorage.getItem('lang') || 'th';
    setLanguage(savedLang);
    
    // Automatically bind any select dropdowns with id="languageSelect"
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = savedLang;
        langSelect.addEventListener('change', (e) => {
            setLanguage(e.target.value);
        });
    }
}

// Run translation initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initI18n);
