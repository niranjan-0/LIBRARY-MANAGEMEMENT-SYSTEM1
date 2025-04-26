let reservations = [];
let currentReservationId = null;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize reservations table
    loadReservations();
    
    // Setup listeners
    document.getElementById('reservationForm').addEventListener('submit', handleReservationFormSubmit);
    document.getElementById('searchReservations').addEventListener('input', filterReservations);
    document.getElementById('addNewReservationBtn').addEventListener('click', () => {
        resetReservationForm();
        document.getElementById('reservationModalLabel').textContent = 'Add New Reservation';
        document.querySelector('#reservationModal .btn-primary').textContent = 'Add Reservation';
    });
    
    // Setup dropdowns in the form
    loadMembersDropdown();
    loadBooksDropdown();
});

/**
 * Load all reservations from API
 */
async function loadReservations() {
    try {
        reservations = await fetchData('/api/reservations');
        displayReservations(reservations, currentPage);
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

/**
 * Display reservations in the table
 */
function displayReservations(reservationsToDisplay, page) {
    const tableBody = document.getElementById('reservationsTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReservations = reservationsToDisplay.slice(startIndex, endIndex);
    
    if (paginatedReservations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No reservations found</td></tr>';
        return;
    }
    
    paginatedReservations.forEach(reservation => {
        const row = document.createElement('tr');
        
        // Status badge class
        let statusClass = 'bg-secondary';
        if (reservation.Status === 'Pending') statusClass = 'bg-warning';
        if (reservation.Status === 'Completed') statusClass = 'bg-success';
        if (reservation.Status === 'Cancelled') statusClass = 'bg-danger';
        
        row.innerHTML = `
            <td data-column="member">${reservation.MemberName || '-'}</td>
            <td data-column="book">${reservation.BookTitle || '-'}</td>
            <td data-column="reservationDate">${formatDateForDisplay(reservation.ReservationDate) || '-'}</td>
            <td data-column="status">
                <span class="badge ${statusClass}">${reservation.Status}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-reservation" data-id="${reservation.ReservationID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-reservation" data-id="${reservation.ReservationID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup edit and delete buttons
    setupReservationButtonListeners();
    
    // Setup pagination
    const paginationContainer = document.getElementById('reservationsPagination');
    createPagination(paginationContainer, reservationsToDisplay.length, itemsPerPage, page, (newPage) => {
        currentPage = newPage;
        displayReservations(reservationsToDisplay, newPage);
    });
    
    // Initialize sorting
    initializeTableSorting(document.getElementById('reservationsTable'));
}

/**
 * Setup event listeners for edit and delete buttons
 */
function setupReservationButtonListeners() {
    // Edit reservation buttons
    document.querySelectorAll('.edit-reservation').forEach(button => {
        button.addEventListener('click', () => {
            const reservationId = button.getAttribute('data-id');
            editReservation(reservationId);
        });
    });
    
    // Delete reservation buttons
    document.querySelectorAll('.delete-reservation').forEach(button => {
        button.addEventListener('click', () => {
            const reservationId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this reservation?')) {
                deleteReservation(reservationId);
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
        
        // Add book options
        books.forEach(book => {
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
 * Reset reservation form for adding a new reservation
 */
function resetReservationForm() {
    const form = document.getElementById('reservationForm');
    form.reset();
    currentReservationId = null;
    
    // Set today's date as default for reservation date
    document.getElementById('reservationDate').value = new Date().toISOString().split('T')[0];
    
    // Set default status
    document.getElementById('status').value = 'Pending';
    
    // Clear validation errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Edit a reservation
 */
async function editReservation(reservationId) {
    try {
        const reservation = reservations.find(r => r.ReservationID == reservationId);
        if (!reservation) return;
        
        currentReservationId = reservationId;
        
        // Fill the form
        document.getElementById('memberID').value = reservation.MemberID;
        document.getElementById('bookID').value = reservation.BookID;
        document.getElementById('status').value = reservation.Status;
        
        // Format and set the date
        if (reservation.ReservationDate) {
            document.getElementById('reservationDate').value = formatDate(reservation.ReservationDate);
        } else {
            document.getElementById('reservationDate').value = '';
        }
        
        // Update modal title and button text
        document.getElementById('reservationModalLabel').textContent = 'Edit Reservation';
        document.querySelector('#reservationModal .btn-primary').textContent = 'Update Reservation';
        
        // Show the modal
        const reservationModal = new bootstrap.Modal(document.getElementById('reservationModal'));
        reservationModal.show();
    } catch (error) {
        console.error('Error editing reservation:', error);
        showToast('Failed to load reservation details', 'error');
    }
}

/**
 * Handle reservation form submission (add/edit)
 */
async function handleReservationFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('reservationForm');
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Collect form data
    const reservationData = {
        MemberID: parseInt(document.getElementById('memberID').value),
        BookID: parseInt(document.getElementById('bookID').value),
        ReservationDate: document.getElementById('reservationDate').value || null,
        Status: document.getElementById('status').value
    };
    
    try {
        if (currentReservationId) {
            // Update existing reservation
            await sendRequest(`/api/reservations/${currentReservationId}`, 'PUT', reservationData);
            showToast('Reservation updated successfully', 'success');
        } else {
            // Add new reservation
            await sendRequest('/api/reservations', 'POST', reservationData);
            showToast('Reservation added successfully', 'success');
        }
        
        // Close modal
        const reservationModal = bootstrap.Modal.getInstance(document.getElementById('reservationModal'));
        reservationModal.hide();
        
        // Reload reservations
        loadReservations();
    } catch (error) {
        console.error('Error saving reservation:', error);
    }
}

/**
 * Delete a reservation
 */
async function deleteReservation(reservationId) {
    try {
        await sendRequest(`/api/reservations/${reservationId}`, 'DELETE');
        showToast('Reservation deleted successfully', 'success');
        
        // Reload reservations
        loadReservations();
    } catch (error) {
        console.error('Error deleting reservation:', error);
    }
}

/**
 * Filter reservations based on search input
 */
function filterReservations() {
    const searchTerm = document.getElementById('searchReservations').value.toLowerCase();
    
    if (!searchTerm) {
        displayReservations(reservations, 1);
        return;
    }
    
    const filteredReservations = reservations.filter(reservation => 
        (reservation.MemberName && reservation.MemberName.toLowerCase().includes(searchTerm)) ||
        (reservation.BookTitle && reservation.BookTitle.toLowerCase().includes(searchTerm)) ||
        (reservation.Status && reservation.Status.toLowerCase().includes(searchTerm))
    );
    
    displayReservations(filteredReservations, 1);
}

/**
 * Filter reservations by status
 */
function filterByStatus(status) {
    let filteredReservations = [...reservations];
    
    if (status !== 'all') {
        filteredReservations = reservations.filter(r => r.Status === status);
    }
    
    displayReservations(filteredReservations, 1);
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter-${status}`).classList.add('active');
}
