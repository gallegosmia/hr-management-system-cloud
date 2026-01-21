export const mockEmployees = [
    {
        "id": 1,
        "employee_id": "2018-0001",
        "last_name": "ARRADAZA",
        "first_name": "JOSEPHINE",
        "department": "Operations",
        "position": "CASHIER",
        "branch": "Ormoc Branch",
        "employment_status": "Regular",
        "salary_info": {
            "basic_salary": 13710,
            "daily_rate": 457,
            "allowances": {
                "special": 1500
            },
            "deductions": {
                "sss_contribution": 725,
                "philhealth_contribution": 285,
                "pagibig_contribution": 200,
                "company_cash_fund": 300,
                "company_loan": { "balance": 0, "amortization": 0 },
                "sss_loan": { "balance": 20000, "amortization": 1292.06 },
                "pagibig_loan": { "balance": 20000, "amortization": 1783.16 }
            }
        }
    },
    {
        "id": 2,
        "employee_id": "2022-0001",
        "last_name": "BAÑEZ",
        "first_name": "BERNARDITO",
        "department": "Operations",
        "position": "SUPERVISOR",
        "branch": "Ormoc Branch",
        "employment_status": "Regular",
        "salary_info": {
            "basic_salary": 13560,
            "daily_rate": 452,
            "allowances": {
                "special": 1800
            },
            "deductions": {
                "sss_contribution": 700,
                "philhealth_contribution": 281.25,
                "pagibig_contribution": 200,
                "company_cash_fund": 300,
                "company_loan": { "balance": 0, "amortization": 0 },
                "sss_loan": { "balance": 0, "amortization": 0 },
                "pagibig_loan": { "balance": 0, "amortization": 0 }
            }
        }
    },
    {
        "id": 6,
        "employee_id": "2022-0002",
        "last_name": "CABALLES",
        "first_name": "EDDIE JR.",
        "department": "Operations",
        "position": "CI/COLLECTOR",
        "branch": "Ormoc Branch",
        "employment_status": "Regular",
        "salary_info": {
            "basic_salary": 13560,
            "daily_rate": 452,
            "allowances": { "special": 1000 },
            "deductions": {
                "sss_contribution": 675,
                "philhealth_contribution": 281.25,
                "pagibig_contribution": 200,
                "company_cash_fund": 300,
                "company_loan": { "balance": 17386, "amortization": 2000 },
                "sss_loan": { "balance": 0, "amortization": 1199.77 },
                "pagibig_loan": { "balance": 0, "amortization": 1773.3 }
            }
        }
    }
];

export const mockUsers = [
    {
        "id": 1,
        "username": "admin",
        "role": "Admin",
        "is_active": 1
    },
    {
        "id": 10,
        "username": "Mel",
        "role": "HR",
        "is_active": 1
    }
];
