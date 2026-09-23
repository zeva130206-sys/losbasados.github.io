// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAdTk5ODylCJ13iifDlYcNGqNk84clxghQ",
    authDomain: "los-basados.firebaseapp.com",
    databaseURL: "https://los-basados-default-rtdb.firebaseio.com",
    projectId: "los-basados",
    storageBucket: "los-basados.firebasestorage.app",
    messagingSenderId: "669430555076",
    appId: "1:669430555076:web:6ca4e4ea23fdfbb8344491",
    measurementId: "G-3EF05XGSY1"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const messagesRef = db.ref('chat_messages');
const onlineUsersRef = db.ref('online_users');
const usersRef = db.ref('users');
const gamesRef = db.ref('games');
const newsRef = db.ref('news');
const genresRef = db.ref('genres');
const commentsRef = db.ref('comments');
const reportsRef = db.ref('reports');
const requestsRef = db.ref('game_requests');
const socialRef = db.ref('social_links');
const userScreenshotsRef = db.ref('screenshots');
const friendsRef = db.ref('user_friends');
const privateChatRef = db.ref('private_messages');

// IMAGEN POR DEFECTO PARA FALLBACKS
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x225/0f0f14/ff003c?text=Imagen+No+Disponible';

// PROTECCIÓN ANTI-INSPECCIÓN / CTRL+U / F12
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
    if (
        e.key === 'F12' ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'))
    ) {
        e.preventDefault();
    }
});

// AUDIO SYNTHWAVE / LO-FI DE FONDO
const bgAudio = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3');
bgAudio.loop = true;
bgAudio.volume = 0.2;
let isAudioPlaying = false;

// EFECTO DE SONIDO POP AL HACER CLICK
function playClickSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
}

// DATOS BASE INICIALES
const defaultGames = [
    {
        id: "default-1",
        title: "Mario Kart Wii (PC Port)",
        category: ["Carreras", "Pantalla Compartida", "Windows"],
        size: "2.9 GB",
        server: "MediaFire",
        image: "assets/img/MarioKartWii.png",
        downloadUrl: "https://ouo.io/gx2F6LP",
        versions: [
            { name: "Versión Portable v1.0", downloadUrl: "https://ouo.io/gx2F6LP", server: "MediaFire" },
            { name: "Versión HD Modpack", downloadUrl: "https://ouo.io/gx2F6LP", server: "MediaFire" }
        ],
        fixOnlineServer: "",
        fixOnlineUrl: "",
        featured: true,
        ageRestricted: false,
        onlineStatus: "online",
        gamepadStatus: true,
        downloadsCount: 154,
        specs: {
            so: "Windows 7 / 8 / 10 / 11 (64-bits)",
            cpu: "Intel Core i3 / AMD FX equivalente",
            ram: "4 GB RAM",
            gpu: "Intel HD 4000 / Nvidia GT 710"
        },
        desc: "El clásico juego de carreras totalmente adaptado para PC.",
        embed: ""
    }
];

const defaultGenres = ["Carreras", "Acción", "Supervivencia", "Retro", "Android", "Windows", "ISO", "Pantalla Compartida"];

const defaultNews = [
    { id: "news-1", title: "Actualización v2.1 de LOS BASADOS", date: "15 SEPT, 2026", content: "Añadidos contadores de descargas, reporte de links caídos, filtros de mando/online y creador de peticiones." },
    { id: "news-2", title: "Nuevos Ports Optimizados", date: "12 SEPT, 2026", content: "Optimizando los instaladores para que corran en PC y móviles de gama baja/media." }
];

const defaultSocialLinks = {
    discord: "https://discord.gg",
    telegram: "https://t.me",
    youtube: "https://youtube.com",
    instagram: "https://instagram.com",
    tiktok: "https://tiktok.com"
};

// ESTADO GLOBAL
let currentUser = JSON.parse(localStorage.getItem('basados_user')) || null;
let favorites = JSON.parse(localStorage.getItem('basados_favs')) || [];
let loadedGames = [];
let loadedGenres = [];
let loadedNews = [];
let loadedReports = [];
let loadedRequests = [];
let loadedSocialLinks = defaultSocialLinks;
let currentOnlineList = [];
let loadedScreenshots = {};
let loadedFriendsData = {};
let activeProfileViewName = "";
let activePrivateChatPartner = null;
let privateChatListener = null;
let myUserRef = null;
let currentDeviceInfo = { type: 'pc', os: 'windows' };

let selectedRating = 5;
let currentActiveGameCommentsRef = null;

let carouselIndex = 0;
let carouselTimer = null;

const MODERATOR_EMAILS = [
    "esva@losbasados.com",
    "jesuslazarinos0@gmail.com",
    "cargoso@gmail.com"
];

// ELEMENTOS DOM
const gamesGrid = document.getElementById('gamesGrid');
const searchInput = document.getElementById('searchInput');
const btnAuth = document.getElementById('btnAuth');
const userBtnText = document.getElementById('userBtnText');
const userAvatarNav = document.getElementById('userAvatarNav');
const btnAdminPanel = document.getElementById('btnAdminPanel');

// DETECTOR DE DISPOSITIVOS
function detectDevice() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const width = window.innerWidth;
    
    let type = 'pc';
    let os = 'unknown';
    let iconClass = 'fa-desktop';
    let textLabel = 'PC / Windows';

    if (/android/i.test(ua)) os = 'android';
    else if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) os = 'ios';
    else if (/Win/i.test(ua)) os = 'windows';
    else if (/Mac/i.test(ua)) os = 'mac';
    else if (/Linux/i.test(ua)) os = 'linux';

    const isTabletUA = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua);
    
    if (isTabletUA || (width >= 600 && width <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0))) {
        type = 'tablet';
        iconClass = 'fa-tablet-alt';
        textLabel = os === 'android' ? 'Tablet Android' : (os === 'ios' ? 'iPad OS' : 'Tablet');
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua) || width < 600) {
        type = 'mobile';
        iconClass = 'fa-mobile-alt';
        textLabel = os === 'android' ? 'Android Mobile' : (os === 'ios' ? 'iPhone / iOS' : 'Smartphone');
    } else {
        type = 'pc';
        iconClass = 'fa-desktop';
        textLabel = os === 'windows' ? 'PC Windows' : 'Escritorio';
    }

    currentDeviceInfo = { type, os, label: textLabel, icon: iconClass };

    document.body.classList.remove('device-pc', 'device-mobile', 'device-tablet', 'os-android', 'os-ios');
    document.body.classList.add(`device-${type}`, `os-${os}`);

    const deviceBadge = document.getElementById('deviceBadge');
    const deviceIcon = document.getElementById('deviceIcon');
    const deviceText = document.getElementById('deviceText');

    if (deviceBadge && deviceIcon && deviceText) {
        deviceIcon.className = `fas ${iconClass}`;
        deviceText.textContent = textLabel;
    }
}

// FORMATO DE GÉNEROS
function formatGameGenres(category) {
    if (!category) return "General";
    
    let genresArr = [];
    if (Array.isArray(category)) {
        genresArr = category;
    } else if (typeof category === 'string') {
        genresArr = category.split(',').map(s => s.trim());
    }

    if (genresArr.length === 0) return "General";
    if (genresArr.length === 1) return genresArr[0];
    if (genresArr.length === 2) return `${genresArr[0]}, ${genresArr[1]}`;
    return `${genresArr[0]}, ${genresArr[1]}, más...`;
}

// CALCULAR EDAD
function calculateAgeInfo(birthdateString) {
    if (!birthdateString) return { age: 0, isAdult: false, label: "Edad no registrada" };
    
    const birthDate = new Date(birthdateString);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    const isAdult = age >= 18;
    return {
        age: age,
        isAdult: isAdult,
        label: isAdult ? `Mayor de edad (${age} años)` : `Menor de edad (${age} años)`
    };
}

document.addEventListener('DOMContentLoaded', () => {
    detectDevice();
    window.addEventListener('resize', detectDevice);
    updateUserUI();
    setupEventListeners();
    initRealtimeFirebase();
    updateTwitchEmbedParentDomain();
    setupFilterToggle();
    setupAudioToggle();

    document.addEventListener('click', (e) => {
        if (e.target.closest('button, .cat-btn, .game-card, .social-btn')) {
            playClickSound();
        }
    });
});

// REPRODUCTOR AUDIO
function setupAudioToggle() {
    const btnAudio = document.getElementById('btnToggleAudio');
    if (!btnAudio) return;

    btnAudio.addEventListener('click', () => {
        if (isAudioPlaying) {
            bgAudio.pause();
            btnAudio.classList.remove('playing');
            isAudioPlaying = false;
        } else {
            bgAudio.play().then(() => {
                btnAudio.classList.add('playing');
                isAudioPlaying = true;
            }).catch(() => {});
        }
    });
}

