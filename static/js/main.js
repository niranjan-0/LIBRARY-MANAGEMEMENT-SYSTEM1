// Global DOM elements
const loaderElement = document.createElement('div');
loaderElement.classList.add('loader-overlay');
loaderElement.innerHTML = '<div class="loader"></div>';

// Toast container
const toastContainer = document.createElement('div');
toastContainer.classList.add('toast-container');
document.body.appendChild(toastContainer);

// Utility functions
/**
 * Shows a loader overlay while operations are in progress
 */
function showLoader() {
    document.body.appendChild(loaderElement);
}

/**
 * Hides the loader overlay
 */
function hideLoader() {
    if (document.body.contains(loaderElement)) {
        document.body.removeChild(loaderElement);
    }
}

/**
 * Display a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error, warning)
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.classList.add('toast', 'show');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Set background color based on type
    let bgColor = 'bg-success';
    if (type === 'error') bgColor = 'bg-danger';
    if (type === 'warning') bgColor = 'bg-warning';
    if (type === 'info') bgColor = 'bg-info';

    toast.innerHTML = `
        <div class="toast-header ${bgColor} text-white">
            <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toast);

    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);

    // Make close button work
    const closeButton = toast.querySelector('.btn-close');
    closeButton.addEventListener('click', () => {
        toast.remove();
    });
}

/**
 * Format a date string to YYYY-MM-DD format
 * @param {string} dateString - The date string to format
 * @returns {string} The formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a date string to a more readable format
 * @param {string} dateString - The date string to format
 * @returns {string} The formatted date string
 */
function formatDateForDisplay(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
}

/**
 * Validate form inputs
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} Whether the form is valid
 */
function validateForm(form) {
    let isValid = true;
    
    // Reset previous validations
    form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    
    // Check all required fields
    form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            const feedbackElement = field.nextElementSibling;
            if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
                feedbackElement.textContent = 'This field is required.';
            }
            isValid = false;
        }
    });
    
    // Check email fields
    form.querySelectorAll('input[type="email"]').forEach(field => {
        if (field.value.trim() && !validateEmail(field.value)) {
            field.classList.add('is-invalid');
            const feedbackElement = field.nextElementSibling;
            if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
                feedbackElement.textContent = 'Please enter a valid email address.';
            }
            isValid = false;
        }
    });
    
    // Check number fields
    form.querySelectorAll('input[type="number"]').forEach(field => {
        if (field.value.trim() && (isNaN(field.value) || parseFloat(field.value) < 0)) {
            field.classList.add('is-invalid');
            const feedbackElement = field.nextElementSibling;
            if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
                feedbackElement.textContent = 'Please enter a valid positive number.';
            }
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * Validate an email address
 * @param {string} email - The email to validate
 * @returns {boolean} Whether the email is valid
 */
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Create pagination buttons for a data table
 * @param {HTMLElement} container - The container for the pagination buttons
 * @param {number} totalItems - The total number of items
 * @param {number} itemsPerPage - The number of items per page
 * @param {number} currentPage - The current page
 * @param {function} onChange - The function to call when the page changes
 */
function createPagination(container, totalItems, itemsPerPage, currentPage, onChange) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Clear existing pagination
    container.innerHTML = '';
    
    // If no pages, return
    if (totalPages <= 1) return;
    
    const pagination = document.createElement('ul');
    pagination.classList.add('pagination', 'justify-content-center');
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.classList.add('page-item');
    if (currentPage === 1) prevLi.classList.add('disabled');
    
    const prevLink = document.createElement('a');
    prevLink.classList.add('page-link');
    prevLink.setAttribute('href', '#');
    prevLink.setAttribute('aria-label', 'Previous');
    prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';
    
    prevLi.appendChild(prevLink);
    pagination.appendChild(prevLi);
    
    prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            onChange(currentPage - 1);
        }
    });
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.classList.add('page-item');
        if (i === currentPage) pageLi.classList.add('active');
        
        const pageLink = document.createElement('a');
        pageLink.classList.add('page-link');
        pageLink.setAttribute('href', '#');
        pageLink.textContent = i;
        
        pageLi.appendChild(pageLink);
        pagination.appendChild(pageLi);
        
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            onChange(i);
        });
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.classList.add('page-item');
    if (currentPage === totalPages) nextLi.classList.add('disabled');
    
    const nextLink = document.createElement('a');
    nextLink.classList.add('page-link');
    nextLink.setAttribute('href', '#');
    nextLink.setAttribute('aria-label', 'Next');
    nextLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';
    
    nextLi.appendChild(nextLink);
    pagination.appendChild(nextLi);
    
    nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            onChange(currentPage + 1);
        }
    });
    
    container.appendChild(pagination);
}

