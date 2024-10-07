## Buggy Sytem
### Task
	1.	You’ve been provided with a buggy Node.js system that interacts with a database.
	2.	Your task is to:
        •	Debug the SQL queries and find/fix issues.
        •	Ensure input validation is added where needed.
        •	Handle database constraints properly (e.g., foreign keys, unique fields).
        •	Implement proper error handling.
### Instructions
	1.	Clone the repository and install the dependencies (npm install).
	2.	Ensure you have a running MySQL or PostgreSQL instance and update the connection details in the app.
	3.	Create the required tables using the provided SQL schema.
	4.	Run the application (npm start) and debug the routes.
	5.	Document the bugs you found and how you fixed them (This should be a Google doc).

### Database Structure
We have a simple schema with two tables:
    1.	users: Contains user data.
    2.	orders: Stores user orders.
```
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_total DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```