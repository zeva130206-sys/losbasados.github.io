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

// IMAGEN POR DEFECTO PARA FALLBACKS
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x225/0f0f14/ff003c?text=Imagen+No+Disponible';

// DATOS BASE INICIALES
const defaultGames = [
    {
        id: "default-1",
        title: "Mario Kart Wii (PC Port)",
        category: ["Carreras", "Pantalla Compartida"],
        size: "2.9 GB",
        server: "MediaFire",
        image: "assets/img/MarioKartWii.png",
        downloadUrl: "https://ouo.io/gx2F6LP",
        versions: [
            { name: "v1.0 (Base Port)", downloadUrl: "https://ouo.io/gx2F6LP", server: "MediaFire" },
            { name: "v1.2 (Modpack HD)", downloadUrl: "https://ouo.io/gx2F6LP", server: "MediaFire" }
        ],
        featured: true,
        ageRestricted: false,
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

const defaultGenres = ["Carreras", "Acción", "Supervivencia", "Retro", "Android APK", "Pantalla Compartida", "Un solo jugador", "Online"];

const defaultNews = [
    { id: "news-1", title: "Nuevos Ports Optimizados", date: "15 SEPT, 2026", content: "Optimizando los instaladores para que corran en PC y móviles de gama baja/media." },
    { id: "news-2", title: "Actualización de Servidores", date: "12 SEPT, 2026", content: "Todos los enlaces directos están migrando a servidores de alta velocidad." },
    { id: "news-3", title: "Comunidad LOS BASADOS", date: "10 SEPT, 2026", content: "Usa nuestro nuevo Foro en Línea o únete al Discord oficial." }
];

// ESTADO GLOBAL
let currentUser = JSON.parse(localStorage.getItem('basados_user')) || null;
let favorites = JSON.parse(localStorage.getItem('basados_favs')) || [];
let loadedGames = [];
let loadedGenres = [];
let loadedNews = [];
let currentOnlineList = [];
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
});

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
        renderGames(loadedGames);
        renderHeroCarousel(loadedGames);
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

    // 4. Chat
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
                    <img src="${msg.avatar}" alt="${msg.author}" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Guest';">
                    <div class="chat-msg-content">
                        <span class="chat-author">${msg.author}</span>
                        <p class="chat-text">${formattedText}</p>
                    </div>
                `;
                chatMessages.appendChild(msgDiv);
            });
            setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
        }
    });

    // 5. Presencia en Vivo
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

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeImageModal();
        });
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

    loadedGenres.forEach(g => {
        bar.innerHTML += `<button class="cat-btn" data-cat="${g.name}">${g.name}</button>`;
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
                    if (Array.isArray(g.category)) {
                        return g.category.includes(cat);
                    }
                    return g.category === cat;
                }));
            }
        });
    });
}

// NOTICIAS
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
        gamesGrid.innerHTML = '<p style="color:#888; grid-column: 1/-1;">No se encontraron juegos en esta categoría.</p>';
        return;
    }

    const isMod = currentUser && (currentUser.isMod || MODERATOR_EMAILS.includes(currentUser.email));
    const userIsAdult = currentUser && currentUser.isAdult;

    data.forEach(game => {
        const isFav = favorites.includes(game.id);
        const isBlocked = game.ageRestricted && !userIsAdult;

        const card = document.createElement('div');
        card.className = `game-card ${isBlocked ? 'restricted-blur' : ''}`;
        
        let overlayHTML = '';
        if (isBlocked) {
            overlayHTML = `
                <div class="age-lock-overlay">
                    <i class="fas fa-user-lock"></i>
                    <span class="badge-18">+18 AÑOS</span>
                    <p>${currentUser ? 'Para mayores de edad.' : 'Inicia sesión para ver.'}</p>
                </div>
            `;
        }

        const versionCount = (game.versions && game.versions.length) ? game.versions.length : 1;
        const genresFormatted = formatGameGenres(game.category);

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${game.image}" alt="${game.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';">
                ${overlayHTML}
                ${isMod ? `<button class="edit-card-btn" onclick="openAdminEditModal(event, '${game.id}')" title="Editar Juego / Versiones"><i class="fas fa-edit"></i></button>` : ''}
                ${!isBlocked ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event, '${game.id}')"><i class="fas fa-heart"></i></button>` : ''}
            </div>
            <div class="card-info" ${!isBlocked ? `onclick="openGameModal('${game.id}')"` : ''}>
                <span class="card-cat">${genresFormatted} ${game.ageRestricted ? '<span class="badge-18-tag">+18</span>' : ''}</span>
                <h4>${game.title}</h4>
                <div class="card-meta">
                    <span><i class="fas fa-hdd"></i> ${game.size}</span>
                    <span><i class="fas fa-code-branch"></i> ${versionCount} Ver.</span>
                </div>
            </div>
        `;

        if (isBlocked) {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.edit-card-btn')) return;
                alert("⚠️ Contenido restringido para mayores de 18 años.");
            });
        }

        gamesGrid.appendChild(card);
    });
}

// BUSCADOR
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

// MODAL JUEGO - CON SELECTOR DE MÚLTIPLES VERSIONES
function openGameModal(id) {
    const game = loadedGames.find(g => g.id === id);
    if (!game) return;

    if (game.ageRestricted && (!currentUser || !currentUser.isAdult)) {
        alert("⚠️ Acceso denegado: Requiere confirmación de edad (+18).");
        return;
    }

    const modalContent = document.getElementById('gameModalContent');
    let embedHTML = '';
    if (game.embed && game.embed.trim() !== '') {
        embedHTML = `
            <h4 style="color:var(--neon-red); margin: 20px 0 10px 0;"><i class="fas fa-video"></i> Tutorial / Demo:</h4>
            <div class="embed-video-container">
                ${game.embed}
            </div>
        `;
    }

    // Asegurar que siempre exista al menos una versión
    const versions = (game.versions && game.versions.length > 0) ? game.versions : [
        { name: "Versión Estándar", downloadUrl: game.downloadUrl || "#", server: game.server || "MediaFire" }
    ];

    let versionsSelectorHTML = '';
    if (versions.length > 1) {
        versionsSelectorHTML = `
            <div class="version-selector-container">
                <label style="font-size:0.85rem; color:#aaa; font-weight:bold;">
                    <i class="fas fa-layer-group"></i> Seleccionar Versión del Juego:
                </label>
                <div class="version-btn-grid" id="modalVersionButtons">
                    ${versions.map((v, idx) => `
                        <button class="version-btn ${idx === 0 ? 'active' : ''}" onclick="selectModalVersion(${idx}, '${id}')">
                            <i class="fas fa-download"></i> ${v.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const firstVersion = versions[0];
    const genresFormatted = formatGameGenres(game.category);

    modalContent.innerHTML = `
        <h2 style="font-family: var(--font-head); color: var(--neon-red); margin-bottom: 5px;">
            ${game.title} ${game.ageRestricted ? '<span class="badge-18-tag">+18</span>' : ''}
        </h2>
        <div style="font-size: 0.85rem; color: var(--neon-red); font-weight: bold; margin-bottom: 12px; text-transform: uppercase;">
            <i class="fas fa-tags"></i> ${genresFormatted}
        </div>
        <p style="color:#ccc; margin-bottom: 15px;">${game.desc}</p>
        
        ${versionsSelectorHTML}

        <div style="background:#0a0a0f; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div class="download-version-box" style="margin-bottom: 12px;">
                <span class="version-badge-tag" id="currentVersionTag">${firstVersion.name}</span>
                <span style="font-size:0.85rem; color:#aaa;" id="currentVersionServer">Servidor: <strong>${firstVersion.server || game.server || 'MediaFire'}</strong></span>
            </div>

            <a href="${firstVersion.downloadUrl}" target="_blank" id="btnMainDownloadUrl" class="btn-primary" style="display:inline-block; text-decoration:none; text-align:center;">
                <i class="fas fa-download"></i> DESCARGAR AHORA (${firstVersion.server || game.server || 'MediaFire'})
            </a>
        </div>

        <div style="background:#0a0a0f; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
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
                <div id="starsAverageDisplay" style="color:#ffca28; font-size:1.1rem;">
                    ☆☆☆☆☆
                </div>
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
                <div class="login-to-comment-box">
                    <p><i class="fas fa-lock"></i> Inicia sesión para comentar y calificar.</p>
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

// CAMBIAR VERSIÓN EN MODAL DE DESCARGA
window.selectModalVersion = function(index, gameId) {
    const game = loadedGames.find(g => g.id === gameId);
    if (!game || !game.versions || !game.versions[index]) return;

    const selectedVer = game.versions[index];

    const tag = document.getElementById('currentVersionTag');
    const serverSpan = document.getElementById('currentVersionServer');
    const btnDownload = document.getElementById('btnMainDownloadUrl');

    if (tag) tag.textContent = selectedVer.name;
    if (serverSpan) serverSpan.innerHTML = `Servidor: <strong>${selectedVer.server || game.server || 'MediaFire'}</strong>`;
    if (btnDownload) {
        btnDownload.href = selectedVer.downloadUrl;
        btnDownload.innerHTML = `<i class="fas fa-download"></i> DESCARGAR (${selectedVer.name})`;
    }

    // Actualizar clase activa en los botones
    const btns = document.querySelectorAll('#modalVersionButtons .version-btn');
    btns.forEach((btn, idx) => {
        if (idx === index) btn.classList.add('active');
        else btn.classList.remove('active');
    });
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
    if (currentActiveGameCommentsRef) {
        currentActiveGameCommentsRef.off();
    }

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
                <img src="${c.avatar}" alt="${c.author}" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Guest';">
                <div class="comment-main">
                    <div class="comment-header">
                        <span class="comment-author">${c.author}</span>
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
    });
}

