const express = require('express');
const router = express.Router();
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getCategories, restockProduct } = require('../controllers/productController');
const authenticate = require('../middleware/auth');

router.get('/categories', authenticate, getCategories);
router.get('/', authenticate, getProducts);
router.get('/:id', authenticate, getProductById);
router.post('/', authenticate, createProduct);
router.put('/:id', authenticate, updateProduct);
router.patch('/:id/restock', authenticate, restockProduct);
router.delete('/:id', authenticate, deleteProduct);

module.exports = router;
