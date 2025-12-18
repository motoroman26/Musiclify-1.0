class AlbumUploader {
    constructor() {
        this.tracks = [];
        this.coverFile = null;
        this.isUploading = false;
        this.uploadProgress = 0;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupFileUpload();
        this.setupDragAndDrop();
        this.setupFormValidation();
    }
    
    setupEventListeners() {
        const form = document.getElementById('albumForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('title').addEventListener('input', () => this.previewURL());
        document.getElementById('artist').addEventListener('input', () => this.previewURL());
    }
    
    setupFileUpload() {
        const coverInput = document.getElementById('cover');
        const coverUploadArea = document.getElementById('coverUploadArea');
        
        coverUploadArea.addEventListener('click', (e) => {
            coverInput.click();
        });
        
        coverInput.addEventListener('change', (e) => this.handleCoverUpload(e));
        
        const tracksInput = document.getElementById('tracks');
        const tracksUploadArea = document.getElementById('tracksUploadArea');
        
        tracksUploadArea.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('audio') || e.target.closest('.track-actions')) {
                return;
            }
            tracksInput.click();
        });
        
        tracksInput.addEventListener('change', (e) => this.handleTracksUpload(e));
    }
    
    setupDragAndDrop() {
        const areas = ['coverUploadArea', 'tracksUploadArea'];
        
        areas.forEach(areaId => {
            const area = document.getElementById(areaId);
            
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });
            
            area.addEventListener('dragleave', () => {
                area.classList.remove('drag-over');
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (areaId === 'coverUploadArea') {
                    this.handleCoverDrop(files);
                } else {
                    this.handleTracksDrop(files);
                }
            });
        });
    }
    
    setupFormValidation() {
        const form = document.getElementById('albumForm');
        form.addEventListener('input', (e) => {
            if (e.target.matches('input[required]')) {
                this.validateField(e.target);
            }
        });
    }
    
    validateField(field) {
        const formGroup = field.closest('.form-group');
        let errorText = formGroup.querySelector('.error-text');
        
        if (!errorText) {
            errorText = document.createElement('span');
            errorText.className = 'error-text';
            formGroup.appendChild(errorText);
        }
        
        if (!field.value.trim()) {
            formGroup.classList.add('error');
            errorText.textContent = 'Це поле обов\'язкове';
            return false;
        }
        
        if (field.id === 'year') {
            const year = parseInt(field.value);
            const currentYear = new Date().getFullYear();
            if (year < 1900 || year > currentYear + 1) {
                formGroup.classList.add('error');
                errorText.textContent = `Введіть коректний рік (1900-${currentYear + 1})`;
                return false;
            }
        }
        
        formGroup.classList.remove('error');
        errorText.textContent = '';
        return true;
    }
    
    validateForm() {
        const requiredFields = document.querySelectorAll('input[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        if (this.tracks.length === 0) {
            this.showError('Додайте принаймні один трек');
            isValid = false;
        }
        
        return isValid;
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        if (this.isUploading) return;
        if (!this.validateForm()) return;
        
        this.isUploading = true;
        this.showUploadProgress();
        this.disableForm(true);
        
        try {
            const formData = new FormData();
            formData.append("title", document.getElementById("title").value.trim());
            formData.append("artistName", document.getElementById("artist").value.trim());
            formData.append("year", document.getElementById("year").value);
            
            if (this.coverFile) {
                formData.append("cover", this.coverFile);
            }
            
            this.tracks.forEach((track) => {
                formData.append("tracks", track.file, track.file.name);
            });
            
            this.updateProgress(10, 'Відправка даних на сервер...');
            
            const response = await this.uploadWithProgress(formData);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Помилка завантаження');
            }
            
            const result = await response.json();
            this.onUploadSuccess(result);
            
        } catch (error) {
            this.onUploadError(error);
        } finally {
            this.isUploading = false;
        }
    }
    
    async uploadWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    this.updateProgress(10 + percent * 0.7, `Завантаження файлів: ${percent}%`);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        ok: true,
                        json: () => Promise.resolve(JSON.parse(xhr.responseText))
                    });
                } else {
                    reject(new Error(`HTTP ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Помилка мережі'));
            });
            
            xhr.open('POST', 'http://localhost:5255/api/albums');
            xhr.send(formData);
        });
    }
    
    onUploadSuccess(result) {
        this.updateProgress(100, 'Обробка завершена!');
        
        const artistSlug = this.createSlug(result.artistName || document.getElementById('artist').value.trim());
        const albumId = result.albumId;
        const albumSlug = this.createSlug(result.albumTitle || document.getElementById('title').value.trim());
        
        const albumUrl = `/album/${artistSlug}/${albumSlug}`;
        const fullUrl = `${window.location.origin}${albumUrl}`;
        
        setTimeout(() => {
            this.showSuccessMessage(result, fullUrl, albumUrl);
        }, 1000);
    }
    
    onUploadError(error) {
        this.showError(`Помилка завантаження: ${error.message}`);
        this.disableForm(false);
        this.hideUploadProgress();
    }
    
    createSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9а-яіїєґ\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    }
    
    handleCoverUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showError('Будь ласка, виберіть зображення');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            this.showError('Обкладинка занадто велика (макс. 10MB)');
            return;
        }
        
        this.coverFile = file;
        this.showCoverPreview(file);
    }
    
    handleCoverDrop(files) {
        if (files.length > 0) {
            this.handleCoverUpload({ target: { files } });
        }
    }
    
    showCoverPreview(file) {
        const preview = document.getElementById('coverPreview');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            preview.innerHTML = `
                <div class="cover-preview">
                    <img src="${e.target.result}" alt="Preview">
                </div>
                <div class="cover-info">
                    ${file.name} (${this.formatFileSize(file.size)})
                </div>
            `;
            preview.classList.add('active');
        };
        
        reader.readAsDataURL(file);
    }
    
    handleTracksUpload(e) {
        const files = Array.from(e.target.files);
        this.addTracks(files);
    }
    
    handleTracksDrop(files) {
        this.addTracks(Array.from(files));
    }
    
    addTracks(files) {
        const audioFiles = files.filter(file => file.type.startsWith('audio/'));
        
        if (audioFiles.length === 0) {
            this.showError('Будь ласка, виберіть аудіо файли');
            return;
        }
        
        audioFiles.forEach(file => {
            if (file.size > 50 * 1024 * 1024) {
                this.showError(`Файл "${file.name}" занадто великий (макс. 50MB)`);
                return;
            }
            
            if (!this.tracks.some(t => t.file.name === file.name)) {
                this.tracks.push({
                    file: file,
                    url: URL.createObjectURL(file)
                });
            }
        });
        
        this.renderTrackList();
    }
    
    renderTrackList() {
        const trackList = document.getElementById('trackList');
        
        if (this.tracks.length > 0) {
            trackList.innerHTML = this.tracks.map((track, index) => `
                <div class="track-item" data-index="${index}">
                    <div class="track-number">${index + 1}</div>
                    <div class="track-info">
                        <span class="track-name">${track.file.name}</span>
                        <span class="track-size">${this.formatFileSize(track.file.size)}</span>
                        <div class="audio-preview">
                            <audio controls src="${track.url}"></audio>
                        </div>
                    </div>
                    <div class="track-actions">
                        <button type="button" class="move-up" onclick="albumUploader.moveTrackUp(${index})" 
                                ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button type="button" class="move-down" onclick="albumUploader.moveTrackDown(${index})" 
                                ${index === this.tracks.length - 1 ? 'disabled' : ''}>↓</button>
                        <button type="button" class="remove" onclick="albumUploader.removeTrack(${index})">✖</button>
                    </div>
                </div>
            `).join('');
            
            trackList.classList.add('has-tracks');
        } else {
            trackList.innerHTML = '';
            trackList.classList.remove('has-tracks');
        }
        
        this.showTracksSummary();
    }
    
    moveTrackUp(index) {
        if (index > 0) {
            [this.tracks[index - 1], this.tracks[index]] = [this.tracks[index], this.tracks[index - 1]];
            this.renderTrackList();
        }
    }
    
    moveTrackDown(index) {
        if (index < this.tracks.length - 1) {
            [this.tracks[index], this.tracks[index + 1]] = [this.tracks[index + 1], this.tracks[index]];
            this.renderTrackList();
        }
    }
    
    removeTrack(index) {
        URL.revokeObjectURL(this.tracks[index].url);
        this.tracks.splice(index, 1);
        this.renderTrackList();
    }
    
    showTracksSummary() {
        let summary = document.querySelector('.tracks-summary');
        
        if (this.tracks.length === 0) {
            if (summary) summary.remove();
            return;
        }

        const totalSize = this.tracks.reduce((sum, track) => sum + track.file.size, 0);
        const summaryHtml = `
            <p>Загальна кількість треків: <strong>${this.tracks.length}</strong></p>
            <p>Загальний розмір: <strong>${this.formatFileSize(totalSize)}</strong></p>
        `;
        
        if (!summary) {
            summary = document.createElement('div');
            summary.className = 'tracks-summary';
            document.getElementById('tracksUploadArea').appendChild(summary);
        }
        summary.innerHTML = summaryHtml;
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
    
    previewURL() {
        const artist = document.getElementById('artist').value.trim();
        const title = document.getElementById('title').value.trim();
        
        if (artist && title) {
            const artistSlug = this.createSlug(artist);
            const titleSlug = this.createSlug(title);
            document.getElementById('albumUrl').textContent = `musiclify/${artistSlug}/${titleSlug}`;
            document.getElementById('urlPreview').style.display = 'block';
        }
    }
    
    showUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'block';
    }
    
    hideUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'none';
    }
    
    updateProgress(percent, status) {
        this.uploadProgress = percent;
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressPercent').textContent = `${Math.round(percent)}%`;
        document.getElementById('progressStatus').textContent = status;
    }
    
    disableForm(disabled) {
        const submitBtn = document.getElementById('submitBtn');
        const inputs = document.querySelectorAll('#albumForm input, #albumForm button');
        
        if (disabled) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            inputs.forEach(input => input.disabled = false);
        }
    }
    
    showSuccessMessage(result, fullUrl, albumUrl) {
        document.getElementById('albumFormContainer').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';
        
        document.getElementById('successDetails').textContent = 
            `Альбом "${result.albumTitle || result.title}" від ${result.artistName} з ${result.tracksCount} треками успішно додано.`;
        
        document.getElementById('finalAlbumUrl').textContent = fullUrl;
        
        const viewAlbumBtn = document.getElementById('viewAlbumBtn');
        viewAlbumBtn.href = albumUrl;
        viewAlbumBtn.onclick = (e) => {
            e.preventDefault();
            if (window.contentLoader) {
                window.contentLoader.loadContent('home');
                setTimeout(() => {
                    const artistSlug = this.createSlug(result.artistName);
                    const albumSlug = this.createSlug(result.albumTitle || result.title);
                    window.history.pushState({}, '', `/album/${artistSlug}/${albumSlug}`);
                    window.contentLoader.handleRouting();
                }, 100);
            } else {
                window.location.href = '/index.html';
            }
        };
    }
    
    showError(message) {
        let errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.className = 'error-message';
            document.getElementById('albumForm').prepend(errorDiv);
        }
        
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }
}

let albumUploader;
document.addEventListener('DOMContentLoaded', () => {
    albumUploader = new AlbumUploader();
});