// EMBED TWITCH DOMINIO
function updateTwitchEmbedParentDomain() {
    const twitchIframe = document.querySelector('.twitch-player-container iframe');
    if (twitchIframe) {
        const currentHost = window.location.hostname || 'localhost';
        twitchIframe.src = `https://player.twitch.tv/?channel=vaze_z06&parent=${currentHost}&parent=localhost&parent=127.0.0.1&muted=true`;
    }
}

// FIREBASE EN TIEMPO REAL
function initRealtimeFirebase() {
    // 1. Juegos
    gamesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            loadedGames = Object.values(data);
        } else {
            defaultGames.forEach(g => gamesRef.child(g.id).set(g));
            loadedGames = defaultGames;
        }
        applySorting();
        renderHeroCarousel(loadedGames);
        renderAdminGamesList();
    });

    // 2. Categorías
    genresRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            loadedGenres = Object.values(data);
        } else {
            defaultGenres.forEach(g => genresRef.child(g).set({ name: g }));
            loadedGenres = defaultGenres.map(g => ({ name: g }));
        }
        renderCategoriesBar();
        renderAdminGenres();
        populateFilterDropdowns();
    });

    // 3. Noticias
    newsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            loadedNews = Object.values(data);
        } else {
            defaultNews.forEach(n => newsRef.child(n.id).set(n));
            loadedNews = defaultNews;
        }
        renderNews();
        renderAdminNews();
    });

    // 4. Redes Sociales
    socialRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            loadedSocialLinks = data;
        } else {
            socialRef.set(defaultSocialLinks);
            loadedSocialLinks = defaultSocialLinks;
        }
        renderCommunitySocialGrid();
        populateAdminSocialForm();
    });

    // 5. Capturas de Pantalla
    userScreenshotsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        loadedScreenshots = data || {};
        if (activeProfileViewName) {
            renderUserScreenshots(activeProfileViewName);
        }
    });

    // 6. Amigos
    friendsRef.on('value', (snapshot) => {
        loadedFriendsData = snapshot.val() || {};
        if (activeProfileViewName) {
            renderFriendsList(activeProfileViewName);
        }
    });

    // 7. Reportes de Enlaces
    reportsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        loadedReports = data ? Object.values(data) : [];
        const badge = document.getElementById('reportsBadgeCount');
        if (badge) badge.textContent = loadedReports.length;
        renderAdminReports();
    });

    // 8. Peticiones de Juegos
    requestsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        loadedRequests = data ? Object.values(data) : [];
        renderGameRequests();
    });

    // 9. Chat
    messagesRef.limitToLast(50).on('value', (snapshot) => {
        const data = snapshot.val();
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';

        if (data) {
            Object.values(data).forEach(msg => {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'chat-msg';

                const imageUrlPattern = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)(?:\?.*)?|https?:\/\/cdn\.discordapp\.com\/attachments\/[^\s]+|https?:\/\/media\.discordapp\.net\/attachments\/[^\s]+)/i;
                let formattedText = msg.text;

                if (imageUrlPattern.test(msg.text)) {
                    formattedText = msg.text.replace(imageUrlPattern, (url) => {
                        return `<br><img src="${url}" class="chat-msg-img" onclick="openImageModal('${url}')" title="Ampliar imagen" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';">`;
                    });
                }

                msgDiv.innerHTML = `
                    <img src="${msg.avatar}" alt="${msg.author}" onclick="openPublicProfile('${msg.author}', '${msg.avatar}')" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Guest';">
                    <div class="chat-msg-content">
                        <span class="chat-author" onclick="openPublicProfile('${msg.author}', '${msg.avatar}')">${msg.author}</span>
                        <p class="chat-text">${formattedText}</p>
                    </div>
                `;
                chatMessages.appendChild(msgDiv);
            });
            setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
        }
    });

    // 10. Presencia en Vivo
    myUserRef = onlineUsersRef.push();
    myUserRef.onDisconnect().remove();
    updateFirebasePresence();

    onlineUsersRef.on('value', (snapshot) => {
        const data = snapshot.val();
        currentOnlineList = data ? Object.values(data) : [];
        const total = currentOnlineList.length;
        document.getElementById('onlineCount').textContent = total;
        document.getElementById('onlineCountModal').textContent = total;
        renderOnlineUsersSidebar();
    });
}

function renderCommunitySocialGrid() {
    const grid = document.getElementById('communitySocialGrid');
    if (!grid) return;
    grid.innerHTML = `
        <a href="${loadedSocialLinks.discord || '#'}" target="_blank" class="social-btn discord-btn"><i class="fab fa-discord"></i> Discord</a>
        <a href="${loadedSocialLinks.telegram || '#'}" target="_blank" class="social-btn telegram-btn"><i class="fab fa-telegram"></i> Telegram</a>
        <a href="${loadedSocialLinks.youtube || '#'}" target="_blank" class="social-btn youtube-btn"><i class="fab fa-youtube"></i> YouTube</a>
        <a href="${loadedSocialLinks.instagram || '#'}" target="_blank" class="social-btn instagram-btn"><i class="fab fa-instagram"></i> Instagram</a>
        <a href="${loadedSocialLinks.tiktok || '#'}" target="_blank" class="social-btn tiktok-btn"><i class="fab fa-tiktok"></i> TikTok</a>
    `;
}

function populateAdminSocialForm() {
    document.getElementById('adminLinkDiscord').value = loadedSocialLinks.discord || '';
    document.getElementById('adminLinkTelegram').value = loadedSocialLinks.telegram || '';
    document.getElementById('adminLinkYoutube').value = loadedSocialLinks.youtube || '';
    document.getElementById('adminLinkInstagram').value = loadedSocialLinks.instagram || '';
    document.getElementById('adminLinkTiktok').value = loadedSocialLinks.tiktok || '';
}

document.getElementById('formAdminSocial').addEventListener('submit', (e) => {
    e.preventDefault();
    const updatedSocial = {
        discord: document.getElementById('adminLinkDiscord').value.trim(),
        telegram: document.getElementById('adminLinkTelegram').value.trim(),
        youtube: document.getElementById('adminLinkYoutube').value.trim(),
        instagram: document.getElementById('adminLinkInstagram').value.trim(),
        tiktok: document.getElementById('adminLinkTiktok').value.trim()
    };

    socialRef.set(updatedSocial, (err) => {
        if (!err) alert("✅ Redes Sociales actualizadas en tiempo real.");
    });
});

// PERFIL PÚBLICO & SISTEMA DE RED SOCIAL / AMIGOS / CAPTURAS
window.openPublicProfile = function(name, avatar) {
    activeProfileViewName = name;
    document.getElementById('publicName').textContent = name;
    document.getElementById('publicAvatarImg').src = avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest';

    const postBox = document.getElementById('postScreenshotBox');
    const btnEdit = document.getElementById('btnEditProfileSettings');
    const btnAdd = document.getElementById('btnAddFriend');
    const btnDM = document.getElementById('btnOpenPrivateChat');

    if (currentUser && currentUser.name === name) {
        postBox.classList.remove('hidden');
        btnEdit.classList.remove('hidden');
        btnAdd.classList.add('hidden');
        btnDM.classList.add('hidden');
    } else {
        postBox.classList.add('hidden');
        btnEdit.classList.add('hidden');
        if (currentUser) {
            btnAdd.classList.remove('hidden');
            btnDM.classList.remove('hidden');
            
            const isFriend = loadedFriendsData[currentUser.name] && loadedFriendsData[currentUser.name][name];
            btnAdd.innerHTML = isFriend ? '<i class="fas fa-user-check"></i> Amigos' : '<i class="fas fa-user-plus"></i> Añadir Amigo';
        } else {
            btnAdd.classList.add('hidden');
            btnDM.classList.add('hidden');
        }
    }

    switchSocialProfileTab('screenshots');
    renderUserScreenshots(name);
    renderFriendsList(name);
    document.getElementById('publicProfileModal').classList.add('active');
};

window.toggleAddFriend = function() {
    if (!currentUser || !activeProfileViewName) return;
    const isFriend = loadedFriendsData[currentUser.name] && loadedFriendsData[currentUser.name][activeProfileViewName];

    if (isFriend) {
        friendsRef.child(currentUser.name).child(activeProfileViewName).remove();
        friendsRef.child(activeProfileViewName).child(currentUser.name).remove();
    } else {
        friendsRef.child(currentUser.name).child(activeProfileViewName).set({ name: activeProfileViewName, timestamp: Date.now() });
        friendsRef.child(activeProfileViewName).child(currentUser.name).set({ name: currentUser.name, timestamp: Date.now() });
    }
};

