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
        category: "Carreras",
        size: "2.9 GB",
        server: "MediaFire",
        image: "assets/img/MarioKartWii.png",
        downloadUrl: "https://ouo.io/gx2F6LP",
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

const defaultGenres = ["Carreras", "Acción", "Supervivencia", "Retro", "Android APK"];

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
            if (cat === 'all') renderGames(loadedGames);
            else if (cat === 'favs') renderGames(loadedGames.filter(g => favorites.includes(g.id)));
            else renderGames(loadedGames.filter(g => g.category === cat));
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

// CATÁLOGO DE JUEGOS CON FALLBACK EN IMÁGENES
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

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${game.image}" alt="${game.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';">
                ${overlayHTML}
                ${isMod ? `<button class="edit-card-btn" onclick="openAdminEditModal(event, '${game.id}')" title="Editar Juego"><i class="fas fa-edit"></i></button>` : ''}
                ${!isBlocked ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event, '${game.id}')"><i class="fas fa-heart"></i></button>` : ''}
            </div>
            <div class="card-info" ${!isBlocked ? `onclick="openGameModal('${game.id}')"` : ''}>
                <span class="card-cat">${game.category} ${game.ageRestricted ? '<span class="badge-18-tag">+18</span>' : ''}</span>
                <h4>${game.title}</h4>
                <div class="card-meta">
                    <span><i class="fas fa-hdd"></i> ${game.size}</span>
                    <span><i class="fas fa-server"></i> ${game.server}</span>
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

// MODAL JUEGO
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

    modalContent.innerHTML = `
        <h2 style="font-family: var(--font-head); color: var(--neon-red); margin-bottom: 10px;">
            ${game.title} ${game.ageRestricted ? '<span class="badge-18-tag">+18</span>' : ''}
        </h2>
        <p style="color:#ccc; margin-bottom: 15px;">${game.desc}</p>
        
        <div style="background:#0a0a0f; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color:var(--neon-red); margin-bottom: 8px;">Requisitos del Sistema:</h4>
            <ul style="list-style: none; color: #aaa; font-size: 0.9rem;">
                <li><strong>SO:</strong> ${game.specs ? game.specs.so : 'Windows / Android'}</li>
                <li><strong>Procesador:</strong> ${game.specs ? game.specs.cpu : 'Quad Core'}</li>
                <li><strong>RAM:</strong> ${game.specs ? game.specs.ram : '4 GB'}</li>
                <li><strong>Gráficos:</strong> ${game.specs ? game.specs.gpu : 'Integrados'}</li>
            </ul>
        </div>

        <a href="${game.downloadUrl}" target="_blank" class="btn-primary" style="display:inline-block; text-decoration:none; text-align:center;">
            <i class="fas fa-download"></i> LINK DE DESCARGA (${game.server})
        </a>

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
    document.getElementById('adminCategory').value = game.category;
    document.getElementById('adminSize').value = game.size;
    document.getElementById('adminServer').value = game.server;
    document.getElementById('adminImage').value = game.image;
    document.getElementById('adminAgeRestricted').value = game.ageRestricted ? "true" : "false";
    document.getElementById('adminDownloadUrl').value = game.downloadUrl;
    document.getElementById('adminDesc').value = game.desc;
    document.getElementById('adminFeatured').checked = !!game.featured;
    document.getElementById('adminSo').value = game.specs ? game.specs.so : '';
    document.getElementById('adminCpu').value = game.specs ? game.specs.cpu : '';
    document.getElementById('adminRam').value = game.specs ? game.specs.ram : '';
    document.getElementById('adminGpu').value = game.specs ? game.specs.gpu : '';
    document.getElementById('adminEmbed').value = game.embed || '';

    document.getElementById('btnSaveAdminGame').textContent = "GUARDAR CAMBIOS";
    document.getElementById('btnCancelEdit').classList.remove('hidden');
    switchAdminTab('games');
    document.getElementById('adminModal').classList.add('active');
}

document.getElementById('btnCancelEdit').addEventListener('click', resetAdminForm);

function resetAdminForm() {
    document.getElementById('formAdminGame').reset();
    document.getElementById('adminGameId').value = '';
    document.getElementById('btnSaveAdminGame').textContent = "PUBLICAR / GUARDAR CAMBIOS";
    document.getElementById('btnCancelEdit').classList.add('hidden');
}

document.getElementById('formAdminGame').addEventListener('submit', (e) => {
    e.preventDefault();
    const gameId = document.getElementById('adminGameId').value || 'game_' + Date.now();
    const newGame = {
        id: gameId,
        title: document.getElementById('adminTitle').value.trim(),
        category: document.getElementById('adminCategory').value,
        size: document.getElementById('adminSize').value.trim(),
        server: document.getElementById('adminServer').value.trim(),
        image: document.getElementById('adminImage').value.trim(),
        ageRestricted: document.getElementById('adminAgeRestricted').value === "true",
        downloadUrl: document.getElementById('adminDownloadUrl').value.trim(),
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
            alert("¡Juego guardado con éxito!");
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
            
            document.getElementById('profileAvatarUrl').value = currentUser.avatar;
            document.getElementById('profileAvatarPreview').src = currentUser.avatar;

            const isMod = currentUser.isMod || MODERATOR_EMAILS.includes(currentUser.email);
            if (currentUser.birthdate && !isMod) {
                profileBirthdateInput.disabled = true;
                profileBirthdateInput.style.cursor = 'not-allowed';
                profileBirthdateInput.style.opacity = '0.6';
                if (birthdateNotice) birthdateNotice.textContent = "🔒 La fecha no se puede cambiar.";
            } else {
                profileBirthdateInput.disabled = false;
                profileBirthdateInput.style.cursor = 'pointer';
                profileBirthdateInput.style.opacity = '1';
                if (birthdateNotice) birthdateNotice.textContent = isMod ? "🛠️ (Mod Mode) Puedes cambiar la fecha." : "";
            }

            document.getElementById('profileModal').classList.add('active');
        } else {
            document.getElementById('authModal').classList.add('active');
        }
    });

    window.selectPresetAvatar = function(url) {
        document.getElementById('profileAvatarUrl').value = url;
        document.getElementById('profileAvatarPreview').src = url;
    };

    document.getElementById('profileBirthdate').addEventListener('change', (e) => {
        const ageInfo = calculateAgeInfo(e.target.value);
        document.getElementById('profileAgeBadge').value = ageInfo.label;
    });

    document.getElementById('formProfile').addEventListener('submit', (e) => {
        e.preventDefault();
        const newNick = document.getElementById('profileNickname').value;
        const profileBirthdateInput = document.getElementById('profileBirthdate');
        const isMod = currentUser.isMod || MODERATOR_EMAILS.includes(currentUser.email);

        const newBirthdate = (profileBirthdateInput.disabled && !isMod) 
            ? currentUser.birthdate 
            : profileBirthdateInput.value;

        const newAvatar = document.getElementById('profileAvatarUrl').value || `https://api.dicebear.com/7.x/bottts/svg?seed=${newNick}`;
        const ageInfo = calculateAgeInfo(newBirthdate);

        currentUser.name = newNick;
        currentUser.birthdate = newBirthdate;
        currentUser.age = ageInfo.age;
        currentUser.isAdult = ageInfo.isAdult;
        currentUser.avatar = newAvatar;
        
        localStorage.setItem('basados_user', JSON.stringify(currentUser));

        if (currentUser.userId) {
            usersRef.child(currentUser.userId).update({
                name: newNick,
                birthdate: newBirthdate,
                age: ageInfo.age,
                isAdult: ageInfo.isAdult,
                avatar: newAvatar
            });
        }

        updateUserUI();
        updateFirebasePresence();
        renderGames(loadedGames);
        document.getElementById('profileModal').classList.remove('active');
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('basados_user');
        updateUserUI();
        updateFirebasePresence();
        renderGames(loadedGames);
        document.getElementById('profileModal').classList.remove('active');
    });

    document.getElementById('btnOnlineUsers').addEventListener('click', () => {
        renderOnlineUsersSidebar();
        document.getElementById('onlineModal').classList.add('active');
    });

    // EMOJI PICKER
    const chatInputArea = document.querySelector('.chat-input-area');
    if (chatInputArea && !document.getElementById('emojiPickerBtn')) {
        const emojiBtn = document.createElement('button');
        emojiBtn.type = 'button';
        emojiBtn.id = 'emojiPickerBtn';
        emojiBtn.className = 'btn-secondary';
        emojiBtn.style.cssText = 'padding: 0 10px; background: #14141d; border: 1px solid #282836; font-size: 1.2rem; cursor: pointer; color: #fff;';
        emojiBtn.innerHTML = '🔥';
        
        const emojiMenu = document.createElement('div');
        emojiMenu.id = 'emojiMenu';
        emojiMenu.className = 'hidden';
        emojiMenu.style.cssText = 'position: absolute; bottom: 50px; right: 60px; background: #12121a; border: 1px solid var(--neon-red); border-radius: 8px; padding: 10px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; z-index: 100; box-shadow: 0 0 15px rgba(0,0,0,0.8);';
        
        const emojis = ['🔥', '🎮', '😎', '👑', '🚀', '💯', '💀', '👀', '💪', 'xD'];
        emojis.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.style.cssText = 'cursor: pointer; font-size: 1.3rem; text-align: center; border-radius: 4px; padding: 2px;';
            span.onclick = () => {
                document.getElementById('chatInput').value += ` ${emoji} `;
                emojiMenu.classList.add('hidden');
                document.getElementById('chatInput').focus();
            };
            emojiMenu.appendChild(span);
        });

        chatInputArea.style.position = 'relative';
        chatInputArea.appendChild(emojiMenu);
        chatInputArea.insertBefore(emojiBtn, chatInputArea.querySelector('button[type="submit"]'));

        emojiBtn.onclick = () => emojiMenu.classList.toggle('hidden');
    }

    document.getElementById('formChat').addEventListener('submit', (e) => {
        e.preventDefault();
        const textInput = document.getElementById('chatInput');
        const text = textInput.value.trim();
        if (!text) return;

        messagesRef.push({
            author: currentUser ? currentUser.name : "Invitado Basado",
            avatar: currentUser ? currentUser.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=Guest",
            text: text,
            timestamp: Date.now()
        });

        textInput.value = '';
        const menu = document.getElementById('emojiMenu');
        if (menu) menu.classList.add('hidden');
    });

    document.getElementById('btnNotif').addEventListener('click', () => {
        document.getElementById('notifModal').classList.add('active');
    });

    // TABS AUTH
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active'); tabRegister.classList.remove('active');
        formLogin.classList.add('active'); formRegister.classList.remove('active');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active'); tabLogin.classList.remove('active');
        formRegister.classList.add('active'); formLogin.classList.remove('active');
    });

    // REGISTRO
    formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('regUser').value.trim();
        const birthdate = document.getElementById('regBirthdate').value;
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const pass = document.getElementById('regPass').value;
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;

        const ageInfo = calculateAgeInfo(birthdate);
        const newUserRef = usersRef.push();
        const userData = {
            userId: newUserRef.key,
            name: name,
            birthdate: birthdate,
            age: ageInfo.age,
            isAdult: ageInfo.isAdult,
            email: email,
            pass: pass,
            avatar: avatar,
            isMod: MODERATOR_EMAILS.includes(email)
        };

        newUserRef.set(userData, (error) => {
            if (!error) {
                currentUser = userData;
                localStorage.setItem('basados_user', JSON.stringify(currentUser));
                updateUserUI();
                updateFirebasePresence();
                renderGames(loadedGames);
                document.getElementById('authModal').classList.remove('active');
                
                const statusMessage = ageInfo.isAdult ? "Mayor de 18 años" : "Menor de 18 años";
                alert(`¡Cuenta registrada!\nEdad: ${ageInfo.age} años (${statusMessage})`);
            }
        });
    });

    // LOGIN
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('loginEmail').value.trim().toLowerCase();
        const passInput = document.getElementById('loginPass').value;

        usersRef.orderByChild('email').equalTo(emailInput).once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const usersList = Object.values(data);
                const matchedUser = usersList.find(u => u.pass === passInput);

                if (matchedUser) {
                    currentUser = matchedUser;
                    localStorage.setItem('basados_user', JSON.stringify(currentUser));
                    updateUserUI();
                    updateFirebasePresence();
                    renderGames(loadedGames);
                    document.getElementById('authModal').classList.remove('active');
                } else {
                    alert("Contraseña incorrecta.");
                }
            } else {
                alert("Correo no registrado.");
            }
        });
    });
}

function updateUserUI() {
    if (currentUser) {
        userBtnText.textContent = currentUser.name;
        userAvatarNav.src = currentUser.avatar;
        userAvatarNav.classList.remove('hidden');

        const isMod = currentUser.isMod || MODERATOR_EMAILS.includes(currentUser.email);
        if (isMod) btnAdminPanel.classList.remove('hidden');
        else btnAdminPanel.classList.add('hidden');
    } else {
        userBtnText.textContent = "Ingresar";
        userAvatarNav.classList.add('hidden');
        btnAdminPanel.classList.add('hidden');
    }
}
