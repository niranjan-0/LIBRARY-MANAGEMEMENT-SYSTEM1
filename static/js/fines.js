let fines = [];
let currentFineId = null;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize fines table
    loadFines();
    
    // Setup listeners
    document.getElementById('fineForm').addEventListener('submit', handleFineFormSubmit);
    document.getElementById('searchFines').addEventListener('input', filterFines);
    document.getElementById('addNewFineBtn').addEventListener('click', () => {
        resetFineForm();
        document.getElementById('fineModalLabel').textContent = 'Add New Fine';
        document.querySelector('#fineModal .btn-primary').textContent = 'Add Fine';
    });
    
    // Setup borrowings dropdown in the form
    loadBorrowingsDropdown();
});

/**
 * Load all fines from API
 */
async function loadFines() {
    try {
        fines = await fetchData('/api/fines');
        displayFines(fines, currentPage);
    } catch (error) {
        console.error('Error loading fines:', error);
    }
}

/**
 * Display fines in the table
 */
function displayFines(finesToDisplay, page) {
    const tableBody = document.getElementById('finesTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedFines = finesToDisplay.slice(startIndex, endIndex);
    
    if (paginatedFines.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No fines found</td></tr>';
        return;
    }
    
    paginatedFines.forEach(fine => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td data-column="member">${fine.MemberName || '-'}</td>
            <td data-column="book">${fine.BookTitle || '-'}</td>
            <td data-column="borrowDate">${formatDateForDisplay(fine.BorrowDate) || '-'}</td>
            <td data-column="dueDate">${formatDateForDisplay(fine.DueDate) || '-'}</td>
            <td data-column="amount">$${fine.Amount.toFixed(2)}</td>
            <td data-column="paid">
                <span class="badge ${fine.Paid ? 'bg-success' : 'bg-danger'}">
                    ${fine.Paid ? 'Paid' : 'Unpaid'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-fine" data-id="${fine.FineID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-fine" data-id="${fine.FineID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup edit and delete buttons
    setupFineButtonListeners();
    
    // Setup pagination
    const paginationContainer = document.getElementById('finesPagination');
    createPagination(paginationContainer, finesToDisplay.length, itemsPerPage, page, (newPage) => {
        currentPage = newPage;
        displayFines(finesToDisplay, newPage);
    });
    
    // Initialize sorting
    initializeTableSorting(document.getElementById('finesTable'));
}

/**
 * Setup event listeners for edit and delete buttons
 */
function setupFineButtonListeners() {
    // Edit fine buttons
    document.querySelectorAll('.edit-fine').forEach(button => {
        button.addEventListener('click', () => {
            const fineId = button.getAttribute('data-id');
            editFine(fineId);
        });
    });
    
    // Delete fine buttons
    document.querySelectorAll('.delete-fine').forEach(button => {
        button.addEventListener('click', () => {
            const fineId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this fine?')) {
                deleteFine(fineId);
            }
        });
    });
}

/**
 * Load borrowings for dropdown
 */
async function loadBorrowingsDropdown() {
    try {
        const borrowings = await fetchData('/api/borrowings');
        const select = document.getElementById('borrowID');
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Borrowing</option>';
        
        // Add borrowing options
        borrowings.forEach(borrowing => {
            const option = document.createElement('option');
            option.value = borrowing.BorrowID;
            option.textContent = `${borrowing.MemberName} - ${borrowing.BookTitle} (Due: ${formatDateForDisplay(borrowing.DueDate)})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading borrowings:', error);
    }
}

/**
 * Reset fine form for adding a new fine
 */
function resetFineForm() {
    const form = document.getElementById('fineForm');
    form.reset();
    currentFineId = null;
    
    // Default amount to 10.00
    document.getElementById('amount').value = '10.00';
    
    // Clear validation errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Edit a fine
 */
async function editFine(fineId) {
    try {
        const fine = fines.find(f => f.FineID == fineId);
        if (!fine) return;
        
        currentFineId = fineId;
        
        // Fill the form
        document.getElementById('borrowID').value = fine.BorrowID;
        document.getElementById('amount').value = fine.Amount.toFixed(2);
        document.getElementById('paid').checked = fine.Paid;
        
        // Update modal title and button text
        document.getElementById('fineModalLabel').textContent = 'Edit Fine';
        document.querySelector('#fineModal .btn-primary').textContent = 'Update Fine';
        
        // Show the modal
        const fineModal = new bootstrap.Modal(document.getElementById('fineModal'));
        fineModal.show();
    } catch (error) {
        console.error('Error editing fine:', error);
        showToast('Failed to load fine details', 'error');
    }
}

/**
 * Handle fine form submission (add/edit)
 */
async function handleFineFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('fineForm');
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Collect form data
    const fineData = {
        BorrowID: parseInt(document.getElementById('borrowID').value),
        Amount: parseFloat(document.getElementById('amount').value),
        Paid: document.getElementById('paid').checked
    };
    
    try {
        if (currentFineId) {
            // Update existing fine
            await sendRequest(`/api/fines/${currentFineId}`, 'PUT', fineData);
            showToast('Fine updated successfully', 'success');
        } else {
            // Add new fine
            await sendRequest('/api/fines', 'POST', fineData);
            showToast('Fine added successfully', 'success');
        }
        
        // Close modal
        const fineModal = bootstrap.Modal.getInstance(document.getElementById('fineModal'));
        fineModal.hide();
        
        // Reload fines
        loadFines();
    } catch (error) {
        console.error('Error saving fine:', error);
    }
}

/**
 * Delete a fine
 */
async function deleteFine(fineId) {
    try {
        await sendRequest(`/api/fines/${fineId}`, 'DELETE');
        showToast('Fine deleted successfully', 'success');
        
        // Reload fines
        loadFines();
    } catch (error) {
        console.error('Error deleting fine:', error);
    }
}

/**
 * Filter fines based on search input
 */
function filterFines() {
    const searchTerm = document.getElementById('searchFines').value.toLowerCase();
    
    if (!searchTerm) {
        displayFines(fines, 1);
        return;
    }
    
    const filteredFines = fines.filter(fine => 
        (fine.MemberName && fine.MemberName.toLowerCase().includes(searchTerm)) ||
        (fine.BookTitle && fine.BookTitle.toLowerCase().includes(searchTerm))
    );
    
    displayFines(filteredFines, 1);
}

/**
 * Filter fines by payment status
 */
function filterByPaymentStatus(status) {
    let filteredFines = [...fines];
    
    if (status === 'paid') {
        filteredFines = fines.filter(f => f.Paid);
    } else if (status === 'unpaid') {
        filteredFines = fines.filter(f => !f.Paid);
    }
    
    displayFines(filteredFines, 1);
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter-${status}`).classList.add('active');
}
