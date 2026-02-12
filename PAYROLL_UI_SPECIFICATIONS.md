# Payroll UI Design Specifications

## Based on Provided Mockups

This document provides detailed specifications for implementing the payroll UI based on the mockups provided.

---

## 1. Print Preview Screen

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  ← Print Preview                      [🖨️ Print]   │ Header Bar
├─────────────────────────────────────────────────────┤
│  SELECTED EMPLOYEES                    3 Selected ▼ │ Batch Info
│  Batch: January 1-15, 2026                          │ (UI Only)
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │  [Company Logo]  LENDING INVESTOR CORP    │     │
│  │                  Kagayday mo sa Pag-unlad │     │
│  │                  Address & Contact Info   │     │
│  │                                           │     │
│  │              PAYSLIP                      │     │
│  │                                           │     │
│  │  Period Covered:  January 1-15, 2026     │     │
│  │  Name:           ROSAL, ALDIE             │     │
│  │  Position:       CI/Collector             │     │
│  │                                           │     │
│  │  Basic Pay                    6,780.00    │     │
│  │  No. of Worked Days (15)          -       │     │
│  │  No. of Holidays (0/0)            -       │     │
│  │  Regular Allowance              500.00    │     │
│  │  TOTAL PAY                    7,280.00    │     │
│  │                                           │     │
│  │  DEDUCTIONS:                              │     │
│  │  Cash Fund                      300.00    │     │
│  │  Philhealth                     281.25    │     │
│  │  PAG-IBIG                       200.00    │     │
│  │  Emergency Loan                 800.00    │     │
│  │  TOTAL DEDUCTION              1,581.25    │     │
│  │                                           │     │
│  │  ┌─────────────────────────────────────┐ │     │
│  │  │ NET PAY        Php 5,698.75         │ │     │
│  │  └─────────────────────────────────────┘ │     │
│  │                                           │     │
│  │  Prepared by: _______________             │     │
│  │                              PAID         │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  ● ○ ○                                              │ Page Indicators
├─────────────────────────────────────────────────────┤
│  ⚙️ Page Setup  📤 Send PDF  💾 Save All  ⋯ More   │ Controls
│                    [🖨️ Print]                       │ (UI Only)
└─────────────────────────────────────────────────────┘
```

### Design Specifications

#### Header Bar
- **Height**: 60px
- **Background**: White
- **Border Bottom**: 1px solid #e5e7eb
- **Left**: Back arrow + "Print Preview" text (0.9rem, bold)
- **Right**: Green print button (40px height, rounded)

#### Batch Info Section (UI Only - Not Printed)
- **Background**: #f9fafb
- **Padding**: 12px 16px
- **Border Bottom**: 1px solid #e5e7eb
- **Text**: 
  - "SELECTED EMPLOYEES" (0.65rem, uppercase, gray)
  - Batch period (0.8rem, regular)
  - Count badge (green, 0.7rem)
  - Dropdown icon

#### Payslip Card
- **Width**: 380px (centered)
- **Background**: White
- **Border**: 1px solid #e5e7eb
- **Border Radius**: 12px
- **Box Shadow**: 0 2px 8px rgba(0,0,0,0.08)
- **Padding**: 24px

#### Page Indicators (UI Only)
- **Position**: Below payslip card
- **Dots**: 8px diameter
- **Active**: Green (#10b981)
- **Inactive**: Gray (#d1d5db)
- **Gap**: 8px

#### Bottom Controls (UI Only - Not Printed)
- **Height**: 70px
- **Background**: White
- **Border Top**: 1px solid #e5e7eb
- **Icons**: Gray (#6b7280)
- **Floating Print Button**: 56px diameter, green, center

---

## 2. Individual Payslip View

### Layout Structure

```
┌─────────────────────────────────────────┐
│  ← View Payslip                    🖨️  │ Header
├─────────────────────────────────────────┤
│                                         │
│  [LOGO]  LENDING INVESTOR CORPORATION   │
│          Kagayday mo sa Pag-unlad       │
│          843 Puno 6, Brgy. Bagong...    │
│          Email: melann.lic2019@...      │
│                                         │
│              PAYSLIP                    │
│                                         │
│  Period Covered:  January 1-15, 2026    │
│                                         │
│  NAME                    ROSAL, ALDIE   │
│  POSITION                CI/Collector   │
│                                         │
│  DESCRIPTION          AMOUNT (PHP)      │
│  ─────────────────────────────────────  │
│  Basic Pay                   6,780.00   │
│  No. of Worked Days             15.0    │
│  Rate per day based on 15 days          │
│  No. of Holidays                 0.0    │
│  Special Allowance                 -    │
│  Regular Allowance             500.00   │
│  TOTAL GROSS PAY             7,280.00   │
│                                         │
│  DEDUCTIONS              AMOUNT         │
│  ─────────────────────────────────────  │
│  Cash Advance                      -    │
│  Cash Fund                     300.00   │
│  Philhealth                    281.25   │
│  PAG-IBIG                      200.00   │
│  Emergency Loan                800.00   │
│  TOTAL DEDUCTIONS            1,581.25   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ TAKE HOME PAY                     │  │
│  │ NET PAY      PHP 5,698.75         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ____________         ____________      │
│  PREPARED BY          RECEIVED BY/DATE  │
│                                         │
│  OFFICIAL DOCUMENT GENERATED VIA        │
│  MELANN PORTAL                          │
│                                         │
│  ⓘ Optimized for Standard A4/Letter... │
│                                         │
│  [📥 Download PDF]                      │
└─────────────────────────────────────────┘
```

### Design Specifications

#### Page Container
- **Max Width**: 420px
- **Background**: White
- **Padding**: 24px
- **Margin**: Auto (centered)

#### Company Header
- **Logo**: 60×60px, rounded square, green background
- **Company Name**: 1rem, bold, uppercase
- **Tagline**: 0.7rem, italic, red color
- **Address**: 0.65rem, gray
- **Email**: 0.65rem, gray

#### Payslip Title
- **Text**: "PAYSLIP"
- **Font Size**: 1.25rem
- **Font Weight**: 800
- **Letter Spacing**: 0.15em
- **Margin**: 20px 0
- **Border Top**: 1px solid #e5e7eb
- **Border Bottom**: 1px solid #e5e7eb
- **Padding**: 12px 0

#### Period & Employee Info
- **Period Label**: 0.7rem, bold
- **Period Value**: 0.8rem, regular
- **Name/Position**: Two-column layout
- **Labels**: 0.65rem, uppercase, gray
- **Values**: 0.8rem, bold, right-aligned

#### Earnings Table
- **Header**: "DESCRIPTION" | "AMOUNT (PHP)"
- **Header Style**: 0.65rem, uppercase, bold, gray
- **Divider**: 1px solid #e5e7eb
- **Row Height**: 32px
- **Label**: 0.7rem, left-aligned
- **Amount**: 0.8rem, right-aligned, monospace
- **Total Row**: 
  - Background: #f9fafb
  - Font Weight: 700
  - Border Top: 2px solid #e5e7eb

#### Deductions Section
- **Header**: "DEDUCTIONS" (red color #dc2626)
- **Same table structure as earnings**
- **Total Row**: 
  - Background: #fef2f2
  - Font Weight: 700
  - Color: #dc2626

#### Net Pay Box
- **Border**: 2px solid #10b981
- **Border Radius**: 8px
- **Padding**: 16px
- **Background**: #f0fdf4
- **Label**: "TAKE HOME PAY" (0.65rem, uppercase)
- **Sublabel**: "NET PAY" (0.8rem, bold)
- **Amount**: 1.5rem, bold, #10b981

#### Signature Section
- **Two columns**: Prepared By | Received By/Date
- **Line**: 1px solid #d1d5db
- **Line Width**: 120px
- **Label**: 0.65rem, uppercase, gray
- **Margin Top**: 24px

#### Footer
- **Text**: "OFFICIAL DOCUMENT GENERATED VIA MELANN PORTAL"
- **Font Size**: 0.6rem
- **Color**: #9ca3af
- **Text Align**: Center
- **Margin**: 20px 0

#### Download Button
- **Width**: 100%
- **Height**: 44px
- **Background**: #10b981
- **Color**: White
- **Border Radius**: 8px
- **Font Size**: 0.8rem
- **Font Weight**: 600
- **Icon**: Download icon (16px)

---

## 3. Color Palette

### Primary Colors
- **Green**: #10b981 (buttons, highlights)
- **Red**: #dc2626 (deductions, warnings)
- **Blue**: #3b82f6 (links, info)

### Neutral Colors
- **Gray 50**: #f9fafb (backgrounds)
- **Gray 100**: #f3f4f6 (subtle backgrounds)
- **Gray 200**: #e5e7eb (borders)
- **Gray 400**: #9ca3af (muted text)
- **Gray 500**: #6b7280 (secondary text)
- **Gray 700**: #374151 (primary text)
- **Gray 900**: #111827 (headings)

### Status Colors
- **Success**: #10b981
- **Warning**: #f59e0b
- **Error**: #dc2626
- **Info**: #3b82f6

---

## 4. Typography Scale

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Page Title | 1.25rem | 800 | "PAYSLIP" |
| Section Header | 1rem | 700 | Company name |
| Subsection | 0.9rem | 600 | Period covered |
| Body Text | 0.8rem | 400 | Amounts, labels |
| Small Text | 0.7rem | 400 | Descriptions |
| Tiny Text | 0.65rem | 400 | Hints, metadata |
| Net Pay | 1.5rem | 700 | Take home pay |

---

## 5. Spacing System

| Size | Value | Usage |
|------|-------|-------|
| xs | 4px | Minimal gaps |
| sm | 8px | Tight spacing |
| md | 12px | Standard gaps |
| lg | 16px | Section spacing |
| xl | 20px | Large spacing |
| 2xl | 24px | Major sections |

---

## 6. Print Specifications

### Page Setup
- **Paper**: A4 (210mm × 297mm) or Letter (8.5" × 11")
- **Orientation**: Portrait
- **Margins**: 15mm all sides
- **DPI**: 300 minimum

### Print Behavior
- **One employee = One page**
- **No page breaks within payslip**
- **No UI elements** (buttons, icons, indicators)
- **Monochrome safe** (readable in black & white)
- **Font minimum**: 10px (for printing)

### PDF Export
- **Format**: PDF/A (archival)
- **Compression**: Medium
- **Embedded Fonts**: Yes
- **Metadata**: Include (employee name, period, date)

---

## 7. Responsive Behavior

### Desktop (1366×768)
- **Payslip Width**: 420px (centered)
- **Scrollable**: Yes (if needed)
- **Sidebar**: Visible

### Tablet (768px)
- **Payslip Width**: 100% (max 500px)
- **Padding**: 16px

### Mobile (375px)
- **Payslip Width**: 100%
- **Padding**: 12px
- **Font sizes**: Slightly reduced

---

## 8. Accessibility

### WCAG Compliance
- **Minimum font size**: 10px (0.625rem)
- **Color contrast**: 4.5:1 minimum
- **Touch targets**: 44px minimum
- **Keyboard navigation**: Full support

### Screen Readers
- **Semantic HTML**: Proper heading hierarchy
- **ARIA labels**: For icons and buttons
- **Alt text**: For logo and images

---

## 9. Implementation Notes

### React Components Structure
```
PayslipView/
├── PayslipHeader.tsx (Company info)
├── PayslipTitle.tsx (PAYSLIP heading)
├── EmployeeInfo.tsx (Period, name, position)
├── EarningsTable.tsx (Earnings section)
├── DeductionsTable.tsx (Deductions - cutoff dependent)
├── NetPayBox.tsx (Take home pay)
├── SignatureSection.tsx (Prepared/Received)
└── PayslipFooter.tsx (Official document text)
```

### State Management
```typescript
interface PayslipData {
    employee: Employee;
    payrollRun: PayrollRun;
    earnings: {
        basicPay: number;
        payrollDays: number;
        holidays: number;
        regularAllowance: number;
        specialAllowance: number;
        grossPay: number;
    };
    deductions: {
        // Dynamic based on cutoff
        [key: string]: number;
    };
    netPay: number;
}
```

### CSS Modules
- Use CSS Modules for component-specific styles
- Global styles for print media queries
- Separate print.css for print-only styles

---

## 10. Testing Checklist

- [ ] Payslip renders correctly on screen
- [ ] Print preview matches screen layout
- [ ] PDF export matches screen layout
- [ ] One page per employee in batch print
- [ ] No UI elements in print/PDF
- [ ] Deductions change based on cutoff
- [ ] Amounts align properly
- [ ] Long names wrap correctly
- [ ] Prints correctly on A4 paper
- [ ] Prints correctly on Letter paper
- [ ] Readable in monochrome
- [ ] All fonts embedded in PDF
- [ ] Responsive on mobile
- [ ] Accessible via keyboard
- [ ] Screen reader compatible
