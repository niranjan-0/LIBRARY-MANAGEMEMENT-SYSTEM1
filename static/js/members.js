let members = [];
let currentMemberId = null;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize members table
    loadMembers();
    
    // Setup listeners
    document.getElementById('memberForm').addEventListener('submit', handleMemberFormSubmit);
    document.getElementById('searchMembers').addEventListener('input', filterMembers);
    document.getElementById('addNewMemberBtn').addEventListener('click', () => {
        resetMemberForm();
        document.getElementById('memberModalLabel').textContent = 'Add New Member';
        document.querySelector('#memberModal .btn-primary').textContent = 'Add Member';
    });
    
    // Setup membership type dropdown in the form
    loadMembershipTypesDropdown();
});

/**
 * Load all members from API
 */
async function loadMembers() {
    try {
        members = await fetchData('/api/members');
        displayMembers(members, currentPage);
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

/**
 * Display members in the table
 */
function displayMembers(membersToDisplay, page) {
    const tableBody = document.getElementById('membersTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedMembers = membersToDisplay.slice(startIndex, endIndex);
    
    if (paginatedMembers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No members found</td></tr>';
        return;
    }
    
    paginatedMembers.forEach(member => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td data-column="name">${member.Name}</td>
            <td data-column="email">${member.Email}</td>
            <td data-column="phone">${member.Phone}</td>
            <td data-column="address">${member.Address || '-'}</td>
            <td data-column="membershipType">${member.MembershipTypeName || '-'}</td>
            <td data-column="membershipDate">${formatDateForDisplay(member.MembershipDate) || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-member" data-id="${member.MemberID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-member" data-id="${member.MemberID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup edit and delete buttons
    setupMemberButtonListeners();
    
    // Setup pagination
    const paginationContainer = document.getElementById('membersPagination');
    createPagination(paginationContainer, membersToDisplay.length, itemsPerPage, page, (newPage) => {
        currentPage = newPage;
        displayMembers(membersToDisplay, newPage);
    });
    
    // Initialize sorting
    initializeTableSorting(document.getElementById('membersTable'));
}

/**
 * Setup event listeners for edit and delete buttons
 */
function setupMemberButtonListeners() {
    // Edit member buttons
    document.querySelectorAll('.edit-member').forEach(button => {
        button.addEventListener('click', () => {
            const memberId = button.getAttribute('data-id');
            editMember(memberId);
        });
    });
    
    // Delete member buttons
    document.querySelectorAll('.delete-member').forEach(button => {
        button.addEventListener('click', () => {
            const memberId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this member?')) {
                deleteMember(memberId);
            }
        });
    });
}

/**
 * Load membership types for dropdown
 */
async function loadMembershipTypesDropdown() {
    try {
        const membershipTypes = await fetchData('/api/membershiptypes');
        const select = document.getElementById('membershipTypeID');
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Membership Type</option>';
        
        // Add membership type options
        membershipTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.MembershipTypeID;
            option.textContent = `${type.TypeName} (${type.DurationMonths} months, $${type.Fee})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading membership types:', error);
    }
}

/**
 * Reset member form for adding a new member
 */
function resetMemberForm() {
    const form = document.getElementById('memberForm');
    form.reset();
    currentMemberId = null;
    
    // Set today's date as default for membership date
    document.getElementById('membershipDate').value = new Date().toISOString().split('T')[0];
    
    // Clear validation errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Edit a member
 */
async function editMember(memberId) {
    try {
        const member = members.find(m => m.MemberID == memberId);
        if (!member) return;
        
        currentMemberId = memberId;
        
        // Fill the form
        document.getElementById('name').value = member.Name;
        document.getElementById('email').value = member.Email;
        document.getElementById('phone').value = member.Phone;
        document.getElementById('address').value = member.Address || '';
        document.getElementById('membershipTypeID').value = member.MembershipTypeID || '';
        
        // Format and set the date
        if (member.MembershipDate) {
            document.getElementById('membershipDate').value = formatDate(member.MembershipDate);
        } else {
            document.getElementById('membershipDate').value = '';
        }
        
        // Update modal title and button text
        document.getElementById('memberModalLabel').textContent = 'Edit Member';
        document.querySelector('#memberModal .btn-primary').textContent = 'Update Member';
        
        // Show the modal
        const memberModal = new bootstrap.Modal(document.getElementById('memberModal'));
        memberModal.show();
    } catch (error) {
        console.error('Error editing member:', error);
        showToast('Failed to load member details', 'error');
    }
}

/**
 * Handle member form submission (add/edit)
 */
async function handleMemberFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('memberForm');
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Collect form data
    const memberData = {
        Name: document.getElementById('name').value,
        Email: document.getElementById('email').value,
        Phone: document.getElementById('phone').value,
        Address: document.getElementById('address').value || null,
        MembershipTypeID: document.getElementById('membershipTypeID').value || null,
        MembershipDate: document.getElementById('membershipDate').value || null
    };
    
    try {
        if (currentMemberId) {
            // Update existing member
            await sendRequest(`/api/members/${currentMemberId}`, 'PUT', memberData);
            showToast('Member updated successfully', 'success');
        } else {
            // Add new member
            await sendRequest('/api/members', 'POST', memberData);
            showToast('Member added successfully', 'success');
        }
        
        // Close modal
        const memberModal = bootstrap.Modal.getInstance(document.getElementById('memberModal'));
        memberModal.hide();
        
        // Reload members
        loadMembers();
    } catch (error) {
        console.error('Error saving member:', error);
    }
}

/**
 * Delete a member
 */
async function deleteMember(memberId) {
    try {
        await sendRequest(`/api/members/${memberId}`, 'DELETE');
        showToast('Member deleted successfully', 'success');
        
        // Reload members
        loadMembers();
    } catch (error) {
        console.error('Error deleting member:', error);
    }
}

/**
 * Filter members based on search input
 */
function filterMembers() {
    const searchTerm = document.getElementById('searchMembers').value.toLowerCase();
    
    if (!searchTerm) {
        displayMembers(members, 1);
        return;
    }
    
    const filteredMembers = members.filter(member => 
        member.Name.toLowerCase().includes(searchTerm) ||
        member.Email.toLowerCase().includes(searchTerm) ||
        member.Phone.toLowerCase().includes(searchTerm) ||
        (member.Address && member.Address.toLowerCase().includes(searchTerm))
    );
    
    displayMembers(filteredMembers, 1);
}
