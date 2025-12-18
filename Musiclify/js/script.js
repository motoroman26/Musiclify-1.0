document.addEventListener("DOMContentLoaded", async () => {
    const audioPlayer = document.getElementById("audioPlayer");
    const playPauseBtn = document.getElementById("playPause");
    const prevBtn = document.getElementById("prevTrack");
    const nextBtn = document.getElementById("nextTrack");
    const playIcon = document.getElementById("playIcon");
    const progressContainer = document.getElementById("progressContainer");
    const progressPlayed = document.getElementById("progressPlayed");
    const timeDisplay = document.getElementById("time");
    const volumeSlider = document.getElementById("volumeSlider");

    const trackTitleEl = document.getElementById("trackTitle");
    const trackSubtitleEl = document.getElementById("trackSubtitle") || document.querySelector(".track-subtitle");
    const trackCoverEl = document.getElementById("trackCover") || document.querySelector(".track-cover");
    const playerBar = document.querySelector('.player-bar');

    const backendUrl = 'http://localhost:5255';

    let currentPlaylist = [];
    let currentTrackIndex = -1;

    const PLAY_SVG_PATH = `<path fill="currentColor" d="M5 4.623V19.38a1.5 1.5 0 002.26 1.29L22 12 7.26 3.33A1.5 1.5 0 005 4.623Z"/>`;
    const PAUSE_SVG_PATH = `<path fill="currentColor" d="M6 0h4v16H6zm8 0h4v16h-4z"/>`;

    if (volumeSlider) {
        audioPlayer.volume = volumeSlider.value / 100;
    }

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, "0")}`;
    };

    const getBackendFileUrl = (path, type) => {
        if (!path) return null;
        let normalized = path.replace(/\\/g, '/');
        if (normalized.startsWith('http')) return normalized;
        if (normalized.startsWith('/')) normalized = normalized.substring(1);
        if (normalized.toLowerCase().startsWith(type.toLowerCase() + '/')) {
            normalized = normalized.substring(type.length + 1);
        }
        return `${backendUrl}/${type}/${normalized}`;
    };

    async function loadTrack(id, autoPlay = true) {
        if (!id) return;
        try {
            if (progressPlayed) progressPlayed.style.width = "0%";
            if (timeDisplay) timeDisplay.textContent = "0:00 / 0:00";

            const resp = await fetch(`${backendUrl}/api/tracks/${id}`);
            if (!resp.ok) return;
            
            const track = await resp.json();

            const title = track.title || track.Title || "Невідома назва";
            const artistObj = track.artist || track.Artist;
            const albumObj = track.album || track.Album;
            const artistName = artistObj ? (artistObj.artistName || artistObj.ArtistName) : "Невідомий виконавець";
            const albumTitle = albumObj ? (albumObj.title || albumObj.Title) : "";
            const albumYear = albumObj ? (albumObj.year || albumObj.Year) : "";

            if (trackTitleEl) trackTitleEl.textContent = title;
            
            if (trackSubtitleEl) {
                let subtitle = `${artistName} • ${albumTitle}`;
                if (albumYear) subtitle += ` • ${albumYear}`;
                trackSubtitleEl.textContent = subtitle;
            }

            if (trackCoverEl) {
                let rawCover = albumObj ? (albumObj.cover || albumObj.Cover) : null;
                if (rawCover) {
                    trackCoverEl.src = getBackendFileUrl(rawCover, 'covers');
                } else {
                    trackCoverEl.src = 'images/album-cover.jpg';
                }
            }

            let audioPath = track.path || track.Path;
            if (audioPath) {
                audioPlayer.src = getBackendFileUrl(audioPath, 'music');
                if (autoPlay) {
                    try {
                        await audioPlayer.play();
                    } catch (e) {}
                }
            }

            if (playerBar) playerBar.style.display = 'flex';
            updateButtonsState();
            return track;
        } catch (err) {}
    }

    function updateButtonsState() {
        if (prevBtn) {
            prevBtn.style.opacity = currentTrackIndex > 0 ? "1" : "0.5";
            prevBtn.style.cursor = currentTrackIndex > 0 ? "pointer" : "default";
        }
        if (nextBtn) {
            nextBtn.style.opacity = currentTrackIndex < currentPlaylist.length - 1 ? "1" : "0.5";
            nextBtn.style.cursor = currentTrackIndex < currentPlaylist.length - 1 ? "pointer" : "default";
        }
    }

    function playNext() {
        if (currentTrackIndex < currentPlaylist.length - 1) {
            currentTrackIndex++;
            const track = currentPlaylist[currentTrackIndex];
            loadTrack(track.TrackId || track.trackId);
        }
    }

    function playPrev() {
        if (currentTrackIndex > 0) {
            currentTrackIndex--;
            const track = currentPlaylist[currentTrackIndex];
            loadTrack(track.TrackId || track.trackId);
        } else {
            audioPlayer.currentTime = 0;
        }
    }

    playPauseBtn?.addEventListener("click", () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    });

    prevBtn?.addEventListener("click", playPrev);
    nextBtn?.addEventListener("click", playNext);

    audioPlayer.addEventListener("timeupdate", () => {
        const dur = audioPlayer.duration;
        const cur = audioPlayer.currentTime;
        if (dur && !isNaN(dur)) {
            const pct = (cur / dur) * 100;
            if (progressPlayed) progressPlayed.style.width = `${pct}%`;
            timeDisplay.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
        }
    });

    audioPlayer.addEventListener("ended", () => {
        if (currentTrackIndex < currentPlaylist.length - 1) {
            playNext();
        } else {
            if (playIcon) playIcon.innerHTML = PLAY_SVG_PATH;
            if (progressPlayed) progressPlayed.style.width = "0%";
        }
    });

    audioPlayer.addEventListener("play", () => {
        if (playIcon) playIcon.innerHTML = PAUSE_SVG_PATH;
    });
    
    audioPlayer.addEventListener("pause", () => {
        if (playIcon) playIcon.innerHTML = PLAY_SVG_PATH;
    });

    progressContainer?.addEventListener("click", (e) => {
        if (!audioPlayer.duration) return;
        const rect = progressContainer.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pct * audioPlayer.duration;
    });

    volumeSlider?.addEventListener("input", () => {
        audioPlayer.volume = volumeSlider.value / 100;
    });

    window.musicPlayer = {
        loadTrack: (id) => loadTrack(id),
        setQueue: (tracks, startIndex = 0) => {
            currentPlaylist = tracks;
            currentTrackIndex = startIndex;
            const track = currentPlaylist[currentTrackIndex];
            if (track) {
                loadTrack(track.TrackId || track.trackId);
            }
        },
        play: () => audioPlayer.play(),
        pause: () => audioPlayer.pause(),
        getCurrentTime: () => audioPlayer.currentTime,
        setCurrentTime: (time) => { audioPlayer.currentTime = time; }
    };
});

window.toggleUserMenu = function(event) {
    event.stopPropagation(); 
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.toggle('active');
};

document.addEventListener('click', (event) => {
    const menu = document.getElementById('userMenu');
    const profileContainer = document.querySelector('.user-profile-container');
    if (menu && menu.classList.contains('active') && 
        !menu.contains(event.target) && 
        (!profileContainer || !profileContainer.contains(event.target))) {
        menu.classList.remove('active');
    }
});

window.loadContent = (type) => {
    if (typeof contentLoader !== 'undefined') {
        contentLoader.loadContent(type);
    }
};