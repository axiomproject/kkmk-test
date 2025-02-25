CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create initial admin user (password: admin123)
INSERT INTO admin_users (name, email, password, role) 
VALUES (
    'Admin User', 
    'admin@kkmk.com',
    '$2a$10$K.RUkGF4G8YCdqHGwzw3G.xyJLcZL8LnkrOYE8kJ1QBHgE65Bjyby',
    'admin'
) ON CONFLICT (email) DO NOTHING;
