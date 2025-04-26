document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard with stats and charts
    loadDashboardData();
});

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    try {
        const stats = await fetchData('/api/dashboard/stats');
        
        // Update stat cards
        updateStatsCards(stats);
        
        // Create charts
        createGenreChart(stats.books_by_genre);
        
        // Update tables
        updateRecentBorrowingsTable(stats.recent_borrowings);
        updateTopBooksTable(stats.top_books);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

/**
 * Update the statistics cards
 * @param {Object} stats - The dashboard statistics
 */
function updateStatsCards(stats) {
    document.getElementById('total-books').textContent = stats.total_books;
    document.getElementById('total-members').textContent = stats.total_members;
    document.getElementById('total-borrowings').textContent = stats.total_borrowings;
    document.getElementById('overdue-borrowings').textContent = stats.overdue_borrowings;
}

/**
 * Create chart showing books by genre
 * @param {Array} genreData - The genre data
 */
function createGenreChart(genreData) {
    const ctx = document.getElementById('genreChart').getContext('2d');
    
    // Extract labels and data
    const labels = genreData.map(item => item.Genre || 'Unspecified');
    const data = genreData.map(item => item.count);
    
    // Create a color array
    const colors = [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
        '#6f42c1', '#5a5c69', '#858796', '#d1d3e2', '#f8f9fc'
    ];
    
    // Create chart
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                hoverBackgroundColor: colors.slice(0, data.length),
                hoverBorderColor: 'rgba(234, 236, 244, 1)',
            }],
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                position: 'right',
            },
            tooltips: {
                backgroundColor: 'rgb(255,255,255)',
                bodyFontColor: '#858796',
                borderColor: '#dddfeb',
                borderWidth: 1,
                xPadding: 15,
                yPadding: 15,
                displayColors: false,
                caretPadding: 10,
            },
        },
    });
}

/**
 * Update the recent borrowings table
 * @param {Array} borrowings - Recent borrowings data
 */
function updateRecentBorrowingsTable(borrowings) {
    const tableBody = document.getElementById('recent-borrowings-table').querySelector('tbody');
    tableBody.innerHTML = '';
    
    if (borrowings.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">No recent borrowings found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    borrowings.forEach(borrowing => {
        const row = document.createElement('tr');
        
        // Create status badge
        let statusBadge = '';
        if (!borrowing.ReturnDate && new Date(borrowing.DueDate) < new Date()) {
            statusBadge = '<span class="badge bg-danger">Overdue</span>';
        } else if (!borrowing.ReturnDate) {
            statusBadge = '<span class="badge bg-warning">Borrowed</span>';
        } else {
            statusBadge = '<span class="badge bg-success">Returned</span>';
        }
        
        row.innerHTML = `
            <td>${borrowing.MemberName}</td>
            <td>${borrowing.BookTitle}</td>
            <td>${formatDateForDisplay(borrowing.BorrowDate)}</td>
            <td>${formatDateForDisplay(borrowing.DueDate)}</td>
            <td>${statusBadge}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Update the top books table
 * @param {Array} books - Top books data
 */
function updateTopBooksTable(books) {
    const tableBody = document.getElementById('top-books-table').querySelector('tbody');
    tableBody.innerHTML = '';
    
    if (books.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3" class="text-center">No book data available</td>';
        tableBody.appendChild(row);
        return;
    }
    
    books.forEach((book, index) => {
        const row = document.createElement('tr');
        
        // Create rank badge
        let rankBadge = `<span class="badge rounded-pill bg-secondary">${index + 1}</span>`;
        if (index === 0) rankBadge = '<span class="badge rounded-pill bg-warning">1</span>';
        if (index === 1) rankBadge = '<span class="badge rounded-pill bg-secondary">2</span>';
        if (index === 2) rankBadge = '<span class="badge rounded-pill bg-danger">3</span>';
        
        row.innerHTML = `
            <td>${rankBadge}</td>
            <td>${book.Title}</td>
            <td>${book.BorrowCount}</td>
        `;
        
        tableBody.appendChild(row);
    });
}
