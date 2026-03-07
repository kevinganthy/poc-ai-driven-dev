import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const JWT_SECRET = process.env.JWT_SECRET as string;

function makeToken(role: 'user' | 'admin', id = `${role}-1`) {
  return jwt.sign({ id, email: `${role}@test.com`, role }, JWT_SECRET, { expiresIn: '1h' });
}

const mockFindMany = prisma.ticket.findMany as jest.Mock;
const mockFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockCreate = prisma.ticket.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Check 3 ──────────────────────────────────────────────────────────────────
describe('GET /tickets — authentication guard', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/tickets');
    expect(res.status).toBe(401);
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it('returns 401 when token is malformed', async () => {
    const res = await request(app)
      .get('/tickets')
      .set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });
});

// ── Check 4 ──────────────────────────────────────────────────────────────────
describe('PUT /tickets/:id — status change RBAC', () => {
  it("returns 403 when a 'user' tries to change the ticket status", async () => {
    const res = await request(app)
      .put('/tickets/ticket-id-1')
      .set('Authorization', `Bearer ${makeToken('user')}`)
      .send({ status: 'in-progress' });

    expect(res.status).toBe(403);
    // DB must not be touched — service throws before querying
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it("allows an 'admin' to change the ticket status", async () => {
    mockFindUnique.mockResolvedValue({ id: 'ticket-id-1', authorId: 'some-user', status: 'open' });
    (prisma.ticket.update as jest.Mock).mockResolvedValue({
      id: 'ticket-id-1',
      title: 'Fix bug',
      description: 'Needs a fix here',
      status: 'in_progress',
      authorId: 'some-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .put('/tickets/ticket-id-1')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'in-progress' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'in-progress');
  });
});

// ── Check 5 ──────────────────────────────────────────────────────────────────
describe('GET /tickets — data-level filtering', () => {
  it("'user' role receives only their own tickets", async () => {
    const userId = 'user-1';
    const ownTicket = {
      id: 't1',
      title: 'My ticket',
      description: 'Something I need',
      status: 'open',
      authorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindMany.mockResolvedValue([ownTicket]);

    const res = await request(app)
      .get('/tickets')
      .set('Authorization', `Bearer ${makeToken('user', userId)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);

    // Verify the service applied the authorId filter
    const callArg = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArg.where).toHaveProperty('authorId', userId);
  });

  // ── Check 6 ────────────────────────────────────────────────────────────────
  it("'admin' role receives all tickets without an authorId filter", async () => {
    mockFindMany.mockResolvedValue([
      { id: 't1', title: 'T1', description: 'Desc', status: 'open', authorId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 't2', title: 'T2', description: 'Desc', status: 'in_progress', authorId: 'user-2', createdAt: new Date(), updatedAt: new Date() },
    ]);

    const res = await request(app)
      .get('/tickets')
      .set('Authorization', `Bearer ${makeToken('admin', 'admin-1')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const callArg = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArg.where).not.toHaveProperty('authorId');
  });
});

// ── Check 7 ──────────────────────────────────────────────────────────────────
describe("DELETE /tickets/:id — ownership check", () => {
  it("returns 403 when a user tries to delete another user's ticket", async () => {
    mockFindUnique.mockResolvedValue({ id: 'ticket-id-2', authorId: 'user-2' });

    const res = await request(app)
      .delete('/tickets/ticket-id-2')
      .set('Authorization', `Bearer ${makeToken('user', 'user-1')}`);

    expect(res.status).toBe(403);
    expect(prisma.ticket.delete).not.toHaveBeenCalled();
  });

  it('returns 204 when a user deletes their own ticket', async () => {
    const userId = 'user-1';
    mockFindUnique.mockResolvedValue({ id: 'ticket-id-1', authorId: userId });
    (prisma.ticket.delete as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .delete('/tickets/ticket-id-1')
      .set('Authorization', `Bearer ${makeToken('user', userId)}`);

    expect(res.status).toBe(204);
  });
});

// ── POST /tickets ─────────────────────────────────────────────────────────────
describe('POST /tickets', () => {
  it("creates a ticket with status 'open' regardless of provided status", async () => {
    const userId = 'user-1';
    mockCreate.mockResolvedValue({
      id: 'new-ticket',
      title: 'Login page broken',
      description: 'The login page shows 500 error on submit',
      status: 'open',
      authorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${makeToken('user', userId)}`)
      .send({ title: 'Login page broken', description: 'The login page shows 500 error on submit' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('status', 'open');
    expect(res.body).toHaveProperty('authorId', userId);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${makeToken('user')}`)
      .send({ description: 'No title provided here either' });

    expect(res.status).toBe(400);
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });
});

// ── GET /tickets/:id ──────────────────────────────────────────────────────────
describe('GET /tickets/:id', () => {
  it('returns 200 with the ticket for the owner', async () => {
    const userId = 'user-1';
    mockFindUnique.mockResolvedValue({
      id: 'ticket-id-1',
      title: 'My ticket',
      description: 'Something important',
      status: 'open',
      authorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .get('/tickets/ticket-id-1')
      .set('Authorization', `Bearer ${makeToken('user', userId)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'ticket-id-1');
    expect(res.body).toHaveProperty('status', 'open');
  });

  it("returns 403 when a user accesses another user's ticket", async () => {
    mockFindUnique.mockResolvedValue({
      id: 'ticket-id-1',
      title: 'Other ticket',
      description: 'Belongs to someone else',
      status: 'open',
      authorId: 'user-2',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .get('/tickets/ticket-id-1')
      .set('Authorization', `Bearer ${makeToken('user', 'user-1')}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 for admin accessing any ticket', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'ticket-id-1',
      title: 'Any ticket',
      description: 'Belongs to a user',
      status: 'in_progress',
      authorId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .get('/tickets/ticket-id-1')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'in-progress'); // mapped from in_progress
  });

  it('returns 404 when ticket does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/tickets/non-existent')
      .set('Authorization', `Bearer ${makeToken('user', 'user-1')}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/tickets/ticket-id-1');
    expect(res.status).toBe(401);
  });
});

// ── GET /tickets?status= — filter ────────────────────────────────────────────
describe('GET /tickets — status query filter', () => {
  it('applies the status filter when ?status=in-progress is provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await request(app)
      .get('/tickets?status=in-progress')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    const callArg = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArg.where).toHaveProperty('status', 'in_progress'); // converted to Prisma enum
  });

  it('applies the status filter when ?status=open is provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await request(app)
      .get('/tickets?status=open')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    const callArg = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArg.where).toHaveProperty('status', 'open');
  });

  it('does not apply a status filter when no query param is provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await request(app)
      .get('/tickets')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    const callArg = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArg.where).not.toHaveProperty('status');
  });
});
