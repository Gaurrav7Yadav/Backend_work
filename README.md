### **README**

---

## **Backend Task: Inventory Management System**

This project implements a backend application for managing products, inventory, and orders using **Node.js**, **Express**, and **MySQL**. It includes APIs for CRUD operations on products and orders, with features like soft deletion, pagination, and concurrency-safe order creation.

---

### **Features**
- Manage products: Create, update, list, and soft delete.
- Manage orders: Place orders, view order details, and list orders.
- Concurrency handling for safe stock updates.
- Error handling and meaningful responses for invalid data or actions.

---

### **Prerequisites**
1. **Software Requirements**:
   - **Node.js**: Install from [Node.js Official Site](https://nodejs.org/).
   - **XAMPP**: Install from [XAMPP Official Site](https://www.apachefriends.org/index.html) to set up MySQL.

2. **Database Setup**:
   - MySQL database (default setup via XAMPP).

---

### **Project Setup**

#### **1. Clone the Repository**
```bash
git clone https://github.com/Gaurrav7Yadav/Backend_Task.git
cd Backend_Task
```

#### **2. Install Dependencies**
```bash
npm install
```

#### **3. Configure the Database**
- **Start XAMPP**:
  - Open the XAMPP control panel.
  - Start **Apache** and **MySQL**.

- **Create the Database**:
  - Open phpMyAdmin: [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
  - Create a database named `inventory_management`.

- **Run the SQL Script**:
  - Navigate to the **SQL** tab in phpMyAdmin.
  - Paste the following script to set up the tables and seed data:

```sql
-- Create `products` table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create `orders` table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create `order_items` table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Seed `products` table
INSERT INTO products (name, sku, price, quantity, is_active)
VALUES 
('Product A', 'SKU001', 10.50, 50, TRUE),
('Product B', 'SKU002', 15.75, 30, TRUE),
('Product C', 'SKU003', 7.25, 100, TRUE),
('Product D', 'SKU004', 20.00, 25, TRUE),
('Product E', 'SKU005', 5.50, 75, TRUE);
```

#### **4. Update Database Configuration**
Modify the `db` configuration in `index.js` if your MySQL credentials differ:
```javascript
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'inventory_management'
});
```

---

### **Run the Project**

#### **Start the Server**
```bash
node index.js
```
You should see:
```
Connected to the MySQL database.
Server is running on http://localhost:3000
```

#### **Test the APIs**
- Use **Postman** or any API testing tool to interact with the endpoints.

---

### **API Endpoints**

#### **Products**
1. **Create Product**: `POST /products`
2. **Update Product**: `PUT /products/:id`
3. **List Products**: `GET /products?page=1&limit=10&search=term`
4. **Soft Delete Product**: `DELETE /products/:id`

#### **Orders**
1. **Create Order**: `POST /orders`
2. **Get Order Details**: `GET /orders/:id`
3. **List Orders**: `GET /orders?page=1&limit=10`

Refer to the [API Documentation](#) for detailed request and response formats.

---

### **Troubleshooting**

1. **Database Connection Issues**:
   - Ensure MySQL is running in XAMPP.
   - Verify `host`, `user`, `password`, and `database` in the code.

2. **Port Conflicts**:
   - If port `3000` is in use, change the port in the `index.js` file:
     ```javascript
     const PORT = 3001;
     ```

3. **Missing Dependencies**:
   - Run `npm install` to ensure all dependencies are installed.

---




