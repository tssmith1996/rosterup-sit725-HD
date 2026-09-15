const User = require('../models/User');
const Workplace = require('../models/Workplace');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        //FR-01/04/08 require a "name". expecting first_name and last_name from the client
        const { first_name, last_name, email, password, role, workplaceInviteCode } = req.body;

        //Basic field presence validation
        if (!first_name || !last_name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: first_name, last_name, email, password, and role are mandatory."
            });
        }

        //Convert incoming role string to lowercase to match schema enum ('manager' / 'employee')
        const normalizedRole = role.toLowerCase();
        if (normalizedRole !== 'manager' && normalizedRole !== 'employee') {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Must be either 'Manager' or 'Employee'."
            });
        }

        //FR-08: If user is an employee, they MUST provide an invite code
        if (normalizedRole === 'employee' && !workplaceInviteCode) {
            return res.status(400).json({
                success: false,
                message: "Employee registration requires a workplace invite code."
            });
        }

        //Security: Check if email is already taken
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "An account with this email address already exists."
            });
        }

        //FR-08: Resolve the invite code to a real workplace before creating
        //the account. This used to be a no-op (see git history) — the code
        //was accepted from the form but never looked up, so every employee
        //ended up with workplace: null regardless of what they typed.
        let targetWorkplace = null;
        if (normalizedRole === 'employee') {
            targetWorkplace = await Workplace.findOne({
                invite_code: workplaceInviteCode.trim().toUpperCase(),
                active: true
            });

            if (!targetWorkplace) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workplace invite code."
                });
            }
        }

        //Security: Hash the raw text password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        //Structure payload to match User Schema architecture
        const newUserPayload = {
            first_name,
            last_name,
            email,
            password_hashed: hashedPassword,
            role: normalizedRole,
            active: true
        };

        if (normalizedRole === 'employee') {
            newUserPayload.workplace_status = 'pending';
            newUserPayload.workplace = targetWorkplace._id;
        }

        //Save records into MongoDB
        const newUser = new User(newUserPayload);
        await newUser.save();

        //Send successful output response (excluding sensitive password data)
        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            user: {
                id: newUser._id,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                role: newUser.role,
                workplace_status: newUser.workplace_status
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server validation error.",
            error: error.message
        });
    }
};

//FR-02: Authenticate an existing user and issue a JWT
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        //Look up by email; don't reveal whether the email or the password was wrong
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.active) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hashed);
        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("Login Error: JWT_SECRET is not set in the environment.");
            return res.status(500).json({
                success: false,
                message: "Server misconfiguration: missing JWT secret."
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                workplace_status: user.workplace_status
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during login.",
            error: error.message
        });
    }
};

//FR-02: Sign out. The token is a stateless JWT, so there's nothing to
//invalidate server-side yet — the client discards it. This endpoint exists
//so the frontend has a real call to make, and a place to hook a token
//blacklist/session store later if that's ever needed.
exports.logout = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Logged out successfully."
    });
};

//GET /api/auth/me — returns the current user's up-to-date profile.
//The JWT payload only carries {id, role}, and the client otherwise only
//refreshes its cached profile (localStorage) at login time — so without
//this, an employee whose workplace_status changes (e.g. a manager approves
//their request) would never see that reflected until they log out and back
//in. Dashboards call this on load to pick up changes like that.
exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.active) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired session."
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                workplace_status: user.workplace_status
            }
        });
    } catch (error) {
        console.error("Fetch Current User Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching profile.",
            error: error.message
        });
    }
};
