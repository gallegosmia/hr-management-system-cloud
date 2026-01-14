-- HR Management System Schema
-- Optimized for PostgreSQL (Supabase/Neon)

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    employee_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active INTEGER DEFAULT 1
);

-- 2. Employees table (The main 201 file)
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    department VARCHAR(100),
    position VARCHAR(100),
    branch VARCHAR(100),
    employment_status VARCHAR(50),
    date_hired DATE,
    date_of_birth DATE,
    date_separated DATE,
    contact_number VARCHAR(50),
    email_address VARCHAR(100),
    address TEXT,
    sss_number VARCHAR(50),
    philhealth_number VARCHAR(50),
    pagibig_number VARCHAR(50),
    tin VARCHAR(50),
    civil_status VARCHAR(50),
    salary_info JSONB, -- Stores complex salary info object
    personal_info_complete INTEGER DEFAULT 0,
    preemployment_req_complete INTEGER DEFAULT 0,
    government_docs_complete INTEGER DEFAULT 0,
    employment_records_complete INTEGER DEFAULT 0,
    attendance_records_complete INTEGER DEFAULT 0,
    payroll_records_complete INTEGER DEFAULT 0,
    disciplinary_records INTEGER DEFAULT 0,
    training_records INTEGER DEFAULT 0,
    separation_records INTEGER DEFAULT 0,
    file_completion_status VARCHAR(20) DEFAULT 'Incomplete',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    training_details TEXT,
    disciplinary_details TEXT,
    profile_picture VARCHAR(255),
    created_by INTEGER REFERENCES users(id)
);

-- 3. Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    category VARCHAR(100),
    document_name VARCHAR(255),
    file_path TEXT,
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_in TIME,
    time_out TIME,
    status VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- 5. Leave Requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(4,1),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    approvals JSONB DEFAULT '[]',
    current_approval_level INTEGER DEFAULT 1,
    remarks TEXT,
    rejected_by VARCHAR(100),
    branch_manager_approved_at TIMESTAMP WITH TIME ZONE,
    branch_manager_approved_by INTEGER,
    branch_manager_remarks TEXT,
    evp_approved_at TIMESTAMP WITH TIME ZONE,
    evp_approved_by INTEGER,
    evp_remarks TEXT,
    final_approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payroll Runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
    id SERIAL PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    manager_approved_by INTEGER REFERENCES users(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    evp_approved_by INTEGER REFERENCES users(id),
    evp_approved_at TIMESTAMP WITH TIME ZONE
);

-- 7. Payslips table
CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    payroll_run_id INTEGER REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id),
    gross_pay DECIMAL(15,2),
    net_pay DECIMAL(15,2),
    total_deductions DECIMAL(15,2),
    total_allowances DECIMAL(15,2),
    days_present DECIMAL(4,1),
    double_pay_days DECIMAL(4,1),
    double_pay_amount DECIMAL(15,2),
    deduction_details JSONB,
    allowance_details JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Education table
CREATE TABLE IF NOT EXISTS education (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    level VARCHAR(100),
    school_name VARCHAR(255),
    degree_course VARCHAR(255),
    year_graduated VARCHAR(50),
    honors_awards TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Sessions table (for serverless persistence)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Admin (Password: admin123)
-- Note: You should hash the password using bcrypt before inserting in production
-- This is just for schema reference
-- INSERT INTO users (username, password, role) VALUES ('admin', '$2a$10$w8.B0uWCHf8n9XfX8U.6be8qE0V9A9U8Y/I6p0q/k6p0q/k6p0q', 'Admin');
