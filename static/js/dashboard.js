document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard data
    loadDashboardData();
    
    /**
     * Load all dashboard data
     */
    async function loadDashboardData() {
        showLoader();
        try {
            const response = await fetchData('/api/dashboard/stats');
            
            // Update statistics cards
            updateStatsCards(response);
            
            // Create genre chart
            if (response.books_by_genre && response.books_by_genre.length > 0) {
                createGenreChart(response.books_by_genre);
            }
            
            // Update recent borrowings table
            if (response.recent_borrowings && response.recent_borrowings.length > 0) {
                updateRecentBorrowingsTable(response.recent_borrowings);
            }
            
            // Update top books table
            if (response.top_books && response.top_books.length > 0) {
                updateTopBooksTable(response.top_books);
            }
            
            hideLoader();
        } catch (error) {
            showToast('Error loading dashboard data: ' + error.message, 'error');
            hideLoader();
        }
    }
    
    /**
     * Update the statistics cards
     * @param {Object} stats - The dashboard statistics
     */
    function updateStatsCards(stats) {
        document.getElementById('total-books').textContent = stats.total_books || 0;
        document.getElementById('total-members').textContent = stats.total_members || 0;
        document.getElementById('total-borrowings').textContent = stats.total_borrowings || 0;
        document.getElementById('overdue-borrowings').textContent = stats.overdue_borrowings || 0;
    }
    
    /**
     * Create chart showing books by genre
     * @param {Array} genreData - The genre data
     */
    function createGenreChart(genreData) {
        const ctx = document.getElementById('genreChart').getContext('2d');
        
        // Extract labels and data
        const labels = genreData.map(item => item.genre);
        const data = genreData.map(item => item.count);
        
        // Generate background colors
        const backgroundColors = generateColors(genreData.length);
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: 'white'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Update the recent borrowings table
     * @param {Array} borrowings - Recent borrowings data
     */
    function updateRecentBorrowingsTable(borrowings) {
        const tbody = document.getElementById('recent-borrowings-table');
        tbody.innerHTML = '';
        
        borrowings.forEach(borrowing => {
            const row = document.createElement('tr');
            
            // Determine status
            let status = 'Active';
            let statusClass = 'bg-primary';
            
            if (borrowing.ReturnDate) {
                status = 'Returned';
                statusClass = 'bg-success';
            } else if (new Date(borrowing.DueDate) < new Date()) {
                status = 'Overdue';
                statusClass = 'bg-danger';
            }
            
            row.innerHTML = `
                <td>${borrowing.MemberName || 'Unknown'}</td>
                <td>${borrowing.BookTitle || 'Unknown'}</td>
                <td>${formatDateForDisplay(borrowing.BorrowDate)}</td>
                <td>${formatDateForDisplay(borrowing.DueDate)}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    /**
     * Update the top books table
     * @param {Array} books - Top books data
     */
    function updateTopBooksTable(books) {
        const tbody = document.getElementById('top-books-table');
        tbody.innerHTML = '';
        
        books.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.title}</td>
                <td>${book.count}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    /**
     * Generate an array of colors for chart
     * @param {number} count - Number of colors to generate
     * @returns {Array} Array of colors
     */
    function generateColors(count) {
        const baseColors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(40, 159, 64, 0.8)',
            'rgba(210, 199, 199, 0.8)'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            const colorIndex = i % baseColors.length;
            colors.push(baseColors[colorIndex]);
        }
        
        return colors;
    }
});