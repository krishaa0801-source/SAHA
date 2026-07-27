const express = require('express');
const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const dashboardRoutes = require('./dashboard');

const router = express.Router();

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
