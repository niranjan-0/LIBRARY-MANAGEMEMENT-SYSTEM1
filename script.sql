-- CREATE DATABASE IF NOT EXISTS LibraryDB_Expanded1;
USE LibraryDB_Expanded1;

-- Table for publishers
CREATE TABLE IF NOT EXISTS Publishers (
    PublisherID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Address TEXT,
    Email VARCHAR(100) UNIQUE,
    Phone VARCHAR(15) UNIQUE
);

-- Table for storing book details
CREATE TABLE IF NOT EXISTS Books (
    BookID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Author VARCHAR(255) NOT NULL,
    ISBN VARCHAR(20) UNIQUE NOT NULL,
    Genre VARCHAR(100),
    PublishedYear INT,
    PublisherID INT,
    Quantity INT NOT NULL CHECK (Quantity >= 0),
    CONSTRAINT fk_books_publisher FOREIGN KEY (PublisherID) REFERENCES Publishers(PublisherID) ON DELETE SET NULL
);

-- Table for membership types
CREATE TABLE IF NOT EXISTS MembershipTypes (
    MembershipTypeID INT AUTO_INCREMENT PRIMARY KEY,
    TypeName VARCHAR(100) NOT NULL,
    DurationMonths INT NOT NULL,
    Fee DECIMAL(10,2) NOT NULL
);

-- Table for library members
CREATE TABLE IF NOT EXISTS Members (
    MemberID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL,
    Address TEXT,
    MembershipTypeID INT,
    MembershipDate DATE DEFAULT (CURDATE()),
    CONSTRAINT fk_members_membershiptype FOREIGN KEY (MembershipTypeID) REFERENCES MembershipTypes(MembershipTypeID) ON DELETE SET NULL
);

-- Table for staff
CREATE TABLE IF NOT EXISTS Staff (
    StaffID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL,
    Role VARCHAR(50),
    HireDate DATE DEFAULT (CURDATE())
);

-- Table for borrowing transactions
CREATE TABLE IF NOT EXISTS Borrowings (
    BorrowID INT AUTO_INCREMENT PRIMARY KEY,
    MemberID INT,
    BookID INT,
    BorrowDate DATE DEFAULT (CURDATE()),
    DueDate DATE NOT NULL,
    ReturnDate DATE,
    StaffID INT,
    CONSTRAINT fk_borrowings_member FOREIGN KEY (MemberID) REFERENCES Members(MemberID) ON DELETE CASCADE,
    CONSTRAINT fk_borrowings_book FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE,
    CONSTRAINT fk_borrowings_staff FOREIGN KEY (StaffID) REFERENCES Staff(StaffID) ON DELETE SET NULL
);

-- Table for fines
CREATE TABLE IF NOT EXISTS Fines (
    FineID INT AUTO_INCREMENT PRIMARY KEY,
    BorrowID INT,
    Amount DECIMAL(10,2) NOT NULL,
    Paid BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_fines_borrow FOREIGN KEY (BorrowID) REFERENCES Borrowings(BorrowID) ON DELETE CASCADE
);

-- Table for book reservations
CREATE TABLE IF NOT EXISTS Reservations (
    ReservationID INT AUTO_INCREMENT PRIMARY KEY,
    MemberID INT,
    BookID INT,
    ReservationDate DATE DEFAULT (CURDATE()),
    Status ENUM('Pending', 'Completed', 'Cancelled') DEFAULT 'Pending',
    CONSTRAINT fk_reservations_member FOREIGN KEY (MemberID) REFERENCES Members(MemberID) ON DELETE CASCADE,
    CONSTRAINT fk_reservations_book FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE
);
