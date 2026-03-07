// Sets env vars before any module (including config/env.ts) is loaded
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_purposes_only';
process.env.PORT = '0';
