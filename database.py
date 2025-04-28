import mysql.connector
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from models import Publisher, Book, Member, MembershipType, Staff, Borrowing, Fine, Reservation

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'password',
    'database': 'LibraryDB_Expanded1'
}

def get_connection():
    """Establish and return a database connection."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        logger.error(f"Error connecting to MySQL: {err}")
        raise

def execute_query(query: str, params: tuple = None) -> List[Dict]:
    """Execute a SELECT query and return results as a list of dictionaries."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())
        results = cursor.fetchall()
        return results
    except mysql.connector.Error as err:
        logger.error(f"Error executing query: {err}")
        logger.error(f"Query: {query}")
        logger.error(f"Params: {params}")
        raise
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

def execute_transaction(queries: List[Tuple[str, tuple]]) -> Optional[int]:
    """Execute multiple queries as a transaction. Return last insert id if applicable."""
    conn = get_connection()
    try:
        conn.start_transaction()
        cursor = conn.cursor()
        
        last_insert_id = None
        for query, params in queries:
            cursor.execute(query, params)
            if query.strip().upper().startswith('INSERT'):
                last_insert_id = cursor.lastrowid
        
        conn.commit()
        return last_insert_id
    except mysql.connector.Error as err:
        conn.rollback()
        logger.error(f"Error executing transaction: {err}")
        logger.error(f"Queries: {queries}")
        raise
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# Dashboard statistics
def get_dashboard_stats() -> Dict[str, Any]:
    """Get statistics for dashboard."""
    try:
        # Total counts
        books_count = execute_query("SELECT COUNT(*) as count FROM Books")[0]['count']
        members_count = execute_query("SELECT COUNT(*) as count FROM Members")[0]['count']
        borrowings_count = execute_query("SELECT COUNT(*) as count FROM Borrowings")[0]['count']
        overdue_count = execute_query(
            "SELECT COUNT(*) as count FROM Borrowings WHERE DueDate < CURDATE() AND ReturnDate IS NULL"
        )[0]['count']
        
        # Books by genre
        books_by_genre = execute_query(
            "SELECT Genre, COUNT(*) as count FROM Books GROUP BY Genre ORDER BY count DESC LIMIT 5"
        )
        
        # Recent borrowings
        recent_borrowings = execute_query("""
            SELECT b.BorrowID, m.Name as MemberName, bk.Title as BookTitle, 
                   b.BorrowDate, b.DueDate, b.ReturnDate
            FROM Borrowings b
            JOIN Members m ON b.MemberID = m.MemberID
            JOIN Books bk ON b.BookID = bk.BookID
            ORDER BY b.BorrowDate DESC LIMIT 5
        """)
        
        # Top borrowed books
        top_books = execute_query("""
            SELECT b.Title, COUNT(br.BookID) as BorrowCount
            FROM Books b
            JOIN Borrowings br ON b.BookID = br.BookID
            GROUP BY b.BookID
            ORDER BY BorrowCount DESC
            LIMIT 5
        """)
        
        return {
            "total_books": books_count,
            "total_members": members_count,
            "total_borrowings": borrowings_count,
            "overdue_borrowings": overdue_count,
            "books_by_genre": books_by_genre,
            "recent_borrowings": recent_borrowings,
            "top_books": top_books
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise

# Publisher CRUD operations
def get_publishers() -> List[Dict]:
    """Get all publishers."""
    return execute_query("SELECT * FROM Publishers ORDER BY Name")

def add_publisher(publisher: Publisher) -> int:
    """Add a new publisher and return the new ID."""
    query = """
        INSERT INTO Publishers (Name, Address, Email, Phone)
        VALUES (%s, %s, %s, %s)
    """
    params = (publisher.Name, publisher.Address, publisher.Email, publisher.Phone)
    return execute_transaction([(query, params)])

def update_publisher(publisher: Publisher) -> None:
    """Update an existing publisher."""
    query = """
        UPDATE Publishers 
        SET Name = %s, Address = %s, Email = %s, Phone = %s
        WHERE PublisherID = %s
    """
    params = (publisher.Name, publisher.Address, publisher.Email, publisher.Phone, publisher.PublisherID)
    execute_transaction([(query, params)])

def delete_publisher(publisher_id: int) -> None:
    """Delete a publisher."""
    query = "DELETE FROM Publishers WHERE PublisherID = %s"
    execute_transaction([(query, (publisher_id,))])

# Book CRUD operations
def get_books() -> List[Dict]:
    """Get all books with publisher name."""
    query = """
        SELECT b.*, p.Name as PublisherName
        FROM Books b
        LEFT JOIN Publishers p ON b.PublisherID = p.PublisherID
        ORDER BY b.Title
    """
    return execute_query(query)

def get_book(book_id: int) -> Optional[Dict]:
    """Get a specific book by ID."""
    query = """
        SELECT b.*, p.Name as PublisherName
        FROM Books b
        LEFT JOIN Publishers p ON b.PublisherID = p.PublisherID
        WHERE b.BookID = %s
    """
    results = execute_query(query, (book_id,))
    return results[0] if results else None

def add_book(book: Book) -> int:
    """Add a new book and return the new ID."""
    query = """
        INSERT INTO Books (Title, Author, ISBN, Genre, PublishedYear, PublisherID, Quantity)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        book.Title, book.Author, book.ISBN, book.Genre, 
        book.PublishedYear, book.PublisherID, book.Quantity
    )
    return execute_transaction([(query, params)])

def update_book(book: Book) -> None:
    """Update an existing book."""
    query = """
        UPDATE Books 
        SET Title = %s, Author = %s, ISBN = %s, Genre = %s, 
            PublishedYear = %s, PublisherID = %s, Quantity = %s
        WHERE BookID = %s
    """
    params = (
        book.Title, book.Author, book.ISBN, book.Genre,
        book.PublishedYear, book.PublisherID, book.Quantity, book.BookID
    )
    execute_transaction([(query, params)])

def delete_book(book_id: int) -> None:
    """Delete a book."""
    query = "DELETE FROM Books WHERE BookID = %s"
    execute_transaction([(query, (book_id,))])

def get_duplicate_books() -> List[Dict]:
    """Find books that might be duplicates (same title and author)."""
    query = """
        SELECT b1.BookID, b1.Title, b1.Author, b1.ISBN, b1.PublishedYear, b1.Quantity, 
               COUNT(*) as DuplicateCount
        FROM Books b1
        JOIN Books b2 ON b1.Title = b2.Title AND b1.Author = b2.Author
        WHERE b1.BookID != b2.BookID
        GROUP BY b1.BookID, b1.Title, b1.Author
        ORDER BY b1.Title, b1.Author
    """
    return execute_query(query)

# Member CRUD operations
def get_members() -> List[Dict]:
    """Get all members with membership type name."""
    query = """
        SELECT m.*, mt.TypeName as MembershipTypeName
        FROM Members m
        LEFT JOIN MembershipTypes mt ON m.MembershipTypeID = mt.MembershipTypeID
        ORDER BY m.Name
    """
    return execute_query(query)

def get_member(member_id: int) -> Optional[Dict]:
    """Get a specific member by ID."""
    query = """
        SELECT m.*, mt.TypeName as MembershipTypeName
        FROM Members m
        LEFT JOIN MembershipTypes mt ON m.MembershipTypeID = mt.MembershipTypeID
        WHERE m.MemberID = %s
    """
    results = execute_query(query, (member_id,))
    return results[0] if results else None

def add_member(member: Member) -> int:
    """Add a new member and return the new ID."""
    query = """
        INSERT INTO Members (Name, Email, Phone, Address, MembershipTypeID, MembershipDate)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    # Convert string date to datetime if provided
    membership_date = None
    if member.MembershipDate:
        if isinstance(member.MembershipDate, str):
            membership_date = datetime.strptime(member.MembershipDate, "%Y-%m-%d").date()
        else:
            membership_date = member.MembershipDate
    
    params = (
        member.Name, member.Email, member.Phone, 
        member.Address, member.MembershipTypeID, membership_date
    )
    return execute_transaction([(query, params)])

def update_member(member: Member) -> None:
    """Update an existing member."""
    query = """
        UPDATE Members 
        SET Name = %s, Email = %s, Phone = %s, Address = %s, 
            MembershipTypeID = %s, MembershipDate = %s
        WHERE MemberID = %s
    """
    # Convert string date to datetime if provided
    membership_date = None
    if member.MembershipDate:
        if isinstance(member.MembershipDate, str):
            membership_date = datetime.strptime(member.MembershipDate, "%Y-%m-%d").date()
        else:
            membership_date = member.MembershipDate
    
    params = (
        member.Name, member.Email, member.Phone, member.Address,
        member.MembershipTypeID, membership_date, member.MemberID
    )
    execute_transaction([(query, params)])

def delete_member(member_id: int) -> None:
    """Delete a member."""
    query = "DELETE FROM Members WHERE MemberID = %s"
    execute_transaction([(query, (member_id,))])

# MembershipType CRUD operations
def get_membership_types() -> List[Dict]:
    """Get all membership types."""
    return execute_query("SELECT * FROM MembershipTypes ORDER BY TypeName")

def get_membership_type(type_id: int) -> Optional[Dict]:
    """Get a specific membership type by ID."""
    query = "SELECT * FROM MembershipTypes WHERE MembershipTypeID = %s"
    results = execute_query(query, (type_id,))
    return results[0] if results else None

def add_membership_type(membership_type: MembershipType) -> int:
    """Add a new membership type and return the new ID."""
    query = """
        INSERT INTO MembershipTypes (TypeName, DurationMonths, Fee)
        VALUES (%s, %s, %s)
    """
    params = (
        membership_type.TypeName, 
        membership_type.DurationMonths, 
        membership_type.Fee
    )
    return execute_transaction([(query, params)])

def update_membership_type(membership_type: MembershipType) -> None:
    """Update an existing membership type."""
    query = """
        UPDATE MembershipTypes 
        SET TypeName = %s, DurationMonths = %s, Fee = %s
        WHERE MembershipTypeID = %s
    """
    params = (
        membership_type.TypeName, 
        membership_type.DurationMonths, 
        membership_type.Fee, 
        membership_type.MembershipTypeID
    )
    execute_transaction([(query, params)])

def delete_membership_type(type_id: int) -> None:
    """Delete a membership type."""
    query = "DELETE FROM MembershipTypes WHERE MembershipTypeID = %s"
    execute_transaction([(query, (type_id,))])

# Staff CRUD operations
def get_staff() -> List[Dict]:
    """Get all staff members."""
    return execute_query("SELECT * FROM Staff ORDER BY Name")

def get_staff_member(staff_id: int) -> Optional[Dict]:
    """Get a specific staff member by ID."""
    query = "SELECT * FROM Staff WHERE StaffID = %s"
    results = execute_query(query, (staff_id,))
    return results[0] if results else None

def add_staff(staff: Staff) -> int:
    """Add a new staff member and return the new ID."""
    query = """
        INSERT INTO Staff (Name, Email, Phone, Role, HireDate)
        VALUES (%s, %s, %s, %s, %s)
    """
    # Convert string date to datetime if provided
    hire_date = None
    if staff.HireDate:
        if isinstance(staff.HireDate, str):
            hire_date = datetime.strptime(staff.HireDate, "%Y-%m-%d").date()
        else:
            hire_date = staff.HireDate
    
    params = (staff.Name, staff.Email, staff.Phone, staff.Role, hire_date)
    return execute_transaction([(query, params)])

def update_staff(staff: Staff) -> None:
    """Update an existing staff member."""
    query = """
        UPDATE Staff 
        SET Name = %s, Email = %s, Phone = %s, Role = %s, HireDate = %s
        WHERE StaffID = %s
    """
    # Convert string date to datetime if provided
    hire_date = None
    if staff.HireDate:
        if isinstance(staff.HireDate, str):
            hire_date = datetime.strptime(staff.HireDate, "%Y-%m-%d").date()
        else:
            hire_date = staff.HireDate
    
    params = (
        staff.Name, staff.Email, staff.Phone, 
        staff.Role, hire_date, staff.StaffID
    )
    execute_transaction([(query, params)])

def delete_staff(staff_id: int) -> None:
    """Delete a staff member."""
    query = "DELETE FROM Staff WHERE StaffID = %s"
    execute_transaction([(query, (staff_id,))])

# Borrowing CRUD operations
def get_borrowings() -> List[Dict]:
    """Get all borrowings with related information."""
    query = """
        SELECT b.*, 
               m.Name as MemberName, 
               bk.Title as BookTitle,
               s.Name as StaffName
        FROM Borrowings b
        LEFT JOIN Members m ON b.MemberID = m.MemberID
        LEFT JOIN Books bk ON b.BookID = bk.BookID
        LEFT JOIN Staff s ON b.StaffID = s.StaffID
        ORDER BY b.BorrowDate DESC
    """
    return execute_query(query)

def get_borrowing(borrow_id: int) -> Optional[Dict]:
    """Get a specific borrowing by ID."""
    query = """
        SELECT b.*, 
               m.Name as MemberName, 
               bk.Title as BookTitle,
               s.Name as StaffName
        FROM Borrowings b
        LEFT JOIN Members m ON b.MemberID = m.MemberID
        LEFT JOIN Books bk ON b.BookID = bk.BookID
        LEFT JOIN Staff s ON b.StaffID = s.StaffID
        WHERE b.BorrowID = %s
    """
    results = execute_query(query, (borrow_id,))
    return results[0] if results else None

def add_borrowing(borrowing: Borrowing) -> int:
    """Add a new borrowing and return the new ID."""
    # Check if book is available (quantity > 0)
    book_query = "SELECT Quantity FROM Books WHERE BookID = %s"
    book_result = execute_query(book_query, (borrowing.BookID,))
    
    if not book_result or book_result[0]['Quantity'] <= 0:
        raise ValueError("Book is not available for borrowing")
    
    # Decrement book quantity
    update_quantity_query = "UPDATE Books SET Quantity = Quantity - 1 WHERE BookID = %s"
    
    # Insert borrowing record
    borrow_query = """
        INSERT INTO Borrowings (MemberID, BookID, BorrowDate, DueDate, ReturnDate, StaffID)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    
    # Convert string dates to datetime if provided
    borrow_date = borrowing.BorrowDate if borrowing.BorrowDate else datetime.now().date()
    due_date = borrowing.DueDate
    return_date = borrowing.ReturnDate
    
    if isinstance(borrow_date, str):
        borrow_date = datetime.strptime(borrow_date, "%Y-%m-%d").date()
    if isinstance(due_date, str):
        due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
    if return_date and isinstance(return_date, str):
        return_date = datetime.strptime(return_date, "%Y-%m-%d").date()
    
    borrow_params = (
        borrowing.MemberID, borrowing.BookID, 
        borrow_date, due_date, return_date, borrowing.StaffID
    )
    
    # Execute as transaction
    return execute_transaction([
        (update_quantity_query, (borrowing.BookID,)),
        (borrow_query, borrow_params)
    ])

def update_borrowing(borrowing: Borrowing) -> None:
    """Update an existing borrowing."""
    # Get current return status
    current_query = "SELECT ReturnDate FROM Borrowings WHERE BorrowID = %s"
    current_result = execute_query(current_query, (borrowing.BorrowID,))
    
    if not current_result:
        raise ValueError("Borrowing record not found")
    
    current_return_date = current_result[0]['ReturnDate']
    new_return_date = borrowing.ReturnDate
    
    # Convert string date to datetime if provided
    if new_return_date and isinstance(new_return_date, str):
        new_return_date = datetime.strptime(new_return_date, "%Y-%m-%d").date()
    
    # If book is being returned (new return date set, old return date null)
    if new_return_date and not current_return_date:
        # Update book quantity
        update_quantity_query = "UPDATE Books SET Quantity = Quantity + 1 WHERE BookID = %s"
        book_id_query = "SELECT BookID FROM Borrowings WHERE BorrowID = %s"
        book_id_result = execute_query(book_id_query, (borrowing.BorrowID,))
        book_id = book_id_result[0]['BookID']
        
        # Update borrowing record
        update_query = """
            UPDATE Borrowings 
            SET MemberID = %s, BookID = %s, BorrowDate = %s, 
                DueDate = %s, ReturnDate = %s, StaffID = %s
            WHERE BorrowID = %s
        """
        
        # Convert string dates to datetime if provided
        borrow_date = borrowing.BorrowDate
        due_date = borrowing.DueDate
        
        if isinstance(borrow_date, str):
            borrow_date = datetime.strptime(borrow_date, "%Y-%m-%d").date()
        if isinstance(due_date, str):
            due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
        
        update_params = (
            borrowing.MemberID, borrowing.BookID, borrow_date,
            due_date, new_return_date, borrowing.StaffID, borrowing.BorrowID
        )
        
        # Execute as transaction
        execute_transaction([
            (update_quantity_query, (book_id,)),
            (update_query, update_params)
        ])
    # If book return is being cancelled (old return date set, new return date null)
    elif current_return_date and not new_return_date:
        # Update book quantity
        update_quantity_query = "UPDATE Books SET Quantity = Quantity - 1 WHERE BookID = %s"
        book_id_query = "SELECT BookID FROM Borrowings WHERE BorrowID = %s"
        book_id_result = execute_query(book_id_query, (borrowing.BorrowID,))
        book_id = book_id_result[0]['BookID']
        
        # Update borrowing record
        update_query = """
            UPDATE Borrowings 
            SET MemberID = %s, BookID = %s, BorrowDate = %s, 
                DueDate = %s, ReturnDate = %s, StaffID = %s
            WHERE BorrowID = %s
        """
        
        # Convert string dates to datetime if provided
        borrow_date = borrowing.BorrowDate
        due_date = borrowing.DueDate
        
        if isinstance(borrow_date, str):
            borrow_date = datetime.strptime(borrow_date, "%Y-%m-%d").date()
        if isinstance(due_date, str):
            due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
        
        update_params = (
            borrowing.MemberID, borrowing.BookID, borrow_date,
            due_date, new_return_date, borrowing.StaffID, borrowing.BorrowID
        )
        
        # Execute as transaction
        execute_transaction([
            (update_quantity_query, (book_id,)),
            (update_query, update_params)
        ])
    # Simple update with no quantity change
    else:
        update_query = """
            UPDATE Borrowings 
            SET MemberID = %s, BookID = %s, BorrowDate = %s, 
                DueDate = %s, ReturnDate = %s, StaffID = %s
            WHERE BorrowID = %s
        """
        
        # Convert string dates to datetime if provided
        borrow_date = borrowing.BorrowDate
        due_date = borrowing.DueDate
        
        if isinstance(borrow_date, str):
            borrow_date = datetime.strptime(borrow_date, "%Y-%m-%d").date()
        if isinstance(due_date, str):
            due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
        
        update_params = (
            borrowing.MemberID, borrowing.BookID, borrow_date,
            due_date, new_return_date, borrowing.StaffID, borrowing.BorrowID
        )
        
        execute_transaction([(update_query, update_params)])

def delete_borrowing(borrow_id: int) -> None:
    """Delete a borrowing record."""
    # Check if book was returned
    check_query = "SELECT ReturnDate, BookID FROM Borrowings WHERE BorrowID = %s"
    result = execute_query(check_query, (borrow_id,))
    
    if not result:
        raise ValueError("Borrowing record not found")
    
    return_date = result[0]['ReturnDate']
    book_id = result[0]['BookID']
    
    # If book wasn't returned, increment quantity
    if not return_date:
        update_quantity_query = "UPDATE Books SET Quantity = Quantity + 1 WHERE BookID = %s"
        delete_query = "DELETE FROM Borrowings WHERE BorrowID = %s"
        
        execute_transaction([
            (update_quantity_query, (book_id,)),
            (delete_query, (borrow_id,))
        ])
    else:
        delete_query = "DELETE FROM Borrowings WHERE BorrowID = %s"
        execute_transaction([(delete_query, (borrow_id,))])

# Fine CRUD operations
def get_fines() -> List[Dict]:
    """Get all fines with borrowing information."""
    query = """
        SELECT f.*, 
               b.BorrowDate, b.DueDate, b.ReturnDate,
               m.Name as MemberName, 
               bk.Title as BookTitle
        FROM Fines f
        JOIN Borrowings b ON f.BorrowID = b.BorrowID
        JOIN Members m ON b.MemberID = m.MemberID
        JOIN Books bk ON b.BookID = bk.BookID
        ORDER BY f.Paid, b.DueDate
    """
    return execute_query(query)

def get_fine(fine_id: int) -> Optional[Dict]:
    """Get a specific fine by ID."""
    query = """
        SELECT f.*, 
               b.BorrowDate, b.DueDate, b.ReturnDate,
               m.Name as MemberName, 
               bk.Title as BookTitle
        FROM Fines f
        JOIN Borrowings b ON f.BorrowID = b.BorrowID
        JOIN Members m ON b.MemberID = m.MemberID
        JOIN Books bk ON b.BookID = bk.BookID
        WHERE f.FineID = %s
    """
    results = execute_query(query, (fine_id,))
    return results[0] if results else None

def add_fine(fine: Fine) -> int:
    """Add a new fine and return the new ID."""
    query = """
        INSERT INTO Fines (BorrowID, Amount, Paid)
        VALUES (%s, %s, %s)
    """
    params = (fine.BorrowID, fine.Amount, fine.Paid)
    return execute_transaction([(query, params)])

def update_fine(fine: Fine) -> None:
    """Update an existing fine."""
    query = """
        UPDATE Fines 
        SET BorrowID = %s, Amount = %s, Paid = %s
        WHERE FineID = %s
    """
    params = (fine.BorrowID, fine.Amount, fine.Paid, fine.FineID)
    execute_transaction([(query, params)])

def delete_fine(fine_id: int) -> None:
    """Delete a fine."""
    query = "DELETE FROM Fines WHERE FineID = %s"
    execute_transaction([(query, (fine_id,))])

# Reservation CRUD operations
def get_reservations() -> List[Dict]:
    """Get all reservations with member and book information."""
    query = """
        SELECT r.*, 
               m.Name as MemberName, 
               b.Title as BookTitle
        FROM Reservations r
        JOIN Members m ON r.MemberID = m.MemberID
        JOIN Books b ON r.BookID = b.BookID
        ORDER BY r.ReservationDate DESC
    """
    return execute_query(query)

def get_reservation(reservation_id: int) -> Optional[Dict]:
    """Get a specific reservation by ID."""
    query = """
        SELECT r.*, 
               m.Name as MemberName, 
               b.Title as BookTitle
        FROM Reservations r
        JOIN Members m ON r.MemberID = m.MemberID
        JOIN Books b ON r.BookID = b.BookID
        WHERE r.ReservationID = %s
    """
    results = execute_query(query, (reservation_id,))
    return results[0] if results else None

def add_reservation(reservation: Reservation) -> int:
    """Add a new reservation and return the new ID."""
    query = """
        INSERT INTO Reservations (MemberID, BookID, ReservationDate, Status)
        VALUES (%s, %s, %s, %s)
    """
    # Convert string date to datetime if provided
    reservation_date = reservation.ReservationDate if reservation.ReservationDate else datetime.now().date()
    
    if isinstance(reservation_date, str):
        reservation_date = datetime.strptime(reservation_date, "%Y-%m-%d").date()
    
    params = (
        reservation.MemberID, reservation.BookID, 
        reservation_date, reservation.Status
    )
    return execute_transaction([(query, params)])

def update_reservation(reservation: Reservation) -> None:
    """Update an existing reservation."""
    query = """
        UPDATE Reservations 
        SET MemberID = %s, BookID = %s, ReservationDate = %s, Status = %s
        WHERE ReservationID = %s
    """
    # Convert string date to datetime if provided
    reservation_date = reservation.ReservationDate
    
    if isinstance(reservation_date, str):
        reservation_date = datetime.strptime(reservation_date, "%Y-%m-%d").date()
    
    params = (
        reservation.MemberID, reservation.BookID, 
        reservation_date, reservation.Status, reservation.ReservationID
    )
    execute_transaction([(query, params)])

def delete_reservation(reservation_id: int) -> None:
    """Delete a reservation."""
    query = "DELETE FROM Reservations WHERE ReservationID = %s"
    execute_transaction([(query, (reservation_id,))])
