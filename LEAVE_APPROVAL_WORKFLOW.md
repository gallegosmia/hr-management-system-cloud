# Leave Request Two-Level Approval Workflow

## Overview
The leave request system has been updated to implement a mandatory two-level approval process. All leave requests must be approved by both the Branch Manager and the Executive Vice President before being finalized.

## Approval Workflow

### Level 1: Branch Manager Approval
- **Status:** `Pending Branch Manager`
- **Approver:** Marilyn Reloba (Branch Manager)
- **Action:** Reviews and approves/rejects the leave request
- **Next Step:** If approved, advances to Level 2 (Pending EVP)

### Level 2: Executive Vice President Approval
- **Status:** `Pending EVP`
- **Approver:** Anna Liza Rodriguez (Executive Vice President)
- **Action:** Final review and approval/rejection
- **Next Step:** If approved, leave is fully approved

## Status Flow

```
Employee Files Leave Request
        ↓
[Pending Branch Manager]
        ↓
Branch Manager Reviews
        ├─→ Approved → [Pending EVP]
        └─→ Rejected → [Rejected] (End)
                ↓
        EVP Reviews
                ├─→ Approved → [Approved] (End)
                └─→ Rejected → [Rejected] (End)
```

## Status Definitions

| Status | Description | Badge Color |
|--------|-------------|-------------|
| **Pending Branch Manager** | Awaiting Branch Manager approval | Yellow (Warning) |
| **Pending EVP** | Branch Manager approved, awaiting EVP approval | Blue (Info) |
| **Approved** | Fully approved by both Branch Manager and EVP | Green (Success) |
| **Rejected** | Rejected by either Branch Manager or EVP | Red (Danger) |
| **Cancelled** | Cancelled by employee or admin | Gray |

## How to Use

### For Employees
1. Navigate to **Leave Requests** page
2. Click **"➕ File Leave Request"**
3. Fill in the leave details:
   - Select employee
   - Choose leave type
   - Set start and end dates
   - Provide reason
4. Click **"Submit Request"**
5. Status will be set to **"Pending Branch Manager"**

### For Branch Managers
1. Navigate to **Leave Requests** page
2. Filter by **"Pending"** to see requests awaiting approval
3. Review leave requests with status **"Pending Branch Manager"**
4. Click **✓** to approve or **✕** to reject
5. If approved, status changes to **"Pending EVP"**
6. If rejected, provide remarks (required) and status changes to **"Rejected"**

### For Executive Vice President
1. Navigate to **Leave Requests** page
2. Filter by **"Pending"** to see requests awaiting approval
3. Review leave requests with status **"Pending EVP"**
4. Click **✓** to approve or **✕** to reject
5. If approved, status changes to **"Approved"** (final)
6. If rejected, provide remarks (required) and status changes to **"Rejected"**

## PDF Leave Form

The PDF leave form has been updated to reflect the two-level approval process:

### Signature Sections
1. **Employee Signature / Date** - Employee acknowledges the leave request
2. **MARILYN RELOBA - Branch Manager** - Level 1 approval signature
3. **ANNA LIZA RODRIGUEZ - Executive Vice President** - Level 2 approval signature (final)

### Approval Workflow Section
The PDF now includes a section that clearly states:
- "This leave request requires approval from:"
  1. Branch Manager (Marilyn Reloba)
  2. Executive Vice President (Anna Liza Rodriguez)

## Database Fields

The following fields are tracked for each leave request:

### Branch Manager Approval
- `branch_manager_approved_at` - Timestamp of approval
- `branch_manager_approved_by` - User ID of Branch Manager
- `branch_manager_remarks` - Optional remarks

### EVP Approval
- `evp_approved_at` - Timestamp of approval
- `evp_approved_by` - User ID of EVP
- `evp_remarks` - Optional remarks

### Final Approval
- `final_approved_at` - Timestamp when fully approved
- `status` - Current status of the request

## Business Rules

### Approval Rules
1. **Sequential Approval:** Branch Manager must approve before EVP can review
2. **Rejection at Any Level:** Either approver can reject the request
3. **Remarks Required:** Rejection requires mandatory remarks explaining the reason
4. **No Skipping Levels:** Cannot skip Branch Manager approval to go directly to EVP

### Status Transitions
- ✅ `Pending Branch Manager` → `Pending EVP` (Branch Manager approves)
- ✅ `Pending Branch Manager` → `Rejected` (Branch Manager rejects)
- ✅ `Pending EVP` → `Approved` (EVP approves)
- ✅ `Pending EVP` → `Rejected` (EVP rejects)
- ❌ `Pending Branch Manager` → `Approved` (Cannot skip EVP approval)

## API Changes

### PATCH /api/leave
Updated to handle two-level approval:

**Request Body:**
```json
{
  "id": 1,
  "status": "Approved",
  "approver_id": 1,
  "approver_role": "Branch Manager",
  "remarks": "Optional remarks"
}
```

**Response for Branch Manager Approval:**
```json
{
  "success": true,
  "message": "Approved by Branch Manager. Pending EVP approval."
}
```

**Response for EVP Approval:**
```json
{
  "success": true,
  "message": "Fully approved by Executive Vice President."
}
```

## Notifications (Future Enhancement)

Future versions may include:
- Email notifications to Branch Manager when new request is filed
- Email notifications to EVP when Branch Manager approves
- Email notifications to employee when request is approved/rejected
- SMS notifications for urgent leave requests

## Troubleshooting

**Q: Can I approve a leave request directly as EVP?**
No, the Branch Manager must approve first. The system enforces sequential approval.

**Q: What happens if Branch Manager rejects?**
The leave request is immediately rejected and EVP does not review it.

**Q: Can I edit a leave request after submission?**
Yes, but only if it's still pending. Once approved or rejected, it cannot be edited.

**Q: How do I cancel a leave request?**
Click the delete button (🗑️) or update the status to "Cancelled".

## Implementation Details

### Files Modified
1. `/app/leave/page.tsx` - Updated UI and PDF generation
2. `/app/api/leave/route.ts` - Implemented two-level approval logic
3. `/lib/data.ts` - Updated initial status to "Pending Branch Manager"

### Key Changes
- Initial status changed from "Pending Level 1" to "Pending Branch Manager"
- Added intermediate status "Pending EVP"
- Updated badge colors for different statuses
- Modified PDF to show two-level approval workflow
- Enhanced API to track approval details for each level

---

**Effective Date:** January 9, 2026
**Version:** 2.0
**Status:** ✅ Active