window.switchSocialProfileTab = function(tab) {
    const btnShots = document.getElementById('btnTabScreenshots');
    const btnFriends = document.getElementById('btnTabFriends');
    const contentShots = document.getElementById('socialScreenshotsContent');
    const contentFriends = document.getElementById('socialFriendsContent');

    if (tab === 'screenshots') {
        btnShots.classList.add('active'); btnFriends.classList.remove('active');
        contentShots.classList.remove('hidden'); contentFriends.classList.add('hidden');
    } else {
        btnFriends.classList.add('active'); btnShots.classList.remove('active');
        contentFriends.classList.remove('hidden'); contentShots.classList.add('hidden');
    }
};

function renderUserScreenshots(username) {
    const feed = document.getElementById('screenshotsFeedGrid');
    if (!feed) return;

    const userShots = loadedScreenshots[username] ? Object.values(loadedScreenshots[username]) : [];

    if (userShots.length === 0) {
        feed.innerHTML = '<p style="color:#aaa; font-size:0.85rem; grid-column:1/-1;">Aún no ha subido publicaciones.</p>';
        return;
    }

    feed.innerHTML = userShots.reverse().map(s => `
        <div class="shot-card-item">
            <div class="shot-card-info">
                <strong>${s.title}</strong>
            </div>
            ${s.imageUrl ? `<img src="${s.imageUrl}" onclick="openImageModal('${s.imageUrl}')" title="Ampliar captura">` : ''}
        </div>
    `).join('');
}

function renderFriendsList(username) {
    const container = document.getElementById('friendsListContainer');
    const countBadge = document.getElementById('profileFriendsCount');
    if (!container) return;

    const userFriends = loadedFriendsData[username] ? Object.keys(loadedFriendsData[username]) : [];
    if (countBadge) countBadge.textContent = userFriends.length;

    if (userFriends.length === 0) {
        container.innerHTML = '<p style="color:#aaa; font-size:0.85rem;">No hay amigos añadidos.</p>';
        return;
    }

    container.innerHTML = userFriends.map(friendName => `
        <div class="friend-item-row">
            <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="openPublicProfile('${friendName}', '')">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${friendName}">
                <strong style="color:#fff; font-size:0.9rem;">${friendName}</strong>
            </div>
            ${currentUser ? `<button class="btn-secondary btn-sm" onclick="openPrivateChatWith('${friendName}')"><i class="fas fa-comment"></i> Chat</button>` : ''}
        </div>
    `).join('');
}

// MENSAJES PRIVADOS DMs
window.openPrivateChatFromProfile = function() {
    if (activeProfileViewName) openPrivateChatWith(activeProfileViewName);
};

window.openPrivateChatWith = function(targetName) {
    if (!currentUser) return;
    activePrivateChatPartner = targetName;

    document.getElementById('privateChatTargetName').textContent = targetName;
    document.getElementById('privateChatTargetAvatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${targetName}`;

    const chatId = [currentUser.name, targetName].sort().join('_CHAT_');

    if (privateChatListener) privateChatListener.off();
    privateChatListener = privateChatRef.child(chatId);

    privateChatListener.on('value', (snapshot) => {
        const data = snapshot.val();
        const container = document.getElementById('privateChatMessages');
        container.innerHTML = '';

        if (data) {
            Object.values(data).forEach(msg => {
                const isMine = msg.sender === currentUser.name;
                const msgDiv = document.createElement('div');
                msgDiv.className = 'chat-msg';
                msgDiv.style.justifyContent = isMine ? 'flex-end' : 'flex-start';
                msgDiv.innerHTML = `
                    <div class="chat-msg-content" style="${isMine ? 'background:#800020; border-color:var(--neon-red);' : ''}">
                        <span class="chat-author" style="color:${isMine ? '#ff4444' : '#00ff80'};">${msg.sender}</span>
                        <p class="chat-text">${msg.text}</p>
                    </div>
                `;
                container.appendChild(msgDiv);
            });
            setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
        }
    });

    document.getElementById('privateChatModal').classList.add('active');
};

document.getElementById('closePrivateChatModal').addEventListener('click', () => {
    document.getElementById('privateChatModal').classList.remove('active');
    if (privateChatListener) privateChatListener.off();
});

document.getElementById('formPrivateChat').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser || !activePrivateChatPartner) return;

    const input = document.getElementById('privateChatInput');
    const text = input.value.trim();
    if (!text) return;

    const chatId = [currentUser.name, activePrivateChatPartner].sort().join('_CHAT_');
    privateChatRef.child(chatId).push({
        sender: currentUser.name,
        text: text,
        timestamp: Date.now()
    });

    input.value = '';
});

// SUBIR CAPTURA CON COMPRESIÓN EN CANVAS
document.getElementById('formPostScreenshot').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById('shotTitle').value.trim();
    const fileInput = document.getElementById('shotFileInput');
    const file = fileInput.files[0];

    const savePost = (imgUrl = '') => {
        userScreenshotsRef.child(currentUser.name).push({
            title: title,
            imageUrl: imgUrl,
            timestamp: Date.now()
        }, (err) => {
            if (!err) {
                alert("📸 Publicación enviada con éxito.");
                document.getElementById('shotTitle').value = '';
                fileInput.value = '';
            }
        });
    };

    if (file) {
        if (file.size > 1024 * 1024) {
            alert("⚠️ La foto no debe superar 1 MB de peso.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxWidth = 1280;
                const maxHeight = 720;

                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                savePost(compressedBase64);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        savePost('');
    }
});

document.getElementById('closePublicProfileModal').addEventListener('click', () => {
    document.getElementById('publicProfileModal').classList.remove('active');
});

// REPORTAR ENLACE CAÍDO
window.reportGameLink = function(gameId, gameTitle) {
    if (confirm(`¿Quieres reportar el enlace de "${gameTitle}" como caído o dañado?`)) {
        reportsRef.push({
            gameId,
            gameTitle,
            reportedBy: currentUser ? currentUser.name : "Invitado",
            timestamp: Date.now()
        }, (err) => {
            if (!err) alert("✅ Gracias. El reporte ha sido enviado a los moderadores.");
        });
    }
};

function renderAdminReports() {
    const container = document.getElementById('adminReportsList');
    if (!container) return;
    if (loadedReports.length === 0) {
        container.innerHTML = '<p style="color:#aaa; font-size:0.85rem;">No hay enlaces caídos reportados actualmente.</p>';
        return;
    }

    container.innerHTML = loadedReports.map(r => `
        <div class="admin-list-item">
            <div>
                <strong style="color:var(--neon-red);">${r.gameTitle}</strong>
                <small style="color:#aaa; display:block;">Reportado por: ${r.reportedBy}</small>
            </div>
            <button class="btn-secondary btn-sm" onclick="openAdminEditModal(event, '${r.gameId}')">🔧 Resolver / Editar</button>
        </div>
    `).join('');
}

// PESTAÑAS DEL MODAL FORO / COMUNIDAD
window.switchForumTab = function(tab) {
    const btnChat = document.getElementById('btnTabChat');
    const btnReq = document.getElementById('btnTabRequests');
    const chatContent = document.getElementById('forumChatContent');
    const reqContent = document.getElementById('forumRequestsContent');

    if (tab === 'chat') {
        btnChat.classList.add('active'); btnReq.classList.remove('active');
        chatContent.classList.remove('hidden'); reqContent.classList.add('hidden');
    } else {
        btnReq.classList.add('active'); btnChat.classList.remove('active');
        reqContent.classList.remove('hidden'); chatContent.classList.add('hidden');
    }
};

// PETICIONES DE JUEGOS
document.getElementById('formGameRequest').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('reqGameTitle').value.trim();
    const platform = document.getElementById('reqPlatform').value;
    if (!title) return;

    requestsRef.push({
        title,
        platform,
        requestedBy: currentUser ? currentUser.name : "Invitado",
        timestamp: Date.now()
    }, (err) => {
        if (!err) {
            document.getElementById('reqGameTitle').value = '';
        }
    });
});

function renderGameRequests() {
    const container = document.getElementById('requestsContainer');
    if (!container) return;
    if (loadedRequests.length === 0) {
        container.innerHTML = '<p style="color:#aaa; font-size:0.85rem;">No hay peticiones aún. Sé el primero.</p>';
        return;
    }

    container.innerHTML = loadedRequests.map(r => `
        <div class="request-card-item">
            <div>
                <strong>${r.title}</strong>
                <small style="color:#00a2ff; display:block;">[${r.platform}] - Pedido por ${r.requestedBy}</small>
            </div>
            <span style="font-size:0.75rem; color:#888;"><i class="fas fa-clock"></i> Pendiente</span>
        </div>
    `).join('');
}

