document.addEventListener('DOMContentLoaded', () => {
    function truncateText(text, maxLength) {
        if (!text) return 'Без названия';
        return text.length > maxLength 
            ? text.substring(0, maxLength) + '...' 
            : text;
    }
    let currentCursor = null;
    let nextCursor = null;
    let isFetching = false;

    const elements = {
        gallery: document.getElementById('gallery'),
        loading: document.getElementById('loading'),
        errorContainer: document.getElementById('errorContainer'),
        nsfw: document.getElementById('nsfw'),
        sort: document.getElementById('sort'),
        period: document.getElementById('period'), // Важно!
        limit: document.getElementById('limit'),
        searchButton: document.getElementById('searchButton'),
        modelId: document.getElementById('modelId'), // Важно!
    };

    // Элементы модального окна
    const modal = document.getElementById('modal');
    const modalMedia = document.getElementById('modalMedia');
    const modalMeta = document.getElementById('modalMeta');
    const modalClose = document.querySelector('.modal-close');

    // Инициализация
    init();

    function init() {
        elements.searchButton.addEventListener('click', handleSearch);
        window.addEventListener('scroll', handleScroll);
        modalClose.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        loadFirstPage();
    }

    function handleSearch() {
        resetState();
        loadFirstPage();
    }

    function resetState() {
        currentCursor = null;
        nextCursor = null;
        elements.gallery.innerHTML = '';
        isFetching = false;
        elements.modelId.value = ''; // Очищаем поле при сбросе
    }

    async function loadFirstPage() {
        currentCursor = null;
        await fetchImages();
    }

    async function fetchImages() {
        if (isFetching) return;
        isFetching = true;
        showLoading();

        try {
            const apiUrl = buildApiUrl();
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }

            const data = await response.json();
            if (!data.items?.length) throw new Error('Нет данных');

            nextCursor = data.metadata?.nextCursor;
            displayContent(data.items);

        } catch (error) {
            showError(error.message);
        } finally {
            isFetching = false;
            hideLoading();
        }
    }

    function buildApiUrl() {
        const url = new URL('https://civitai.com/api/v1/images');
        
        // Основные параметры
        url.searchParams.set('limit', getValidLimit());
        if (currentCursor) url.searchParams.set('cursor', currentCursor);
        
        // Фильтр по ID модели
        const modelId = elements.modelId.value.trim();
        if (modelId) url.searchParams.set('modelId', modelId);
    
        // Остальные параметры
        url.searchParams.set('sort', elements.sort.value);
        url.searchParams.set('period', elements.period.value);
        url.searchParams.set('nsfw', elements.nsfw.value === 'true');
    
        return url.toString();
    }

    function getValidLimit() {
        return Math.min(200, Math.max(1, parseInt(elements.limit.value) || 50));
    }

    function displayContent(items) {
        const parser = new DOMParser();
        
        items.forEach(item => {
            const mediaUrl = item.url || 'https://via.placeholder.com/250';
            const isVideo = mediaUrl.match(/\.(mp4|webm)$/i);
            const coverUrl = item.coverUrl || 'default-cover.jpg'; // Предполагаем, что API возвращает coverUrl

            // Предзагрузка обложки
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.as = 'image';
            preloadLink.href = coverUrl;
            document.head.appendChild(preloadLink);

            const html = `
                <div class="media-card">
                    <div class="media-container">
                        ${isVideo ? `
                            <video controls muted playsinline
                                preload="metadata"
                                poster="${coverUrl}"
                                onerror="this.parentElement.innerHTML = 'Ошибка загрузки видео'">
                                <source src="${mediaUrl}" type="video/mp4">
                            </video>
                        ` : `
                            <img src="${mediaUrl}" 
                                 loading="lazy"
                                 onerror="this.src='error-image.png'">
                        `}
                    </div>
                    <div class="media-info">
                        <h3>${truncateText(item.meta?.prompt, 50)}</h3>
                        <p>❤️ ${item.stats?.heartCount || 0}</p>
                    </div>
                </div>
            `;

            const card = parser.parseFromString(html, 'text/html').body.firstChild;
            
            // Обработка ошибок загрузки обложки
            if(isVideo) {
                const video = card.querySelector('video');
                video.addEventListener('error', () => {
                    video.poster = 'error-image.png';
                });
            }

            // Add click handler to show modal
            card.addEventListener('click', () => showModal(item));

            elements.gallery.appendChild(card);
        });
    }

    function showModal(item) {
        const mediaUrl = item.url;
        const isVideo = mediaUrl.match(/\.(mp4|webm)$/i);

        // Format date nicely
        const createdAt = new Date(item.createdAt).toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Prepare media content
        const mediaHtml = isVideo 
            ? `<video controls src="${mediaUrl}" style="max-width: 100%;"></video>`
            : `<img src="${mediaUrl}" style="max-width: 100%;">`;

        // Display media
        modalMedia.innerHTML = mediaHtml;

        // Display metadata
        modalMeta.innerHTML = `
            <div class="meta-item">
                <strong>Created:</strong>
                ${createdAt || 'Нет данных'}
            </div>
            <div class="meta-item">
                <strong>Prompt:</strong>
                ${item.meta?.prompt || 'Нет данных'}
            </div>
            <div class="meta-item">
                <strong>Negative Prompt:</strong>
                ${item.meta?.negativePrompt || 'Нет данных'}
            </div>
            <div class="meta-item">
                <strong>Model:</strong>
                ${item.meta?.Model || 'Нет данных'}
            </div>
            <div class="meta-item">
                <strong>Sampler:</strong>
                ${item.meta?.sampler || 'Нет данных'}
            </div>
            <div class="meta-item">
                <strong>CFG Scale:</strong>
                ${item.meta?.cfgScale || 'Нет данных'}
            </div>
            <div class="meta-item">
                <strong>Steps:</strong>
                ${item.meta?.steps || 'Нет данных'}
            </div>
            <div class="meta-item">
                <strong>Seed:</strong>
                ${item.meta?.seed || 'Нет данных'}
            </div>
            <div class="meta-item">
                <strong>Reactions:</strong>
                ❤️ ${item.stats?.heartCount || 0}
            </div>
        `;

        // Show modal
        modal.style.display = 'block';
    }

    function handleScroll() {
        const scrollBottom = window.innerHeight + window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;
        const threshold = 500;

        if (pageHeight - scrollBottom < threshold && !isFetching && nextCursor) {
            currentCursor = nextCursor;
            fetchImages();
        }
    }

    function showLoading() {
        elements.loading.style.display = 'block';
    }

    function hideLoading() {
        elements.loading.style.display = 'none';
    }

    function showError(message) {
        elements.errorContainer.innerHTML = `
            <div class="error">
                <p>${message}</p>
                <button onclick="window.location.reload()">Обновить</button>
            </div>
        `;
        elements.errorContainer.style.display = 'block';
    }
});
// app.js (дополнения)
document.addEventListener('DOMContentLoaded', () => {
    let isAutoScrollActive = false;
    let scrollInterval = null;
    const toggleButton = document.getElementById('autoScrollToggle');
    let lastScrollPosition = 0;

    function initAutoScroll() {
        toggleButton.addEventListener('click', toggleAutoScroll);
    }

    function toggleAutoScroll() {
        isAutoScrollActive = !isAutoScrollActive;
        toggleButton.classList.toggle('active');
        toggleButton.textContent = `Автопрокрутка: ${isAutoScrollActive ? 'ВКЛ' : 'ВЫКЛ'}`;
        
        if (isAutoScrollActive) {
            startAutoScroll();
        } else {
            stopAutoScroll();
        }
    }

    function startAutoScroll() {
        const scrollSpeed = 10; // Уменьшено для большей плавности
        const scrollStep = 2.5;   // Увеличен шаг прокрутки
        
        // Очистка предыдущего интервала
        if (scrollInterval) clearInterval(scrollInterval);

        scrollInterval = setInterval(() => {
            if (!isAutoScrollActive) return;
            
            const currentPosition = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

            // Прокручиваем только если не достигнут конец
            if (currentPosition < maxScroll) {
                window.scrollBy({
                    top: scrollStep,
                    behavior: 'instant'
                });
                
                // Автоподгрузка контента при приближении к концу
                if (maxScroll - currentPosition < 1000) {
                    loadMoreContent();
                }
            }
        }, scrollSpeed);
    }

    function stopAutoScroll() {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }

    // Интеграция с существующей логикой подгрузки
    async function loadMoreContent() {
        if (!isFetching && nextCursor) {
            currentCursor = nextCursor;
            await fetchImages();
        }
    }

    initAutoScroll();
});