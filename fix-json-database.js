const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

async function fixJsonDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            console.error('❌ database.json not found');
            return;
        }

        console.log('📖 Reading database.json...');
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

        if (!data.payslips || !Array.isArray(data.payslips)) {
            console.error('❌ No payslips array found in database');
            return;
        }

        console.log(`🔍 Found ${data.payslips.length} payslips. Correcting miscalculations...`);

        let fixedCount = 0;

        data.payslips = data.payslips.map(ps => {
            const basicPay = ps.basic_pay || 0;
            const regularAllowance = ps.regular_allowance || 0;
            const specialAllowance = ps.special_allowance || 0;
            const holidayPay = ps.holiday_pay || 0;
            const otherEarnings = ps.other_earnings || 0;
            const totalDeductions = ps.total_deductions || 0;

            // Correct Formula: Gross Pay = Basic Pay + All Allowances
            const correctGrossPay = basicPay + regularAllowance + specialAllowance + holidayPay + otherEarnings;
            const correctNetPay = correctGrossPay - totalDeductions;

            // If there's a difference or if net/gross was slightly off due to float precision
            if (ps.gross_pay !== correctGrossPay || Math.abs(ps.net_pay - correctNetPay) > 0.001) {
                const oldGross = ps.gross_pay;
                ps.gross_pay = correctGrossPay;
                ps.net_pay = correctNetPay;
                fixedCount++;
                console.log(`✅ Fixed Payslip ID ${ps.id}: Gross ${oldGross} ➔ ${correctGrossPay}`);
            }

            return ps;
        });

        if (fixedCount > 0) {
            console.log(`💾 Saving changes to database.json... (Fixed ${fixedCount} records)`);
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
            console.log('🚀 Successfully fixed all payslips!');
        } else {
            console.log('✨ No miscalculations found in payslips.');
        }

    } catch (error) {
        console.error('❌ Error fixing database:', error);
    }
}

fixJsonDatabase();
