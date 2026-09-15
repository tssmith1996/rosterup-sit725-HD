const User = require('../models/User');
const Workplace = require('../models/Workplace');

//GET /api/manager/pending-employees
//(This used to return every pending employee for every manager, with no
//workplace filter at all — any manager could see another manager's pending
//employees. Scoped to the signed-in manager's own workplace below, the
//same way listPendingClaims is already scoped for shifts.)
exports.getPendingEmployees = async (req, res) => {
    try {
        const managerId = req.user?.id || req.user?._id;
        const workplace = await Workplace.findOne({ manager_id: managerId, active: true });

        //A manager with no workplace yet can't have anyone pending against
        //it — nobody can register with an invite code that doesn't exist.
        if (!workplace) {
            return res.status(200).json({
                success: true,
                count: 0,
                employees: []
            });
        }

        //Find all active employees whose workplace status is currently pending
        const pendingEmployees = await User.find({
            role: 'employee',
            workplace_status: 'pending',
            workplace: workplace._id,
            active: true
        }).select('first_name last_name email role workplace_status');

        return res.status(200).json({
            success: true,
            count: pendingEmployees.length,
            employees: pendingEmployees
        });
    } catch (error) {
        console.error("Fetch Pending Employees Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching pending requests.",
            error: error.message
        });
    }
};

//PATCH /api/manager/process-employee/:id
exports.processEmployeeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // Expecting either 'approve' or 'reject'

        if (!action || (action !== 'approve' && action !== 'reject')) {
            return res.status(400).json({
                success: false,
                message: "Invalid action. System requires 'approve' or 'reject'."
            });
        }

        //Same scoping as above — without this, a manager could approve or
        //reject another manager's pending employee just by knowing/guessing
        //their user id, even though the list itself is now scoped.
        const managerId = req.user?.id || req.user?._id;
        const workplace = await Workplace.findOne({ manager_id: managerId, active: true });
        if (!workplace) {
            return res.status(404).json({
                success: false,
                message: "Employee request record not found."
            });
        }

        const employee = await User.findById(id);
        if (!employee || String(employee.workplace) !== String(workplace._id)) {
            return res.status(404).json({
                success: false,
                message: "Employee request record not found."
            });
        }

        const fullName = `${employee.first_name} ${employee.last_name}`;

        if (action === 'approve') {
            employee.workplace_status = 'approved';
            await employee.save();
        } else if (action === 'reject') {
            //Keep document record but mark rejected
            employee.workplace_status = 'rejected';
            employee.active = false; // Soft-disable access profile
            await employee.save();

            // Option B (Alternative): deleting rejected requests completely:
            // await User.findByIdAndDelete(id);
        }

        return res.status(200).json({
            success: true,
            message: `Employee request successfully ${action}d.`,
            employeeName: fullName,
            action: action
        });

    } catch (error) {
        console.error("Process Employee Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error updating employee status.",
            error: error.message
        });
    }
};
