document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    let totalPages = 1;
    
    const elements = {
        gallery: document.getElementById('gallery'),
        loading: document.getElementById('loading'),
        errorContainer: document.getElementById('errorContainer'),
        pagination: document.getElementById('pagination'),
        paginationInfo: document.getElementById('paginationInfo'),
        nsfw: document.getElementById('nsfw'),
        sort: document.getElementById('sort'),
        period: document.getElementById('period'),
        limit: document.getElementById('limit'),
        searchButton: document.getElementById('searchButton')
    };

    elements.limit.addEventListener('change', function() {
        let value = parseInt(this.value) || 50;
        this.value = Math.min(200, Math.max(1, value));
    });

    elements.searchButton.addEventListener('click', () => {
        currentPage = 1;
        fetchImages(currentPage);
    });

    async function fetchImages(page) {
        // Добавить после получения элементов:
    elements.searchButton.addEventListener('click', () => {
        currentPage = 1;
        fetchImages(currentPage);
        });
        elements.loading.style.display = 'block';
        elements.gallery.innerHTML = '';
        elements.pagination.innerHTML = '';
        elements.errorContainer.style.display = 'none';
        
        try {
            const limit = Math.min(200, Math.max(1, parseInt(elements.limit.value) || 50));
            let apiUrl = `https://civitai.com/api/v1/images?page=${page}&limit=${limit}`;
            
            if (elements.nsfw.value !== 'off') {
                apiUrl += `&nsfw=${elements.nsfw.value}`;
            }
            
            apiUrl += `&sort=${elements.sort.value}`;
            apiUrl += `&period=${elements.period.value}`;

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Ошибка ${response.status}`);
            
            const data = await response.json();
            displayImages(data.items);
            updatePagination(page, data.metadata);
        } catch (error) {
            elements.errorContainer.style.display = 'block';
            elements.errorContainer.innerHTML = `<div class="error">${error.message}</div>`;
        } finally {
            elements.loading.style.display = 'none';
        }
    }

    function displayImages(images) {
        elements.gallery.innerHTML = images?.length ? images.map(image => `
            <div class="image-card">
                <div class="image-container">
                    <img src="${image.url || image.meta?.image || image.resources?.[0]?.url || 'https://via.placeholder.com/250x250?text=No+Image'}" 
                         alt="${image.meta?.prompt || 'Сгенерированное изображение'}" 
                         loading="lazy">
                </div>
                <div class="image-info">
                    <h3>${image.meta?.prompt?.substring(0, 50) || 'Без названия'}${image.meta?.prompt?.length > 50 ? '...' : ''}</h3>
                    <p>❤️ ${image.stats?.heartCount || 0} • 💬 ${image.stats?.commentCount || 0}</p>
                    <p>Модель: ${image.model?.name || 'Неизвестна'}</p>
                </div>
            </div>
        `).join('') : '<p>Изображения не найдены</p>';
    }

    function updatePagination(page, metadata) {
        if (!metadata) return;
        
        totalPages = Math.ceil(metadata.totalItems / metadata.pageSize);
        elements.paginationInfo.textContent = `Страница ${page} • Всего: ${metadata.totalItems}`;
        
        elements.pagination.innerHTML = `
            <button ${page === 1 ? 'disabled' : ''} onclick="currentPage=${page-1};fetchImages(currentPage)">← Назад</button>
            ${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                const p = Math.max(1, page - 2) + i;
                return p > totalPages ? '' : `
                    <button ${p === page ? 'class="current-page"' : ''} 
                            onclick="currentPage=${p};fetchImages(currentPage)">
                        ${p}
                    </button>
                `;
            }).join('')}
            <button ${page >= totalPages ? 'disabled' : ''} onclick="currentPage=${page+1};fetchImages(currentPage)">Вперед →</button>
        `;
    }

    fetchImages(currentPage);
});