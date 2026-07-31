const express = require('express');
const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const dashboardRoutes = require('./dashboard');
const reviewRoutes = require('./reviews');
const couponRoutes = require('./coupons');
const orderRoutes = require('./orders');

const router = express.Router();

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
