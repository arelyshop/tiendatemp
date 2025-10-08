document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM PARA LOGIN ---
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const logoutBtn = document.getElementById('logout-btn');
    const loginBtn = document.getElementById('login-btn');
    
    // --- LÓGICA DE LOGIN ---

    const showAdminPanel = () => {
        loginContainer.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        adminPanel.classList.add('flex');
        initializeAdminLogic(); 
    };

    if (sessionStorage.getItem('is_arelyshop_admin_logged_in') === 'true') {
        showAdminPanel();
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.classList.add('hidden');
        loginBtn.textContent = 'Verificando...';
        loginBtn.disabled = true;
        
        const username = event.target.username.value.trim();
        const password = event.target.password.value.trim();

        try {
            const response = await fetch('/.netlify/functions/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                sessionStorage.setItem('is_arelyshop_admin_logged_in', 'true');
                showAdminPanel();
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Credenciales incorrectas.';
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error al intentar iniciar sesión:', error);
            errorMessage.textContent = 'Error de conexión. Inténtalo de nuevo.';
            errorMessage.classList.remove('hidden');
        } finally {
            loginBtn.textContent = 'Ingresar';
            loginBtn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('is_arelyshop_admin_logged_in');
        window.location.reload();
    });


    // --- LÓGICA DEL PANEL DE ADMINISTRACIÓN ---
    function initializeAdminLogic() {
        // --- STATE ---
        let allProducts = [];
        let currentProductId = null;
        let html5QrCode = null;
        let currentScannerTarget = null; 

        // --- ELEMENT SELECTORS ---
        const productForm = document.getElementById('product-form');
        const productFormContainer = document.getElementById('product-form-container'); // <-- Nuevo selector
        const formTitle = document.getElementById('form-title');
        const productListEl = document.getElementById('product-list');
        const searchInput = document.getElementById('search-product-input');
        const newProductBtn = document.getElementById('new-product-btn');
        const saveBtn = document.getElementById('save-btn');
        const deleteBtn = document.getElementById('delete-btn');
        const statusMessageEl = document.getElementById('status-message');
        const photoUrlInputs = productForm.querySelectorAll('input[type="url"]');
        const suggestSkuBtn = document.getElementById('suggest-sku-btn');
        const skuInput = document.getElementById('sku');
        const categorySelect = document.getElementById('category-select');
        const categoryCustomInput = document.getElementById('category-custom');
        const brandSelect = document.getElementById('brand-select');
        const brandCustomInput = document.getElementById('brand-custom');
        const barcodeInput = document.getElementById('barcode');
        const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
        const scanSearchBtn = document.getElementById('scan-search-btn');
        const scannerContainer = document.getElementById('scanner-container');
        const closeScannerBtn = document.getElementById('close-scanner-btn');
        const imagePreviewModal = document.getElementById('image-preview-modal');
        const previewImage = document.getElementById('preview-image');
        const closePreviewBtn = document.getElementById('close-preview-btn');


        const API_URL = '/.netlify/functions';

        // --- FUNCTIONS ---
        const fetchAndRenderProducts = async () => {
            try {
                productListEl.innerHTML = '<p class="text-gray-400">Cargando productos...</p>';
                const response = await fetch(`${API_URL}/get-products`);
                if (!response.ok) throw new Error('Failed to fetch products');
                allProducts = await response.json();
                renderProductList(allProducts);
            } catch (error) {
                console.error('Error fetching products:', error);
                productListEl.innerHTML = '<p class="text-red-500">Error al cargar productos.</p>';
            }
        };

        const renderProductList = (products) => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const filteredProducts = products.filter(p => 
                p.name.toLowerCase().includes(searchTerm) || 
                (p.sku && p.sku.toLowerCase().includes(searchTerm)) ||
                (p.barcode && p.barcode.toLowerCase().includes(searchTerm))
            );

            if (filteredProducts.length === 0) {
                productListEl.innerHTML = '<p class="text-gray-500">No se encontraron productos.</p>';
                return;
            }

            productListEl.innerHTML = filteredProducts.map(product => `
                <div class="flex items-center justify-between p-3 mb-2 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors ${product.id === currentProductId ? 'bg-blue-900' : 'bg-gray-800'}" data-id="${product.id}">
                    <div class="flex-grow">
                        <p class="font-semibold text-white">${product.name}</p>
                        <p class="text-sm text-gray-400">SKU: ${product.sku || 'N/A'}</p>
                    </div>
                    <div class="text-sm text-gray-300">Stock: ${product.stock || 0}</div>
                </div>
            `).join('');
        };
        
        const populateFormForEdit = (productId) => {
            const product = allProducts.find(p => p.id === productId);
            if (!product) return;
            resetForm();
            currentProductId = productId;
            for (const key in product) {
                if (productForm.elements[key]) {
                    productForm.elements[key].value = product[key] || '';
                }
            }

            for (let i = 1; i <= 8; i++) {
                const urlInput = document.getElementById(`photo_url_${i}`);
                const thumbnail = document.getElementById(`thumbnail-${i}`);
                if (urlInput.value) {
                    thumbnail.src = urlInput.value;
                } else {
                    thumbnail.src = `https://placehold.co/40x40/1f2937/9ca3af?text=${i}`;
                }
            }

            const categoryOptionExists = [...categorySelect.options].some(opt => opt.value === product.category);
            if (product.category && categoryOptionExists) {
                categorySelect.value = product.category;
                categoryCustomInput.classList.add('hidden');
            } else if (product.category) {
                categorySelect.value = 'custom';
                categoryCustomInput.value = product.category;
                categoryCustomInput.classList.remove('hidden');
            }
            const brandOptionExists = [...brandSelect.options].some(opt => opt.value === product.brand);
            if (product.brand && brandOptionExists) {
                brandSelect.value = product.brand;
                brandCustomInput.classList.add('hidden');
            } else if (product.brand) {
                brandSelect.value = 'custom';
                brandCustomInput.value = product.brand;
                brandCustomInput.classList.remove('hidden');
            }
            formTitle.textContent = 'Editar Producto';
            saveBtn.textContent = 'Guardar Cambios';
            deleteBtn.classList.remove('hidden');
            renderProductList(allProducts);
        };

        const resetForm = () => {
            productForm.reset();
            currentProductId = null;
            formTitle.textContent = 'Agregar Nuevo Producto';
            saveBtn.textContent = 'Guardar Producto';
            deleteBtn.classList.add('hidden');
            statusMessageEl.textContent = '';
            statusMessageEl.className = 'mt-4 text-center font-semibold';
            categoryCustomInput.classList.add('hidden');
            brandCustomInput.classList.add('hidden');

            for (let i = 1; i <= 8; i++) {
                const thumbnail = document.getElementById(`thumbnail-${i}`);
                thumbnail.src = `https://placehold.co/40x40/1f2937/9ca3af?text=${i}`;
            }

            renderProductList(allProducts);
        };

        const handleFormSubmit = async (event) => {
            event.preventDefault();
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
            statusMessageEl.textContent = '';
            const formData = new FormData(productForm);
            const productData = Object.fromEntries(formData.entries());
            productData.category = categorySelect.value === 'custom' ? categoryCustomInput.value : categorySelect.value;
            productData.brand = brandSelect.value === 'custom' ? brandCustomInput.value : brandSelect.value;
            delete productData['category-select'];
            delete productData['category-custom'];
            delete productData['brand-select'];
            delete productData['brand-custom'];
            const numericFields = ['sale_price', 'discount_price', 'purchase_price', 'wholesale_price', 'stock'];
            numericFields.forEach(field => {
                productData[field] = productData[field] === '' ? null : Number(productData[field]);
            });
            const isUpdating = !!currentProductId;
            const url = isUpdating ? `${API_URL}/update-product` : `${API_URL}/add-product`;
            const method = isUpdating ? 'PUT' : 'POST';
            if(isUpdating) {
                productData.id = currentProductId;
            }
            try {
                const response = await fetch(url, { method, body: JSON.stringify(productData), headers: { 'Content-Type': 'application/json' } });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(JSON.parse(errorText).error || errorText);
                }
                statusMessageEl.textContent = `¡Producto ${isUpdating ? 'actualizado' : 'agregado'} con éxito!`;
                statusMessageEl.className = 'mt-4 text-center font-semibold text-green-600';
                await fetchAndRenderProducts();
                setTimeout(resetForm, 2000);
            } catch (error) {
                console.error('Error saving product:', error);
                statusMessageEl.textContent = `Error: ${error.message}`;
                statusMessageEl.className = 'mt-4 text-center font-semibold text-red-600';
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = isUpdating ? 'Guardar Cambios' : 'Guardar Producto';
            }
        };

        const handleDelete = async () => {
            if (!currentProductId || !confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) return;
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Eliminando...';
            try {
                 const response = await fetch(`${API_URL}/delete-product`, {
                    method: 'DELETE',
                    body: JSON.stringify({ id: currentProductId }),
                    headers: { 'Content-Type': 'application/json' },
                });
                 if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server error');
                }
                const result = await response.json();
                statusMessageEl.textContent = result.message || 'Producto eliminado.';
                statusMessageEl.className = 'mt-4 text-center font-semibold text-green-600';
                await fetchAndRenderProducts();
                setTimeout(resetForm, 2000);
            } catch(error) {
                 console.error('Error deleting product:', error);
                statusMessageEl.textContent = `Error: ${error.message}`;
                statusMessageEl.className = 'mt-4 text-center font-semibold text-red-600';
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.textContent = 'Eliminar Producto';
            }
        };

        const handleSearch = () => renderProductList(allProducts);

        function convertGoogleDriveUrl(url) {
            const regex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
            const match = url.match(regex);
            return (match && match[1]) ? `https://lh3.googleusercontent.com/d/${match[1]}=w1000?authuser=0` : url;
        }

        function suggestSku() {
            const prefix = "ASP";
            let maxNumber = 0;
            allProducts.forEach(product => {
                if (product.sku && product.sku.toUpperCase().startsWith(prefix)) {
                    const numberPart = parseInt(product.sku.substring(prefix.length), 10);
                    if (!isNaN(numberPart) && numberPart > maxNumber) maxNumber = numberPart;
                }
            });
            skuInput.value = `${prefix}${maxNumber + 1}`;
        }

        function startScanner(target) {
            currentScannerTarget = target;
            scannerContainer.classList.remove('hidden');
            scannerContainer.classList.add('flex');
            
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("reader");
            }

            const qrCodeSuccessCallback = (decodedText, decodedResult) => {
                if (currentScannerTarget === 'barcode') {
                    barcodeInput.value = decodedText;
                } else if (currentScannerTarget === 'search') {
                    searchInput.value = decodedText;
                    handleSearch();
                }
                stopScanner();
            };

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
                .catch(err => console.log(`Unable to start scanning, error: ${err}`));
        }

        function stopScanner() {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    console.log("QR Code scanning stopped.");
                }).catch(err => {
                    console.log(`Error stopping scan: ${err}`);
                });
            }
            scannerContainer.classList.add('hidden');
            scannerContainer.classList.remove('flex');
        }

        function openImagePreview(imageUrl) {
            if (imageUrl && !imageUrl.includes('placehold.co')) {
                previewImage.src = imageUrl;
                imagePreviewModal.classList.remove('hidden');
            }
        }

        function closeImagePreview() {
            imagePreviewModal.classList.add('hidden');
            previewImage.src = ''; // Clear src to avoid showing old image briefly
        }

        // --- EVENT LISTENERS ---
        productForm.addEventListener('submit', handleFormSubmit);
        newProductBtn.addEventListener('click', resetForm);
        deleteBtn.addEventListener('click', handleDelete);
        searchInput.addEventListener('input', handleSearch);
        suggestSkuBtn.addEventListener('click', suggestSku);
        scanBarcodeBtn.addEventListener('click', () => startScanner('barcode'));
        scanSearchBtn.addEventListener('click', () => startScanner('search'));
        closeScannerBtn.addEventListener('click', stopScanner);

        productListEl.addEventListener('click', (event) => {
            const productElement = event.target.closest('[data-id]');
            if (productElement) {
                populateFormForEdit(parseInt(productElement.dataset.id, 10));
                
                // Si la pantalla es de tamaño móvil (menos de 1024px, el breakpoint 'lg' de Tailwind)
                if (window.innerWidth < 1024) {
                    productFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
        
        photoUrlInputs.forEach((input, index) => {
            input.addEventListener('input', (event) => {
                const originalUrl = event.target.value;
                let convertedUrl = convertGoogleDriveUrl(originalUrl);
                
                if (originalUrl !== convertedUrl) {
                    event.target.value = convertedUrl;
                }
                
                const thumbnail = document.getElementById(`thumbnail-${index + 1}`);
                if (convertedUrl) {
                    thumbnail.src = convertedUrl;
                } else {
                    thumbnail.src = `https://placehold.co/40x40/1f2937/9ca3af?text=${index + 1}`;
                }
            });
        });

        // Add event listeners for thumbnails to open modal
        for (let i = 1; i <= 8; i++) {
            const thumbnail = document.getElementById(`thumbnail-${i}`);
            thumbnail.addEventListener('click', () => openImagePreview(thumbnail.src));
        }

        closePreviewBtn.addEventListener('click', closeImagePreview);
        imagePreviewModal.addEventListener('click', (e) => {
            // Close if clicking on the dark overlay, but not on the image itself
            if (e.target === imagePreviewModal) {
                closeImagePreview();
            }
        });


        categorySelect.addEventListener('change', (e) => {
            categoryCustomInput.classList.toggle('hidden', e.target.value !== 'custom');
            if (e.target.value === 'custom') categoryCustomInput.focus();
        });

        brandSelect.addEventListener('change', (e) => {
            brandCustomInput.classList.toggle('hidden', e.target.value !== 'custom');
            if (e.target.value === 'custom') brandCustomInput.focus();
        });

        // --- INITIALIZATION ---
        fetchAndRenderProducts();
    }
});