/**
 * Generic function to get data from an API endpoint
 * @param {string} url - The API endpoint URL
 * @returns {Promise<any>} The API response
 */
async function fetchData(url) {
    try {
        showLoader();
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'An error occurred');
        }
        
        return await response.json();
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Error fetching data:', error);
        throw error;
    } finally {
        hideLoader();
    }
}

/**
 * Generic function to post/put data to an API endpoint
 * @param {string} url - The API endpoint URL
 * @param {string} method - The HTTP method (POST, PUT, DELETE)
 * @param {object} data - The data to send (optional for DELETE)
 * @returns {Promise<any>} The API response
 */
async function sendRequest(url, method, data = null) {
    try {
        showLoader();
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && method !== 'DELETE') {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'An error occurred');
        }
        
        return await response.json();
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Error sending request:', error);
        throw error;
    } finally {
        hideLoader();
    }
}

/**
 * Initialize search functionality for a data table
 * @param {HTMLInputElement} searchInput - The search input element
 * @param {HTMLTableElement} table - The table to search
 */
function initializeSearch(searchInput, table) {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

/**
 * Initialize sorting functionality for a data table
 * @param {HTMLTableElement} table - The table to sort
 */
function initializeTableSorting(table) {
    const headers = table.querySelectorAll('thead th[data-sort]');
    
    headers.forEach(header => {
        header.style.cursor = 'pointer';
        header.title = 'Click to sort';
        
        // Add sort icon
        const sortIcon = document.createElement('span');
        sortIcon.classList.add('ms-1');
        sortIcon.innerHTML = '&#8645;'; // Up-down arrow
        header.appendChild(sortIcon);
        
        header.addEventListener('click', () => {
            const sortColumn = header.dataset.sort;
            let sortDirection = header.dataset.sortDirection || 'asc';
            
            // Update all headers
            headers.forEach(h => {
                if (h !== header) {
                    h.dataset.sortDirection = '';
                    h.querySelector('span').innerHTML = '&#8645;';
                }
            });
            
            // Toggle sort direction
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            header.dataset.sortDirection = sortDirection;
            
            // Update sort icon
            sortIcon.innerHTML = sortDirection === 'asc' ? '&#9650;' : '&#9660;';
            
            // Sort table
            sortTable(table, sortColumn, sortDirection);
        });
    });
}

/**
 * Sort a table by a specific column
 * @param {HTMLTableElement} table - The table to sort
 * @param {string} column - The column to sort by
 * @param {string} direction - The sort direction ('asc' or 'desc')
 */
function sortTable(table, column, direction) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Sort the rows
    rows.sort((a, b) => {
        const aValue = a.querySelector(`td[data-column="${column}"]`).textContent.trim();
        const bValue = b.querySelector(`td[data-column="${column}"]`).textContent.trim();
        
        // Check if values are dates
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        
        if (!isNaN(aDate) && !isNaN(bDate)) {
            return direction === 'asc' ? aDate - bDate : bDate - aDate;
        }
        
        // Check if values are numbers
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Default to string comparison
        return direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
    });
    
    // Clear the table and add the sorted rows
    tbody.innerHTML = '';
    rows.forEach(row => {
        tbody.appendChild(row);
    });
}

// Set active nav item based on current page
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || 
            (currentPath === '/' && href === '/dashboard') ||
            (currentPath !== '/' && href !== '/dashboard' && currentPath.includes(href))) {
            link.classList.add('active');
        }
    });
});
