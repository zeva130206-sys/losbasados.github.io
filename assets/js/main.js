// CONFIGURACIÓN DE FIREBASE CON TUS CREDENCIALES
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

// Inicializar Firebase Database
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const messagesRef = db.ref('chat_messages');
const onlineUsersRef = db.ref('online_users');

// LISTA BASE DE JUEGOS
const gamesData = [
    {
        id: 1,
        title: "Mario Kart Wii (PC Port)",
        category: "Carreras",
        size: "2.9 GB",
        server: "MediaFire",
        image: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
        downloadUrl: "https://ouo.io/gx2F6LP",
        specs: {
            so: "Windows 7 / 8 / 10 / 11 (64-bits)",
            cpu: "Intel Core i3 / AMD FX equivalente",
            ram: "4 GB RAM",
            gpu: "Intel HD 4000 / Nvidia GT 710"
        },
        desc: "El clásico juego de carreas de Nintendo totalmente adaptado para PC. Corre en las mejores pistas, usa tus ítems favoritos y compite con el mejor rendimiento."
    },
    {
        id: 2,
        title: "Dying Light 2",
        category: "Acción",
        size: "42 GB",
        server: "Directo / MediaFire",
        image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
        downloadUrl: "#",
        specs: {
            so: "Windows 10",
            cpu: "Intel Core i5-8600K",
            ram: "8 GB RAM",
            gpu: "Nvidia GTX 1050 Ti"
        },
        desc: "Sobrevive en una ciudad infestada de infectados usando parkour y combate cuerpo a cuerpo."
    },
    {
        id: 3,
        title: "Green Hell",
        category: "Supervivencia",
        size: "8 GB",
        server: "MediaFire",
        image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80",
        downloadUrl: "#",
        specs: {
            so: "Windows 7/8/10 64-bit",
            cpu: "3.2 GHz Dual Core",
            ram: "4 GB RAM",
            gpu: "GeForce GTX 660"
        },
        desc: "Simulador de supervivencia en la selva amazónica no explorada. Lucha por tu vida con técnicas reales."
    },
    {
        id: 4,
        title: "Quake II Remaster",
        category: "Retro",
        size: "3.5 GB",
        server: "MediaFire",
        image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
        downloadUrl: "#",
        specs: {
            so: "Windows 10 64-bit",
            cpu: "Intel Core i3-4170",
            ram: "8 GB RAM",
            gpu: "Nvidia GTX 650"
        },
        desc: "El legendario shooter en primera persona vuelve totalmente remasterizado con soporte 4K."
    }
];

// ESTADO DE SESIÓN LOCAL Y VARIABLES GLOBAL DE PRESENCIA
let currentUser = JSON.parse(localStorage.getItem('basados_user')) || null;
let favorites = JSON.parse(localStorage.getItem('basados_favs')) || [];
let currentOnlineList = [];
let myUserRef = null;

// ELEMENTOS DOM
const gamesGrid = document.getElementById('gamesGrid');
const searchInput = document.getElementById('searchInput');
const btnAuth = document.getElementById('btnAuth');
const userBtnText = document.getElementById('userBtnText');
const userAvatarNav = document.getElementById('userAvatarNav');

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    renderGames(gamesData);
    updateUserUI();
    setupEventListeners();
    initRealtimeFirebase();
});

// ESCUCHAR CHAT Y PRESENCIA EN TIEMPO REAL DESDE FIREBASE
function initRealtimeFirebase() {
    // 1. Escuchar mensajes del chat (últimos 50)
    messagesRef.limitToLast(50).on('value', (snapshot) => {
        const data = snapshot.val();
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';

        if (data) {
            Object.values(data).forEach(msg => {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'chat-msg';
                msgDiv.innerHTML = `
                    <img src="${msg.avatar}" alt="${msg.author}">
                    <div class="chat-msg-content">
                        <span class="chat-author">${msg.author}</span>
                        <p class="chat-text">${msg.text}</p>
                    </div>
                `;
                chatMessages.appendChild(msgDiv);
            });

            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 50);
        }
    });

    // 2. Control de usuarios conectados en vivo
    myUserRef = onlineUsersRef.push();
    myUserRef.onDisconnect().remove(); // Al cerrar pestaña se borra automáticamente
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

