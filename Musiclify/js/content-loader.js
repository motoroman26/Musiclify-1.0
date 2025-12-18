class ContentLoader {
    constructor() {
        this.currentContent = 'home';
        this.backendUrl = 'http://localhost:5255';
        this.albumCache = new Map();
        this.currentUser = null;
        this.currentTrackList = [];
        this.init();
    }
    
    init() {
        this.loadUserFromStorage();
        this.setupNavigation();
        this.ensureContentContainer();
        this.handleRouting();
        this.updateUserInterface();
    }
    
    ensureContentContainer() {
        let container = document.getElementById('contentContainer');
        if (!container) {
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                container = document.createElement('div');
                container.id = 'contentContainer';
                mainContent.appendChild(container);
            }
        }
        return container;
    }
    
    loadUserFromStorage() {
        try {
            const userData = localStorage.getItem('musiclify_user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
            }
        } catch (error) {
            localStorage.removeItem('musiclify_user');
            this.currentUser = null;
        }
    }
    
    updateUserInterface() {
        const userProfile = document.querySelector('.user-profile');
        if (!userProfile) return;
        
        if (this.currentUser) {
            const username = this.currentUser.username || this.currentUser.email || 'Користувач';
            const avatarLetter = username.charAt(0).toUpperCase();
            
            userProfile.innerHTML = `
                <div class="user-profile-container" onclick="toggleUserMenu(event)">
                    <div class="avatar">${avatarLetter}</div>
                    <span class="username">${username}</span>
                    <span style="font-size: 10px; margin-left: auto;">▲</span>
                </div>
                <div class="user-menu" id="userMenu">
                    <a href="/add-album.html">
                        <span>➕</span> Додати альбом
                    </a>
                    <a href="#" onclick="contentLoader.loadContent('my-albums')">
                        <span>📁</span> Мої альбоми
                    </a>
                    <div style="height: 1px; background: var(--border-color); margin: 5px 0;"></div>
                    <a href="#" onclick="contentLoader.logout()">
                        <span>🚪</span> Вийти
                    </a>
                </div>
            `;
            
            const libraryMenu = document.querySelector('.library ul');
            if (libraryMenu && !libraryMenu.querySelector('.my-albums-link')) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#" class="my-albums-link" onclick="contentLoader.loadContent('my-albums')"><span class="icon">📁</span> Мої альбоми</a>`;
                libraryMenu.appendChild(li);
            }
        } else {
            userProfile.innerHTML = `
                <div class="user-profile-container" onclick="toggleUserMenu(event)">
                    <div class="avatar">Г</div>
                    <span class="username">Гість</span>
                    <span style="font-size: 10px; margin-left: auto;">▲</span>
                </div>
                <div class="user-menu" id="userMenu">
                    <a href="/login.html"><span>🔑</span> Увійти</a>
                    <a href="/register.html"><span>📝</span> Реєстрація</a>
                </div>
            `;

            const libraryMenu = document.querySelector('.library ul');
            if (libraryMenu) {
                const myAlbumsLink = libraryMenu.querySelector('.my-albums-link');
                if (myAlbumsLink) {
                    myAlbumsLink.closest('li').remove();
                }
            }
        }
    }
    
    async login(email, password) {
        try {
            const response = await fetch(`${this.backendUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.message || `Помилка входу (${response.status})`);
                } catch {
                    throw new Error(`Помилка сервера: ${response.status}`);
                }
            }
            
            const userData = await response.json();
            this.currentUser = userData.user || userData;
            localStorage.setItem('musiclify_user', JSON.stringify(this.currentUser));
            
            this.updateUserInterface();
            this.loadContent('home');
            this.updateURL('home');
            
            return this.currentUser;
        } catch (error) {
            throw new Error(error.message || 'Невірний email або пароль');
        }
    }
    
    async register(username, email, password) {
        try {
            const response = await fetch(`${this.backendUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.message || `Помилка реєстрації (${response.status})`);
                } catch {
                    throw new Error(`Помилка сервера: ${response.status}`);
                }
            }
            
            const userData = await response.json();
            this.currentUser = userData.user || userData;
            localStorage.setItem('musiclify_user', JSON.stringify(this.currentUser));
            
            this.updateUserInterface();
            this.loadContent('home');
            this.updateURL('home');
            
            return this.currentUser;
        } catch (error) {
            throw new Error(error.message || 'Помилка реєстрації');
        }
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('musiclify_user');
        
        this.updateUserInterface();
        this.loadContent('home');
        this.updateURL('home');
    }
    
    setupNavigation() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const onclick = link.getAttribute('onclick');
            if (onclick && onclick.includes('contentLoader.loadContent')) {
                e.preventDefault();
                
                const match = onclick.match(/'([^']+)'/);
                if (match && match[1]) {
                    const contentType = match[1];
                    this.loadContent(contentType);
                    this.updateURL(contentType);
                }
            }
        });
        
        window.addEventListener('popstate', () => {
            this.handleRouting();
        });
    }
    
    handleRouting() {
        const path = window.location.pathname;
        const hash = window.location.hash;
        
        this.ensureContentContainer();
        
        if (path.includes('/album/')) {
            this.handleAlbumRoute(path);
        } else if (hash) {
            const contentType = hash.substring(1);
            this.loadContent(contentType);
        } else if (path === '/' || path === '/index.html' || path === '') {
            this.loadContent('home');
        }
    }
    
    async handleAlbumRoute(path) {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        const parts = path.split('/').filter(part => part);
        
        if (parts.length >= 3 && parts[0] === 'album') {
            const artistSlug = decodeURIComponent(parts[1]);
            const albumSlug = decodeURIComponent(parts[2]);
            
            const albumId = await this.findAlbumBySlug(artistSlug, albumSlug);
            
            if (albumId) {
                await this.loadAlbumPage(albumId);
            } else {
                this.showAlbumError();
            }
        }
    }

    async findAlbumBySlug(artistSlug, albumSlug) {
        try {
            const response = await fetch(`${this.backendUrl}/api/albums`);
            
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const data = await response.json();
            
            let rawAlbums = [];
            if (Array.isArray(data)) rawAlbums = data;
            else if (data.albums && Array.isArray(data.albums)) rawAlbums = data.albums;
            else if (data.data && Array.isArray(data.data)) rawAlbums = data.data;
            
            const albums = this.normalizeAlbumsData(rawAlbums);
            
            const foundAlbum = albums.find(album => {
                const currentArtistSlug = this.createSlug(String(album.Artist?.ArtistName || album.artistName));
                const currentAlbumSlug = this.createSlug(String(album.Title || album.title));
                return currentArtistSlug === artistSlug && currentAlbumSlug === albumSlug;
            });
            
            return foundAlbum?.AlbumId;
        } catch (error) {
            return null;
        }
    }
    
    updateURL(contentType) {
        const newUrl = contentType === 'home' ? '/index.html' : `/#${contentType}`;
        window.history.pushState({}, '', newUrl);
    }
    
    updateAlbumURL(artistSlug, albumSlug, albumId) {
        const newUrl = `/album/${artistSlug}/${albumSlug}`;
        window.history.pushState({ albumId }, '', newUrl);
    }
    
    async loadContent(type) {
        this.currentContent = type;
        
        const container = this.ensureContentContainer();
        if (!container) return;
        
        if (this.requiresAuth(type) && !this.currentUser) {
            window.location.href = '/login.html';
            return;
        }
        
        document.querySelectorAll('.main-nav a, .library a').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[onclick*="${type}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        switch(type) {
            case 'home':
                await this.loadHomeContent();
                break;
            case 'albums':
                await this.loadAlbumsContent();
                break;
            case 'artists':
                await this.loadArtistsContent();
                break;
            case 'search':
                await this.loadSearchContent();
                break;
            case 'my-albums':
                await this.loadMyAlbumsContent();
                break;
            default:
                await this.loadHomeContent();
        }
    }
    
    requiresAuth(contentType) {
        const protectedPages = ['my-albums'];
        return protectedPages.includes(contentType);
    }
    
    async loadHomeContent() {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        const isLoggedIn = !!this.currentUser;
        const username = isLoggedIn ? (this.currentUser.username || this.currentUser.email) : '';
        
        container.innerHTML = `
            <section class="music-section">
                <h2>${isLoggedIn ? `Вітаємо, ${username}!` : 'Ласкаво просимо до Musiclify!'} 🎵</h2>
                <p class="subtitle">${isLoggedIn ? 'Раді вас знову бачити!' : 'Музична платформа для всіх'}</p>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">💿</div>
                        <div class="stat-info">
                            <h3>Альбоми</h3>
                            <p id="albumsCount">Завантаження...</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🧑‍🎤</div>
                        <div class="stat-info">
                            <h3>Артисти</h3>
                            <p id="artistsCount">Завантаження...</p>
                        </div>
                    </div>
                    
                    ${isLoggedIn ? `
                    <div class="stat-card">
                        <div class="stat-icon">👤</div>
                        <div class="stat-info">
                            <h3>Ваш аккаунт</h3>
                            <p>${username}</p>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="quick-actions">
                    <button class="quick-action-btn" onclick="contentLoader.loadAlbumsContent()">
                        <span class="action-icon">📀</span>
                        <span>Переглянути альбоми</span>
                    </button>
                    
                    ${isLoggedIn ? `
                    <button class="quick-action-btn primary" onclick="window.location.href='/add-album.html'">
                        <span class="action-icon">➕</span>
                        <span>Додати альбом</span>
                    </button>
                    
                    <button class="quick-action-btn" onclick="contentLoader.loadMyAlbumsContent()">
                        <span class="action-icon">📁</span>
                        <span>Мої альбоми</span>
                    </button>
                    ` : `
                    <button class="quick-action-btn primary" onclick="window.location.href='/register.html'">
                        <span class="action-icon">📝</span>
                        <span>Зареєструватися</span>
                    </button>
                    
                    <button class="quick-action-btn" onclick="window.location.href='/login.html'">
                        <span class="action-icon">🔑</span>
                        <span>Увійти</span>
                    </button>
                    `}
                </div>
            </section>
        `;
        
        await this.loadStats();
    }
    
    async loadStats() {
        try {
            const response = await fetch(`${this.backendUrl}/api/albums`);
            const data = await response.json();
            
            let albums = [];
            if (Array.isArray(data)) {
                albums = data;
            } else if (data.albums && Array.isArray(data.albums)) {
                albums = data.albums;
            } else if (data.data && Array.isArray(data.data)) {
                albums = data.data;
            }
            
            const artists = new Set();
            albums.forEach(album => {
                const artistName = album.artist?.artistName || album.Artist?.ArtistName || album.artistName;
                if (artistName) artists.add(artistName);
            });
            
            const albumsCount = document.getElementById('albumsCount');
            const artistsCount = document.getElementById('artistsCount');
            
            if (albumsCount) albumsCount.textContent = `${albums.length} альбомів`;
            if (artistsCount) artistsCount.textContent = `${artists.size} артистів`;
            
        } catch (error) {
            const albumsCount = document.getElementById('albumsCount');
            const artistsCount = document.getElementById('artistsCount');
            
            if (albumsCount) albumsCount.textContent = 'Помилка';
            if (artistsCount) artistsCount.textContent = 'Помилка';
        }
    }
    
    getCoverUrl(coverPath) {
        if (!coverPath) return this.createDefaultCover('M');
        if (coverPath.startsWith('http')) return coverPath;
        
        let cleanPath = coverPath.replace(/^(\.\.\/)+/, '');
        if (cleanPath.startsWith('covers/') || cleanPath.startsWith('covers\\')) {
             cleanPath = cleanPath.substring(7);
        }
        
        return `${this.backendUrl}/covers/${cleanPath}`;
    }
    
    createDefaultCover(text) {
        const colors = ['#1DB954', '#E91E63', '#9C27B0', '#2196F3', '#FF9800'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 300, 300);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.charAt(0).toUpperCase(), 150, 150);
        
        return canvas.toDataURL();
    }
    
    async loadAlbumsContent() {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p class="loading-text">Завантаження альбомів...</p>
            </div>
        `;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/albums`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            let albumsArray = [];
            
            if (Array.isArray(data)) {
                albumsArray = data;
            } else if (data.albums && Array.isArray(data.albums)) {
                albumsArray = data.albums;
            } else if (data.data && Array.isArray(data.data)) {
                albumsArray = data.data;
            } else if (typeof data === 'object' && data !== null) {
                albumsArray = [data];
            }
            
            const normalizedAlbums = this.normalizeAlbumsData(albumsArray);
            
            normalizedAlbums.forEach(album => {
                this.albumCache.set(album.AlbumId, album);
            });
            
            if (normalizedAlbums.length === 0) {
                container.innerHTML = `
                    <div class="albums-page-container">
                        <div class="albums-header">
                            <h1>Всі альбоми</h1>
                            <p class="subtitle">0 альбомів</p>
                        </div>
                        
                        <div class="empty-state">
                            <div class="empty-state-icon">💿</div>
                            <h3>Альбоми відсутні</h3>
                            <p>База даних порожня</p>
                            <button class="add-album-btn" onclick="window.location.href='/add-album.html'">
                                ➕ Додати альбом
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="albums-page-container">
                    <div class="albums-header">
                        <h1>Всі альбоми</h1>
                        <p class="subtitle">${normalizedAlbums.length} альбомів</p>
                    </div>
                    
                    <div class="albums-list" id="albumsList">
                        ${this.renderAlbumsList(normalizedAlbums)}
                    </div>
                </div>
            `;
            
        } catch (error) {
            container.innerHTML = `
                <div class="albums-page-container">
                    <div class="albums-header">
                        <h1>Всі альбоми</h1>
                        <p class="subtitle">Помилка завантаження</p>
                    </div>
                    
                    <div class="error-message">
                        <h2>Не вдалося завантажити альбоми 😔</h2>
                        <p>Помилка: ${error.message}</p>
                        
                        <div class="action-buttons">
                            <button onclick="contentLoader.loadAlbumsContent()" class="back-button">🔄 Спробувати знову</button>
                            <button onclick="contentLoader.loadHomeContent()" class="back-button">🏠 На головну</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    normalizeAlbumsData(albums) {
        if (!Array.isArray(albums)) return [];
        
        return albums.map(album => {
            try {
                const albumId = album.albumId || album.AlbumId || album.id || 0;
                const title = album.title || album.Title || 'Без назви';
                const artistName = album.artist?.artistName || 
                                 album.Artist?.ArtistName || 
                                 album.artistName || 
                                 album.ArtistName || 
                                 'Невідомий артист';
                const year = album.year || album.Year || new Date().getFullYear();
                const cover = album.cover || album.Cover || '';
                const tracksNumber = album.tracksNumber || album.TracksNumber || album.tracks || 0;
                const artistId = album.artist?.artistId || album.Artist?.ArtistId || 0;
                
                return {
                    AlbumId: albumId,
                    Title: title,
                    Year: year,
                    Cover: cover,
                    TracksNumber: tracksNumber,
                    Artist: {
                        ArtistId: artistId,
                        ArtistName: artistName
                    }
                };
            } catch (error) {
                return null;
            }
        }).filter(album => album !== null && album.AlbumId && album.Title);
    }
    
    renderAlbumsList(albums) {
        return albums.map((album, index) => {
            const albumId = album.AlbumId;
            const title = album.Title;
            const artistName = album.Artist.ArtistName;
            const year = album.Year;
            const tracksNumber = album.TracksNumber;
            const coverUrl = this.getCoverUrl(album.Cover);
            
            const artistSlug = this.createSlug(artistName);
            const albumSlug = this.createSlug(title);
            
            return `
                <div class="album-list-item" 
                     style="cursor: pointer;"
                     onclick="contentLoader.loadAlbumPage(${albumId})"
                     data-album-id="${albumId}"
                     data-artist-slug="${artistSlug}"
                     data-album-slug="${albumSlug}">
                    
                    <div class="album-list-number">${index + 1}</div>
                    
                    <div class="album-list-cover">
                        <img src="${coverUrl}" 
                             alt="${title}"
                             onerror="this.onerror=null; this.src='${this.createDefaultCover(title.charAt(0))}'">
                    </div>
                    
                    <div class="album-list-info">
                        <div class="album-list-title">${this.escapeHtml(title)}</div>
                        <div class="album-list-artist">${this.escapeHtml(artistName)}</div>
                    </div>
                    
                    <div class="album-list-year">${year}</div>
                    
                    <div class="album-list-tracks">${tracksNumber} ${this.getPluralForm(tracksNumber, 'трек', 'треки', 'треків')}</div>
                </div>
            `;
        }).join('');
    }
    
    async loadAlbumPage(albumId) {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p class="loading-text">Завантаження альбому...</p>
            </div>
        `;
        
        try {
            let album = this.albumCache.get(albumId);
            
            if (!album) {
                const response = await fetch(`${this.backendUrl}/api/albums/${albumId}`);
                if (!response.ok) throw new Error('Альбом не знайдено');
                
                const data = await response.json();
                const normalized = this.normalizeAlbumsData([data]);
                album = normalized[0];
                
                if (album) {
                    this.albumCache.set(albumId, album);
                }
            }
            
            let tracks = [];
            try {
                const tracksResponse = await fetch(`${this.backendUrl}/api/albums/${albumId}/tracks`);
                if (tracksResponse.ok) {
                    const tracksData = await tracksResponse.json();
                    tracks = Array.isArray(tracksData) ? tracksData : 
                            (tracksData.tracks || tracksData.data || []);
                }
            } catch (tracksError) {}
            
            const artistSlug = this.createSlug(album.Artist.ArtistName);
            const albumSlug = this.createSlug(album.Title);
            this.updateAlbumURL(artistSlug, albumSlug, albumId);
            
            this.renderAlbumPage(album, tracks);
            
        } catch (error) {
            this.showAlbumError(error.message);
        }
    }
    
    renderAlbumPage(album, tracks) {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        this.currentTrackList = tracks;

        const coverUrl = this.getCoverUrl(album.Cover);
        const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || track.Duration || 0), 0);
        
        container.innerHTML = `
            <div class="album-page-container">
                <div class="album-header">
                    <div class="album-cover-large">
                        <img src="${coverUrl}" 
                             alt="${album.Title}"
                             onerror="this.onerror=null; this.src='${this.createDefaultCover(album.Title.charAt(0))}'">
                    </div>
                    
                    <div class="album-info">
                        <div class="album-type">АЛЬБОМ</div>
                        <h1 class="album-title">${this.escapeHtml(album.Title)}</h1>
                        <div class="album-artist">${this.escapeHtml(album.Artist.ArtistName)}</div>
                        
                        <div class="album-meta">
                            <span>${album.Year}</span>
                            <span>•</span>
                            <span>${album.TracksNumber} ${this.getPluralForm(album.TracksNumber, 'трек', 'треки', 'треків')}</span>
                            <span>•</span>
                            <span>${this.formatDuration(totalDuration)}</span>
                        </div>
                        
                        <div class="album-actions">
                            <button class="play-button" onclick="contentLoader.playTrack(${tracks[0]?.TrackId || tracks[0]?.trackId})">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="play-icon" style="fill: currentColor;">
                                    <path d="M5 4.623V19.38a1.5 1.5 0 002.26 1.29L22 12 7.26 3.33A1.5 1.5 0 005 4.623Z"/>
                                </svg>
                                <span>Відтворити</span>
                            </button>
                            
                            <button class="action-button" onclick="contentLoader.shareAlbum(${album.AlbumId})">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="action-icon" style="fill: currentColor;">
                                    <path d="M10 3.158V7.51c-5.428.223-8.27 3.75-8.875 11.199-.04.487-.07.975-.09 1.464l-.014.395c-.014.473.578.684.88.32.302-.368.61-.73.925-1.086l.244-.273c1.79-1.967 3-2.677 4.93-2.917a18.011 18.011 0 012-.112v4.346a1 1 0 001.646.763l9.805-8.297 1.55-1.31-1.55-1.31-9.805-8.297A1 1 0 0010 3.158Zm2 6.27v.002-4.116l7.904 6.688L12 18.689v-4.212l-2.023.024c-1.935.022-3.587.17-5.197 1.024a9 9 0 00-1.348.893c.355-1.947.916-3.39 1.63-4.4251.062-1.541 2.607-2.385 5.02-2.485L12 9.428Z"/>
                                </svg>
                                <span>Поділитися</span>
                            </button>
                            
                            <button class="action-button" onclick="contentLoader.loadAlbumsContent()">
                                <span class="action-icon">←</span>
                                <span>До альбомів</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="tracks-section">
                    <h2>Треки</h2>
                    
                    ${tracks.length > 0 ? `
                        <div class="tracks-list">
                            ${tracks.map((track, index) => `
                                <div class="track-item" 
                                     style="cursor: pointer;"
                                     onclick="contentLoader.playTrack(${track.trackId || track.TrackId || index})"
                                     data-track-id="${track.trackId || track.TrackId || index}">
                                    <div class="track-number">${index + 1}</div>
                                    <div class="track-info">
                                        <div class="track-title">${track.title || track.Title || 'Без назви'}</div>
                                        <div class="track-artist">${album.Artist.ArtistName}</div>
                                    </div>
                                    <div class="track-duration">${this.formatDuration(track.duration || track.Duration || 0)}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">🎵</div>
                            <h3>Треки відсутні</h3>
                            <p>В цьому альбомі ще немає музичних треків</p>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        document.title = `${album.Title} - ${album.Artist.ArtistName} | Musiclify`;
    }
    
    async loadMyAlbumsContent() {
        if (!this.currentUser) {
            window.location.href = '/login.html';
            return;
        }
        
        const container = this.ensureContentContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p class="loading-text">Завантаження ваших альбомів...</p>
            </div>
        `;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/albums`);
            const data = await response.json();
            
            let albumsArray = [];
            if (Array.isArray(data)) {
                albumsArray = data;
            } else if (data.albums && Array.isArray(data.albums)) {
                albumsArray = data.albums;
            } else if (data.data && Array.isArray(data.data)) {
                albumsArray = data.data;
            }
            
            const normalizedAlbums = this.normalizeAlbumsData(albumsArray);
            
            if (normalizedAlbums.length === 0) {
                container.innerHTML = `
                    <div class="albums-page-container">
                        <div class="albums-header">
                            <h1>Мої альбоми</h1>
                            <p class="subtitle">У вас ще немає альбомів</p>
                        </div>
                        
                        <div class="empty-state">
                            <div class="empty-state-icon">📁</div>
                            <h3>Альбоми відсутні</h3>
                            <p>Створіть свій перший альбом!</p>
                            <button class="add-album-btn" onclick="window.location.href='/add-album.html'">
                                ➕ Створити альбом
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="albums-page-container">
                    <div class="albums-header">
                        <h1>Мої альбоми</h1>
                        <p class="subtitle">${normalizedAlbums.length} альбомів</p>
                    </div>
                    
                    <div class="albums-list" id="albumsList">
                        ${this.renderAlbumsList(normalizedAlbums)}
                    </div>
                </div>
            `;
            
        } catch (error) {
            container.innerHTML = `
                <div class="error-message">
                    <h2>Не вдалося завантажити ваші альбоми</h2>
                    <p>${error.message}</p>
                    <button onclick="contentLoader.loadMyAlbumsContent()" class="back-button">Спробувати знову</button>
                </div>
            `;
        }
    }
    
    showAlbumError(message = 'Альбом не знайдено') {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-message">
                <h2>😔 ${message}</h2>
                <p>Не вдалося завантажити альбом. Можливо, він був видалений або сталася помилка.</p>
                
                <div class="action-buttons">
                    <button onclick="contentLoader.loadAlbumsContent()" class="back-button">
                        ← Повернутися до альбомів
                    </button>
                    <button onclick="contentLoader.loadHomeContent()" class="back-button">
                        🏠 На головну
                    </button>
                </div>
            </div>
        `;
    }
    
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, "0")}`;
    }
    
    createSlug(text) {
        if (!text) return 'unknown';
        return String(text).toLowerCase()
            .replace(/[^a-z0-9а-яіїєґ\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getPluralForm(count, one, few, many) {
        if (!count) return many;
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return many;
        if (lastDigit === 1) return one;
        if (lastDigit >= 2 && lastDigit <= 4) return few;
        return many;
    }
    
    async loadArtistsContent() {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p class="loading-text">Завантаження виконавців...</p>
            </div>
        `;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/albums`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            let albumsArray = [];
            
            if (Array.isArray(data)) {
                albumsArray = data;
            } else if (data.albums && Array.isArray(data.albums)) {
                albumsArray = data.albums;
            } else if (data.data && Array.isArray(data.data)) {
                albumsArray = data.data;
            }

            const artistsMap = new Map();

            albumsArray.forEach(album => {
                const artistName = album.artist?.artistName || album.Artist?.ArtistName || album.artistName || 'Невідомий виконавець';
                
                if (!artistsMap.has(artistName)) {
                    artistsMap.set(artistName, {
                        name: artistName,
                        albumsCount: 0,
                        tracksCount: 0
                    });
                }
                
                const stats = artistsMap.get(artistName);
                stats.albumsCount++;
                stats.tracksCount += (album.tracksNumber || album.TracksNumber || 0);
            });

            const artists = Array.from(artistsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            
            if (artists.length === 0) {
                container.innerHTML = `
                    <div class="albums-page-container">
                        <div class="albums-header">
                            <h1>Виконавці</h1>
                            <p class="subtitle">0 виконавців</p>
                        </div>
                        
                        <div class="empty-state">
                            <div class="empty-state-icon">🧑‍🎤</div>
                            <h3>Виконавці відсутні</h3>
                            <p>База даних порожня</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="albums-page-container">
                    <div class="albums-header">
                        <h1>Виконавці</h1>
                        <p class="subtitle">${artists.length} виконавців</p>
                    </div>
                    
                    <div class="albums-list" id="artistsList">
                        ${this.renderArtistsList(artists)}
                    </div>
                </div>
            `;
            
        } catch (error) {
            container.innerHTML = `
                <div class="albums-page-container">
                    <div class="albums-header">
                        <h1>Виконавці</h1>
                        <p class="subtitle">Помилка завантаження</p>
                    </div>
                    
                    <div class="error-message">
                        <h2>Не вдалося завантажити виконавців 😔</h2>
                        <p>Помилка: ${error.message}</p>
                        
                        <div class="action-buttons">
                            <button onclick="contentLoader.loadArtistsContent()" class="back-button">🔄 Спробувати знову</button>
                            <button onclick="contentLoader.loadHomeContent()" class="back-button">🏠 На головну</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    renderArtistsList(artists) {
        return artists.map((artist, index) => {
            const safeName = artist.name.replace(/'/g, "\\'");
            return `
                <div class="album-list-item" 
                     style="cursor: pointer; grid-template-columns: 50px 1fr auto; padding: 25px 30px; align-items: center;"
                     onclick="contentLoader.loadArtistPage('${safeName}')">
                    <div class="album-list-number" style="font-size: 18px; color: var(--text-faded);">${index + 1}</div>
                    
                    <div class="album-list-info" style="display: flex; flex-direction: column; gap: 8px;">
                        <div class="album-list-title" style="font-size: 26px; font-weight: 700; color: var(--text-light); line-height: 1.2;">
                            ${this.escapeHtml(artist.name)}
                        </div>
                        <div class="album-list-artist" style="font-size: 16px; color: var(--text-faded); opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">
                            Виконавець
                        </div>
                    </div>
                    
                    <div class="album-list-year" style="text-align: right; color: var(--text-faded); font-size: 16px; font-weight: 500;">
                        <span style="color: var(--text-light); font-weight: 700;">${artist.albumsCount}</span> ${this.getPluralForm(artist.albumsCount, 'альбом', 'альбоми', 'альбомів')} 
                        <span style="margin: 0 8px; opacity: 0.5;">•</span>
                        <span style="color: var(--text-light); font-weight: 700;">${artist.tracksCount}</span> ${this.getPluralForm(artist.tracksCount, 'трек', 'треки', 'треків')}
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadArtistPage(artistName) {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p class="loading-text">Завантаження сторінки виконавця...</p>
            </div>
        `;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/albums`);
            if (!response.ok) throw new Error('Помилка завантаження даних');
            
            const data = await response.json();
            let albumsArray = [];
             if (Array.isArray(data)) {
                albumsArray = data;
            } else if (data.albums && Array.isArray(data.albums)) {
                albumsArray = data.albums;
            } else if (data.data && Array.isArray(data.data)) {
                albumsArray = data.data;
            }

            const normalizedAlbums = this.normalizeAlbumsData(albumsArray);
            const artistAlbums = normalizedAlbums.filter(album => album.Artist.ArtistName === artistName);
            
            container.innerHTML = `
                <div class="albums-page-container">
                    <button class="action-button" onclick="contentLoader.loadArtistsContent()" style="margin-bottom: 30px; border: none; padding-left: 0; background: none; color: var(--text-faded); width: auto;">
                        <span class="action-icon" style="margin-right: 5px;">←</span> Назад до виконавців
                    </button>

                    <div class="albums-header" style="margin-bottom: 50px;">
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                            <span style="font-size: 14px; color: var(--text-faded); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; font-weight: 700;">Виконавець</span>
                            <h1 style="font-size: 64px; margin: 0; line-height: 1.1; font-weight: 900; letter-spacing: -2px;">${this.escapeHtml(artistName)}</h1>
                            <p style="color: var(--text-light); margin-top: 20px; font-size: 18px; opacity: 0.8;">
                                ${artistAlbums.length} ${this.getPluralForm(artistAlbums.length, 'альбом', 'альбоми', 'альбомів')}
                            </p>
                        </div>
                    </div>
                    
                    <h2 style="font-size: 24px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">Дискографія</h2>
                    
                    ${artistAlbums.length > 0 ? `
                        <div class="albums-list">
                            ${this.renderAlbumsList(artistAlbums)}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">💿</div>
                            <h3>Альбоми відсутні</h3>
                        </div>
                    `}
                </div>
            `;
            
        } catch (error) {
            container.innerHTML = `
                <div class="error-message">
                    <h2>Помилка</h2>
                    <p>${error.message}</p>
                    <button onclick="contentLoader.loadArtistsContent()" class="back-button">Назад</button>
                </div>
            `;
        }
    }
    
    async loadSearchContent() {
        const container = this.ensureContentContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="albums-page-container">
                <div class="albums-header">
                    <h1>Пошук треків</h1>
                    <div style="margin-top: 20px;">
                        <input type="text" 
                               id="searchInput" 
                               placeholder="Введіть назву треку або виконавця..." 
                               style="width: 100%; max-width: 600px; padding: 15px 25px; font-size: 16px; border-radius: 30px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: white; outline: none; transition: all 0.3s;">
                    </div>
                </div>
                
                <div id="searchResults" style="margin-top: 30px;">
                    <div class="empty-state">
                        <div class="empty-state-icon" style="font-size: 48px; margin-bottom: 15px;">🎹</div>
                        <p style="font-size: 18px; color: var(--text-faded);">Почніть вводити текст для пошуку музики</p>
                    </div>
                </div>
            </div>
        `;
        
        const input = document.getElementById('searchInput');
        input.focus();
        
        input.addEventListener('focus', () => input.style.borderColor = 'var(--primary-color)');
        input.addEventListener('blur', () => input.style.borderColor = 'var(--border-color)');
        
        let debounceTimer;
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            if (query.length >= 1) {
                debounceTimer = setTimeout(() => this.performSearch(query), 300);
            } else {
                document.getElementById('searchResults').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon" style="font-size: 48px; margin-bottom: 15px;">🎹</div>
                        <p style="font-size: 18px; color: var(--text-faded);">Почніть вводити текст для пошуку музики</p>
                    </div>
                `;
            }
        });
    }

    async performSearch(query) {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = `
            <div class="loading-container" style="padding: 40px 0;">
                <div class="spinner"></div>
            </div>
        `;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/tracks/search/${encodeURIComponent(query)}`);
            
            if (!response.ok) throw new Error('Помилка пошуку');
            
            const tracks = await response.json();
            
            this.currentTrackList = tracks;

            if (tracks.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-state" style="padding: 40px 0;">
                        <div class="empty-state-icon" style="font-size: 48px; margin-bottom: 15px;">🤷‍♂️</div>
                        <h3 style="margin-bottom: 10px;">Нічого не знайдено</h3>
                        <p style="color: var(--text-faded);">Спробуйте змінити запит</p>
                    </div>
                `;
                return;
            }
            
            resultsContainer.innerHTML = `
                <h3 style="margin-bottom: 20px; color: var(--text-faded); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Результати пошуку (${tracks.length})</h3>
                <div class="tracks-list" style="display: flex; flex-direction: column; gap: 8px;">
                    ${tracks.map((track, index) => {
                        const albumCover = this.getCoverUrl(track.album?.cover || track.Album?.Cover);
                        const duration = this.formatDuration(track.duration || track.Duration || 0);
                        const trackId = track.trackId || track.TrackId;
                        const title = this.escapeHtml(track.title || track.Title);
                        const artist = this.escapeHtml(track.artist?.artistName || track.Artist?.ArtistName);
                        
                        return `
                        <div class="track-item search-result-item" 
                             style="cursor: pointer; display: flex; align-items: center; padding: 10px 15px; border-radius: 8px; background: rgba(255,255,255,0.03); transition: background 0.2s ease;"
                             onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                             onmouseout="this.style.background='rgba(255,255,255,0.03)'"
                             onclick="contentLoader.playTrack(${trackId})">
                            
                            <div class="track-info" style="display: flex; align-items: center; gap: 15px; flex-grow: 1; justify-content: flex-start; width: auto; padding: 0;">
                                <img src="${albumCover}" alt="${title}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                                <div style="display: flex; flex-direction: column; justify-content: center; text-align: left;">
                                    <div class="track-title" style="color: white; font-weight: 600; font-size: 16px; margin-bottom: 4px;">${title}</div>
                                    <div class="track-artist" style="font-size: 14px; color: var(--text-faded);">${artist}</div>
                                </div>
                            </div>
                            
                            <div class="track-duration" style="font-size: 14px; color: var(--text-faded); margin-left: 15px;">${duration}</div>
                        </div>
                        `;
                    }).join('')}
                </div>
            `;
            
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 30px;">
                    <p style="color: #ff5252;">Сталася помилка під час пошуку. Спробуйте пізніше.</p>
                </div>
            `;
        }
    }
    
    async playAlbum(albumId) {
        try {
            const response = await fetch(`${this.backendUrl}/api/albums/${albumId}/tracks`);
            if (response.ok) {
                const tracks = await response.json();
                if (tracks.length > 0) {
                    const firstTrack = tracks[0];
                    this.playTrack(firstTrack.trackId || firstTrack.TrackId);
                } else {
                    alert('Альбом порожній');
                }
            }
        } catch (e) {}
    }
    
    playTrack(trackId) {
        if (!window.musicPlayer) return;
        
        const index = this.currentTrackList.findIndex(t => (t.trackId || t.TrackId) == trackId);
        
        if (index !== -1) {
            window.musicPlayer.setQueue(this.currentTrackList, index);
        } else {
            window.musicPlayer.loadTrack(trackId);
        }
    }
    
    shareAlbum(albumId) {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Посилання скопійовано в буфер обміну!');
        }).catch(err => {
            alert('Не вдалося скопіювати посилання');
        });
    }
}

let contentLoader;

document.addEventListener('DOMContentLoaded', () => {
    contentLoader = new ContentLoader();
});

window.loadContent = (type) => {
    if (typeof contentLoader !== 'undefined') {
        contentLoader.loadContent(type);
    }
};