let staffMembers = [];
let currentStaffId = null;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize staff table
    loadStaff();
    
    // Setup listeners
    document.getElementById('staffForm').addEventListener('submit', handleStaffFormSubmit);
    document.getElementById('searchStaff').addEventListener('input', filterStaff);
    document.getElementById('addNewStaffBtn').addEventListener('click', () => {
        resetStaffForm();
        document.getElementById('staffModalLabel').textContent = 'Add New Staff Member';
        document.querySelector('#staffModal .btn-primary').textContent = 'Add Staff Member';
    });
});

/**
 * Load all staff from API
 */
async function loadStaff() {
    try {
        staffMembers = await fetchData('/api/staff');
        displayStaff(staffMembers, currentPage);
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

/**
 * Display staff in the table
 */
function displayStaff(staffToDisplay, page) {
    const tableBody = document.getElementById('staffTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStaff = staffToDisplay.slice(startIndex, endIndex);
    
    if (paginatedStaff.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No staff members found</td></tr>';
        return;
    }
    
    paginatedStaff.forEach(staff => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td data-column="name">${staff.Name}</td>
            <td data-column="email">${staff.Email}</td>
            <td data-column="phone">${staff.Phone}</td>
            <td data-column="role">${staff.Role || '-'}</td>
            <td data-column="hireDate">${formatDateForDisplay(staff.HireDate) || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-staff" data-id="${staff.StaffID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-staff" data-id="${staff.StaffID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup edit and delete buttons
    setupStaffButtonListeners();
    
    // Setup pagination
    const paginationContainer = document.getElementById('staffPagination');
    createPagination(paginationContainer, staffToDisplay.length, itemsPerPage, page, (newPage) => {
        currentPage = newPage;
        displayStaff(staffToDisplay, newPage);
    });
    
    // Initialize sorting
    initializeTableSorting(document.getElementById('staffTable'));
}

/**
 * Setup event listeners for edit and delete buttons
 */
function setupStaffButtonListeners() {
    // Edit staff buttons
    document.querySelectorAll('.edit-staff').forEach(button => {
        button.addEventListener('click', () => {
            const staffId = button.getAttribute('data-id');
            editStaff(staffId);
        });
    });
    
    // Delete staff buttons
    document.querySelectorAll('.delete-staff').forEach(button => {
        button.addEventListener('click', () => {
            const staffId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this staff member?')) {
                deleteStaff(staffId);
            }
        });
    });
}

/**
 * Reset staff form for adding a new staff member
 */
function resetStaffForm() {
    const form = document.getElementById('staffForm');
    form.reset();
    currentStaffId = null;
    
    // Set today's date as default for hire date
    document.getElementById('hireDate').value = new Date().toISOString().split('T')[0];
    
    // Clear validation errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Edit a staff member
 */
async function editStaff(staffId) {
    try {
        const staff = staffMembers.find(s => s.StaffID == staffId);
        if (!staff) return;
        
        currentStaffId = staffId;
        
        // Fill the form
        document.getElementById('name').value = staff.Name;
        document.getElementById('email').value = staff.Email;
        document.getElementById('phone').value = staff.Phone;
        document.getElementById('role').value = staff.Role || '';
        
        // Format and set the date
        if (staff.HireDate) {
            document.getElementById('hireDate').value = formatDate(staff.HireDate);
        } else {
            document.getElementById('hireDate').value = '';
        }
        
        // Update modal title and button text
        document.getElementById('staffModalLabel').textContent = 'Edit Staff Member';
        document.querySelector('#staffModal .btn-primary').textContent = 'Update Staff Member';
        
        // Show the modal
        const staffModal = new bootstrap.Modal(document.getElementById('staffModal'));
        staffModal.show();
    } catch (error) {
        console.error('Error editing staff member:', error);
        showToast('Failed to load staff member details', 'error');
    }
}

/**
 * Handle staff form submission (add/edit)
 */
async function handleStaffFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('staffForm');
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Collect form data
    const staffData = {
        Name: document.getElementById('name').value,
        Email: document.getElementById('email').value,
        Phone: document.getElementById('phone').value,
        Role: document.getElementById('role').value || null,
        HireDate: document.getElementById('hireDate').value || null
    };
    
    try {
        if (currentStaffId) {
            // Update existing staff member
            await sendRequest(`/api/staff/${currentStaffId}`, 'PUT', staffData);
            showToast('Staff member updated successfully', 'success');
        } else {
            // Add new staff member
            await sendRequest('/api/staff', 'POST', staffData);
            showToast('Staff member added successfully', 'success');
        }
        
        // Close modal
        const staffModal = bootstrap.Modal.getInstance(document.getElementById('staffModal'));
        staffModal.hide();
        
        // Reload staff
        loadStaff();
    } catch (error) {
        console.error('Error saving staff member:', error);
    }
}

/**
 * Delete a staff member
 */
async function deleteStaff(staffId) {
    try {
        await sendRequest(`/api/staff/${staffId}`, 'DELETE');
        showToast('Staff member deleted successfully', 'success');
        
        // Reload staff
        loadStaff();
    } catch (error) {
        console.error('Error deleting staff member:', error);
    }
}

/**
 * Filter staff based on search input
 */
function filterStaff() {
    const searchTerm = document.getElementById('searchStaff').value.toLowerCase();
    
    if (!searchTerm) {
        displayStaff(staffMembers, 1);
        return;
    }
    
    const filteredStaff = staffMembers.filter(staff => 
        staff.Name.toLowerCase().includes(searchTerm) ||
        staff.Email.toLowerCase().includes(searchTerm) ||
        staff.Phone.toLowerCase().includes(searchTerm) ||
        (staff.Role && staff.Role.toLowerCase().includes(searchTerm))
    );
    
    displayStaff(filteredStaff, 1);
}
