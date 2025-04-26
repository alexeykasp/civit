document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        modelsList: document.getElementById('modelsList'),
        loading: document.getElementById('loading'),
        errorContainer: document.getElementById('errorContainer'),
        searchInput: document.getElementById('search'),
        typesSelect: document.getElementById('types'),
        sortSelect: document.getElementById('sort'),
        periodSelect: document.getElementById('period'),
        nsfw: document.getElementById('nsfw'),
        searchButton: document.getElementById('searchButton')
    };

    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;

    function init() {
        elements.searchButton.addEventListener('click', handleSearch);
        window.addEventListener('scroll', handleScroll);
        loadModels();
    }

    function handleSearch() {
        currentPage = 1;
        hasMore = true;
        elements.modelsList.innerHTML = '';
        loadModels();
    }

    async function loadModels() {
        if (isLoading || !hasMore) return;
        isLoading = true;
        showLoading();

        try {
            const url = buildApiUrl();
            const response = await fetch(url);
            
            if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
            
            const data = await response.json();
            hasMore = data.metadata?.nextPage ? true : false;
            
            if (data.items?.length) {
                displayModels(data.items);
                currentPage++;
            } else if(currentPage === 1) {
                throw new Error('Модели не найдены');
            }
        } catch (error) {
            showError(error.message);
        } finally {
            isLoading = false;
            hideLoading();
        }
    }

    function buildApiUrl() {
        const url = new URL('https://civitai.com/api/v1/models');
        const params = {
            query: elements.searchInput.value.trim(),
            types: elements.typesSelect.value,
            sort: elements.sortSelect.value,
            period: elements.periodSelect.value,
            page: currentPage,
            limit: 30
        };
    
        // Обработка NSFW параметра
        switch(elements.nsfw.value) {
            case 'true':
                params.nsfw = true;
                break;
            case 'false':
                params.nsfw = false;
                break;
            // Для "Все" не передаем параметр
        }
    
        Object.entries(params).forEach(([key, value]) => {
            if(value !== undefined && value !== '') {
                url.searchParams.set(key, value);
            }
        });
    
        return url.toString();
    }

    function displayModels(models) {
        const fragment = document.createDocumentFragment();

        models.forEach(model => {
            const card = document.createElement('div');
            card.className = 'model-card';
            
            const previewUrl = model.modelVersions?.[0]?.images?.[0]?.url || 'placeholder.jpg';
            const stats = model.stats || {};
            
            card.innerHTML = `
                <div class="model-preview">
                    <img src="${previewUrl}" 
                         loading="lazy" 
                         onerror="this.src='error-image.png'">
                </div>
                <div class="model-info">
                    <h3>${model.name || 'Без названия'}</h3>
                    <div class="model-meta">
                        <span>ID: ${model.id}</span>
                        <span>Тип: ${model.type}</span>
                    </div>
                    <div class="model-stats">
                        <div class="stat-item">
                            <div class="stat-value">${stats.downloadCount?.toLocaleString() || 0}</div>
                            <div class="stat-label">Загрузок</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.rating?.toFixed(1) || 0.0}</div>
                            <div class="stat-label">Рейтинг</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.commentCount || 0}</div>
                            <div class="stat-label">Комментарии</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.favoriteCount || 0}</div>
                            <div class="stat-label">Избранное</div>
                        </div>
                    </div>
                </div>
            `;

            fragment.appendChild(card);
        });

        elements.modelsList.appendChild(fragment);
    }

    function handleScroll() {
        const scrollBottom = window.innerHeight + window.scrollY;
        const threshold = 500;
        
        if (document.documentElement.scrollHeight - scrollBottom < threshold) {
            loadModels();
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

    init();
});