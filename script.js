document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let allProducts = [];
    let currentProductId = null;

    // --- ELEMENT SELECTORS ---
    const productForm = document.getElementById('product-form');
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
    
    // API Endpoint
    const API_URL = '/.netlify/functions';

    // --- FUNCTIONS ---

    /**
     * Fetch all products from the backend and render the list
     */
    const fetchAndRenderProducts = async () => {
        try {
            productListEl.innerHTML = '<p class="text-gray-500">Cargando productos...</p>';
            const response = await fetch(`${API_URL}/get-products`);
            if (!response.ok) throw new Error('Failed to fetch products');
            
            allProducts = await response.json();
            renderProductList(allProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
            productListEl.innerHTML = '<p class="text-red-500">Error al cargar productos.</p>';
        }
    };

    /**
     * Render a list of products in the sidebar
     * @param {Array} products - The array of products to render
     */
    const renderProductList = (products) => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProducts = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.sku && p.sku.toLowerCase().includes(searchTerm))
        );

        if (filteredProducts.length === 0) {
            productListEl.innerHTML = '<p class="text-gray-500">No se encontraron productos.</p>';
            return;
        }

        productListEl.innerHTML = filteredProducts.map(product => `
            <div class="flex items-center justify-between p-3 mb-2 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors ${product.id === currentProductId ? 'bg-blue-100' : 'bg-gray-50'}" data-id="${product.id}">
                <div class="flex-grow">
                    <p class="font-semibold text-gray-800">${product.name}</p>
                    <p class="text-sm text-gray-500">SKU: ${product.sku || 'N/A'}</p>
                </div>
                <div class="text-sm text-gray-600">Stock: ${product.stock || 0}</div>
            </div>
        `).join('');
    };
    
    /**
     * Populate the form with data from a selected product
     * @param {number} productId - The ID of the product to edit
     */
    const populateFormForEdit = (productId) => {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        resetForm(); // Start with a clean slate
        currentProductId = productId;
        
        // Populate all form fields
        for (const key in product) {
            if (productForm.elements[key]) {
                productForm.elements[key].value = product[key] || '';
            }
        }

        // Handle Category dropdown
        const categoryOptionExists = [...categorySelect.options].some(opt => opt.value === product.category);
        if (product.category && categoryOptionExists) {
            categorySelect.value = product.category;
            categoryCustomInput.classList.add('hidden');
        } else if (product.category) {
            categorySelect.value = 'custom';
            categoryCustomInput.value = product.category;
            categoryCustomInput.classList.remove('hidden');
        }

        // Handle Brand dropdown
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
        renderProductList(allProducts); // Re-render to show selection
    };

    /**
     * Reset the form to its "Add New Product" state
     */
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
        renderProductList(allProducts); // Re-render to clear selection highlight
    };

    /**
     * Handle form submission for both creating and updating products
     */
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
        const method = isUpdating ? 'PUT' : 'POST'; // <-- THIS IS THE KEY FIX

        if(isUpdating) {
            productData.id = currentProductId;
        }

        try {
            const response = await fetch(url, {
                method: method,
                body: JSON.stringify(productData),
                headers: { 'Content-Type': 'application/json' },
            });
            
            if (!response.ok) {
                 const errorText = await response.text();
                 try {
                     const errorData = JSON.parse(errorText);
                     throw new Error(errorData.error || 'Server error');
                 } catch (e) {
                     throw new Error(errorText); // If the error response wasn't JSON
                 }
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

    /**
     * Handle product deletion
     */
    const handleDelete = async () => {
        if (!currentProductId || !confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
            return;
        }
        
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Eliminando...';

        try {
             const response = await fetch(`${API_URL}/delete-product`, {
                method: 'DELETE', // Using DELETE method
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

    /**
     * Filter the product list based on search input
     */
    const handleSearch = () => {
        renderProductList(allProducts);
    };

    /**
     * Converts Google Drive URLs to direct image links
     */
    function convertGoogleDriveUrl(url) {
        const regex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
        const match = url.match(regex);
        if (match && match[1]) {
            return `https://lh3.googleusercontent.com/d/${match[1]}=w1000?authuser=0`;
        }
        return url;
    }

    /**
     * Suggests a new unique SKU
     */
    function suggestSku() {
        const prefix = "ASP";
        let maxNumber = 0;
        allProducts.forEach(product => {
            if (product.sku && product.sku.toUpperCase().startsWith(prefix)) {
                const numberPart = parseInt(product.sku.substring(prefix.length), 10);
                if (!isNaN(numberPart) && numberPart > maxNumber) {
                    maxNumber = numberPart;
                }
            }
        });
        skuInput.value = `${prefix}${maxNumber + 1}`;
    }
    
    // --- EVENT LISTENERS ---
    productForm.addEventListener('submit', handleFormSubmit);
    newProductBtn.addEventListener('click', resetForm);
    deleteBtn.addEventListener('click', handleDelete);
    searchInput.addEventListener('input', handleSearch);
    suggestSkuBtn.addEventListener('click', suggestSku);

    productListEl.addEventListener('click', (event) => {
        const productElement = event.target.closest('[data-id]');
        if (productElement) {
            const productId = parseInt(productElement.dataset.id, 10);
            populateFormForEdit(productId);
        }
    });
    
    photoUrlInputs.forEach(input => {
        input.addEventListener('input', (event) => {
            const originalUrl = event.target.value;
            const convertedUrl = convertGoogleDriveUrl(originalUrl);
            if (originalUrl !== convertedUrl) {
                event.target.value = convertedUrl;
            }
        });
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
});
