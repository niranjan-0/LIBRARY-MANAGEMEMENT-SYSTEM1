import os
import logging
from flask import Flask, request, jsonify, render_template, redirect, url_for
from models import db, Publisher, Book, Member, MembershipType, Staff, Borrowing, Fine, Reservation
from datetime import datetime
from sqlalchemy import func, text
import dotenv
# Load environment variables
dotenv.load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.secret_key = os.environ.get("SESSION_SECRET", "dev_key")

# Initialize database
db.init_app(app)

# Create tables
with app.app_context():
    db.create_all()

# ================ Routes ================

# Root route - redirect to dashboard
@app.route('/')
def root():
    return redirect(url_for('dashboard'))

# Dashboard route
@app.route('/dashboard')
def dashboard():
    return render_template('index.html')

# Get dashboard statistics
@app.route('/api/dashboard/stats')
def get_stats():
    try:
        stats = {}
        
        # Total books count
        stats['total_books'] = db.session.query(func.sum(Book.Quantity)).scalar() or 0
        
        # Total members count
        stats['total_members'] = db.session.query(Member).count()
        
        # Total borrowings
        stats['total_borrowings'] = db.session.query(Borrowing).count()
        
        # Overdue borrowings
        today = datetime.now().date()
        stats['overdue_borrowings'] = db.session.query(Borrowing).filter(
            Borrowing.ReturnDate.is_(None),
            Borrowing.DueDate < today
        ).count()
        
        # Books by genre
        genre_data = db.session.query(
            Book.Genre, 
            func.count(Book.BookID)
        ).filter(Book.Genre.isnot(None)).group_by(Book.Genre).all()
        
        stats['books_by_genre'] = [
            {'genre': genre or 'Uncategorized', 'count': count}
            for genre, count in genre_data
        ]
        
        # Most borrowed books (top 5)
        top_books_query = db.session.query(
            Book.Title,
            func.count(Borrowing.BorrowID).label('borrow_count')
        ).join(Borrowing, Book.BookID == Borrowing.BookID
        ).group_by(Book.Title
        ).order_by(text('borrow_count DESC')
        ).limit(5).all()
        
        stats['top_books'] = [
            {'title': title, 'count': count}
            for title, count in top_books_query
        ]
        
        # Recent borrowings (top 5)
        recent_borrowings = db.session.query(Borrowing).order_by(
            Borrowing.BorrowDate.desc()
        ).limit(5).all()
        
        stats['recent_borrowings'] = [borrowing.to_dict() for borrowing in recent_borrowings]
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Template routes for each entity
@app.route('/books')
def books_page():
    return render_template('books.html')

@app.route('/members')
def members_page():
    return render_template('members.html')

@app.route('/publishers')
def publishers_page():
    return render_template('publishers.html')

@app.route('/staff')
def staff_page():
    return render_template('staff.html')

@app.route('/borrowings')
def borrowings_page():
    return render_template('borrowings.html')

@app.route('/fines')
def fines_page():
    return render_template('fines.html')

@app.route('/reservations')
def reservations_page():
    return render_template('reservations.html')

@app.route('/membershiptypes')
def membership_types_page():
    return render_template('membershiptypes.html')

# ================ API Endpoints ================

