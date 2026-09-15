const express = require('express');
const router = express.Router();

function notImplemented(req, res) {
    return res.status(501).json({
        error: 'This user operation has not been implemented yet',
    });
}

// Get user/profile details
router.get('/:id', notImplemented);

// Update profile details
router.put('/:id', notImplemented);

// Change password
router.put('/:id/password', notImplemented);

// Approve/reject an employee  
router.put('/:id/status', notImplemented);

module.exports = router;