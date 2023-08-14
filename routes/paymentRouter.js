const express = require('express');
const paymentControllers = require('./../controllers/paymentConrollers')
const userControllers = require('./../controllers/userControllers');
const authControllers = require('../controllers/authControllers');

const router = express.Router();
router.get('/:productId',authControllers.protect,paymentControllers.createCheckoutSession);

module.exports = router;