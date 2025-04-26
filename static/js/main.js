/**
 * Shows the loader overlay
 */
function showLoader() {
    document.getElementById('loader-overlay').style.display = 'flex';
}

/**
 * Hides the loader overlay
 */
function hideLoader() {
    document.getElementById('loader-overlay').style.display = 'none';
}

/**
 * Display a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error, warning)
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastBody = toast.querySelector('.toast-body');
    
    // Set message
    toastBody.textContent = message;
    
    // Set style based on type
    toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'text-white');
    if (type === 'success') {
        toast.classList.add('bg-success', 'text-white');
    } else if (type === 'error') {
        toast.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toast.classList.add('bg-warning', 'text-white');
    }
    
    // Show toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

/**
 * Format a date string to YYYY-MM-DD format
 * @param {string} dateString - The date string to format
 * @returns {string} The formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * Format a date string to a more readable format
 * @param {string} dateString - The date string to format
 * @returns {string} The formatted date string
 */
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Validate form inputs
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} Whether the form is valid
 */
function validateForm(form) {
    let isValid = true;
    
    Array.from(form.elements).forEach(element => {
        if (element.hasAttribute('required') && !element.value.trim()) {
            isValid = false;
            element.classList.add('is-invalid');
        } else if (element.type === 'email' && element.value.trim() && !validateEmail(element.value)) {
            isValid = false;
            element.classList.add('is-invalid');
        } else {
            element.classList.remove('is-invalid');
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
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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
    container.innerHTML = '';
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    const prevItem = document.createElement('li');
    prevItem.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.setAttribute('aria-label', 'Previous');
    prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';
    
    if (currentPage > 1) {
        prevLink.addEventListener('click', (e) => {
            e.preventDefault();
            onChange(currentPage - 1);
        });
    }
    
    prevItem.appendChild(prevLink);
    container.appendChild(prevItem);
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(startPage + 4, totalPages);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
        
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        
        if (i !== currentPage) {
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                onChange(i);
            });
        }
        
        pageItem.appendChild(pageLink);
        container.appendChild(pageItem);
    }
    
    // Next button
    const nextItem = document.createElement('li');
    nextItem.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.setAttribute('aria-label', 'Next');
    nextLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';
    
    if (currentPage < totalPages) {
        nextLink.addEventListener('click', (e) => {
            e.preventDefault();
            onChange(currentPage + 1);
        });
    }
    
    nextItem.appendChild(nextLink);
    container.appendChild(nextItem);
}

/**
 * Generic function to get data from an API endpoint
 * @param {string} url - The API endpoint URL
 * @returns {Promise<any>} The API response
 */
async function fetchData(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
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
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error ${method} data:`, error);
        throw error;
    }
}

/**
 * Add styles for the loader overlay to the document
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add loader overlay styles
    const style = document.createElement('style');
    style.textContent = `
        #loader-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
    `;
    document.head.appendChild(style);
});