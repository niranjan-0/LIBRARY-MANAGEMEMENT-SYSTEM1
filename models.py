from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()

class Publisher(db.Model):
    __tablename__ = 'publishers'

    PublisherID = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(255), nullable=False)
    Address = db.Column(db.Text, nullable=True)
    Email = db.Column(db.String(100), unique=True, nullable=True)
    Phone = db.Column(db.String(15), unique=True, nullable=True)
    
    books = db.relationship('Book', backref='publisher', lazy=True)

    def to_dict(self):
        return {
            'PublisherID': self.PublisherID,
            'Name': self.Name,
            'Address': self.Address,
            'Email': self.Email,
            'Phone': self.Phone
        }


class Book(db.Model):
    __tablename__ = 'books'

    BookID = db.Column(db.Integer, primary_key=True)
    Title = db.Column(db.String(255), nullable=False)
    Author = db.Column(db.String(255), nullable=False)
    ISBN = db.Column(db.String(20), unique=True, nullable=False)
    Genre = db.Column(db.String(100), nullable=True)
    PublishedYear = db.Column(db.Integer, nullable=True)
    PublisherID = db.Column(db.Integer, db.ForeignKey('publishers.PublisherID', ondelete='SET NULL'), nullable=True)
    Quantity = db.Column(db.Integer, nullable=False, default=0)
    
    borrowings = db.relationship('Borrowing', backref='book', lazy=True)
    reservations = db.relationship('Reservation', backref='book', lazy=True)

    def to_dict(self):
        return {
            'BookID': self.BookID,
            'Title': self.Title,
            'Author': self.Author,
            'ISBN': self.ISBN,
            'Genre': self.Genre,
            'PublishedYear': self.PublishedYear,
            'PublisherID': self.PublisherID,
            'Quantity': self.Quantity,
            'PublisherName': self.publisher.Name if self.publisher else None
        }


class MembershipType(db.Model):
    __tablename__ = 'membership_types'

    MembershipTypeID = db.Column(db.Integer, primary_key=True)
    TypeName = db.Column(db.String(100), nullable=False)
    DurationMonths = db.Column(db.Integer, nullable=False)
    Fee = db.Column(db.Float, nullable=False)
    
    members = db.relationship('Member', backref='membership_type', lazy=True)

    def to_dict(self):
        return {
            'MembershipTypeID': self.MembershipTypeID,
            'TypeName': self.TypeName,
            'DurationMonths': self.DurationMonths,
            'Fee': self.Fee
        }


class Member(db.Model):
    __tablename__ = 'members'

    MemberID = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(255), nullable=False)
    Email = db.Column(db.String(100), unique=True, nullable=False)
    Phone = db.Column(db.String(15), unique=True, nullable=False)
    Address = db.Column(db.Text, nullable=True)
    MembershipTypeID = db.Column(db.Integer, db.ForeignKey('membership_types.MembershipTypeID', ondelete='SET NULL'), nullable=True)
    MembershipDate = db.Column(db.Date, nullable=True)
    
    borrowings = db.relationship('Borrowing', backref='member', lazy=True)
    reservations = db.relationship('Reservation', backref='member', lazy=True)

    def to_dict(self):
        return {
            'MemberID': self.MemberID,
            'Name': self.Name,
            'Email': self.Email,
            'Phone': self.Phone,
            'Address': self.Address,
            'MembershipTypeID': self.MembershipTypeID,
            'MembershipDate': self.MembershipDate.strftime('%Y-%m-%d') if self.MembershipDate else None,
            'MembershipTypeName': self.membership_type.TypeName if self.membership_type else None
        }


