let publishers = [];
let currentPublisherId = null;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize publishers table
    loadPublishers();
    
    // Setup listeners
    document.getElementById('publisherForm').addEventListener('submit', handlePublisherFormSubmit);
    document.getElementById('searchPublishers').addEventListener('input', filterPublishers);
    document.getElementById('addNewPublisherBtn').addEventListener('click', () => {
        resetPublisherForm();
        document.getElementById('publisherModalLabel').textContent = 'Add New Publisher';
        document.querySelector('#publisherModal .btn-primary').textContent = 'Add Publisher';
    });
});

/**
 * Load all publishers from API
 */
async function loadPublishers() {
    try {
        publishers = await fetchData('/api/publishers');
        displayPublishers(publishers, currentPage);
    } catch (error) {
        console.error('Error loading publishers:', error);
    }
}

/**
 * Display publishers in the table
 */
function displayPublishers(publishersToDisplay, page) {
    const tableBody = document.getElementById('publishersTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPublishers = publishersToDisplay.slice(startIndex, endIndex);
    
    if (paginatedPublishers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No publishers found</td></tr>';
        return;
    }
    
    paginatedPublishers.forEach(publisher => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td data-column="name">${publisher.Name}</td>
            <td data-column="address">${publisher.Address || '-'}</td>
            <td data-column="email">${publisher.Email || '-'}</td>
            <td data-column="phone">${publisher.Phone || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-publisher" data-id="${publisher.PublisherID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-publisher" data-id="${publisher.PublisherID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup edit and delete buttons
    setupPublisherButtonListeners();
    
    // Setup pagination
    const paginationContainer = document.getElementById('publishersPagination');
    createPagination(paginationContainer, publishersToDisplay.length, itemsPerPage, page, (newPage) => {
        currentPage = newPage;
        displayPublishers(publishersToDisplay, newPage);
    });
    
    // Initialize sorting
    initializeTableSorting(document.getElementById('publishersTable'));
}

/**
 * Setup event listeners for edit and delete buttons
 */
function setupPublisherButtonListeners() {
    // Edit publisher buttons
    document.querySelectorAll('.edit-publisher').forEach(button => {
        button.addEventListener('click', () => {
            const publisherId = button.getAttribute('data-id');
            editPublisher(publisherId);
        });
    });
    
    // Delete publisher buttons
    document.querySelectorAll('.delete-publisher').forEach(button => {
        button.addEventListener('click', () => {
            const publisherId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this publisher?')) {
                deletePublisher(publisherId);
            }
        });
    });
}

/**
 * Reset publisher form for adding a new publisher
 */
function resetPublisherForm() {
    const form = document.getElementById('publisherForm');
    form.reset();
    currentPublisherId = null;
    
    // Clear validation errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Edit a publisher
 */
async function editPublisher(publisherId) {
    try {
        const publisher = publishers.find(p => p.PublisherID == publisherId);
        if (!publisher) return;
        
        currentPublisherId = publisherId;
        
        // Fill the form
        document.getElementById('name').value = publisher.Name;
        document.getElementById('address').value = publisher.Address || '';
        document.getElementById('email').value = publisher.Email || '';
        document.getElementById('phone').value = publisher.Phone || '';
        
        // Update modal title and button text
        document.getElementById('publisherModalLabel').textContent = 'Edit Publisher';
        document.querySelector('#publisherModal .btn-primary').textContent = 'Update Publisher';
        
        // Show the modal
        const publisherModal = new bootstrap.Modal(document.getElementById('publisherModal'));
        publisherModal.show();
    } catch (error) {
        console.error('Error editing publisher:', error);
        showToast('Failed to load publisher details', 'error');
    }
}

/**
 * Handle publisher form submission (add/edit)
 */
async function handlePublisherFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('publisherForm');
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Collect form data
    const publisherData = {
        Name: document.getElementById('name').value,
        Address: document.getElementById('address').value || null,
        Email: document.getElementById('email').value || null,
        Phone: document.getElementById('phone').value || null
    };
    
    try {
        if (currentPublisherId) {
            // Update existing publisher
            await sendRequest(`/api/publishers/${currentPublisherId}`, 'PUT', publisherData);
            showToast('Publisher updated successfully', 'success');
        } else {
            // Add new publisher
            await sendRequest('/api/publishers', 'POST', publisherData);
            showToast('Publisher added successfully', 'success');
        }
        
        // Close modal
        const publisherModal = bootstrap.Modal.getInstance(document.getElementById('publisherModal'));
        publisherModal.hide();
        
        // Reload publishers
        loadPublishers();
    } catch (error) {
        console.error('Error saving publisher:', error);
    }
}

/**
 * Delete a publisher
 */
async function deletePublisher(publisherId) {
    try {
        await sendRequest(`/api/publishers/${publisherId}`, 'DELETE');
        showToast('Publisher deleted successfully', 'success');
        
        // Reload publishers
        loadPublishers();
    } catch (error) {
        console.error('Error deleting publisher:', error);
    }
}

/**
 * Filter publishers based on search input
 */
function filterPublishers() {
    const searchTerm = document.getElementById('searchPublishers').value.toLowerCase();
    
    if (!searchTerm) {
        displayPublishers(publishers, 1);
        return;
    }
    
    const filteredPublishers = publishers.filter(publisher => 
        publisher.Name.toLowerCase().includes(searchTerm) ||
        (publisher.Address && publisher.Address.toLowerCase().includes(searchTerm)) ||
        (publisher.Email && publisher.Email.toLowerCase().includes(searchTerm)) ||
        (publisher.Phone && publisher.Phone.toLowerCase().includes(searchTerm))
    );
    
    displayPublishers(filteredPublishers, 1);
}
