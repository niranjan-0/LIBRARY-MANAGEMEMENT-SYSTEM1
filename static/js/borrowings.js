let borrowings = [];
let currentBorrowingId = null;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize borrowings table
    loadBorrowings();
    
    // Setup listeners
    document.getElementById('borrowingForm').addEventListener('submit', handleBorrowingFormSubmit);
    document.getElementById('searchBorrowings').addEventListener('input', filterBorrowings);
    document.getElementById('addNewBorrowingBtn').addEventListener('click', () => {
        resetBorrowingForm();
        document.getElementById('borrowingModalLabel').textContent = 'Add New Borrowing';
        document.querySelector('#borrowingModal .btn-primary').textContent = 'Add Borrowing';
    });
    
    // Setup dropdowns in the form
    loadMembersDropdown();
    loadBooksDropdown();
    loadStaffDropdown();
});

/**
 * Load all borrowings from API
 */
async function loadBorrowings() {
    try {
        borrowings = await fetchData('/api/borrowings');
        displayBorrowings(borrowings, currentPage);
    } catch (error) {
        console.error('Error loading borrowings:', error);
    }
}

/**
 * Display borrowings in the table
 */
function displayBorrowings(borrowingsToDisplay, page) {
    const tableBody = document.getElementById('borrowingsTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBorrowings = borrowingsToDisplay.slice(startIndex, endIndex);
    
    if (paginatedBorrowings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No borrowings found</td></tr>';
        return;
    }
    
    paginatedBorrowings.forEach(borrowing => {
        const row = document.createElement('tr');
        
        // Create status and return display
        let statusClass = '';
        let statusText = '';
        const today = new Date();
        const dueDate = new Date(borrowing.DueDate);
        
        if (borrowing.ReturnDate) {
            statusClass = 'bg-success';
            statusText = 'Returned';
        } else if (dueDate < today) {
            statusClass = 'bg-danger';
            statusText = 'Overdue';
        } else {
            statusClass = 'bg-warning';
            statusText = 'Active';
        }
        
        row.innerHTML = `
            <td data-column="member">${borrowing.MemberName || '-'}</td>
            <td data-column="book">${borrowing.BookTitle || '-'}</td>
            <td data-column="borrowDate">${formatDateForDisplay(borrowing.BorrowDate) || '-'}</td>
            <td data-column="dueDate">${formatDateForDisplay(borrowing.DueDate)}</td>
            <td data-column="returnDate">${formatDateForDisplay(borrowing.ReturnDate) || '-'}</td>
            <td data-column="staff">${borrowing.StaffName || '-'}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-borrowing" data-id="${borrowing.BorrowID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-borrowing" data-id="${borrowing.BorrowID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup edit and delete buttons
    setupBorrowingButtonListeners();
    
    // Setup pagination
    const paginationContainer = document.getElementById('borrowingsPagination');
    createPagination(paginationContainer, borrowingsToDisplay.length, itemsPerPage, page, (newPage) => {
        currentPage = newPage;
        displayBorrowings(borrowingsToDisplay, newPage);
    });
    
    // Initialize sorting
    initializeTableSorting(document.getElementById('borrowingsTable'));
}

/**
 * Setup event listeners for edit and delete buttons
 */
function setupBorrowingButtonListeners() {
    // Edit borrowing buttons
    document.querySelectorAll('.edit-borrowing').forEach(button => {
        button.addEventListener('click', () => {
            const borrowingId = button.getAttribute('data-id');
            editBorrowing(borrowingId);
        });
    });
    
    // Delete borrowing buttons
    document.querySelectorAll('.delete-borrowing').forEach(button => {
        button.addEventListener('click', () => {
            const borrowingId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this borrowing record?')) {
                deleteBorrowing(borrowingId);
            }
        });
    });
}

/**
 * Load members for dropdown
 */
async function loadMembersDropdown() {
    try {
        const members = await fetchData('/api/members');
        const select = document.getElementById('memberID');
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Member</option>';
        
        // Add member options
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.MemberID;
            option.textContent = member.Name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

/**
 * Load books for dropdown
 */
async function loadBooksDropdown() {
    try {
        const books = await fetchData('/api/books');
        const select = document.getElementById('bookID');
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Book</option>';
        
        // Add book options (only show books with quantity > 0)
        books.filter(book => book.Quantity > 0).forEach(book => {
            const option = document.createElement('option');
            option.value = book.BookID;
            option.textContent = `${book.Title} (${book.Quantity} available)`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

/**
 * Load staff for dropdown
 */
async function loadStaffDropdown() {
    try {
        const staff = await fetchData('/api/staff');
        const select = document.getElementById('staffID');
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Staff Member</option>';
        
        // Add staff options
        staff.forEach(staffMember => {
            const option = document.createElement('option');
            option.value = staffMember.StaffID;
            option.textContent = staffMember.Name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

/**
 * Reset borrowing form for adding a new borrowing
 */
function resetBorrowingForm() {
    const form = document.getElementById('borrowingForm');
    form.reset();
    currentBorrowingId = null;
    
    // Set today's date as default for borrow date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('borrowDate').value = today;
    
    // Set default due date (today + 14 days)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
    
    // Clear return date
    document.getElementById('returnDate').value = '';
    
    // Clear validation errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Edit a borrowing
 */
async function editBorrowing(borrowingId) {
    try {
        const borrowing = borrowings.find(b => b.BorrowID == borrowingId);
        if (!borrowing) return;
        
        currentBorrowingId = borrowingId;
        
        // Fill the form
        document.getElementById('memberID').value = borrowing.MemberID;
        document.getElementById('bookID').value = borrowing.BookID;
        document.getElementById('staffID').value = borrowing.StaffID || '';
        
        // Format and set dates
        if (borrowing.BorrowDate) {
            document.getElementById('borrowDate').value = formatDate(borrowing.BorrowDate);
        } else {
            document.getElementById('borrowDate').value = '';
        }
        
        if (borrowing.DueDate) {
            document.getElementById('dueDate').value = formatDate(borrowing.DueDate);
        }
        
        if (borrowing.ReturnDate) {
            document.getElementById('returnDate').value = formatDate(borrowing.ReturnDate);
        } else {
            document.getElementById('returnDate').value = '';
        }
        
        // Update modal title and button text
        document.getElementById('borrowingModalLabel').textContent = 'Edit Borrowing';
        document.querySelector('#borrowingModal .btn-primary').textContent = 'Update Borrowing';
        
        // Show the modal
        const borrowingModal = new bootstrap.Modal(document.getElementById('borrowingModal'));
        borrowingModal.show();
    } catch (error) {
        console.error('Error editing borrowing:', error);
        showToast('Failed to load borrowing details', 'error');
    }
}

/**
 * Handle borrowing form submission (add/edit)
 */
async function handleBorrowingFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('borrowingForm');
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Collect form data
    const borrowingData = {
        MemberID: parseInt(document.getElementById('memberID').value),
        BookID: parseInt(document.getElementById('bookID').value),
        BorrowDate: document.getElementById('borrowDate').value || null,
        DueDate: document.getElementById('dueDate').value,
        ReturnDate: document.getElementById('returnDate').value || null,
        StaffID: document.getElementById('staffID').value || null
    };
    
    try {
        if (currentBorrowingId) {
            // Update existing borrowing
            await sendRequest(`/api/borrowings/${currentBorrowingId}`, 'PUT', borrowingData);
            showToast('Borrowing updated successfully', 'success');
        } else {
            // Add new borrowing
            await sendRequest('/api/borrowings', 'POST', borrowingData);
            showToast('Borrowing added successfully', 'success');
        }
        
        // Close modal
        const borrowingModal = bootstrap.Modal.getInstance(document.getElementById('borrowingModal'));
        borrowingModal.hide();
        
        // Reload borrowings and books (since quantities change)
        loadBorrowings();
        loadBooksDropdown();
    } catch (error) {
        console.error('Error saving borrowing:', error);
    }
}

/**
 * Delete a borrowing
 */
async function deleteBorrowing(borrowingId) {
    try {
        await sendRequest(`/api/borrowings/${borrowingId}`, 'DELETE');
        showToast('Borrowing deleted successfully', 'success');
        
        // Reload borrowings and books (since quantities might change)
        loadBorrowings();
        loadBooksDropdown();
    } catch (error) {
        console.error('Error deleting borrowing:', error);
    }
}

/**
 * Filter borrowings based on search input
 */
function filterBorrowings() {
    const searchTerm = document.getElementById('searchBorrowings').value.toLowerCase();
    
    if (!searchTerm) {
        displayBorrowings(borrowings, 1);
        return;
    }
    
    const filteredBorrowings = borrowings.filter(borrowing => 
        (borrowing.MemberName && borrowing.MemberName.toLowerCase().includes(searchTerm)) ||
        (borrowing.BookTitle && borrowing.BookTitle.toLowerCase().includes(searchTerm)) ||
        (borrowing.StaffName && borrowing.StaffName.toLowerCase().includes(searchTerm))
    );
    
    displayBorrowings(filteredBorrowings, 1);
}

/**
 * Filter borrowings by status
 */
function filterByStatus(status) {
    let filteredBorrowings = [...borrowings];
    const today = new Date();
    
    if (status === 'active') {
        filteredBorrowings = borrowings.filter(b => !b.ReturnDate);
    } else if (status === 'returned') {
        filteredBorrowings = borrowings.filter(b => b.ReturnDate);
    } else if (status === 'overdue') {
        filteredBorrowings = borrowings.filter(b => 
            !b.ReturnDate && new Date(b.DueDate) < today
        );
    }
    
    displayBorrowings(filteredBorrowings, 1);
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter-${status}`).classList.add('active');
}