// ORDENAR JUEGOS
window.applySorting = function() {
    const sortVal = document.getElementById('sortSelect').value;
    let sorted = [...loadedGames];

    if (sortVal === 'downloads') {
        sorted.sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0));
    } else if (sortVal === 'rating') {
        sorted.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    }

    renderGames(sorted);
};

// CONTADOR DE DESCARGAS
window.trackDownload = function(gameId) {
    const game = loadedGames.find(g => g.id === gameId);
    if (!game) return;
    const newCount = (game.downloadsCount || 0) + 1;
    gamesRef.child(gameId).update({ downloadsCount: newCount });
};

// LIGHTBOX
window.openImageModal = function(url) {
    let lightbox = document.getElementById('imageLightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'imageLightbox';
        lightbox.className = 'image-lightbox';
        lightbox.innerHTML = `
            <div class="image-lightbox-content">
                <button class="image-lightbox-close" onclick="closeImageModal()">&times;</button>
                <img id="lightboxImg" src="" alt="Vista previa">
            </div>
        `;
        document.body.appendChild(lightbox);
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeImageModal(); });
    }
    document.getElementById('lightboxImg').src = url;
    lightbox.classList.add('active');
};

window.closeImageModal = function() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) lightbox.classList.remove('active');
};

function updateFirebasePresence() {
    if (!myUserRef) return;
    const name = currentUser ? currentUser.name : "Invitado Basado";
    const avatar = currentUser ? currentUser.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=Guest";
    const devType = currentDeviceInfo.type.toUpperCase();
    myUserRef.set({ name, avatar, device: devType });
}

function renderOnlineUsersSidebar() {
    const usersList = document.getElementById('onlineUsersList');
    if (!usersList) return;
    usersList.innerHTML = '';
    currentOnlineList.forEach(u => {
        const li = document.createElement('li');
        const devTag = u.device ? `<small style="font-size:0.7rem; color:#888;">[${u.device}]</small>` : '';
        li.innerHTML = `<img src="${u.avatar}" alt="${u.name}" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Guest';"> <span>${u.name} ${devTag}</span>`;
        li.onclick = () => openPublicProfile(u.name, u.avatar);
        usersList.appendChild(li);
    });
}

