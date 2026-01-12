# Leave Approval System - Final Configuration

## ✅ System Configuration Complete

### Designated Approvers

**Level 1 Approver:**
- **Name:** Marilyn Reloba
- **Position:** Branch Manager
- **Role:** First-level approval for all leave requests

**Level 2 Approver:**
- **Name:** Anna Liza Rodriguez
- **Position:** Executive Vice President
- **Role:** Final approval authority for all leave requests

---

## 📋 Updated PDF Leave Form

The PDF leave application form now includes the specific names of the approvers:

### Signature Section Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [Employee Signature Line]    [MARILYN RELOBA]         │
│  Employee Signature / Date     Branch Manager          │
│                                Signature / Date         │
│                                                         │
│              [ANNA LIZA RODRIGUEZ]                      │
│           Executive Vice President                      │
│              Signature / Date                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Approval Workflow Statement

The PDF clearly states:
> "This leave request requires approval from:
> 1. Branch Manager
> 2. Executive Vice President"

---

## 🔄 Complete Approval Process

### Step-by-Step Flow

1. **Employee Files Leave Request**
   - Status: `Pending Branch Manager`
   - Notification: Marilyn Reloba receives notification

2. **Marilyn Reloba (Branch Manager) Reviews**
   - Options: Approve or Reject
   - If Approved: Status → `Pending EVP`
   - If Rejected: Status → `Rejected` (End)

3. **Anna Liza Rodriguez (EVP) Reviews**
   - Options: Approve or Reject
   - If Approved: Status → `Approved` (End)
   - If Rejected: Status → `Rejected` (End)

---

## 📄 Document Features

### PDF Form Includes:
- ✅ Employee information
- ✅ Leave details (type, dates, reason)
- ✅ Current status
- ✅ Approval workflow explanation
- ✅ Named signature lines for both approvers
- ✅ Employee signature line
- ✅ Date fields for all signatures
- ✅ Document ID and generation timestamp

### Professional Formatting:
- Clean, print-ready layout
- Clear section headers
- Proper spacing for signatures
- Professional typography
- Official company branding

---

## 👥 User Roles & Responsibilities

### Marilyn Reloba - Branch Manager
**Responsibilities:**
- Review all incoming leave requests
- Verify leave eligibility and availability
- Approve or reject with remarks
- First-level authorization

**Access:**
- Can view all leave requests
- Can approve requests with status "Pending Branch Manager"
- Can reject at any time with mandatory remarks

### Anna Liza Rodriguez - Executive Vice President
**Responsibilities:**
- Final review of leave requests
- Strategic oversight of leave approvals
- Final authorization
- Can override if necessary

**Access:**
- Can view all leave requests
- Can approve requests with status "Pending EVP"
- Can reject at any time with mandatory remarks
- Final decision authority

---

## 🎯 Key Features

### Sequential Approval
- ✅ Enforces proper hierarchy
- ✅ Cannot skip Branch Manager
- ✅ EVP only reviews after Branch Manager approval

### Audit Trail
- ✅ Tracks who approved at each level
- ✅ Records timestamps for all actions
- ✅ Stores remarks for rejections
- ✅ Complete history of status changes

### Professional Documentation
- ✅ Named approvers on PDF
- ✅ Clear approval workflow
- ✅ Signature lines with names and titles
- ✅ Print-ready format

---

## 📊 Status Indicators

| Status | Approver | Action Needed |
|--------|----------|---------------|
| **Pending Branch Manager** | Marilyn Reloba | Review and approve/reject |
| **Pending EVP** | Anna Liza Rodriguez | Final review and approve/reject |
| **Approved** | N/A | No action needed - Fully approved |
| **Rejected** | N/A | No action needed - Request denied |

---

## 🔗 Quick Access

**Leave Requests Page:** http://localhost:3001/leave

**Actions:**
1. File new leave request
2. Review pending requests
3. Approve/reject requests
4. Download PDF forms

---

## 📝 Notes

- All leave requests require both approvals to be finalized
- Rejection at any level ends the approval process
- Remarks are mandatory when rejecting
- PDF forms include the names of both approvers
- System enforces sequential approval (no skipping levels)

---

**Configured By:** System Administrator  
**Configuration Date:** January 9, 2026  
**Status:** ✅ Active and Ready for Use  
**Version:** 2.0