class Staff(db.Model):
    __tablename__ = 'staff'

    StaffID = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(255), nullable=False)
    Email = db.Column(db.String(100), unique=True, nullable=False)
    Phone = db.Column(db.String(15), unique=True, nullable=False)
    Role = db.Column(db.String(50), nullable=True)
    HireDate = db.Column(db.Date, nullable=True)
    
    borrowings = db.relationship('Borrowing', backref='staff', lazy=True)

    def to_dict(self):
        return {
            'StaffID': self.StaffID,
            'Name': self.Name,
            'Email': self.Email,
            'Phone': self.Phone,
            'Role': self.Role,
            'HireDate': self.HireDate.strftime('%Y-%m-%d') if self.HireDate else None
        }


class Borrowing(db.Model):
    __tablename__ = 'borrowings'

    BorrowID = db.Column(db.Integer, primary_key=True)
    MemberID = db.Column(db.Integer, db.ForeignKey('members.MemberID', ondelete='CASCADE'), nullable=True)
    BookID = db.Column(db.Integer, db.ForeignKey('books.BookID', ondelete='CASCADE'), nullable=True)
    BorrowDate = db.Column(db.Date, nullable=True, default=date.today)
    DueDate = db.Column(db.Date, nullable=False)
    ReturnDate = db.Column(db.Date, nullable=True)
    StaffID = db.Column(db.Integer, db.ForeignKey('staff.StaffID', ondelete='SET NULL'), nullable=True)
    
    fines = db.relationship('Fine', backref='borrowing', lazy=True)

    def to_dict(self):
        return {
            'BorrowID': self.BorrowID,
            'MemberID': self.MemberID,
            'BookID': self.BookID,
            'BorrowDate': self.BorrowDate.strftime('%Y-%m-%d') if self.BorrowDate else None,
            'DueDate': self.DueDate.strftime('%Y-%m-%d'),
            'ReturnDate': self.ReturnDate.strftime('%Y-%m-%d') if self.ReturnDate else None,
            'StaffID': self.StaffID,
            'MemberName': self.member.Name if self.member else None,
            'BookTitle': self.book.Title if self.book else None,
            'StaffName': self.staff.Name if self.staff else None
        }


class Fine(db.Model):
    __tablename__ = 'fines'

    FineID = db.Column(db.Integer, primary_key=True)
    BorrowID = db.Column(db.Integer, db.ForeignKey('borrowings.BorrowID', ondelete='CASCADE'), nullable=True)
    Amount = db.Column(db.Float, nullable=False)
    Paid = db.Column(db.Boolean, default=False)

    def to_dict(self):
        borrowing = self.borrowing
        member_name = borrowing.member.Name if borrowing and borrowing.member else None
        book_title = borrowing.book.Title if borrowing and borrowing.book else None
        
        return {
            'FineID': self.FineID,
            'BorrowID': self.BorrowID,
            'Amount': self.Amount,
            'Paid': self.Paid,
            'MemberName': member_name,
            'BookTitle': book_title,
            'BorrowDate': borrowing.BorrowDate.strftime('%Y-%m-%d') if borrowing and borrowing.BorrowDate else None,
            'DueDate': borrowing.DueDate.strftime('%Y-%m-%d') if borrowing and borrowing.DueDate else None
        }


class Reservation(db.Model):
    __tablename__ = 'reservations'

    ReservationID = db.Column(db.Integer, primary_key=True)
    MemberID = db.Column(db.Integer, db.ForeignKey('members.MemberID', ondelete='CASCADE'), nullable=True)
    BookID = db.Column(db.Integer, db.ForeignKey('books.BookID', ondelete='CASCADE'), nullable=True)
    ReservationDate = db.Column(db.Date, nullable=True, default=date.today)
    Status = db.Column(db.String(20), default='Pending')

    def to_dict(self):
        return {
            'ReservationID': self.ReservationID,
            'MemberID': self.MemberID,
            'BookID': self.BookID,
            'ReservationDate': self.ReservationDate.strftime('%Y-%m-%d') if self.ReservationDate else None,
            'Status': self.Status,
            'MemberName': self.member.Name if self.member else None,
            'BookTitle': self.book.Title if self.book else None
        }