// GESTIÓN DINÁMICA DE CAMPOS DE VERSIÓN EN PANEL ADMIN
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
                <input type="text" class="ver-name" placeholder="Ej: v1.0 / 1.16.5 / Port HD" value="${name}" required>
            </div>
            <div class="form-group" style="margin-bottom:6px;">
                <label>Servidor</label>
                <input type="text" class="ver-server" placeholder="Ej: MediaFire / Google Drive" value="${server || 'MediaFire'}">
            </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
            <label>Link de Descarga MediaFire / Servidor</label>
            <input type="url" class="ver-url" placeholder="https://mediafire.com/file/..." value="${downloadUrl}" required>
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

document.getElementById('btnAddVersionField').addEventListener('click', () => {
    addVersionField();
});

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

// TABS ADMIN
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
    }
};

// ADMIN JUEGOS
btnAdminPanel.addEventListener('click', () => {
    resetAdminForm();
    switchAdminTab('games');
    document.getElementById('adminModal').classList.add('active');
});

function openAdminEditModal(e, id) {
    e.stopPropagation();
    const game = loadedGames.find(g => g.id === id);
    if (!game) return;

    document.getElementById('adminGameId').value = game.id;
    document.getElementById('adminTitle').value = game.title;
    
    // Cargar Selección Múltiple de Géneros
    const selectCat = document.getElementById('adminCategory');
    const currentCats = Array.isArray(game.category) ? game.category : [game.category];
    Array.from(selectCat.options).forEach(opt => {
        opt.selected = currentCats.includes(opt.value);
    });

    document.getElementById('adminSize').value = game.size;
    document.getElementById('adminServer').value = game.server;
    document.getElementById('adminImage').value = game.image;
    document.getElementById('adminAgeRestricted').value = game.ageRestricted ? "true" : "false";
    document.getElementById('adminDesc').value = game.desc;
    document.getElementById('adminFeatured').checked = !!game.featured;
    document.getElementById('adminSo').value = game.specs ? game.specs.so : '';
    document.getElementById('adminCpu').value = game.specs ? game.specs.cpu : '';
    document.getElementById('adminRam').value = game.specs ? game.specs.ram : '';
    document.getElementById('adminGpu').value = game.specs ? game.specs.gpu : '';
    document.getElementById('adminEmbed').value = game.embed || '';

    // Cargar Lista de Versiones
    const container = document.getElementById('versionsListContainer');
    container.innerHTML = '';

    if (game.versions && game.versions.length > 0) {
        game.versions.forEach(v => addVersionField(v.name, v.downloadUrl, v.server));
    } else {
        addVersionField("Versión Principal", game.downloadUrl || "", game.server || "MediaFire");
    }

    document.getElementById('btnSaveAdminGame').textContent = "GUARDAR CAMBIOS";
    document.getElementById('btnCancelEdit').classList.remove('hidden');
    switchAdminTab('games');
    document.getElementById('adminModal').classList.add('active');
}

