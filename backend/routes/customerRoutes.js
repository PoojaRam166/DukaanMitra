const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, payCustomerCredit } = require('../controllers/customerController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, getCustomers);
router.get('/:id', authenticate, getCustomerById);
router.post('/', authenticate, createCustomer);
router.put('/:id', authenticate, updateCustomer);
router.delete('/:id', authenticate, deleteCustomer);
router.patch('/:id/pay', authenticate, payCustomerCredit);

module.exports = router;
