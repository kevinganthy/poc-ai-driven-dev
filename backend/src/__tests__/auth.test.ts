import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /auth/register', () => {
  it('returns 201 and the user without a password field', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'user-abc',
      email: 'alice@example.com',
      role: 'user',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'SecurePass1!' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', 'alice@example.com');
    expect(res.body).not.toHaveProperty('password');
  });

  it('returns 400 for an invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'SecurePass1!' });

    expect(res.status).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already registered', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'SecurePass1!' });

    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('returns 200 with a JWT token', async () => {
    const hash = await bcrypt.hash('SecurePass1!', 1);
    mockFindUnique.mockResolvedValue({
      id: 'user-abc',
      email: 'alice@example.com',
      role: 'user',
      password: hash,
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'SecurePass1!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.')).toHaveLength(3); // valid JWT structure
  });

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('CorrectPass1!', 1);
    mockFindUnique.mockResolvedValue({
      id: 'user-abc',
      email: 'alice@example.com',
      role: 'user',
      password: hash,
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'WrongPass99!' });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  it('returns 401 for unknown email', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'SomePass1!' });

    expect(res.status).toBe(401);
  });
});