document.getElementById('btnCancelEdit').addEventListener('click', resetAdminForm);

function resetAdminForm() {
    document.getElementById('formAdminGame').reset();
    document.getElementById('adminGameId').value = '';
    
    const container = document.getElementById('versionsListContainer');
    container.innerHTML = '';
    addVersionField("v1.0 Base", "", "MediaFire");

    document.getElementById('btnSaveAdminGame').textContent = "PUBLICAR / GUARDAR CAMBIOS";
    document.getElementById('btnCancelEdit').classList.add('hidden');
}

document.getElementById('formAdminGame').addEventListener('submit', (e) => {
    e.preventDefault();
    const gameId = document.getElementById('adminGameId').value || 'game_' + Date.now();
    const versions = getVersionsFromForm();

    if (versions.length === 0) {
        alert("Por favor, agrega al menos una versión del juego con su respectivo enlace de descarga.");
        return;
    }

    const selectCat = document.getElementById('adminCategory');
    const selectedCategories = Array.from(selectCat.selectedOptions).map(opt => opt.value);

    if (selectedCategories.length === 0) {
        alert("Por favor, selecciona al menos un género/categoría.");
        return;
    }

    const mainDownloadUrl = versions[0].downloadUrl;
    const mainServer = versions[0].server || document.getElementById('adminServer').value.trim() || 'MediaFire';

    const newGame = {
        id: gameId,
        title: document.getElementById('adminTitle').value.trim(),
        category: selectedCategories,
        size: document.getElementById('adminSize').value.trim(),
        server: mainServer,
        image: document.getElementById('adminImage').value.trim(),
        ageRestricted: document.getElementById('adminAgeRestricted').value === "true",
        downloadUrl: mainDownloadUrl,
        versions: versions,
        desc: document.getElementById('adminDesc').value.trim(),
        featured: document.getElementById('adminFeatured').checked,
        specs: {
            so: document.getElementById('adminSo').value.trim(),
            cpu: document.getElementById('adminCpu').value.trim(),
            ram: document.getElementById('adminRam').value.trim(),
            gpu: document.getElementById('adminGpu').value.trim()
        },
        embed: document.getElementById('adminEmbed').value.trim()
    };

    gamesRef.child(gameId).set(newGame, (err) => {
        if (!err) {
            alert("¡Juego y versiones guardados con éxito!");
            document.getElementById('adminModal').classList.remove('active');
            resetAdminForm();
        }
    });
});