// CARRUSEL DESTACADOS
function renderHeroCarousel(games) {
    const featuredGames = games.filter(g => g.featured);
    const container = document.getElementById('heroCarousel');
    
    if (!featuredGames.length) {
        container.innerHTML = `
            <div class="carousel-slide active" style="background-image: url('assets/img/MarioKartWii.png');">
                <div class="hero-content">
                    <span class="badge">DESTACADO DE LA SEMANA</span>
                    <h2>MARIO KART WII (PC PORT)</h2>
                    <p>El clásico de Wii directo en tu PC con gráficos mejorados.</p>
                    <button class="btn-primary" onclick="openGameModal('default-1')"><i class="fas fa-download"></i> DESCARGAR AHORA</button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = featuredGames.map((game, i) => `
        <div class="carousel-slide ${i === 0 ? 'active' : ''}" style="background-image: url('${game.image}');">
            <div class="hero-content">
                <span class="badge">DESTACADO DE LA SEMANA</span>
                <h2>${game.title.toUpperCase()} ${game.ageRestricted ? '<span class="badge-18-tag">+18</span>' : ''}</h2>
                <p>${game.desc}</p>
                <button class="btn-primary" onclick="openGameModal('${game.id}')">
                    <i class="fas fa-download"></i> DESCARGAR AHORA
                </button>
            </div>
        </div>
    `).join('');

    clearInterval(carouselTimer);
    carouselIndex = 0;
    if (featuredGames.length > 1) {
        carouselTimer = setInterval(() => {
            const slides = document.querySelectorAll('.carousel-slide');
            if (!slides.length) return;
            slides[carouselIndex].classList.remove('active');
            carouselIndex = (carouselIndex + 1) % slides.length;
            slides[carouselIndex].classList.add('active');
        }, 5000);
    }
}

// CATEGORÍAS
function renderCategoriesBar() {
    const bar = document.getElementById('categoriesBar');
    const select = document.getElementById('adminCategory');
    
    bar.innerHTML = `<button class="cat-btn active" data-cat="all">Todos</button>`;
    select.innerHTML = '';

    let retroIndex = loadedGenres.findIndex(g => g.name.toLowerCase() === 'retro');
    let displayedGenres = retroIndex !== -1 ? loadedGenres.slice(0, retroIndex + 1) : loadedGenres.slice(0, 4);

    displayedGenres.forEach(g => {
        bar.innerHTML += `<button class="cat-btn" data-cat="${g.name}">${g.name}</button>`;
    });

    loadedGenres.forEach(g => {
        select.innerHTML += `<option value="${g.name}">${g.name}</option>`;
    });

    bar.innerHTML += `<button class="cat-btn" data-cat="favs"><i class="fas fa-heart"></i> Favoritos</button>`;
    setupCategoryEvents();
}

function setupCategoryEvents() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const cat = e.target.dataset.cat;
            if (cat === 'all') {
                renderGames(loadedGames);
            } else if (cat === 'favs') {
                renderGames(loadedGames.filter(g => favorites.includes(g.id)));
            } else {
                renderGames(loadedGames.filter(g => {
                    return Array.isArray(g.category) ? g.category.includes(cat) : g.category === cat;
                }));
            }
        });
    });
}

function setupFilterToggle() {
    const btnToggleFilter = document.getElementById('btnToggleFilter');
    const filterMenu = document.getElementById('filterDropdownMenu');

    if (btnToggleFilter && filterMenu) {
        btnToggleFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            btnToggleFilter.classList.toggle('active');
            filterMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!filterMenu.contains(e.target) && !btnToggleFilter.contains(e.target)) {
                btnToggleFilter.classList.remove('active');
                filterMenu.classList.remove('active');
            }
        });
    }
}

function populateFilterDropdowns() {
    const filterGenreExtra = document.getElementById('filterGenreExtra');
    if (!filterGenreExtra) return;
    filterGenreExtra.innerHTML = '<option value="all">Todos los géneros</option>';
    loadedGenres.forEach(g => {
        filterGenreExtra.innerHTML += `<option value="${g.name}">${g.name}</option>`;
    });
}

window.applyAdvancedFilters = function() {
    const platform = document.getElementById('filterPlatform').value;
    const size = document.getElementById('filterSize').value;
    const extraGenre = document.getElementById('filterGenreExtra').value;

    let filtered = loadedGames.filter(game => {
        let matchesPlatform = true;
        if (platform !== 'all') {
            const categories = Array.isArray(game.category) ? game.category.map(c => c.toLowerCase()) : [game.category.toLowerCase()];
            const titleAndDesc = (game.title + ' ' + game.desc).toLowerCase();
            matchesPlatform = categories.includes(platform.toLowerCase()) || titleAndDesc.includes(platform.toLowerCase());
        }

        let matchesGenre = extraGenre === 'all' || (Array.isArray(game.category) ? game.category.includes(extraGenre) : game.category === extraGenre);

        let matchesSize = true;
        if (size !== 'all' && game.size) {
            const sizeNum = parseFloat(game.size.replace(/[^0-9.]/g, '')) || 0;
            const isMB = game.size.toLowerCase().includes('mb');
            const totalGB = isMB ? sizeNum / 1024 : sizeNum;

            if (size === 'light') matchesSize = totalGB < 1.0;
            else if (size === 'medium') matchesSize = totalGB >= 1.0 && totalGB <= 5.0;
            else if (size === 'heavy') matchesSize = totalGB > 5.0;
        }

        return matchesPlatform && matchesGenre && matchesSize;
    });

    renderGames(filtered);
    document.getElementById('filterDropdownMenu').classList.remove('active');
    document.getElementById('btnToggleFilter').classList.remove('active');
};

window.resetAdvancedFilters = function() {
    document.getElementById('filterPlatform').value = 'all';
    document.getElementById('filterSize').value = 'all';
    document.getElementById('filterGenreExtra').value = 'all';
    renderGames(loadedGames);
    document.getElementById('filterDropdownMenu').classList.remove('active');
    document.getElementById('btnToggleFilter').classList.remove('active');
};

function renderNews() {
    const newsContainer = document.getElementById('newsContainer');
    const isMod = currentUser && (currentUser.isMod || MODERATOR_EMAILS.includes(currentUser.email));

    newsContainer.innerHTML = loadedNews.map(n => `
        <article class="news-card">
            <span class="news-date">${n.date}</span>
            <h4>${n.title}</h4>
            <p>${n.content}</p>
            ${isMod ? `<button onclick="editNews('${n.id}')" style="position:absolute; top:0; right:0; background:none; border:none; color:#ffa500; cursor:pointer;"><i class="fas fa-edit"></i></button>` : ''}
        </article>
    `).join('');
}

// CATÁLOGO DE JUEGOS
function renderGames(data) {
    gamesGrid.innerHTML = '';

    if (!data || data.length === 0) {
        gamesGrid.innerHTML = '<p style="color:#888; grid-column: 1/-1;">No se encontraron juegos con los filtros seleccionados.</p>';
        return;
    }

    const isMod = currentUser && (currentUser.isMod || MODERATOR_EMAILS.includes(currentUser.email));
    const userIsAdult = currentUser && currentUser.isAdult;

    data.forEach(game => {
        const isFav = favorites.includes(game.id);
        const isBlocked = game.ageRestricted && !userIsAdult;

        const card = document.createElement('div');
        card.className = `game-card ${isBlocked ? 'restricted-blur' : ''}`;
        
        let overlayHTML = isBlocked ? `
            <div class="age-lock-overlay">
                <i class="fas fa-user-lock"></i>
                <span class="badge-18">+18 AÑOS</span>
                <p>${currentUser ? 'Para mayores de edad.' : 'Inicia sesión para ver.'}</p>
            </div>
        ` : '';

        const versionCount = (game.versions && game.versions.length) ? game.versions.length : 1;
        const genresFormatted = formatGameGenres(game.category);
        const downloads = game.downloadsCount || 0;

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${game.image}" alt="${game.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';">
                
                <div class="card-badges-row">
                    ${game.onlineStatus === 'online' ? '<span class="status-pill online"><i class="fas fa-wifi"></i> Online</span>' : ''}
                    ${game.gamepadStatus ? '<span class="status-pill gamepad"><i class="fas fa-gamepad"></i> Mando</span>' : ''}
                </div>

                ${overlayHTML}
                ${isMod ? `<button class="edit-card-btn" onclick="openAdminEditModal(event, '${game.id}')" title="Editar Juego"><i class="fas fa-edit"></i></button>` : ''}
                ${!isBlocked ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event, '${game.id}')"><i class="fas fa-heart"></i></button>` : ''}
            </div>
            <div class="card-info" ${!isBlocked ? `onclick="openGameModal('${game.id}')"` : ''}>
                <span class="card-cat">${genresFormatted} ${game.ageRestricted ? '<span class="badge-18-tag">+18</span>' : ''}</span>
                <h4>${game.title}</h4>
                <div class="card-meta">
                    <span><i class="fas fa-hdd"></i> ${game.size}</span>
                    <span><i class="fas fa-code-branch"></i> ${versionCount} Ver.</span>
                </div>
                <div class="downloads-counter"><i class="fas fa-fire"></i> ${downloads} descargas</div>
            </div>
        `;

        if (isBlocked) {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.edit-card-btn')) alert("⚠️ Contenido restringido para mayores de 18 años.");
            });
        }

        gamesGrid.appendChild(card);
    });
}

searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    renderGames(loadedGames.filter(g => g.title.toLowerCase().includes(val)));
});

function toggleFav(e, gameId) {
    e.stopPropagation();
    if (favorites.includes(gameId)) {
        favorites = favorites.filter(id => id !== gameId);
    } else {
        favorites.push(gameId);
    }
    localStorage.setItem('basados_favs', JSON.stringify(favorites));
    renderGames(loadedGames);
}

// MODAL JUEGO
function openGameModal(id) {
    const game = loadedGames.find(g => g.id === id);
    if (!game) return;

    if (game.ageRestricted && (!currentUser || !currentUser.isAdult)) {
        alert("⚠️ Acceso denegado: Requiere confirmación de edad (+18).");
        return;
    }

    const modalContent = document.getElementById('gameModalContent');
    let embedHTML = game.embed ? `
        <h4 style="color:var(--neon-red); margin: 20px 0 10px 0;"><i class="fas fa-video"></i> Tutorial / Demo:</h4>
        <div class="embed-video-container">${game.embed}</div>
    ` : '';

    const versions = (game.versions && game.versions.length > 0) ? game.versions : [
        { name: "Versión Portable", downloadUrl: game.downloadUrl || "#", server: game.server || "MediaFire" }
    ];

    const firstVersion = versions[0];
    const genresFormatted = formatGameGenres(game.category);

    let fixOnlineHTML = '';
    if (game.fixOnlineUrl) {
        fixOnlineHTML = `
            <div class="fix-online-display-box">
                <h4 style="color:#00ff80; margin-bottom: 5px; font-family: var(--font-head); font-size: 0.95rem;">
                    <i class="fas fa-plug"></i> FIX ONLINE DISPONIBLE
                </h4>
                <p style="color:#ccc; font-size: 0.85rem;">
                    ${game.fixOnlineServer || 'Servidor Online / Steam Fix'}
                </p>
                <a href="${game.fixOnlineUrl}" target="_blank" class="btn-fix-online-dl">
                    <i class="fas fa-download"></i> DESCARGAR FIX ONLINE
                </a>
            </div>
        `;
    }

    modalContent.innerHTML = `
        <h2 style="font-family: var(--font-head); color: var(--neon-red); margin-bottom: 5px;">
            ${game.title} ${game.ageRestricted ? '<span class="badge-18-tag">+18</span>' : ''}
        </h2>
        <div style="font-size: 0.85rem; color: var(--neon-red); font-weight: bold; margin-bottom: 12px; text-transform: uppercase;">
            <i class="fas fa-tags"></i> ${genresFormatted}
        </div>
        <p style="color:#ccc; margin-bottom: 20px;">${game.desc}</p>

        ${fixOnlineHTML}
        
        <div class="version-select-box">
            <div class="version-custom-dropdown">
                <button type="button" class="btn-version-dropdown" id="btnDropdownVersions" onclick="toggleVersionMenu(event)">
                    <div class="version-title-group">
                        <i class="fas fa-box-open" style="color:var(--neon-red);"></i>
                        <span id="displaySelectedVersionName">${firstVersion.name}</span>
                        <i class="fas fa-chevron-down arrow-ver-icon"></i>
                    </div>
                    <span class="mediafire-badge" id="displaySelectedVersionServer">
                        <i class="fas fa-cloud-download-alt"></i> ${firstVersion.server || 'MediaFire'}
                    </span>
                </button>

                <div class="version-dropdown-list" id="versionDropdownList">
                    ${versions.map((v, idx) => `
                        <div class="version-dropdown-item ${idx === 0 ? 'active' : ''}" onclick="selectVersionFromDropdown(${idx}, '${id}')">
                            <div class="ver-item-info">
                                <strong>${v.name}</strong>
                                <small style="color:#aaa; display:block;">Servidor: ${v.server || 'MediaFire'}</small>
                            </div>
                            <i class="fas fa-check check-mark"></i>
                        </div>
                    `).join('')}
                </div>
            </div>

            <a href="${firstVersion.downloadUrl}" target="_blank" id="btnMainDownloadUrl" onclick="trackDownload('${id}')" class="btn-primary full-width" style="margin-top:12px; display:flex; text-decoration:none; justify-content:center; align-items:center;">
                <i class="fas fa-download"></i> DESCARGAR AHORA (<span id="btnDownloadServerText">${firstVersion.server || 'MediaFire'}</span>)
            </a>

            <button class="report-btn-link" onclick="reportGameLink('${id}', '${game.title}')">
                <i class="fas fa-exclamation-triangle"></i> ¿Enlace caído o con problemas? Reportar aquí
            </button>
        </div>

        <div style="background:#0a0a0f; padding: 15px; border-radius: 8px; margin-bottom: 20px; border:1px solid #1f1f2e;">
            <h4 style="color:var(--neon-red); margin-bottom: 8px;">Requisitos del Sistema:</h4>
            <ul style="list-style: none; color: #aaa; font-size: 0.9rem;">
                <li><strong>SO:</strong> ${game.specs ? game.specs.so : 'Windows / Android'}</li>
                <li><strong>Procesador:</strong> ${game.specs ? game.specs.cpu : 'Quad Core'}</li>
                <li><strong>RAM:</strong> ${game.specs ? game.specs.ram : '4 GB'}</li>
                <li><strong>Gráficos:</strong> ${game.specs ? game.specs.gpu : 'Integrados'}</li>
            </ul>
        </div>

        ${embedHTML}

        <div class="game-comments-section">
            <h3 class="game-comments-title"><i class="fas fa-star" style="color:#ffca28;"></i> Reseñas & Comentarios</h3>
            
            <div class="rating-overview">
                <div>
                    <span style="font-size:1.4rem; font-weight:800; color:#ffca28;" id="avgRatingVal">0.0</span>
                    <span style="color:#888; font-size:0.9rem;"> / 5.0</span>
                    <div style="font-size:0.75rem; color:#888;" id="totalVotesCount">0 valoraciones</div>
                </div>
                <div id="starsAverageDisplay" style="color:#ffca28; font-size:1.1rem;">☆☆☆☆☆</div>
            </div>

            ${currentUser ? `
                <form id="formGameComment" class="comment-input-box">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.85rem; color:#aaa;">Califica este juego:</span>
                        <div class="star-rating-select" id="starSelector">
                            <i class="fas fa-star active" data-value="1"></i>
                            <i class="fas fa-star active" data-value="2"></i>
                            <i class="fas fa-star active" data-value="3"></i>
                            <i class="fas fa-star active" data-value="4"></i>
                            <i class="fas fa-star active" data-value="5"></i>
                        </div>
                    </div>
                    <textarea id="gameCommentText" placeholder="Escribe tu reseña..." required></textarea>
                    <button type="submit" class="btn-primary" style="align-self:flex-end;"><i class="fas fa-paper-plane"></i> PUBLICAR RESEÑA</button>
                </form>
            ` : `
                <div class="login-to-comment-box" style="text-align:center; padding:15px; background:#12121a; border-radius:8px; border:1px solid #28283a; margin-bottom:20px;">
                    <p style="color:#aaa; margin-bottom:10px;"><i class="fas fa-lock"></i> Inicia sesión para comentar y calificar.</p>
                    <button class="btn-primary" style="margin:0 auto; font-size:0.85rem;" onclick="openAuthFromModal()"><i class="fas fa-sign-in-alt"></i> Iniciar Sesión</button>
                </div>
            `}

            <div class="comments-list" id="commentsContainer">
                <p style="color:#666; font-size:0.85rem;">Cargando comentarios...</p>
            </div>
        </div>
    `;

    document.getElementById('gameModal').classList.add('active');
    initGameComments(id);

    if (currentUser) {
        selectedRating = 5;
        setupStarSelector();

        document.getElementById('formGameComment').addEventListener('submit', (e) => {
            e.preventDefault();
            const text = document.getElementById('gameCommentText').value.trim();
            if (!text) return;

            commentsRef.child(id).push({
                author: currentUser.name,
                avatar: currentUser.avatar,
                rating: selectedRating,
                text: text,
                timestamp: Date.now()
            }, (err) => {
                if (!err) document.getElementById('gameCommentText').value = '';
            });
        });
    }
}

window.toggleVersionMenu = function(e) {
    e.stopPropagation();
    const btn = document.getElementById('btnDropdownVersions');
    const menu = document.getElementById('versionDropdownList');
    if (btn && menu) {
        btn.classList.toggle('active');
        menu.classList.toggle('active');
    }
};

document.addEventListener('click', () => {
    const btn = document.getElementById('btnDropdownVersions');
    const menu = document.getElementById('versionDropdownList');
    if (btn && menu) {
        btn.classList.remove('active');
        menu.classList.remove('active');
    }
});

window.selectVersionFromDropdown = function(index, gameId) {
    const game = loadedGames.find(g => g.id === gameId);
    if (!game || !game.versions || !game.versions[index]) return;

    const selectedVer = game.versions[index];

    document.getElementById('displaySelectedVersionName').textContent = selectedVer.name;
    document.getElementById('displaySelectedVersionServer').innerHTML = `<i class="fas fa-cloud-download-alt"></i> ${selectedVer.server || 'MediaFire'}`;
    document.getElementById('btnDownloadServerText').textContent = selectedVer.server || 'MediaFire';
    document.getElementById('btnMainDownloadUrl').href = selectedVer.downloadUrl;

    document.querySelectorAll('.version-dropdown-item').forEach((item, idx) => {
        if (idx === index) item.classList.add('active');
        else item.classList.remove('active');
    });

    document.getElementById('btnDropdownVersions').classList.remove('active');
    document.getElementById('versionDropdownList').classList.remove('active');
};

window.openAuthFromModal = function() {
    document.getElementById('gameModal').classList.remove('active');
    document.getElementById('authModal').classList.add('active');
};

function setupStarSelector() {
    const stars = document.querySelectorAll('#starSelector i');
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const val = parseInt(e.target.dataset.value);
            selectedRating = val;
            stars.forEach((s, idx) => {
                if (idx < val) s.classList.add('active');
                else s.classList.remove('active');
            });
        });
    });
}

function initGameComments(gameId) {
    if (currentActiveGameCommentsRef) currentActiveGameCommentsRef.off();
    currentActiveGameCommentsRef = commentsRef.child(gameId);

    currentActiveGameCommentsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const container = document.getElementById('commentsContainer');
        const avgValEl = document.getElementById('avgRatingVal');
        const votesEl = document.getElementById('totalVotesCount');
        const starsAvgEl = document.getElementById('starsAverageDisplay');

        if (!container) return;

        if (!data) {
            container.innerHTML = '<p style="color:#666; font-size:0.85rem;">Sé el primero en comentar.</p>';
            if (avgValEl) avgValEl.textContent = '0.0';
            if (votesEl) votesEl.textContent = '0 valoraciones';
            if (starsAvgEl) starsAvgEl.textContent = '☆☆☆☆☆';
            return;
        }

        const commentsArray = Object.values(data);
        let totalRating = 0;
        container.innerHTML = '';

        commentsArray.reverse().forEach(c => {
            totalRating += (c.rating || 5);
            const starsHTML = '★'.repeat(c.rating || 5) + '☆'.repeat(5 - (c.rating || 5));
            const dateStr = new Date(c.timestamp).toLocaleDateString();

            const item = document.createElement('div');
            item.className = 'comment-item';
            item.innerHTML = `
                <img src="${c.avatar}" alt="${c.author}" onclick="openPublicProfile('${c.author}', '${c.avatar}')" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Guest';">
                <div class="comment-main">
                    <div class="comment-header">
                        <span class="comment-author" onclick="openPublicProfile('${c.author}', '${c.avatar}')">${c.author}</span>
                        <span class="comment-date">${dateStr}</span>
                    </div>
                    <div class="comment-stars">${starsHTML}</div>
                    <p class="comment-text">${c.text}</p>
                </div>
            `;
            container.appendChild(item);
        });

        const count = commentsArray.length;
        const avg = (totalRating / count).toFixed(1);

        if (avgValEl) avgValEl.textContent = avg;
        if (votesEl) votesEl.textContent = `${count} ${count === 1 ? 'valoración' : 'valoraciones'}`;
        if (starsAvgEl) {
            const roundedAvg = Math.round(parseFloat(avg));
            starsAvgEl.textContent = '★'.repeat(roundedAvg) + '☆'.repeat(5 - roundedAvg);
        }

        gamesRef.child(gameId).update({ avgRating: parseFloat(avg) });
    });
}

function addVersionField(name = '', downloadUrl = '', server = 'MediaFire') {
    const container = document.getElementById('versionsListContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'version-item-row';
    row.innerHTML = `
        <button type="button" class="btn-del-version" onclick="removeVersionField(this)">&times;</button>
        <div class="form-row">
            <div class="form-group" style="margin-bottom:6px;">
                <label>Nombre de la Versión</label>
                <input type="text" class="ver-name" placeholder="Ej: Portable / v1.0" value="${name}" required>
            </div>
            <div class="form-group" style="margin-bottom:6px;">
                <label>Servidor</label>
                <input type="text" class="ver-server" placeholder="MediaFire" value="${server || 'MediaFire'}">
            </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
            <label>Link Directo</label>
            <input type="url" class="ver-url" placeholder="https://..." value="${downloadUrl}" required>
        </div>
    `;
    container.appendChild(row);
}

window.removeVersionField = function(btn) {
    const container = document.getElementById('versionsListContainer');
    if (container.children.length > 1) {
        btn.closest('.version-item-row').remove();
    } else {
        alert("El juego debe tener al menos una versión registrada.");
    }
};

document.getElementById('btnAddVersionField').addEventListener('click', () => { addVersionField(); });

function getVersionsFromForm() {
    const rows = document.querySelectorAll('.version-item-row');
    const versions = [];
    rows.forEach(row => {
        const name = row.querySelector('.ver-name').value.trim();
        const server = row.querySelector('.ver-server').value.trim();
        const downloadUrl = row.querySelector('.ver-url').value.trim();

        if (name && downloadUrl) {
            versions.push({ name, server, downloadUrl });
        }
    });
    return versions;
}

window.switchAdminTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));

    if (tab === 'games') {
        document.getElementById('tabAdminGames').classList.add('active');
        document.getElementById('contentAdminGames').classList.remove('hidden');
    } else if (tab === 'news') {
        document.getElementById('tabAdminNews').classList.add('active');
        document.getElementById('contentAdminNews').classList.remove('hidden');
    } else if (tab === 'genres') {
        document.getElementById('tabAdminGenres').classList.add('active');
        document.getElementById('contentAdminGenres').classList.remove('hidden');
    } else if (tab === 'social') {
        document.getElementById('tabAdminSocial').classList.add('active');
        document.getElementById('contentAdminSocial').classList.remove('hidden');
    } else if (tab === 'reports') {
        document.getElementById('tabAdminReports').classList.add('active');
        document.getElementById('contentAdminReports').classList.remove('hidden');
    }
};

btnAdminPanel.addEventListener('click', () => {
    resetAdminForm();
    switchAdminTab('games');
    document.getElementById('adminModal').classList.add('active');
});

function openAdminEditModal(e, id) {
    if (e) e.stopPropagation();
    const game = loadedGames.find(g => g.id === id);
    if (!game) return;

    document.getElementById('adminGameId').value = game.id;
    document.getElementById('adminTitle').value = game.title;
    document.getElementById('adminSize').value = game.size;
    document.getElementById('adminServer').value = game.server || 'MediaFire';
    document.getElementById('adminImage').value = game.image;
    document.getElementById('adminDesc').value = game.desc;
    document.getElementById('adminAgeRestricted').value = game.ageRestricted ? "true" : "false";
    document.getElementById('adminOnlineStatus').value = game.onlineStatus || "offline";
    document.getElementById('adminGamepadStatus').value = game.gamepadStatus ? "true" : "false";
    document.getElementById('adminFixServer').value = game.fixOnlineServer || '';
    document.getElementById('adminFixUrl').value = game.fixOnlineUrl || '';
    document.getElementById('adminFeatured').checked = !!game.featured;

    const selectCat = document.getElementById('adminCategory');
    const categories = Array.isArray(game.category) ? game.category : [game.category];
    Array.from(selectCat.options).forEach(opt => {
        opt.selected = categories.includes(opt.value);
    });

    document.getElementById('adminSo').value = game.specs ? game.specs.so : '';
    document.getElementById('adminCpu').value = game.specs ? game.specs.cpu : '';
    document.getElementById('adminRam').value = game.specs ? game.specs.ram : '';
    document.getElementById('adminGpu').value = game.specs ? game.specs.gpu : '';
    document.getElementById('adminEmbed').value = game.embed || '';

    const versionsContainer = document.getElementById('versionsListContainer');
    versionsContainer.innerHTML = '';
    if (game.versions && game.versions.length > 0) {
        game.versions.forEach(v => addVersionField(v.name, v.downloadUrl, v.server));
    } else {
        addVersionField("Versión Portable", game.downloadUrl || '', game.server || 'MediaFire');
    }

    document.getElementById('btnSaveAdminGame').textContent = "ACTUALIZAR JUEGO";
    document.getElementById('btnCancelEdit').classList.remove('hidden');

    switchAdminTab('games');
    document.getElementById('adminModal').classList.add('active');
}

function resetAdminForm() {
    document.getElementById('formAdminGame').reset();
    document.getElementById('adminGameId').value = '';
    document.getElementById('versionsListContainer').innerHTML = '';
    addVersionField();
    document.getElementById('btnSaveAdminGame').textContent = "GUARDAR CAMBIOS";
    document.getElementById('btnCancelEdit').classList.add('hidden');
}

document.getElementById('btnCancelEdit').addEventListener('click', resetAdminForm);

document.getElementById('formAdminGame').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('adminGameId').value || 'game-' + Date.now();
    const title = document.getElementById('adminTitle').value.trim();
    const size = document.getElementById('adminSize').value.trim();
    const server = document.getElementById('adminServer').value.trim();
    const image = document.getElementById('adminImage').value.trim();
    const desc = document.getElementById('adminDesc').value.trim();
    const ageRestricted = document.getElementById('adminAgeRestricted').value === "true";
    const onlineStatus = document.getElementById('adminOnlineStatus').value;
    const gamepadStatus = document.getElementById('adminGamepadStatus').value === "true";
    const fixOnlineServer = document.getElementById('adminFixServer').value.trim();
    const fixOnlineUrl = document.getElementById('adminFixUrl').value.trim();
    const featured = document.getElementById('adminFeatured').checked;

    const selectCat = document.getElementById('adminCategory');
    const selectedCategories = Array.from(selectCat.selectedOptions).map(opt => opt.value);
    const versions = getVersionsFromForm();

    const existingGame = loadedGames.find(g => g.id === id);
    const downloadsCount = existingGame ? (existingGame.downloadsCount || 0) : 0;

    const gameData = {
        id,
        title,
        category: selectedCategories.length > 0 ? selectedCategories : ["General"],
        size,
        server,
        image,
        desc,
        ageRestricted,
        onlineStatus,
        gamepadStatus,
        fixOnlineServer,
        fixOnlineUrl,
        featured,
        downloadsCount,
        downloadUrl: versions.length > 0 ? versions[0].downloadUrl : "#",
        versions: versions,
        specs: {
            so: document.getElementById('adminSo').value.trim(),
            cpu: document.getElementById('adminCpu').value.trim(),
            ram: document.getElementById('adminRam').value.trim(),
            gpu: document.getElementById('adminGpu').value.trim()
        },
        embed: document.getElementById('adminEmbed').value.trim()
    };

    gamesRef.child(id).set(gameData, (err) => {
        if (!err) {
            alert("✅ Juego guardado exitosamente.");
            resetAdminForm();
        }
    });
});

function renderAdminGamesList() {
    const container = document.getElementById('adminGamesListContainer');
    if (!container) return;
    container.innerHTML = loadedGames.map(g => `
        <div class="admin-list-item">
            <div>
                <strong>${g.title}</strong>
                <small style="color:#aaa; display:block;">Descargas: ${g.downloadsCount || 0}</small>
            </div>
            <div>
                <button type="button" onclick="openAdminEditModal(event, '${g.id}')" style="background:none; border:none; color:#ffa500; cursor:pointer; margin-right:8px;"><i class="fas fa-edit"></i></button>
                <button type="button" onclick="deleteGame('${g.id}')" style="background:none; border:none; color:#ff4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.filterAdminGamesList = function() {
    const query = document.getElementById('adminGameSearchInput').value.toLowerCase();
    const filtered = loadedGames.filter(g => g.title.toLowerCase().includes(query));
    const container = document.getElementById('adminGamesListContainer');
    container.innerHTML = filtered.map(g => `
        <div class="admin-list-item">
            <div>
                <strong>${g.title}</strong>
                <small style="color:#aaa; display:block;">Descargas: ${g.downloadsCount || 0}</small>
            </div>
            <div>
                <button type="button" onclick="openAdminEditModal(event, '${g.id}')" style="background:none; border:none; color:#ffa500; cursor:pointer; margin-right:8px;"><i class="fas fa-edit"></i></button>
                <button type="button" onclick="deleteGame('${g.id}')" style="background:none; border:none; color:#ff4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
};

window.deleteGame = function(id) {
    if (confirm("¿Seguro de eliminar este juego del catálogo?")) {
        gamesRef.child(id).remove();
    }
};

document.getElementById('formAdminGenre').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('genreName').value.trim();
    if (!name) return;

    genresRef.child(name).set({ name }, (err) => {
        if (!err) document.getElementById('genreName').value = '';
    });
});

function renderAdminGenres() {
    const list = document.getElementById('adminGenreList');
    if (!list) return;
    list.innerHTML = loadedGenres.map(g => `
        <span class="genre-tag-item">
            ${g.name}
            <button type="button" class="btn-del-mini" onclick="deleteGenre('${g.name}')">&times;</button>
        </span>
    `).join('');
}

window.deleteGenre = function(name) {
    if (confirm(`¿Eliminar la categoría "${name}"?`)) {
        genresRef.child(name).remove();
    }
};

document.getElementById('formAdminNews').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('newsId').value || 'news-' + Date.now();
    const title = document.getElementById('newsTitle').value.trim();
    const date = document.getElementById('newsDate').value.trim();
    const content = document.getElementById('newsContent').value.trim();

    newsRef.child(id).set({ id, title, date, content }, (err) => {
        if (!err) resetNewsForm();
    });
});

function renderAdminNews() {
    const list = document.getElementById('adminNewsList');
    if (!list) return;
    list.innerHTML = loadedNews.map(n => `
        <div class="admin-list-item">
            <div>
                <strong>${n.title}</strong>
                <small style="color:#aaa; display:block;">${n.date}</small>
            </div>
            <div>
                <button type="button" onclick="editNews('${n.id}')" style="background:none; border:none; color:#ffa500; cursor:pointer; margin-right:8px;"><i class="fas fa-edit"></i></button>
                <button type="button" onclick="deleteNews('${n.id}')" style="background:none; border:none; color:#ff4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editNews = function(id) {
    const n = loadedNews.find(item => item.id === id);
    if (!n) return;
    document.getElementById('newsId').value = n.id;
    document.getElementById('newsTitle').value = n.title;
    document.getElementById('newsDate').value = n.date;
    document.getElementById('newsContent').value = n.content;
    document.getElementById('btnSaveNews').textContent = "ACTUALIZAR NOTICIA";
    document.getElementById('btnCancelNewsEdit').classList.remove('hidden');
    switchAdminTab('news');
    document.getElementById('adminModal').classList.add('active');
};

window.deleteNews = function(id) {
    if (confirm("¿Eliminar esta noticia?")) {
        newsRef.child(id).remove();
    }
};

function resetNewsForm() {
    document.getElementById('formAdminNews').reset();
    document.getElementById('newsId').value = '';
    document.getElementById('btnSaveNews').textContent = "GUARDAR NOTICIA";
    document.getElementById('btnCancelNewsEdit').classList.add('hidden');
}

function setupEventListeners() {
    const avatarFileInput = document.getElementById('profileAvatarFile');
    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 500 * 1024) {
                alert("⚠️ La imagen supera el peso máximo de 500 KB.");
                avatarFileInput.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('profileAvatarPreview').src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    btnAuth.addEventListener('click', () => {
        if (currentUser) openPublicProfile(currentUser.name, currentUser.avatar);
        else document.getElementById('authModal').classList.add('active');
    });

    document.getElementById('closeAuthModal').addEventListener('click', () => {
        document.getElementById('authModal').classList.remove('active');
    });

    document.getElementById('tabLogin').addEventListener('click', () => {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabRegister').classList.remove('active');
        document.getElementById('formLogin').classList.add('active');
        document.getElementById('formRegister').classList.remove('active');
    });

    document.getElementById('tabRegister').addEventListener('click', () => {
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('formRegister').classList.add('active');
        document.getElementById('formLogin').classList.remove('active');
    });

    document.getElementById('formLogin').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();

        usersRef.orderByChild('email').equalTo(email).once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const userId = Object.keys(data)[0];
                const user = data[userId];
                const ageInfo = calculateAgeInfo(user.birthdate);

                currentUser = {
                    id: userId,
                    name: user.name,
                    email: user.email,
                    birthdate: user.birthdate,
                    isAdult: ageInfo.isAdult,
                    avatar: user.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=" + user.name,
                    isMod: MODERATOR_EMAILS.includes(user.email)
                };

                localStorage.setItem('basados_user', JSON.stringify(currentUser));
                updateUserUI();
                updateFirebasePresence();
                document.getElementById('authModal').classList.remove('active');
                renderGames(loadedGames);
            } else alert("Usuario no encontrado.");
        });
    });

    document.getElementById('formRegister').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('regUser').value.trim();
        const birthdate = document.getElementById('regBirthdate').value;
        const email = document.getElementById('regEmail').value.trim();

        const ageInfo = calculateAgeInfo(birthdate);
        const newUserRef = usersRef.push();
        const userData = {
            name, birthdate, email,
            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=" + name,
            isMod: MODERATOR_EMAILS.includes(email)
        };

        newUserRef.set(userData, (err) => {
            if (!err) {
                currentUser = { id: newUserRef.key, ...userData, isAdult: ageInfo.isAdult };
                localStorage.setItem('basados_user', JSON.stringify(currentUser));
                updateUserUI();
                updateFirebasePresence();
                document.getElementById('authModal').classList.remove('active');
                renderGames(loadedGames);
            }
        });
    });

    document.getElementById('closeProfileModal').addEventListener('click', () => {
        document.getElementById('profileModal').classList.remove('active');
    });

    document.getElementById('formProfile').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const newName = document.getElementById('profileNickname').value.trim();
        const newBirthdate = document.getElementById('profileBirthdate').value;
        const newAvatarUrl = document.getElementById('profileAvatarUrl').value.trim();
        const fileInput = document.getElementById('profileAvatarFile');

        const ageInfo = calculateAgeInfo(newBirthdate);
        currentUser.name = newName;
        currentUser.birthdate = newBirthdate;
        currentUser.isAdult = ageInfo.isAdult;

        const processSave = (finalAvatar) => {
            if (finalAvatar) currentUser.avatar = finalAvatar;

            usersRef.child(currentUser.id).update({
                name: currentUser.name,
                birthdate: currentUser.birthdate,
                avatar: currentUser.avatar
            });

            localStorage.setItem('basados_user', JSON.stringify(currentUser));
            updateUserUI();
            updateFirebasePresence();
            document.getElementById('profileModal').classList.remove('active');
            renderGames(loadedGames);
        };

        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            if (file.size > 500 * 1024) {
                alert("⚠️ La imagen supera el peso máximo de 500 KB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = function(evt) { processSave(evt.target.result); };
            reader.readAsDataURL(file);
        } else if (newAvatarUrl) {
            processSave(newAvatarUrl);
        } else {
            processSave(null);
        }
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('basados_user');
        updateUserUI();
        updateFirebasePresence();
        document.getElementById('profileModal').classList.remove('active');
        document.getElementById('publicProfileModal').classList.remove('active');
        renderGames(loadedGames);
    });

    document.getElementById('closeGameModal').addEventListener('click', () => {
        document.getElementById('gameModal').classList.remove('active');
        if (currentActiveGameCommentsRef) currentActiveGameCommentsRef.off();
    });

    document.getElementById('closeAdminModal').addEventListener('click', () => {
        document.getElementById('adminModal').classList.remove('active');
    });

    document.getElementById('btnOnlineUsers').addEventListener('click', () => {
        document.getElementById('onlineModal').classList.add('active');
    });

    document.getElementById('closeOnlineModal').addEventListener('click', () => {
        document.getElementById('onlineModal').classList.remove('active');
    });

    document.getElementById('btnNotif').addEventListener('click', () => {
        document.getElementById('notifModal').classList.add('active');
    });

    document.getElementById('closeNotifModal').addEventListener('click', () => {
        document.getElementById('notifModal').classList.remove('active');
    });

    document.getElementById('formNotif').addEventListener('submit', (e) => {
        e.preventDefault();
        alert("🔔 ¡Te has suscrito a las notificaciones con éxito!");
        document.getElementById('notifModal').classList.remove('active');
    });

    document.getElementById('formChat').addEventListener('submit', (e) => {
        e.preventDefault();
        const chatInput = document.getElementById('chatInput');
        const text = chatInput.value.trim();
        if (!text) return;

        messagesRef.push({
            author: currentUser ? currentUser.name : "Invitado Basado",
            avatar: currentUser ? currentUser.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=Guest",
            text: text,
            timestamp: Date.now()
        });

        chatInput.value = '';
    });
}

