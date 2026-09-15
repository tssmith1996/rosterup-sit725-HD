const jwt = require('jsonwebtoken');

//Verifies a "Authorization: Bearer <token>" header and attaches
//{ id, role } to req.user. Responds 401 if the header is missing or the
//token is invalid/expired.
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.id, role: payload.role };
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired session.'
        });
    }
}

//Restricts access to one or more roles. Use after requireAuth, which sets req.user.
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action.'
            });
        }
        return next();
    };
}

module.exports = { requireAuth, requireRole };
