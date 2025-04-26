document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentPage = 1;
    const itemsPerPage = 10;
    let allMembershipTypes = [];
    let membershipTypeToDelete = null;
    
    // Initial load
    loadMembershipTypes();
    setupButtonListeners();
    
    /**
     * Load all membership types from API
     */
    async function loadMembershipTypes() {
        showLoader();
        try {
            const response = await fetchData('/api/membershiptypes');
            allMembershipTypes = response;
            displayMembershipTypes(allMembershipTypes, 1);
            hideLoader();
        } catch (error) {
            showToast('Error loading membership types: ' + error.message, 'error');
            hideLoader();
        }
    }
    
    /**
     * Display membership types in the table
     */
    function displayMembershipTypes(membershipTypesToDisplay, page) {
        const table = document.getElementById('membershipTypesTable');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        
        // Calculate pagination
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, membershipTypesToDisplay.length);
        const paginatedTypes = membershipTypesToDisplay.slice(startIndex, endIndex);
        
        if (paginatedTypes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No membership types found</td></tr>';
            return;
        }
        
        // Create table rows
        paginatedTypes.forEach(type => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${type.MembershipTypeID}</td>
                <td>${type.TypeName}</td>
                <td>${type.DurationMonths}</td>
                <td>$${type.Fee.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${type.MembershipTypeID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${type.MembershipTypeID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Create pagination
        createPagination(
            document.getElementById('pagination'),
            membershipTypesToDisplay.length,
            itemsPerPage,
            page,
            function(newPage) {
                currentPage = newPage;
                displayMembershipTypes(membershipTypesToDisplay, newPage);
            }
        );
        
        // Setup button listeners for edit and delete
        setupButtonListeners();
    }
    
    /**
     * Setup event listeners for edit and delete buttons
     */
    function setupButtonListeners() {
        // Modal save button
        document.getElementById('saveMembershipType').addEventListener('click', handleMembershipTypeFormSubmit);
        
        // Confirm delete button
        document.getElementById('confirmDelete').addEventListener('click', function() {
            if (membershipTypeToDelete) {
                deleteMembershipType(membershipTypeToDelete);
            }
        });
        
        // Search input
        document.getElementById('searchInput').addEventListener('keyup', filterMembershipTypes);
        
        // After rendering the table, attach event listeners to edit and delete buttons
        setTimeout(() => {
            // Edit buttons
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const typeId = this.getAttribute('data-id');
                    editMembershipType(typeId);
                });
            });
            
            // Delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const typeId = this.getAttribute('data-id');
                    membershipTypeToDelete = typeId;
                    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
                    deleteModal.show();
                });
            });
        }, 100);
        
        // Reset form when modal is opened for adding a new membership type
        const membershipTypeModal = document.getElementById('membershipTypeModal');
        membershipTypeModal.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            if (!button || !button.classList.contains('edit-btn')) {
                resetMembershipTypeForm();
            }
        });
    }
    
    /**
     * Reset membership type form for adding a new membership type
     */
    function resetMembershipTypeForm() {
        document.getElementById('membershipTypeForm').reset();
        document.getElementById('membershipTypeId').value = '';
        document.getElementById('membershipTypeModalLabel').textContent = 'Add New Membership Type';
    }
    
    /**
     * Edit a membership type
     */
    async function editMembershipType(typeId) {
        showLoader();
        try {
            const response = await fetchData(`/api/membershiptypes/${typeId}`);
            
            // Populate form
            document.getElementById('membershipTypeId').value = response.MembershipTypeID;
            document.getElementById('typeName').value = response.TypeName;
            document.getElementById('durationMonths').value = response.DurationMonths;
            document.getElementById('fee').value = response.Fee;
            
            // Change modal title
            document.getElementById('membershipTypeModalLabel').textContent = 'Edit Membership Type';
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('membershipTypeModal'));
            modal.show();
            
            hideLoader();
        } catch (error) {
            showToast('Error loading membership type details: ' + error.message, 'error');
            hideLoader();
        }
    }
    
    /**
     * Handle membership type form submission (add/edit)
     */
    async function handleMembershipTypeFormSubmit(e) {
        e.preventDefault();
        
        // Validate form
        const form = document.getElementById('membershipTypeForm');
        if (!validateForm(form)) {
            showToast('Please fill in all required fields correctly', 'error');
            return;
        }
        
        // Get form data
        const typeId = document.getElementById('membershipTypeId').value;
        const typeName = document.getElementById('typeName').value;
        const durationMonths = parseInt(document.getElementById('durationMonths').value);
        const fee = parseFloat(document.getElementById('fee').value);
        
        // Create data object
        const data = {
            TypeName: typeName,
            DurationMonths: durationMonths,
            Fee: fee
        };
        
        if (typeId) {
            data.MembershipTypeID = parseInt(typeId);
        }
        
        showLoader();
        try {
            let response;
            if (typeId) {
                // Update existing membership type
                response = await sendRequest(`/api/membershiptypes/${typeId}`, 'PUT', data);
                showToast('Membership type updated successfully');
            } else {
                // Add new membership type
                response = await sendRequest('/api/membershiptypes', 'POST', data);
                showToast('Membership type added successfully');
            }
            
            // Close modal and reload data
            const modal = bootstrap.Modal.getInstance(document.getElementById('membershipTypeModal'));
            modal.hide();
            loadMembershipTypes();
            
            hideLoader();
        } catch (error) {
            showToast('Error saving membership type: ' + error.message, 'error');
            hideLoader();
        }
    }
    
    /**
     * Delete a membership type
     */
    async function deleteMembershipType(typeId) {
        showLoader();
        try {
            const response = await sendRequest(`/api/membershiptypes/${typeId}`, 'DELETE');
            showToast('Membership type deleted successfully');
            
            // Close modal and reload data
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            modal.hide();
            loadMembershipTypes();
            
            hideLoader();
        } catch (error) {
            showToast('Error deleting membership type: ' + error.message, 'error');
            hideLoader();
        }
    }
    
    /**
     * Filter membership types based on search input
     */
    function filterMembershipTypes() {
        const searchValue = document.getElementById('searchInput').value.toLowerCase();
        
        if (!searchValue) {
            displayMembershipTypes(allMembershipTypes, 1);
            return;
        }
        
        const filteredTypes = allMembershipTypes.filter(type => 
            type.TypeName.toLowerCase().includes(searchValue) ||
            type.MembershipTypeID.toString().includes(searchValue) ||
            type.DurationMonths.toString().includes(searchValue) ||
            type.Fee.toString().includes(searchValue)
        );
        
        currentPage = 1;
        displayMembershipTypes(filteredTypes, 1);
    }
});