function openProfileModal() {
    if (!currentUser) return;
    document.getElementById('profileNickname').value = currentUser.name;
    document.getElementById('profileBirthdate').value = currentUser.birthdate || '';
    document.getElementById('profileAvatarUrl').value = currentUser.avatar || '';
    document.getElementById('profileAvatarPreview').src = currentUser.avatar || '';
    
    const fileInput = document.getElementById('profileAvatarFile');
    if (fileInput) fileInput.value = '';

    const ageInfo = calculateAgeInfo(currentUser.birthdate);
    document.getElementById('profileAgeBadge').value = ageInfo.label;
    document.getElementById('profileModal').classList.add('active');
}

window.selectPresetAvatar = function(url) {
    document.getElementById('profileAvatarUrl').value = url;
    document.getElementById('profileAvatarPreview').src = url;
    const fileInput = document.getElementById('profileAvatarFile');
    if (fileInput) fileInput.value = '';
};

function updateUserUI() {
    if (currentUser) {
        userBtnText.textContent = currentUser.name;
        userAvatarNav.src = currentUser.avatar;
        userAvatarNav.classList.remove('hidden');

        if (currentUser.isMod || MODERATOR_EMAILS.includes(currentUser.email)) {
            btnAdminPanel.classList.remove('hidden');
        } else {
            btnAdminPanel.classList.add('hidden');
        }
    } else {
        userBtnText.textContent = "Ingresar";
        userAvatarNav.classList.add('hidden');
        btnAdminPanel.classList.add('hidden');
    }
}