// ADMIN NOTICIAS
document.getElementById('formAdminNews').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('newsId').value || 'news_' + Date.now();
    const newsData = {
        id: id,
        title: document.getElementById('newsTitle').value.trim(),
        date: document.getElementById('newsDate').value.trim(),
        content: document.getElementById('newsContent').value.trim()
    };

    newsRef.child(id).set(newsData, (err) => {
        if (!err) {
            alert("Noticia guardada.");
            resetNewsForm();
        }
    });
});

window.editNews = function(id) {
    const item = loadedNews.find(n => n.id === id);
    if (!item) return;

    document.getElementById('newsId').value = item.id;
    document.getElementById('newsTitle').value = item.title;
    document.getElementById('newsDate').value = item.date;
    document.getElementById('newsContent').value = item.content;
    document.getElementById('btnSaveNews').textContent = "ACTUALIZAR NOTICIA";
    document.getElementById('btnCancelNewsEdit').classList.remove('hidden');

    switchAdminTab('news');
    document.getElementById('adminModal').classList.add('active');
};

window.deleteNews = function(id) {
    if (confirm("¿Eliminar noticia?")) newsRef.child(id).remove();
};

function resetNewsForm() {
    document.getElementById('formAdminNews').reset();
    document.getElementById('newsId').value = '';
    document.getElementById('btnSaveNews').textContent = "GUARDAR NOTICIA";
    document.getElementById('btnCancelNewsEdit').classList.add('hidden');
}

