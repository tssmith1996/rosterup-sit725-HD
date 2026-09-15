const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

//POST /auth/register
router.post('/register', authController.register);

//POST /auth/login
router.post('/login', authController.login);

//POST /auth/logout
router.post('/logout', authController.logout);

//GET /auth/me — current user's fresh profile (see controller for why)
router.get('/me', requireAuth, authController.me);

module.exports = router;