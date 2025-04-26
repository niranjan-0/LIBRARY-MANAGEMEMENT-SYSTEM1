let membershipTypes = [];
let currentMembershipTypeId = null;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize membership types table
    loadMembershipTypes();
    
    // Setup listeners
    document.getElementById('membershipTypeForm').addEventListener('submit', handleMembershipTypeFormSubmit);
    document.getElementById('searchMembershipTypes').addEventListener('input', filterMembershipTypes);
    document.getElementById('addNewMembershipTypeBtn').addEventListener('click', () => {
        resetMembershipTypeForm();
        document.getElementById('membershipTypeModalLabel').textContent = 'Add New Membership Type';
        document.querySelector('#membershipTypeModal .btn-primary').textContent = 'Add Membership Type';
    });
});

/**
 * Load all membership types from API
 */
async function loadMembershipTypes() {
    try {
        membershipTypes = await fetchData('/api/membershiptypes');
        displayMembershipTypes(membershipTypes, currentPage);
    } catch (error) {
        console.error('Error loading membership types:', error);
    }
}

/**
 * Display membership types in the table
 */
function displayMembershipTypes(typesToDisplay, page) {
    const tableBody = document.getElementById('membershipTypesTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTypes = typesToDisplay.slice(startIndex, endIndex);
    
    if (paginatedTypes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No membership types found</td></tr>';
        return;
    }
    
    paginatedTypes.forEach(type => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td data-column="typeName">${type.TypeName}</td>
            <td data-column="durationMonths">${type.DurationMonths} months</td>
            <td data-column="fee">$${type.Fee.toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-type" data-id="${type.MembershipTypeID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-type" data-id="${type.MembershipTypeID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup edit and delete buttons
    setupMembershipTypeButtonListeners();
    
    // Setup pagination
    const paginationContainer = document.getElementById('membershipTypesPagination');
    createPagination(paginationContainer, typesToDisplay.length, itemsPerPage, page, (newPage) => {
        currentPage = newPage;
        displayMembershipTypes(typesToDisplay, newPage);
    });
    
    // Initialize sorting
    initializeTableSorting(document.getElementById('membershipTypesTable'));
}

/**
 * Setup event listeners for edit and delete buttons
 */
function setupMembershipTypeButtonListeners() {
    // Edit membership type buttons
    document.querySelectorAll('.edit-type').forEach(button => {
        button.addEventListener('click', () => {
            const typeId = button.getAttribute('data-id');
            editMembershipType(typeId);
        });
    });
    
    // Delete membership type buttons
    document.querySelectorAll('.delete-type').forEach(button => {
        button.addEventListener('click', () => {
            const typeId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this membership type?')) {
                deleteMembershipType(typeId);
            }
        });
    });
}

/**
 * Reset membership type form for adding a new type
 */
function resetMembershipTypeForm() {
    const form = document.getElementById('membershipTypeForm');
    form.reset();
    currentMembershipTypeId = null;
    
    // Set default values
    document.getElementById('durationMonths').value = '12';
    document.getElementById('fee').value = '100.00';
    
    // Clear validation errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Edit a membership type
 */
async function editMembershipType(typeId) {
    try {
        const type = membershipTypes.find(t => t.MembershipTypeID == typeId);
        if (!type) return;
        
        currentMembershipTypeId = typeId;
        
        // Fill the form
        document.getElementById('typeName').value = type.TypeName;
        document.getElementById('durationMonths').value = type.DurationMonths;
        document.getElementById('fee').value = type.Fee.toFixed(2);
        
        // Update modal title and button text
        document.getElementById('membershipTypeModalLabel').textContent = 'Edit Membership Type';
        document.querySelector('#membershipTypeModal .btn-primary').textContent = 'Update Membership Type';
        
        // Show the modal
        const membershipTypeModal = new bootstrap.Modal(document.getElementById('membershipTypeModal'));
        membershipTypeModal.show();
    } catch (error) {
        console.error('Error editing membership type:', error);
        showToast('Failed to load membership type details', 'error');
    }
}

/**
 * Handle membership type form submission (add/edit)
 */
async function handleMembershipTypeFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('membershipTypeForm');
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Collect form data
    const typeData = {
        TypeName: document.getElementById('typeName').value,
        DurationMonths: parseInt(document.getElementById('durationMonths').value),
        Fee: parseFloat(document.getElementById('fee').value)
    };
    
    try {
        if (currentMembershipTypeId) {
            // Update existing membership type
            await sendRequest(`/api/membershiptypes/${currentMembershipTypeId}`, 'PUT', typeData);
            showToast('Membership type updated successfully', 'success');
        } else {
            // Add new membership type
            await sendRequest('/api/membershiptypes', 'POST', typeData);
            showToast('Membership type added successfully', 'success');
        }
        
        // Close modal
        const membershipTypeModal = bootstrap.Modal.getInstance(document.getElementById('membershipTypeModal'));
        membershipTypeModal.hide();
        
        // Reload membership types
        loadMembershipTypes();
    } catch (error) {
        console.error('Error saving membership type:', error);
    }
}

/**
 * Delete a membership type
 */
async function deleteMembershipType(typeId) {
    try {
        await sendRequest(`/api/membershiptypes/${typeId}`, 'DELETE');
        showToast('Membership type deleted successfully', 'success');
        
        // Reload membership types
        loadMembershipTypes();
    } catch (error) {
        console.error('Error deleting membership type:', error);
    }
}

/**
 * Filter membership types based on search input
 */
function filterMembershipTypes() {
    const searchTerm = document.getElementById('searchMembershipTypes').value.toLowerCase();
    
    if (!searchTerm) {
        displayMembershipTypes(membershipTypes, 1);
        return;
    }
    
    const filteredTypes = membershipTypes.filter(type => 
        type.TypeName.toLowerCase().includes(searchTerm)
    );
    
    displayMembershipTypes(filteredTypes, 1);
}