# API endpoints for Publishers
@app.route('/api/publishers', methods=['GET'])
def api_get_publishers():
    try:
        publishers = Publisher.query.all()
        return jsonify([publisher.to_dict() for publisher in publishers])
    except Exception as e:
        logger.error(f"Error fetching publishers: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/publishers', methods=['POST'])
def api_add_publisher():
    try:
        data = request.json
        publisher = Publisher(
            Name=data['Name'], 
            Address=data.get('Address'),
            Email=data.get('Email'),
            Phone=data.get('Phone')
        )
        db.session.add(publisher)
        db.session.commit()
        return jsonify({"message": "Publisher added successfully", "id": publisher.PublisherID})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding publisher: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/publishers/<int:publisher_id>', methods=['PUT'])
def api_update_publisher(publisher_id):
    try:
        data = request.json
        publisher = Publisher.query.get(publisher_id)
        if not publisher:
            return jsonify({"error": "Publisher not found"}), 404
            
        publisher.Name = data['Name']
        publisher.Address = data.get('Address')
        publisher.Email = data.get('Email')
        publisher.Phone = data.get('Phone')
        
        db.session.commit()
        return jsonify({"message": "Publisher updated successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating publisher: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/publishers/<int:publisher_id>', methods=['DELETE'])
def api_delete_publisher(publisher_id):
    try:
        publisher = Publisher.query.get(publisher_id)
        if not publisher:
            return jsonify({"error": "Publisher not found"}), 404
            
        db.session.delete(publisher)
        db.session.commit()
        return jsonify({"message": "Publisher deleted successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting publisher: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoints for Books
@app.route('/api/books', methods=['GET'])
def api_get_books():
    try:
        books = Book.query.all()
        return jsonify([book.to_dict() for book in books])
    except Exception as e:
        logger.error(f"Error fetching books: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/<int:book_id>', methods=['GET'])
def api_get_book(book_id):
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({"error": "Book not found"}), 404
        return jsonify(book.to_dict())
    except Exception as e:
        logger.error(f"Error fetching book: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/books', methods=['POST'])
def api_add_book():
    try:
        data = request.json
        book = Book(
            Title=data['Title'],
            Author=data['Author'],
            ISBN=data['ISBN'],
            Genre=data.get('Genre'),
            PublishedYear=data.get('PublishedYear'),
            PublisherID=data.get('PublisherID'),
            Quantity=data['Quantity']
        )
        db.session.add(book)
        db.session.commit()
        return jsonify({"message": "Book added successfully", "id": book.BookID})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding book: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def api_update_book(book_id):
    try:
        data = request.json
        book = Book.query.get(book_id)
        if not book:
            return jsonify({"error": "Book not found"}), 404
            
        book.Title = data['Title']
        book.Author = data['Author']
        book.ISBN = data['ISBN']
        book.Genre = data.get('Genre')
        book.PublishedYear = data.get('PublishedYear')
        book.PublisherID = data.get('PublisherID')
        book.Quantity = data['Quantity']
        
        db.session.commit()
        return jsonify({"message": "Book updated successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating book: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def api_delete_book(book_id):
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({"error": "Book not found"}), 404
            
        db.session.delete(book)
        db.session.commit()
        return jsonify({"message": "Book deleted successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting book: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/duplicates', methods=['GET'])
def api_get_duplicate_books():
    try:
        # Find books with same title and author
        duplicate_books = db.session.query(
            Book.Title, Book.Author, func.count(Book.BookID).label('count')
        ).group_by(Book.Title, Book.Author
        ).having(func.count(Book.BookID) > 1).all()
        
        results = []
        
        for title, author, count in duplicate_books:
            books = Book.query.filter_by(Title=title, Author=author).all()
            books_data = [book.to_dict() for book in books]
            results.append({
                'title': title,
                'author': author,
                'count': count,
                'books': books_data
            })
            
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error finding duplicate books: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoints for Members
@app.route('/api/members', methods=['GET'])
def api_get_members():
    try:
        members = Member.query.all()
        return jsonify([member.to_dict() for member in members])
    except Exception as e:
        logger.error(f"Error fetching members: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/members/<int:member_id>', methods=['GET'])
def api_get_member(member_id):
    try:
        member = Member.query.get(member_id)
        if not member:
            return jsonify({"error": "Member not found"}), 404
        return jsonify(member.to_dict())
    except Exception as e:
        logger.error(f"Error fetching member: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/members', methods=['POST'])
def api_add_member():
    try:
        data = request.json
        
        # Handle date conversion
        membership_date = None
        if data.get('MembershipDate'):
            membership_date = datetime.strptime(data['MembershipDate'], '%Y-%m-%d').date()
            
        member = Member(
            Name=data['Name'],
            Email=data['Email'],
            Phone=data['Phone'],
            Address=data.get('Address'),
            MembershipTypeID=data.get('MembershipTypeID'),
            MembershipDate=membership_date
        )
        db.session.add(member)
        db.session.commit()
        return jsonify({"message": "Member added successfully", "id": member.MemberID})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding member: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/members/<int:member_id>', methods=['PUT'])
def api_update_member(member_id):
    try:
        data = request.json
        member = Member.query.get(member_id)
        if not member:
            return jsonify({"error": "Member not found"}), 404
            
        # Handle date conversion
        membership_date = None
        if data.get('MembershipDate'):
            membership_date = datetime.strptime(data['MembershipDate'], '%Y-%m-%d').date()
            
        member.Name = data['Name']
        member.Email = data['Email']
        member.Phone = data['Phone']
        member.Address = data.get('Address')
        member.MembershipTypeID = data.get('MembershipTypeID')
        member.MembershipDate = membership_date
        
        db.session.commit()
        return jsonify({"message": "Member updated successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating member: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/members/<int:member_id>', methods=['DELETE'])
def api_delete_member(member_id):
    try:
        member = Member.query.get(member_id)
        if not member:
            return jsonify({"error": "Member not found"}), 404
            
        db.session.delete(member)
        db.session.commit()
        return jsonify({"message": "Member deleted successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting member: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoints for Membership Types
@app.route('/api/membershiptypes', methods=['GET'])
def api_get_membership_types():
    try:
        membership_types = MembershipType.query.all()
        return jsonify([membership_type.to_dict() for membership_type in membership_types])
    except Exception as e:
        logger.error(f"Error fetching membership types: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/membershiptypes/<int:type_id>', methods=['GET'])
def api_get_membership_type(type_id):
    try:
        membership_type = MembershipType.query.get(type_id)
        if not membership_type:
            return jsonify({"error": "Membership type not found"}), 404
        return jsonify(membership_type.to_dict())
    except Exception as e:
        logger.error(f"Error fetching membership type: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/membershiptypes', methods=['POST'])
def api_add_membership_type():
    try:
        data = request.json
        membership_type = MembershipType(
            TypeName=data['TypeName'],
            DurationMonths=data['DurationMonths'],
            Fee=data['Fee']
        )
        db.session.add(membership_type)
        db.session.commit()
        return jsonify({"message": "Membership type added successfully", "id": membership_type.MembershipTypeID})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding membership type: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/membershiptypes/<int:type_id>', methods=['PUT'])
def api_update_membership_type(type_id):
    try:
        data = request.json
        membership_type = MembershipType.query.get(type_id)
        if not membership_type:
            return jsonify({"error": "Membership type not found"}), 404
            
        membership_type.TypeName = data['TypeName']
        membership_type.DurationMonths = data['DurationMonths']
        membership_type.Fee = data['Fee']
        
        db.session.commit()
        return jsonify({"message": "Membership type updated successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating membership type: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/membershiptypes/<int:type_id>', methods=['DELETE'])
def api_delete_membership_type(type_id):
    try:
        membership_type = MembershipType.query.get(type_id)
        if not membership_type:
            return jsonify({"error": "Membership type not found"}), 404
            
        db.session.delete(membership_type)
        db.session.commit()
        return jsonify({"message": "Membership type deleted successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting membership type: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoints for Staff
@app.route('/api/staff', methods=['GET'])
def api_get_staff():
    try:
        staff_members = Staff.query.all()
        return jsonify([staff_member.to_dict() for staff_member in staff_members])
    except Exception as e:
        logger.error(f"Error fetching staff: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/staff/<int:staff_id>', methods=['GET'])
def api_get_staff_member(staff_id):
    try:
        staff_member = Staff.query.get(staff_id)
        if not staff_member:
            return jsonify({"error": "Staff member not found"}), 404
        return jsonify(staff_member.to_dict())
    except Exception as e:
        logger.error(f"Error fetching staff member: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/staff', methods=['POST'])
def api_add_staff():
    try:
        data = request.json
        
        # Handle date conversion
        hire_date = None
        if data.get('HireDate'):
            hire_date = datetime.strptime(data['HireDate'], '%Y-%m-%d').date()
            
        staff_member = Staff(
            Name=data['Name'],
            Email=data['Email'],
            Phone=data['Phone'],
            Role=data.get('Role'),
            HireDate=hire_date
        )
        db.session.add(staff_member)
        db.session.commit()
        return jsonify({"message": "Staff member added successfully", "id": staff_member.StaffID})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding staff member: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/staff/<int:staff_id>', methods=['PUT'])
def api_update_staff(staff_id):
    try:
        data = request.json
        staff_member = Staff.query.get(staff_id)
        if not staff_member:
            return jsonify({"error": "Staff member not found"}), 404
            
        # Handle date conversion
        hire_date = None
        if data.get('HireDate'):
            hire_date = datetime.strptime(data['HireDate'], '%Y-%m-%d').date()
            
        staff_member.Name = data['Name']
        staff_member.Email = data['Email']
        staff_member.Phone = data['Phone']
        staff_member.Role = data.get('Role')
        staff_member.HireDate = hire_date
        
        db.session.commit()
        return jsonify({"message": "Staff member updated successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating staff member: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/staff/<int:staff_id>', methods=['DELETE'])
def api_delete_staff(staff_id):
    try:
        staff_member = Staff.query.get(staff_id)
        if not staff_member:
            return jsonify({"error": "Staff member not found"}), 404
            
        db.session.delete(staff_member)
        db.session.commit()
        return jsonify({"message": "Staff member deleted successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting staff member: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoints for Borrowings
@app.route('/api/borrowings', methods=['GET'])
def api_get_borrowings():
    try:
        borrowings = Borrowing.query.all()
        return jsonify([borrowing.to_dict() for borrowing in borrowings])
    except Exception as e:
        logger.error(f"Error fetching borrowings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/borrowings/<int:borrow_id>', methods=['GET'])
def api_get_borrowing(borrow_id):
    try:
        borrowing = Borrowing.query.get(borrow_id)
        if not borrowing:
            return jsonify({"error": "Borrowing record not found"}), 404
        return jsonify(borrowing.to_dict())
    except Exception as e:
        logger.error(f"Error fetching borrowing: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/borrowings', methods=['POST'])
def api_add_borrowing():
    try:
        data = request.json
        
        # Handle date conversions
        borrow_date = None
        if data.get('BorrowDate'):
            borrow_date = datetime.strptime(data['BorrowDate'], '%Y-%m-%d').date()
        
        due_date = datetime.strptime(data['DueDate'], '%Y-%m-%d').date()
        
        return_date = None
        if data.get('ReturnDate'):
            return_date = datetime.strptime(data['ReturnDate'], '%Y-%m-%d').date()
            
        # Check if book is available
        book = Book.query.get(data['BookID'])
        if not book:
            return jsonify({"error": "Book not found"}), 404
            
        if book.Quantity <= 0:
            return jsonify({"error": "Book is not available for borrowing"}), 400
            
        # Create borrowing record
        borrowing = Borrowing(
            MemberID=data['MemberID'],
            BookID=data['BookID'],
            BorrowDate=borrow_date,
            DueDate=due_date,
            ReturnDate=return_date,
            StaffID=data.get('StaffID')
        )
        
        # Update book quantity if not returning
        if not return_date:
            book.Quantity -= 1
            
        db.session.add(borrowing)
        db.session.commit()
        return jsonify({"message": "Borrowing record added successfully", "id": borrowing.BorrowID})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding borrowing: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/borrowings/<int:borrow_id>', methods=['PUT'])
def api_update_borrowing(borrow_id):
    try:
        data = request.json
        borrowing = Borrowing.query.get(borrow_id)
        if not borrowing:
            return jsonify({"error": "Borrowing record not found"}), 404
            
        # Handle return scenarios (book quantity management)
        old_return_date = borrowing.ReturnDate
        new_return_date = None
        
        if data.get('ReturnDate'):
            new_return_date = datetime.strptime(data['ReturnDate'], '%Y-%m-%d').date()
            
        # If returning a book that wasn't returned before
        if new_return_date and not old_return_date:
            book = Book.query.get(borrowing.BookID)
            if book:
                book.Quantity += 1
                
        # If un-returning a book
        elif old_return_date and not new_return_date:
            book = Book.query.get(borrowing.BookID)
            if book:
                book.Quantity -= 1
                
        # Handle date conversions
        borrow_date = None
        if data.get('BorrowDate'):
            borrow_date = datetime.strptime(data['BorrowDate'], '%Y-%m-%d').date()
        
        due_date = datetime.strptime(data['DueDate'], '%Y-%m-%d').date()
            
        # Update borrowing record
        borrowing.MemberID = data['MemberID']
        borrowing.BookID = data['BookID']
        borrowing.BorrowDate = borrow_date
        borrowing.DueDate = due_date
        borrowing.ReturnDate = new_return_date
        borrowing.StaffID = data.get('StaffID')
        
        db.session.commit()
        return jsonify({"message": "Borrowing record updated successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating borrowing: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/borrowings/<int:borrow_id>', methods=['DELETE'])
def api_delete_borrowing(borrow_id):
    try:
        borrowing = Borrowing.query.get(borrow_id)
        if not borrowing:
            return jsonify({"error": "Borrowing record not found"}), 404
            
        # If book was borrowed and not returned, increase quantity when deleting the record
        if not borrowing.ReturnDate:
            book = Book.query.get(borrowing.BookID)
            if book:
                book.Quantity += 1
            
        db.session.delete(borrowing)
        db.session.commit()
        return jsonify({"message": "Borrowing record deleted successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting borrowing: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoints for Fines
@app.route('/api/fines', methods=['GET'])
def api_get_fines():
    try:
        fines = Fine.query.all()
        return jsonify([fine.to_dict() for fine in fines])
    except Exception as e:
        logger.error(f"Error fetching fines: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/fines/<int:fine_id>', methods=['GET'])
def api_get_fine(fine_id):
    try:
        fine = Fine.query.get(fine_id)
        if not fine:
            return jsonify({"error": "Fine record not found"}), 404
        return jsonify(fine.to_dict())
    except Exception as e:
        logger.error(f"Error fetching fine: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/fines', methods=['POST'])
def api_add_fine():
    try:
        data = request.json
        fine = Fine(
            BorrowID=data['BorrowID'],
            Amount=data['Amount'],
            Paid=data.get('Paid', False)
        )
        db.session.add(fine)
        db.session.commit()
        return jsonify({"message": "Fine added successfully", "id": fine.FineID})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding fine: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/fines/<int:fine_id>', methods=['PUT'])
def api_update_fine(fine_id):
    try:
        data = request.json
        fine = Fine.query.get(fine_id)
        if not fine:
            return jsonify({"error": "Fine record not found"}), 404
            
        fine.BorrowID = data['BorrowID']
        fine.Amount = data['Amount']
        fine.Paid = data.get('Paid', False)
        
        db.session.commit()
        return jsonify({"message": "Fine updated successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating fine: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/fines/<int:fine_id>', methods=['DELETE'])
def api_delete_fine(fine_id):
    try:
        fine = Fine.query.get(fine_id)
        if not fine:
            return jsonify({"error": "Fine record not found"}), 404
            
        db.session.delete(fine)
        db.session.commit()
        return jsonify({"message": "Fine deleted successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting fine: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoints for Reservations
@app.route('/api/reservations', methods=['GET'])
def api_get_reservations():
    try:
        reservations = Reservation.query.all()
        return jsonify([reservation.to_dict() for reservation in reservations])
    except Exception as e:
        logger.error(f"Error fetching reservations: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reservations/<int:reservation_id>', methods=['GET'])
def api_get_reservation(reservation_id):
    try:
        reservation = Reservation.query.get(reservation_id)
        if not reservation:
            return jsonify({"error": "Reservation not found"}), 404
        return jsonify(reservation.to_dict())
    except Exception as e:
        logger.error(f"Error fetching reservation: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reservations', methods=['POST'])
def api_add_reservation():
    try:
        data = request.json
        
        # Handle date conversion
        reservation_date = None
        if data.get('ReservationDate'):
            reservation_date = datetime.strptime(data['ReservationDate'], '%Y-%m-%d').date()
            
        reservation = Reservation(
            MemberID=data['MemberID'],
            BookID=data['BookID'],
            ReservationDate=reservation_date,
            Status=data.get('Status', 'Pending')
        )
        db.session.add(reservation)
        db.session.commit()
        return jsonify({"message": "Reservation added successfully", "id": reservation.ReservationID})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding reservation: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reservations/<int:reservation_id>', methods=['PUT'])
def api_update_reservation(reservation_id):
    try:
        data = request.json
        reservation = Reservation.query.get(reservation_id)
        if not reservation:
            return jsonify({"error": "Reservation not found"}), 404
            
        # Handle date conversion
        reservation_date = None
        if data.get('ReservationDate'):
            reservation_date = datetime.strptime(data['ReservationDate'], '%Y-%m-%d').date()
            
        reservation.MemberID = data['MemberID']
        reservation.BookID = data['BookID']
        reservation.ReservationDate = reservation_date
        reservation.Status = data.get('Status', 'Pending')
        
        db.session.commit()
        return jsonify({"message": "Reservation updated successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating reservation: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reservations/<int:reservation_id>', methods=['DELETE'])
def api_delete_reservation(reservation_id):
    try:
        reservation = Reservation.query.get(reservation_id)
        if not reservation:
            return jsonify({"error": "Reservation not found"}), 404
            
        db.session.delete(reservation)
        db.session.commit()
        return jsonify({"message": "Reservation deleted successfully"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting reservation: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Run the app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)