// ACTUALIZAR REGISTRO DE PRESENCIA
function updateFirebasePresence() {
    if (!myUserRef) return;
    const name = currentUser ? currentUser.name : "Invitado Basado";
    const avatar = currentUser ? currentUser.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=Guest";
    myUserRef.set({ name, avatar });
}

// RENDEREAR SIDEBAR DE USUARIOS EN LÍNEA
function renderOnlineUsersSidebar() {
    const usersList = document.getElementById('onlineUsersList');
    if (!usersList) return;
    usersList.innerHTML = '';

    currentOnlineList.forEach(u => {
        const li = document.createElement('li');
        li.innerHTML = `<img src="${u.avatar}" alt="${u.name}"> <span>${u.name}</span>`;
        usersList.appendChild(li);
    });
}

// RENDEREAR CATÁLOGO DE JUEGOS
function renderGames(data) {
    gamesGrid.innerHTML = '';

    if (data.length === 0) {
        gamesGrid.innerHTML = '<p style="color:#888; grid-column: 1/-1;">No se encontraron juegos en esta categoría.</p>';
        return;
    }

    data.forEach(game => {
        const isFav = favorites.includes(game.id);
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${game.image}" alt="${game.title}">
                <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event, ${game.id})">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="card-info" onclick="openGameModal(${game.id})">
                <span class="card-cat">${game.category}</span>
                <h4>${game.title}</h4>
                <div class="card-meta">
                    <span><i class="fas fa-hdd"></i> ${game.size}</span>
                    <span><i class="fas fa-server"></i> ${game.server}</span>
                </div>
            </div>
        `;
        gamesGrid.appendChild(card);
    });
}

// BUSCADOR & FILTROS
searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    renderGames(gamesData.filter(g => g.title.toLowerCase().includes(val)));
});

document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const cat = e.target.dataset.cat;
        if (cat === 'all') {
            renderGames(gamesData);
        } else if (cat === 'favs') {
            renderGames(gamesData.filter(g => favorites.includes(g.id)));
        } else {
            renderGames(gamesData.filter(g => g.category === cat));
        }
    });
});

// FAVORITOS
function toggleFav(e, gameId) {
    e.stopPropagation();
    if (favorites.includes(gameId)) {
        favorites = favorites.filter(id => id !== gameId);
    } else {
        favorites.push(gameId);
    }
    localStorage.setItem('basados_favs', JSON.stringify(favorites));
    renderGames(gamesData);
}

// MODAL JUEGO
function openGameModal(id) {
    const game = gamesData.find(g => g.id === id);
    if (!game) return;

    const modalContent = document.getElementById('gameModalContent');
    modalContent.innerHTML = `
        <h2 style="font-family: var(--font-head); color: var(--neon-red); margin-bottom: 10px;">${game.title}</h2>
        <p style="color:#ccc; margin-bottom: 15px;">${game.desc}</p>
        
        <div style="background:#0a0a0f; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color:var(--neon-red); margin-bottom: 8px;">Requisitos del Sistema:</h4>
            <ul style="list-style: none; color: #aaa; font-size: 0.9rem;">
                <li><strong>SO:</strong> ${game.specs.so}</li>
                <li><strong>Procesador:</strong> ${game.specs.cpu}</li>
                <li><strong>RAM:</strong> ${game.specs.ram}</li>
                <li><strong>Gráficos:</strong> ${game.specs.gpu}</li>
            </ul>
        </div>

        <a href="${game.downloadUrl}" target="_blank" class="btn-primary" style="display:inline-block; text-decoration:none; text-align:center;">
            <i class="fas fa-download"></i> IR A LINK DE DESCARGA (${game.server})
        </a>
    `;

    document.getElementById('gameModal').classList.add('active');
}

// GESTIÓN DE EVENTOS, MODALES Y FORMS
function setupEventListeners() {
    // Cerrar Modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        });
    });

    // Abrir Auth / Perfil Modal
    btnAuth.addEventListener('click', () => {
        if (currentUser) {
            document.getElementById('profileNickname').value = currentUser.name;
            document.getElementById('profileAvatarUrl').value = currentUser.avatar;
            document.getElementById('profileAvatarPreview').src = currentUser.avatar;
            document.getElementById('profileModal').classList.add('active');
        } else {
            document.getElementById('authModal').classList.add('active');
        }
    });

    // Cambiar Avatar Rápido
    window.selectPresetAvatar = function(url) {
        document.getElementById('profileAvatarUrl').value = url;
        document.getElementById('profileAvatarPreview').src = url;
    };

    // Guardar Cambios de Perfil
    document.getElementById('formProfile').addEventListener('submit', (e) => {
        e.preventDefault();
        const newNick = document.getElementById('profileNickname').value;
        const newAvatar = document.getElementById('profileAvatarUrl').value || `https://api.dicebear.com/7.x/bottts/svg?seed=${newNick}`;

        currentUser.name = newNick;
        currentUser.avatar = newAvatar;

        localStorage.setItem('basados_user', JSON.stringify(currentUser));
        updateUserUI();
        updateFirebasePresence();
        document.getElementById('profileModal').classList.remove('active');
    });

    // Cerrar Sesión
    document.getElementById('btnLogout').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('basados_user');
        updateUserUI();
        updateFirebasePresence();
        document.getElementById('profileModal').classList.remove('active');
    });

    // Abrir Modal Usuarios Online & Foro
    document.getElementById('btnOnlineUsers').addEventListener('click', () => {
        renderOnlineUsersSidebar();
        document.getElementById('onlineModal').classList.add('active');
    });

    // Enviar mensaje al Chat / Foro (Directo a Firebase)
    document.getElementById('formChat').addEventListener('submit', (e) => {
        e.preventDefault();
        const textInput = document.getElementById('chatInput');
        const text = textInput.value.trim();

        if (!text) return;

        const authorName = currentUser ? currentUser.name : "Invitado Basado";
        const authorAvatar = currentUser ? currentUser.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=Guest";

        messagesRef.push({
            author: authorName,
            avatar: authorAvatar,
            text: text,
            timestamp: Date.now()
        });

        textInput.value = '';
    });

    // Notificaciones
    document.getElementById('btnNotif').addEventListener('click', () => {
        document.getElementById('notifModal').classList.add('active');
    });

    // Tabs Login / Registro
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
    });

    // Registro
    formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('regUser').value;
        const email = document.getElementById('regEmail').value;
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;

        currentUser = { name, email, avatar };
        localStorage.setItem('basados_user', JSON.stringify(currentUser));

        updateUserUI();
        updateFirebasePresence();
        document.getElementById('authModal').classList.remove('active');
    });

    // Login
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const name = email.split('@')[0];
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;

        currentUser = { name, email, avatar };
        localStorage.setItem('basados_user', JSON.stringify(currentUser));

        updateUserUI();
        updateFirebasePresence();
        document.getElementById('authModal').classList.remove('active');
    });
}

// ACTUALIZAR INTERFAZ DE USUARIOS
function updateUserUI() {
    if (currentUser) {
        userBtnText.textContent = currentUser.name;
        userAvatarNav.src = currentUser.avatar;
        userAvatarNav.classList.remove('hidden');
    } else {
        userBtnText.textContent = "Ingresar";
        userAvatarNav.classList.add('hidden');
    }
}