function renderAdminNews() {
    const container = document.getElementById('adminNewsList');
    container.innerHTML = loadedNews.map(n => `
        <div class="admin-list-item">
            <div>
                <strong>${n.title}</strong>
                <div style="font-size:0.75rem; color:#aaa;">${n.date}</div>
            </div>
            <div>
                <button onclick="editNews('${n.id}')" style="background:none; border:none; color:#ffa500; cursor:pointer; margin-right:8px;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteNews('${n.id}')" class="btn-del-mini"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// ADMIN CATEGORÍAS
document.getElementById('formAdminGenre').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('genreName').value.trim();
    if (name) {
        genresRef.child(name).set({ name: name }, (err) => {
            if (!err) document.getElementById('genreName').value = '';
        });
    }
});

window.deleteGenre = function(name) {
    if (confirm(`¿Eliminar categoría "${name}"?`)) genresRef.child(name).remove();
};

function renderAdminGenres() {
    const container = document.getElementById('adminGenreList');
    container.innerHTML = loadedGenres.map(g => `
        <div class="genre-tag-item">
            <span>${g.name}</span>
            <button class="btn-del-mini" onclick="deleteGenre('${g.name}')">&times;</button>
        </div>
    `).join('');
}

// EVENTOS & AUTENTICACIÓN
function setupEventListeners() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            if (currentActiveGameCommentsRef) {
                currentActiveGameCommentsRef.off();
                currentActiveGameCommentsRef = null;
            }
        });
    });

    btnAuth.addEventListener('click', () => {
        if (currentUser) {
            const profileBirthdateInput = document.getElementById('profileBirthdate');
            const birthdateNotice = document.getElementById('birthdateNotice');

            document.getElementById('profileNickname').value = currentUser.name;
            profileBirthdateInput.value = currentUser.birthdate || '';
            
            const ageInfo = calculateAgeInfo(currentUser.birthdate);
            document.getElementById('profileAgeBadge').value = ageInfo.label;
            
            document.getElementById('profileAvatarUrl').value = currentUser.avatar || '';
            document.getElementById('profileAvatarPreview').src = currentUser.avatar;
            document.getElementById('profileModal').classList.add('active');
        } else {
            document.getElementById('authModal').classList.add('active');
        }
    });

    // Pestañas Auth
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

    // Login Form
    document.getElementById('formLogin').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const isMod = MODERATOR_EMAILS.includes(email);

        currentUser = {
            name: email.split('@')[0],
            email: email,
            birthdate: '2000-01-01',
            isAdult: true,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
            isMod: isMod
        };

        saveAndRefreshUser();
        document.getElementById('authModal').classList.remove('active');
    });

    // Register Form
    document.getElementById('formRegister').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('regUser').value.trim();
        const birthdate = document.getElementById('regBirthdate').value;
        const email = document.getElementById('regEmail').value.trim();
        const isMod = MODERATOR_EMAILS.includes(email);

        const ageInfo = calculateAgeInfo(birthdate);

        currentUser = {
            name: name,
            email: email,
            birthdate: birthdate,
            isAdult: ageInfo.isAdult,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
            isMod: isMod
        };

        saveAndRefreshUser();
        document.getElementById('authModal').classList.remove('active');
    });

    // Profile Form
    document.getElementById('formProfile').addEventListener('submit', (e) => {
        e.preventDefault();
        if (currentUser) {
            currentUser.name = document.getElementById('profileNickname').value.trim();
            currentUser.birthdate = document.getElementById('profileBirthdate').value;
            
            const ageInfo = calculateAgeInfo(currentUser.birthdate);
            currentUser.isAdult = ageInfo.isAdult;

            const customUrl = document.getElementById('profileAvatarUrl').value.trim();
            if (customUrl) currentUser.avatar = customUrl;

            saveAndRefreshUser();
            document.getElementById('profileModal').classList.remove('active');
        }
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('basados_user');
        updateUserUI();
        document.getElementById('profileModal').classList.remove('active');
        renderGames(loadedGames);
        updateFirebasePresence();
    });

    // Chat modal y envio
    document.getElementById('btnOnlineUsers').addEventListener('click', () => {
        document.getElementById('onlineModal').classList.add('active');
    });

    document.getElementById('formChat').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;

        messagesRef.push({
            author: currentUser ? currentUser.name : "Invitado",
            avatar: currentUser ? currentUser.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=Guest",
            text: text,
            timestamp: Date.now()
        });

        input.value = '';
    });

    // Notificaciones modal
    document.getElementById('btnNotif').addEventListener('click', () => {
        document.getElementById('notifModal').classList.add('active');
    });

    document.getElementById('formNotif').addEventListener('submit', (e) => {
        e.preventDefault();
        alert("¡Suscripción realizada con éxito!");
        document.getElementById('notifModal').classList.remove('active');
    });
}

function selectPresetAvatar(url) {
    document.getElementById('profileAvatarUrl').value = url;
    document.getElementById('profileAvatarPreview').src = url;
}

function saveAndRefreshUser() {
    localStorage.setItem('basados_user', JSON.stringify(currentUser));
    updateUserUI();
    renderGames(loadedGames);
    renderNews();
    updateFirebasePresence();
}

function updateUserUI() {
    if (currentUser) {
        userBtnText.textContent = currentUser.name;
        userAvatarNav.src = currentUser.avatar;
        userAvatarNav.classList.remove('hidden');

        const isMod = currentUser.isMod || MODERATOR_EMAILS.includes(currentUser.email);
        if (isMod) {
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
