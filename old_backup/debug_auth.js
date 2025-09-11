// Debug script to check authentication state
console.log('=== AUTH DEBUG SCRIPT ===');

// Check localStorage
const user = localStorage.getItem('user');
const token = localStorage.getItem('token');
console.log('localStorage user:', user);
console.log('localStorage token:', token);

// Check DOM elements
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const userName = document.getElementById('user-name');

console.log('DOM elements found:');
console.log('authButtons:', authButtons);
console.log('userMenu:', userMenu);
console.log('loginBtn:', loginBtn);
console.log('registerBtn:', registerBtn);
console.log('userName:', userName);

// Check computed styles
if (authButtons) {
    console.log('authButtons computed style display:', window.getComputedStyle(authButtons).display);
    console.log('authButtons computed style visibility:', window.getComputedStyle(authButtons).visibility);
    console.log('authButtons classList:', authButtons.classList.toString());
}

if (userMenu) {
    console.log('userMenu computed style display:', window.getComputedStyle(userMenu).display);
    console.log('userMenu computed style visibility:', window.getComputedStyle(userMenu).visibility);
    console.log('userMenu classList:', userMenu.classList.toString());
}

// Check body class
console.log('body classList:', document.body.classList.toString());

// Force update auth UI
console.log('=== FORCING AUTH UI UPDATE ===');

if (user && token) {
    console.log('User is logged in, should hide auth buttons');
    
    // Force hide auth buttons
    if (authButtons) {
        authButtons.style.display = 'none';
        authButtons.style.visibility = 'hidden';
        authButtons.style.opacity = '0';
        authButtons.classList.add('hidden');
    }
    
    // Force show user menu
    if (userMenu) {
        userMenu.style.display = 'flex';
        userMenu.style.visibility = 'visible';
        userMenu.style.opacity = '1';
        userMenu.classList.remove('hidden');
    }
    
    // Update user name
    if (userName) {
        try {
            const userObj = JSON.parse(user);
            userName.textContent = userObj.name || userObj.company_name || userObj.contact_person || userObj.email || '사용자님';
        } catch (e) {
            userName.textContent = '사용자님';
        }
    }
    
    // Add body class
    document.body.classList.add('auth-logged-in');
    
    console.log('Auth UI update completed');
} else {
    console.log('User is not logged in, should show auth buttons');
    
    // Force show auth buttons
    if (authButtons) {
        authButtons.style.display = 'flex';
        authButtons.style.visibility = 'visible';
        authButtons.style.opacity = '1';
        authButtons.classList.remove('hidden');
    }
    
    // Force hide user menu
    if (userMenu) {
        userMenu.style.display = 'none';
        userMenu.style.visibility = 'hidden';
        userMenu.style.opacity = '0';
        userMenu.classList.add('hidden');
    }
    
    // Remove body class
    document.body.classList.remove('auth-logged-in');
    
    console.log('Auth UI update completed (logout state)');
}

console.log('=== POST-UPDATE CHECK ===');
if (authButtons) {
    console.log('authButtons final display:', window.getComputedStyle(authButtons).display);
}
if (userMenu) {
    console.log('userMenu final display:', window.getComputedStyle(userMenu).display);
}
console.log('body final classList:', document.body.classList.toString());