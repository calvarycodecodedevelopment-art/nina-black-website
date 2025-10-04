// --- FUNÇÃO PARA CARREGAR COMPONENTES (HEADER/FOOTER) ---
function loadComponent(componentPath, targetElementId) {
    // ADIÇÃO PARA FORÇAR A ATUALIZAÇÃO (CACHE BUSTING)
    // Isto adiciona um número único ao final do URL (ex: footer.html?v=1678886400000)
    // fazendo o navegador pensar que é sempre um ficheiro novo.
    const cacheBustingUrl = `${componentPath}?v=${new Date().getTime()}`;

    fetch(cacheBustingUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Componente não encontrado em: ${componentPath}`);
            }
            return response.text();
        })
        .then(html => {
            document.getElementById(targetElementId).innerHTML = html;
        })
        .catch(error => {
            console.error(`Erro ao carregar o componente: ${error}`);
        });
}


// Função reutilizável para criar notificações 'toast'
function showToast(message) {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

// Função para renderizar produtos numa grelha (reutilizável)
function renderProductsInGrid(products, container) {
    container.innerHTML = '';
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">${product.price}</p>
            <button class="add-to-cart-btn" data-product-name="${product.name}">Adicionar ao Carrinho</button>
        `;
        container.appendChild(productCard);
    });

    container.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-to-cart-btn')) {
            const productName = event.target.dataset.productName;
            showToast(`${productName} foi adicionado ao carrinho!`);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {

    // --- CARREGA O HEADER E O FOOTER EM TODAS AS PÁGINAS ---
    loadComponent('header.html', 'header-placeholder');
    loadComponent('footer.html', 'footer-placeholder');

    // Efeito de fade-in suave para as seções ao rolar a página
    const sectionsToAnimate = document.querySelectorAll('.categories-section, .main-footer, .featured-products, .all-products-section');
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    sectionsToAnimate.forEach(section => {
        section.style.opacity = 0;
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(section);
    });

    // --- LÓGICA DO CARROSSEL (APENAS PARA A PÁGINA INICIAL) ---
    const carouselContainer = document.querySelector('.carousel-container');
    if (carouselContainer) {
        fetch('products.json')
            .then(response => response.json())
            .then(products => new Carousel(carouselContainer, products))
            .catch(error => console.error('Erro ao carregar os produtos para o carrossel:', error));
    }

    // --- LÓGICA GENÉRICA PARA GRELHAS DE PRODUTOS ---
    const productGridContainer = document.querySelector('[data-grid-type]');
    if (productGridContainer) {
        const gridType = productGridContainer.dataset.gridType;
        fetch('products.json')
            .then(response => response.json())
            .then(products => {
                let filteredProducts = products;
                if (gridType !== 'all') {
                    filteredProducts = products.filter(product => product.imageUrl.includes(`/${gridType}/`));
                }
                renderProductsInGrid(filteredProducts, productGridContainer);
            })
            .catch(error => console.error(`Erro ao carregar produtos para a grelha '${gridType}':`, error));
    }
});

class Carousel {
    constructor(container, products) {
        this.container = container;
        this.products = products;
        this.track = container.querySelector('.carousel-track');
        this.prevButton = container.querySelector('.carousel-button.prev');
        this.nextButton = container.querySelector('.carousel-button.next');
        this.pagination = container.querySelector('.carousel-pagination');
        this.currentIndex = 0;
        this.autoplayInterval = null;
        this.init();
    }

    init() {
        this.renderProducts();
        this.setupPagination();
        this.addEventListeners();
        this.updateCarousel();
        this.startAutoplay();
    }

    getVisibleSlides() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 4;
    }

    getTotalPages() {
        return Math.ceil(this.products.length / this.getVisibleSlides());
    }

    renderProducts() {
        this.products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${product.price}</p>
                <button class="add-to-cart-btn" data-product-name="${product.name}">Adicionar ao Carrinho</button>
            `;
            this.track.appendChild(productCard);
        });
    }

    setupPagination() {
        this.pagination.innerHTML = '';
        for (let i = 0; i < this.getTotalPages(); i++) {
            const dot = document.createElement('button');
            dot.className = 'pagination-dot';
            dot.setAttribute('aria-label', `Ir para a página ${i + 1}`);
            dot.addEventListener('click', () => this.goToPage(i));
            this.pagination.appendChild(dot);
        }
        this.dots = Array.from(this.pagination.children);
    }
    
    addEventListeners() {
        this.prevButton.addEventListener('click', () => this.prevPage());
        this.nextButton.addEventListener('click', () => this.nextPage());
        this.track.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-to-cart-btn')) {
                const productName = event.target.dataset.productName;
                showToast(`${productName} foi adicionado ao carrinho!`);
            }
        });
        this.container.addEventListener('mouseenter', () => this.stopAutoplay());
        this.container.addEventListener('mouseleave', () => this.startAutoplay());
        window.addEventListener('resize', () => {
            this.setupPagination();
            this.updateCarousel();
        });
    }

    startAutoplay() {
        this.stopAutoplay();
        this.autoplayInterval = setInterval(() => {
            const nextPage = (this.currentIndex + 1) % this.getTotalPages();
            this.goToPage(nextPage);
        }, 5000);
    }

    stopAutoplay() {
        clearInterval(this.autoplayInterval);
    }

    goToPage(pageIndex) {
        this.currentIndex = Math.max(0, Math.min(pageIndex, this.getTotalPages() - 1));
        this.updateCarousel();
        this.startAutoplay();
    }

    nextPage() {
        const nextPage = this.currentIndex >= this.getTotalPages() - 1 ? 0 : this.currentIndex + 1;
        this.goToPage(nextPage);
    }

    prevPage() {
        const prevPage = this.currentIndex <= 0 ? this.getTotalPages() - 1 : this.currentIndex - 1;
        this.goToPage(prevPage);
    }

    updateCarousel() {
        const offset = this.currentIndex * 100;
        this.track.style.transform = `translateX(-${offset}%)`;
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
        });
    }
}