-- Create the database
CREATE DATABASE IF NOT EXISTS LibraryDB_Expanded1;
USE LibraryDB_Expanded1;

-- Table for publishers
CREATE TABLE Publishers (
    PublisherID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Address TEXT,
    Email VARCHAR(100) UNIQUE,
    Phone VARCHAR(15) UNIQUE
);

-- Table for storing book details
CREATE TABLE Books (
    BookID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Author VARCHAR(255) NOT NULL,
    ISBN VARCHAR(20) UNIQUE NOT NULL,
    Genre VARCHAR(100),
    PublishedYear INT,
    PublisherID INT,
    Quantity INT NOT NULL CHECK (Quantity >= 0),
    FOREIGN KEY (PublisherID) REFERENCES Publishers(PublisherID) ON DELETE SET NULL
);

-- Table for membership types
CREATE TABLE MembershipTypes (
    MembershipTypeID INT AUTO_INCREMENT PRIMARY KEY,
    TypeName VARCHAR(100) NOT NULL,
    DurationMonths INT NOT NULL,
    Fee DECIMAL(10,2) NOT NULL
);

-- Table for library members
CREATE TABLE Members (
    MemberID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL,
    Address TEXT,
    MembershipTypeID INT,
    MembershipDate DATE ,
    FOREIGN KEY (MembershipTypeID) REFERENCES MembershipTypes(MembershipTypeID) ON DELETE SET NULL
);

-- Table for staff
CREATE TABLE Staff (
    StaffID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL,
    Role VARCHAR(50),
    HireDate DATE
);

-- Table for borrowing transactions
CREATE TABLE Borrowings (
    BorrowID INT AUTO_INCREMENT PRIMARY KEY,
    MemberID INT,
    BookID INT,
   BorrowDate DATE,
    DueDate DATE NOT NULL,
    ReturnDate DATE,
    StaffID INT,
    FOREIGN KEY (MemberID) REFERENCES Members(MemberID) ON DELETE CASCADE,
    FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE,
    FOREIGN KEY (StaffID) REFERENCES Staff(StaffID) ON DELETE SET NULL
);

-- Table for fines
CREATE TABLE Fines (
    FineID INT AUTO_INCREMENT PRIMARY KEY,
    BorrowID INT,
    Amount DECIMAL(10,2) NOT NULL,
    Paid BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (BorrowID) REFERENCES Borrowings(BorrowID) ON DELETE CASCADE
);

-- Table for book reservations
CREATE TABLE Reservations (
    ReservationID INT AUTO_INCREMENT PRIMARY KEY,
    MemberID INT,
    BookID INT,
    ReservationDate DATE,
    Status ENUM('Pending', 'Completed', 'Cancelled') DEFAULT 'Pending',
    FOREIGN KEY (MemberID) REFERENCES Members(MemberID) ON DELETE CASCADE,
    FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE
);

-- Inserting sample data
INSERT INTO Publishers (Name, Address, Email, Phone) VALUES
('Penguin Books', 'New York, USA', 'contact@penguin.com', '1234567890'),
('HarperCollins', 'London, UK', 'info@harpercollins.com', '0987654321');

INSERT INTO Books (Title, Author, ISBN, Genre, PublishedYear, PublisherID, Quantity) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 'Fiction', 1925, 1, 5),
('To Kill a Mockingbird', 'Harper Lee', '9780061120084', 'Fiction', 1960, 2, 3);

INSERT INTO MembershipTypes (TypeName, DurationMonths, Fee) VALUES
('Standard', 12, 100.00),
('Premium', 24, 180.00);

INSERT INTO Members (Name, Email, Phone, Address, MembershipTypeID) VALUES
('John Doe', 'john@example.com', '9876543210', '123 Main St', 1),
('Jane Smith', 'jane@example.com', '9123456780', '456 Elm St', 2);

INSERT INTO Staff (Name, Email, Phone, Role) VALUES
('Alice Johnson', 'alice@example.com', '9012345678', 'Librarian'),
('Bob Williams', 'bob@example.com', '8901234567', 'Assistant');

INSERT INTO Borrowings (MemberID, BookID, DueDate, StaffID) VALUES
(1, 1, DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY), 1),
(2, 2, DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY), 2);

INSERT INTO Fines (BorrowID, Amount, Paid) VALUES
(1, 10.00, FALSE);

INSERT INTO Reservations (MemberID, BookID, Status) VALUES
(1, 2, 'Pending');
