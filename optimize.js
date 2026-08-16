const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const oldScript = '<script src="https://unpkg.com/@phosphor-icons/web"></script>';
const newScript = '<script defer src="https://unpkg.com/@phosphor-icons/web"></script>';

const preconnectTags = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;
    
    if (content.includes(oldScript)) {
        content = content.replaceAll(oldScript, newScript);
        changed = true;
    }
    
    // Add preconnect before fonts if not already there
    if (content.includes('<link href="https://fonts.googleapis.com') && !content.includes('rel="preconnect" href="https://fonts.googleapis.com"')) {
        content = content.replace('<link href="https://fonts.googleapis.com', preconnectTags + '\n    <link href="https://fonts.googleapis.com');
        changed = true;
    }
    
    if (content.includes('<link rel="stylesheet" href="https://fonts.googleapis.com') && !content.includes('rel="preconnect" href="https://fonts.googleapis.com"')) {
        content = content.replace('<link rel="stylesheet" href="https://fonts.googleapis.com', preconnectTags + '\n    <link rel="stylesheet" href="https://fonts.googleapis.com');
        changed = true;
    }
    
    if (changed) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Optimized HTML:', f);
    }
});
