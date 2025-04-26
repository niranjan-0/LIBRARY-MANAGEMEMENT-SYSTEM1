let books = [];
let currentBookId = null;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize books table
    loadBooks();
    
    // Setup listeners
    document.getElementById('bookForm').addEventListener('submit', handleBookFormSubmit);
    document.getElementById('searchBooks').addEventListener('input', filterBooks);
    document.getElementById('addNewBookBtn').addEventListener('click', () => {
        resetBookForm();
        document.getElementById('bookModalLabel').textContent = 'Add New Book';
        document.querySelector('#bookModal .btn-primary').textContent = 'Add Book';
    });
    
    // Setup publisher dropdown in the form
    loadPublishersDropdown();
    
    // Load duplicates button
    document.getElementById('showDuplicatesBtn').addEventListener('click', showDuplicateBooks);
});

/**
 * Load all books from API
 */
async function loadBooks() {
    try {
        books = await fetchData('/api/books');
        displayBooks(books, currentPage);
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

/**
 * Display books in the table
 */
function displayBooks(booksToDisplay, page) {
    const tableBody = document.getElementById('booksTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBooks = booksToDisplay.slice(startIndex, endIndex);
    
    if (paginatedBooks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No books found</td></tr>';
        return;
    }
    
    paginatedBooks.forEach(book => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td data-column="title">${book.Title}</td>
            <td data-column="author">${book.Author}</td>
            <td data-column="isbn">${book.ISBN}</td>
            <td data-column="genre">${book.Genre || '-'}</td>
            <td data-column="publishedYear">${book.PublishedYear || '-'}</td>
            <td data-column="quantity">${book.Quantity}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-book" data-id="${book.BookID}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-book" data-id="${book.BookID}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup edit and delete buttons
    setupBookButtonListeners();
    
    // Setup pagination
    const paginationContainer = document.getElementById('booksPagination');
    createPagination(paginationContainer, booksToDisplay.length, itemsPerPage, page, (newPage) => {
        currentPage = newPage;
        displayBooks(booksToDisplay, newPage);
    });
    
    // Initialize sorting
    initializeTableSorting(document.getElementById('booksTable'));
}

/**
 * Setup event listeners for edit and delete buttons
 */
function setupBookButtonListeners() {
    // Edit book buttons
    document.querySelectorAll('.edit-book').forEach(button => {
        button.addEventListener('click', () => {
            const bookId = button.getAttribute('data-id');
            editBook(bookId);
        });
    });
    
    // Delete book buttons
    document.querySelectorAll('.delete-book').forEach(button => {
        button.addEventListener('click', () => {
            const bookId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this book?')) {
                deleteBook(bookId);
            }
        });
    });
}

/**
 * Load publishers for dropdown
 */
async function loadPublishersDropdown() {
    try {
        const publishers = await fetchData('/api/publishers');
        const select = document.getElementById('publisherID');
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Publisher</option>';
        
        // Add publisher options
        publishers.forEach(publisher => {
            const option = document.createElement('option');
            option.value = publisher.PublisherID;
            option.textContent = publisher.Name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading publishers:', error);
    }
}

/**
 * Reset book form for adding a new book
 */
function resetBookForm() {
    const form = document.getElementById('bookForm');
    form.reset();
    currentBookId = null;
    
    // Clear validation errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Edit a book
 */
async function editBook(bookId) {
    try {
        const book = books.find(b => b.BookID == bookId);
        if (!book) return;
        
        currentBookId = bookId;
        
        // Fill the form
        document.getElementById('title').value = book.Title;
        document.getElementById('author').value = book.Author;
        document.getElementById('isbn').value = book.ISBN;
        document.getElementById('genre').value = book.Genre || '';
        document.getElementById('publishedYear').value = book.PublishedYear || '';
        document.getElementById('publisherID').value = book.PublisherID || '';
        document.getElementById('quantity').value = book.Quantity;
        
        // Update modal title and button text
        document.getElementById('bookModalLabel').textContent = 'Edit Book';
        document.querySelector('#bookModal .btn-primary').textContent = 'Update Book';
        
        // Show the modal
        const bookModal = new bootstrap.Modal(document.getElementById('bookModal'));
        bookModal.show();
    } catch (error) {
        console.error('Error editing book:', error);
        showToast('Failed to load book details', 'error');
    }
}

/**
 * Handle book form submission (add/edit)
 */
async function handleBookFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('bookForm');
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Collect form data
    const bookData = {
        Title: document.getElementById('title').value,
        Author: document.getElementById('author').value,
        ISBN: document.getElementById('isbn').value,
        Genre: document.getElementById('genre').value || null,
        PublishedYear: document.getElementById('publishedYear').value || null,
        PublisherID: document.getElementById('publisherID').value || null,
        Quantity: parseInt(document.getElementById('quantity').value)
    };
    
    try {
        if (currentBookId) {
            // Update existing book
            await sendRequest(`/api/books/${currentBookId}`, 'PUT', bookData);
            showToast('Book updated successfully', 'success');
        } else {
            // Add new book
            await sendRequest('/api/books', 'POST', bookData);
            showToast('Book added successfully', 'success');
        }
        
        // Close modal
        const bookModal = bootstrap.Modal.getInstance(document.getElementById('bookModal'));
        bookModal.hide();
        
        // Reload books
        loadBooks();
    } catch (error) {
        console.error('Error saving book:', error);
    }
}

/**
 * Delete a book
 */
async function deleteBook(bookId) {
    try {
        await sendRequest(`/api/books/${bookId}`, 'DELETE');
        showToast('Book deleted successfully', 'success');
        
        // Reload books
        loadBooks();
    } catch (error) {
        console.error('Error deleting book:', error);
    }
}

/**
 * Filter books based on search input
 */
function filterBooks() {
    const searchTerm = document.getElementById('searchBooks').value.toLowerCase();
    
    if (!searchTerm) {
        displayBooks(books, 1);
        return;
    }
    
    const filteredBooks = books.filter(book => 
        book.Title.toLowerCase().includes(searchTerm) ||
        book.Author.toLowerCase().includes(searchTerm) ||
        book.ISBN.toLowerCase().includes(searchTerm) ||
        (book.Genre && book.Genre.toLowerCase().includes(searchTerm))
    );
    
    displayBooks(filteredBooks, 1);
}

/**
 * Show duplicate books
 */
async function showDuplicateBooks() {
    try {
        const duplicates = await fetchData('/api/books/duplicates');
        
        if (duplicates.length === 0) {
            showToast('No duplicate books found', 'info');
            return;
        }
        
        // Display duplicates in the table
        displayBooks(duplicates, 1);
        
        // Update UI to show we're in duplicates mode
        document.getElementById('currentView').textContent = 'Showing Duplicate Books';
        document.getElementById('showAllBooksBtn').style.display = 'inline-block';
        
        // Add event listener to show all books button
        document.getElementById('showAllBooksBtn').addEventListener('click', () => {
            document.getElementById('currentView').textContent = 'Books Management';
            document.getElementById('showAllBooksBtn').style.display = 'none';
            loadBooks();
        });
    } catch (error) {
        console.error('Error loading duplicate books:', error);
        showToast('Failed to load duplicate books', 'error');
    }
}
