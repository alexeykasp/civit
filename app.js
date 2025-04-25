document.addEventListener('DOMContentLoaded', () => {
    let currentCursor = null;
    let nextCursor = null;
    
    const elements = {
        gallery: document.getElementById('gallery'),
        loading: document.getElementById('loading'),
        errorContainer: document.getElementById('errorContainer'),
        pagination: document.getElementById('pagination'),
        nsfw: document.getElementById('nsfw'),
        sort: document.getElementById('sort'),
        period: document.getElementById('period'),
        limit: document.getElementById('limit'),
        searchButton: document.getElementById('searchButton')
    };

    // Инициализация приложения
    init();

    function init() {
        elements.limit.addEventListener('change', validateLimit);
        elements.searchButton.addEventListener('click', handleSearch);
        loadFirstPage();
    }

    function validateLimit() {
        let value = parseInt(this.value) || 50;
        this.value = Math.min(200, Math.max(1, value));
    }

    function handleSearch() {
        resetPagination();
        loadFirstPage();
    }

    function resetPagination() {
        currentCursor = null;
        nextCursor = null;
        elements.pagination.innerHTML = '';
    }

    async function loadFirstPage() {
        currentCursor = null;
        await fetchImages();
    }

    async function fetchImages() {
        try {
            showLoadingState();
            const apiUrl = buildApiUrl();
            console.log('API Request:', apiUrl);

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Ошибка ${response.status}`);
            
            const data = await response.json();
            console.log('API Response:', data);

            if (!data.items?.length) throw new Error('Изображения не найдены');
            
            updateCursors(data.metadata);
            displayImages(data.items);
            updateNavigation(data.metadata);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoadingState();
        }
    }

    function buildApiUrl() {
        const url = new URL('https://civitai.com/api/v1/images');
        
        // Параметры пагинации
        if (currentCursor) url.searchParams.set('cursor', currentCursor);
        url.searchParams.set('limit', getValidLimit());

        // Параметры фильтров
        url.searchParams.set('sort', elements.sort.value);
        url.searchParams.set('period', elements.period.value);
        url.searchParams.set('nsfw', getNsfwParam());

        return url.toString();
    }

    function getValidLimit() {
        return Math.min(200, Math.max(1, parseInt(elements.limit.value) || 50));
    }

    function getNsfwParam() {
        const value = elements.nsfw.value;
        if (value === 'X') return 'true&nsfwLevel=X';
        if (value === 'off') return 'false';
        return value;
    }

    function updateCursors(metadata) {
        nextCursor = metadata?.nextCursor;
        console.log('Updated cursors:', { currentCursor, nextCursor });
    }

    function displayImages(images) {
        elements.gallery.innerHTML = images.map(image => `
            <div class="image-card">
                <div class="image-container">
                    <img src="${getImageSource(image)}" 
                         alt="${image.meta?.prompt || 'AI изображение'}"
                         loading="lazy">
                </div>
                <div class="image-info">
                    <h3>${truncateText(image.meta?.prompt, 50)}</h3>
                    <p>❤️ ${image.stats?.heartCount || 0} | 💬 ${image.stats?.commentCount || 0}</p>
                    <p>Модель: ${image.model?.name || 'Неизвестна'}</p>
                </div>
            </div>
        `).join('');
    }

    function getImageSource(image) {
        return image.url || image.meta?.image || image.resources?.[0]?.url || 'https://via.placeholder.com/250x250?text=No+Image';
    }

    function truncateText(text, maxLength) {
        return text?.length > maxLength 
            ? `${text.substring(0, maxLength)}...` 
            : text || 'Без названия';
    }

    function updateNavigation(metadata) {
        elements.pagination.innerHTML = '';
        
        if (metadata?.nextCursor) {
            const loadMoreButton = document.createElement('button');
            loadMoreButton.textContent = 'Загрузить ещё';
            loadMoreButton.className = 'load-more-btn';
            loadMoreButton.addEventListener('click', () => {
                currentCursor = nextCursor;
                fetchImages();
            });
            elements.pagination.appendChild(loadMoreButton);
        }
    }

    function showLoadingState() {
        elements.loading.style.display = 'block';
        elements.gallery.innerHTML = '';
        elements.errorContainer.style.display = 'none';
    }

    function hideLoadingState() {
        elements.loading.style.display = 'none';
    }

    function showError(message) {
        elements.errorContainer.style.display = 'block';
        elements.errorContainer.innerHTML = `
            <div class="error">
                <p>${message}</p>
                <button onclick="window.location.reload()">Перезагрузить</button>
            </div>
        `;
    }
});