// Inventory and Order Management API's by Gaurav Yadav

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');


const app = express();
app.use(bodyParser.json());
app.use(express.json());


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'inventory_management' 
});


db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('Connected to the MySQL database.');
});


// Product Management APIs


// 1. Create a product
app.post('/products', (req, res) => {
    const { name, sku, price, quantity } = req.body;
    const sql = `INSERT INTO products (name, sku, price, quantity) VALUES (?, ?, ?, ?)`;
    db.query(sql, [name, sku, price, quantity], (err, result) => {
        if (err) {
            console.error('Error creating product:', err.message);
            return res.status(500).json({ error: 'Failed to create product.' });
        }
        res.status(201).json({ message: 'Product created successfully.', productId: result.insertId });
    });
});


// 2. Update a product
app.put('/products/:id', (req, res) => {
    const { id } = req.params; 
    const { name, sku, price, quantity } = req.body; 

    const sql = `UPDATE products SET name = ?, sku = ?, price = ?, quantity = ? WHERE id = ?`;

    db.query(sql, [name, sku, price, quantity, id], (err, result) => {
        if (err) {
            console.error('Error updating product:', err.message); 
            return res.status(500).json({ error: 'Failed to update product.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found.' }); 
        }

        res.status(200).json({ message: 'Product updated successfully.' }); 
    });
});


// 3. List all products (with pagination and search)
app.get('/products', (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const sql = `SELECT * FROM products WHERE is_active = TRUE AND (name LIKE ? OR sku LIKE ?) LIMIT ? OFFSET ?`;
    db.query(sql, [`%${search}%`, `%${search}%`, parseInt(limit), parseInt(offset)], (err, results) => {
        if (err) {
            console.error('Error fetching products:', err.message);
            return res.status(500).json({ error: 'Failed to fetch products.' });
        }
        res.status(200).json({ products: results });
    });
});


// 4. Soft delete a product

app.delete('/products/:id', (req, res) => {
    const { id } = req.params;

    const sql = `UPDATE products SET is_active = FALSE WHERE id = ?`;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error soft deleting product:', err.message);
            return res.status(500).json({ error: 'Failed to soft delete product.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.status(200).json({ message: 'Product soft deleted successfully.' });
    });
});



// Order Management APIs


// 1. Create an order
//STRETCH GOAL:  It also handles concurrent order creation to prevent race conditions when orders are placed.

app.post('/orders', (req, res) => {
    const { products } = req.body; 
    if (!products || !products.length) {
        return res.status(400).json({ error: 'Products are required to create an order.' });
    }

    let totalPrice = 0;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: 'Transaction error.' });

        const productIds = products.map(({ productId }) => productId); 
        const lockSql = `SELECT id, price, quantity FROM products WHERE id IN (?) FOR UPDATE`; 
        db.query(lockSql, [productIds], (err, lockResults) => { 
            if (err) return db.rollback(() => res.status(500).json({ error: 'Failed to lock product rows.' }));

            const priceMap = {};
            const quantityMap = {};

           
            lockResults.forEach((product) => {
                priceMap[product.id] = product.price;
                quantityMap[product.id] = product.quantity;
            });

          
            for (const { productId, quantity } of products) {
                if (!quantityMap[productId] || quantityMap[productId] < quantity) {
                    return db.rollback(() =>
                        res.status(400).json({ error: `Insufficient stock for product ID ${productId}` })
                    );
                }
            }

            const orderSql = `INSERT INTO orders (total_price) VALUES (?)`;
            db.query(orderSql, [0], (err, result) => {
                if (err) return db.rollback(() => res.status(500).json({ error: 'Failed to create order.' }));

                const orderId = result.insertId;

                const orderItemsData = products.map(({ productId, quantity }) => {
                    const price = priceMap[productId];
                    totalPrice += price * quantity;
                    return [orderId, productId, quantity, price];
                });

                const orderItemsSql = `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?`;
                db.query(orderItemsSql, [orderItemsData], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: 'Failed to add order items.' }));

                    const updateStockPromises = products.map(({ productId, quantity }) => {
                        return new Promise((resolve, reject) => {
                            const updateStockSql = `UPDATE products SET quantity = quantity - ? WHERE id = ?`;
                            db.query(updateStockSql, [quantity, productId], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    });

                    Promise.all(updateStockPromises)
                        .then(() => {
                            const updateOrderSql = `UPDATE orders SET total_price = ? WHERE id = ?`;
                            db.query(updateOrderSql, [totalPrice, orderId], (err) => {
                                if (err) return db.rollback(() => res.status(500).json({ error: 'Failed to update order total.' }));

                                db.commit((err) => {
                                    if (err) return db.rollback(() => res.status(500).json({ error: 'Commit failed.' }));
                                    res.status(201).json({ message: 'Order created successfully.', orderId });
                                });
                            });
                        })
                        .catch((err) => {
                            console.error('Error updating stock:', err.message);
                            db.rollback(() => res.status(500).json({ error: 'Failed to update stock.' }));
                        });
                });
            });
        });
    });
});



// 2. Get order details
app.get('/orders/:id', (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT o.id AS orderId, o.total_price AS totalPrice, o.order_date AS orderDate,
               oi.product_id AS productId, oi.quantity, oi.price
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = ?
    `;
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching order details:', err.message);
            return res.status(500).json({ error: 'Failed to fetch order details.' });
        }
        res.status(200).json({ order: results });
    });
});

// 3. List all orders (with pagination)
app.get('/orders', (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const sql = `SELECT * FROM orders LIMIT ? OFFSET ?`;
    db.query(sql, [parseInt(limit), parseInt(offset)], (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err.message);
            return res.status(500).json({ error: 'Failed to fetch orders.' });
        }
        res.status(200).json({ orders: results });
    });
});



const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
