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
        let sortable = null;

        // --- ELEMENT SELECTORS ---
        const productForm = document.getElementById('product-form');
        const productFormContainer = document.getElementById('product-form-container');
        const formTitle = document.getElementById('form-title');
        const productListEl = document.getElementById('product-list');
        const searchInput = document.getElementById('search-product-input');
        const newProductBtn = document.getElementById('new-product-btn');
        const saveBtn = document.getElementById('save-btn');
        const deleteBtn = document.getElementById('delete-btn');
        const statusMessageEl = document.getElementById('status-message');
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
        const imageUrlList = document.getElementById('image-url-list');
        const processUrlsBtn = document.getElementById('process-urls-btn');
        const imageSortableList = document.getElementById('image-sortable-list');
        const singleImageInputsContainer = document.getElementById('single-image-inputs-container');
        const addSingleUrlFieldBtn = document.getElementById('add-single-url-field-btn');

        const API_URL = '/.netlify/functions';

        // --- FUNCTIONS ---

        function convertGoogleDriveUrl(url) {
            if (!url) return '';
            const regex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
            const match = url.match(regex);
            return (match && match[1]) ? `https://lh3.googleusercontent.com/d/${match[1]}=w1000?authuser=0` : url;
        }

        const addUrlToSorter = (url) => {
            if (!url) return;
            // Prevent adding duplicate URLs
            const existingUrls = Array.from(imageSortableList.querySelectorAll('div[data-url]')).map(div => div.dataset.url);
            if(existingUrls.includes(url)) {
                alert('Esta URL ya ha sido agregada.');
                return;
            }

            const div = document.createElement('div');
            div.className = 'flex items-center space-x-3 p-2 bg-gray-600 rounded-md';
            div.dataset.url = url;

            div.innerHTML = `
                <svg class="w-6 h-6 text-gray-400 drag-handle" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                <img src="${url}" onerror="this.onerror=null;this.src='https://placehold.co/40x40/1f2937/9ca3af?text=Err';" class="w-10 h-10 rounded-md object-cover bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity">
                <p class="flex-grow text-sm text-gray-300 truncate">${url}</p>
                <button type="button" class="text-xl text-red-400 hover:text-red-300 remove-image-btn">&times;</button>
            `;
            
            div.querySelector('img').addEventListener('click', () => openImagePreview(url));
            div.querySelector('.remove-image-btn').addEventListener('click', () => div.remove());
            
            imageSortableList.appendChild(div);
        };
        
        const createNewSingleImageInput = () => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center space-x-2 single-url-wrapper';
        
            wrapper.innerHTML = `
                <input type="url" class="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg" placeholder="Pegar URL y hacer clic en Guardar">
                <button type="button" class="text-sm bg-green-600 text-white font-bold p-2 rounded-lg hover:bg-green-700 transition-colors save-single-url-btn">Guardar</button>
                <button type="button" class="text-xl text-red-500 font-bold p-1 rounded-lg hover:bg-red-700 transition-colors remove-single-url-btn">&times;</button>
            `;
        
            const input = wrapper.querySelector('input');
            const saveBtn = wrapper.querySelector('.save-single-url-btn');
            const removeBtn = wrapper.querySelector('.remove-single-url-btn');
        
            const saveUrlAction = () => {
                const url = convertGoogleDriveUrl(input.value.trim());
                if (url) {
                    addUrlToSorter(url);
                    input.value = ''; // Clear input after adding
                }
            };
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveUrlAction();
                }
            });
        
            saveBtn.addEventListener('click', saveUrlAction);
            removeBtn.addEventListener('click', () => wrapper.remove());
        
            singleImageInputsContainer.appendChild(wrapper);
            input.focus();
        };

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

            const imageUrls = [];
            for (let i = 1; i <= 8; i++) {
                if(product[`photo_url_${i}`]) {
                    imageUrls.push(product[`photo_url_${i}`]);
                }
            }
            imageSortableList.innerHTML = '';
            imageUrls.forEach(url => addUrlToSorter(url));
            
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
            imageSortableList.innerHTML = '';
            singleImageInputsContainer.innerHTML = '';
            createNewSingleImageInput();
            imageUrlList.value = '';
            renderProductList(allProducts);
        };

        const handleFormSubmit = async (event) => {
            event.preventDefault();
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
            statusMessageEl.textContent = '';

            const formData = new FormData(productForm);
            const productData = Object.fromEntries(formData.entries());

            const imageItems = imageSortableList.querySelectorAll('div[data-url]');
            for (let i = 0; i < 8; i++) {
                productData[`photo_url_${i + 1}`] = imageItems[i] ? imageItems[i].dataset.url : null;
            }

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
            previewImage.src = '';
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
                if (window.innerWidth < 1024) {
                    productFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        processUrlsBtn.addEventListener('click', () => {
            const urls = imageUrlList.value.split(',')
                .map(url => convertGoogleDriveUrl(url.trim()))
                .filter(url => url);
            urls.forEach(url => addUrlToSorter(url));
            imageUrlList.value = '';
        });

        addSingleUrlFieldBtn.addEventListener('click', createNewSingleImageInput);

        closePreviewBtn.addEventListener('click', closeImagePreview);
        imagePreviewModal.addEventListener('click', (e) => {
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
        createNewSingleImageInput(); // Create the first single image input
        sortable = new Sortable(imageSortableList, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost'
        });
    }
});
