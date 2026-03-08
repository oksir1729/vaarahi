CREATE TABLE IF NOT EXISTS sales_data (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(100),
    bill_date DATE,
    bill_time TIME,
    item_desc TEXT,
    section_type VARCHAR(255), -- Category
    department VARCHAR(255), -- Sub Category
    cat2 VARCHAR(255),
    cat3 VARCHAR(255),
    cat4 VARCHAR(255),
    cat5 VARCHAR(255),
    cat6 VARCHAR(255),
    sm_code VARCHAR(100),
    sm_name VARCHAR(255),
    bill_quantity NUMERIC(10, 2),
    net_amount NUMERIC(15, 2),
    site VARCHAR(255),
    cp NUMERIC(15, 2),
    basic_amount NUMERIC(15, 2),
    tax_amt NUMERIC(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bill_date ON sales_data (bill_date);

CREATE INDEX IF NOT EXISTS idx_section_type ON sales_data (section_type);


CREATE INDEX IF NOT EXISTS idx_department ON sales_data (department);
