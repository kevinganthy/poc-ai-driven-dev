import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const JWT_SECRET = process.env.JWT_SECRET as string;

function makeToken(role: 'user' | 'admin', id = `${role}-1`) {
  return jwt.sign({ id, email: `${role}@test.com`, role }, JWT_SECRET, { expiresIn: '1h' });
}

const mockFindMany = prisma.category.findMany as jest.Mock;
const mockCreate = prisma.category.create as jest.Mock;
const mockUpdate = prisma.category.update as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /categories ─────────────────────────────────────────────────────────
describe('GET /categories — public endpoint', () => {
  it('returns 200 with active categories without token', async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, name: 'Bug' },
      { id: 2, name: 'Feature' },
    ]);

    const res = await request(app).get('/categories');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty('name', 'Bug');
  });
});

// ── GET /categories/all ─────────────────────────────────────────────────────
describe('GET /categories/all — admin only', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/categories/all');
    expect(res.status).toBe(401);
    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });

  it('returns 403 for user role', async () => {
    const res = await request(app)
      .get('/categories/all')
      .set('Authorization', `Bearer ${makeToken('user')}`);
    expect(res.status).toBe(403);
    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });

  it('returns 200 with all categories including deleted for admin', async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, name: 'Bug', deletedAt: null },
      { id: 2, name: 'Old', deletedAt: '2026-03-01T00:00:00.000Z' },
    ]);

    const res = await request(app)
      .get('/categories/all')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[1]).toHaveProperty('deletedAt');
  });
});

// ── POST /categories ─────────────────────────────────────────────────────────
describe('POST /categories — admin only', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/categories').send({ name: 'Infra' });
    expect(res.status).toBe(401);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('returns 403 for user role', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${makeToken('user')}`)
      .send({ name: 'Infra' });
    expect(res.status).toBe(403);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('returns 400 when name is empty', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('returns 201 with created category for admin', async () => {
    mockCreate.mockResolvedValue({ id: 8, name: 'Infra' });

    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Infra' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 8, name: 'Infra' });
  });

  it('returns 409 when category name already exists', async () => {
    const { Prisma } = jest.requireActual('@prisma/client') as typeof import('@prisma/client');
    const duplicateError = Object.assign(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      }),
      {}
    );
    mockCreate.mockRejectedValue(duplicateError);

    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Bug' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'Category name already exists');
  });
});

// ── PUT /categories/:id ──────────────────────────────────────────────────────
describe('PUT /categories/:id — admin only', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).put('/categories/1').send({ name: 'Renamed' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for user role', async () => {
    const res = await request(app)
      .put('/categories/1')
      .set('Authorization', `Bearer ${makeToken('user')}`)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(403);
  });

  it('returns 200 with updated category for admin', async () => {
    mockUpdate.mockResolvedValue({ id: 1, name: 'Renamed' });

    const res = await request(app)
      .put('/categories/1')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Renamed' });
  });

  it('returns 404 when category does not exist', async () => {
    const { Prisma } = jest.requireActual('@prisma/client') as typeof import('@prisma/client');
    const notFoundError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });
    mockUpdate.mockRejectedValue(notFoundError);

    const res = await request(app)
      .put('/categories/999')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'X' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Category not found');
  });

  it('returns 409 when name conflicts with existing category', async () => {
    const { Prisma } = jest.requireActual('@prisma/client') as typeof import('@prisma/client');
    const duplicateError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    mockUpdate.mockRejectedValue(duplicateError);

    const res = await request(app)
      .put('/categories/1')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Bug' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'Category name already exists');
  });

  it('returns 400 when id is not a number', async () => {
    const res = await request(app)
      .put('/categories/abc')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'X' });

    expect(res.status).toBe(400);
  });
});

// ── DELETE /categories/:id ───────────────────────────────────────────────────
describe('DELETE /categories/:id — admin only', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).delete('/categories/1');
    expect(res.status).toBe(401);
  });

  it('returns 403 for user role', async () => {
    const res = await request(app)
      .delete('/categories/1')
      .set('Authorization', `Bearer ${makeToken('user')}`);
    expect(res.status).toBe(403);
  });

  it('returns 204 on successful soft delete', async () => {
    mockUpdate.mockResolvedValue({ id: 1, name: 'Bug', deletedAt: new Date() });

    const res = await request(app)
      .delete('/categories/1')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when category does not exist', async () => {
    const { Prisma } = jest.requireActual('@prisma/client') as typeof import('@prisma/client');
    const notFoundError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });
    mockUpdate.mockRejectedValue(notFoundError);

    const res = await request(app)
      .delete('/categories/999')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });
});

// ── POST /categories/:id/restore ────────────────────────────────────────────
describe('POST /categories/:id/restore — admin only', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/categories/1/restore');
    expect(res.status).toBe(401);
  });

  it('returns 403 for user role', async () => {
    const res = await request(app)
      .post('/categories/1/restore')
      .set('Authorization', `Bearer ${makeToken('user')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with restored category for admin', async () => {
    mockUpdate.mockResolvedValue({ id: 1, name: 'Bug' });

    const res = await request(app)
      .post('/categories/1/restore')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Bug' });
  });

  it('returns 404 when category does not exist', async () => {
    const { Prisma } = jest.requireActual('@prisma/client') as typeof import('@prisma/client');
    const notFoundError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });
    mockUpdate.mockRejectedValue(notFoundError);

    const res = await request(app)
      .post('/categories/999/restore')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Category not found');
  });
});
