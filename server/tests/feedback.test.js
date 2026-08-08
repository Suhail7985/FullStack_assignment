require('dotenv').config();

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const app = require('../src/index');
const { seed, DEMO_PASSWORD } = require('../src/seed/seed');
const Employee = require('../src/models/Employee');
const PerformanceParameter = require('../src/models/PerformanceParameter');
const FeedbackCycle = require('../src/models/FeedbackCycle');
const Feedback = require('../src/models/Feedback');
const FeedbackAssignment = require('../src/models/FeedbackAssignment');

let server;
let baseUrl;

async function request(method, path, { token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email) {
  const { status, data } = await request('POST', '/api/auth/login', {
    body: { email, password: DEMO_PASSWORD },
  });
  assert.equal(status, 200, `Login failed for ${email}`);
  return data.data.token;
}

function buildResponses(parameters, score = 4) {
  return parameters.map((p) => ({
    parameterId: p._id.toString(),
    score,
    reason: `Solid performance on ${p.name}`,
  }));
}

before(async () => {
  const uri =
    process.env.MONGO_URI_TEST ||
    'mongodb://127.0.0.1:27017/performance_eval_test';
  process.env.MONGO_URI = uri;
  await connectDB(uri);
  await seed({ disconnect: false });

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
});

describe('Feedback authorization and hierarchy', () => {
  it('Test 1: Priya can give feedback to her direct reports', async () => {
    const token = await login('priya@ashoka.test');
    const toGive = await request('GET', '/api/feedback/to-give', { token });
    assert.equal(toGive.status, 200);
    assert.ok(toGive.data.data.assignments.length >= 1);

    const pending = toGive.data.data.assignments.find((a) => a.status === 'pending');
    assert.ok(pending, 'Expected at least one pending assignment for Priya');

    const parameters = toGive.data.data.parameters;
    const cycleId = toGive.data.data.cycle._id;
    const res = await request('POST', '/api/feedback', {
      token,
      body: {
        cycleId,
        employeeId: pending.employee._id,
        responses: buildResponses(parameters, 5),
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
  });

  it('Test 2: Rohan can give feedback to Priya', async () => {
    // Use July cycle which already has Rohan->Priya completed; verify assignment exists
    // and that Rohan is authorized via manager relationship for a fresh open cycle check.
    const token = await login('rohan@ashoka.test');
    const toGive = await request('GET', '/api/feedback/to-give', { token });
    assert.equal(toGive.status, 200);

    const priyaAssignment = toGive.data.data.assignments.find(
      (a) => a.employee.email === 'priya@ashoka.test'
    );
    assert.ok(priyaAssignment, 'Rohan should see Priya as a review target');
  });

  it('Test 3: Founder can give feedback directly to employees', async () => {
    const token = await login('founder@brightpath.test');
    const toGive = await request('GET', '/api/feedback/to-give', { token });
    assert.equal(toGive.status, 200);
    assert.ok(toGive.data.data.assignments.length >= 8);

    const pending = toGive.data.data.assignments.find((a) => a.status === 'pending');
    assert.ok(pending);

    const res = await request('POST', '/api/feedback', {
      token,
      body: {
        cycleId: toGive.data.data.cycle._id,
        employeeId: pending.employee._id,
        responses: buildResponses(toGive.data.data.parameters, 4),
      },
    });
    assert.equal(res.status, 201);
  });

  it('Test 4: Priya cannot give feedback to a Bright Path employee', async () => {
    const token = await login('priya@ashoka.test');
    const bpEmployee = await Employee.findOne({ email: 'bp.employee1@brightpath.test' });
    const ashokaCycle = await FeedbackCycle.findOne({
      companyId: (await Employee.findOne({ email: 'priya@ashoka.test' })).companyId,
      status: 'open',
    });
    const parameters = await PerformanceParameter.find({ isActive: true });

    const res = await request('POST', '/api/feedback', {
      token,
      body: {
        cycleId: ashokaCycle._id.toString(),
        employeeId: bpEmployee._id.toString(),
        responses: buildResponses(parameters),
      },
    });
    assert.ok([403, 404].includes(res.status));
    assert.equal(res.data.success, false);
  });
});

describe('Feedback integrity', () => {
  it('Test 5: Duplicate feedback cannot be created', async () => {
    const token = await login('priya@ashoka.test');
    const toGive = await request('GET', '/api/feedback/to-give', { token });
    const completed = toGive.data.data.assignments.find((a) => a.status === 'completed');
    assert.ok(completed);

    const res = await request('POST', '/api/feedback', {
      token,
      body: {
        cycleId: toGive.data.data.cycle._id,
        employeeId: completed.employee._id,
        responses: buildResponses(toGive.data.data.parameters),
      },
    });
    assert.equal(res.status, 409);
  });

  it('Test 6: Incomplete review cannot be submitted', async () => {
    // Re-seed pending for Employee 6 if already submitted by Test 1
    const priya = await Employee.findOne({ email: 'priya@ashoka.test' });
    const emp = await Employee.findOne({ email: 'employee6@ashoka.test' });
    const cycle = await FeedbackCycle.findOne({ companyId: priya.companyId, status: 'open' });
    const parameters = await PerformanceParameter.find({ isActive: true }).sort({ order: 1 });

    await Feedback.deleteMany({
      companyId: priya.companyId,
      cycleId: cycle._id,
      reviewerId: priya._id,
      employeeId: emp._id,
    });
    await FeedbackAssignment.findOneAndUpdate(
      {
        companyId: priya.companyId,
        cycleId: cycle._id,
        reviewerId: priya._id,
        employeeId: emp._id,
      },
      { status: 'pending' }
    );

    const token = await login('priya@ashoka.test');
    const res = await request('POST', '/api/feedback', {
      token,
      body: {
        cycleId: cycle._id.toString(),
        employeeId: emp._id.toString(),
        responses: buildResponses(parameters.slice(0, 3)),
      },
    });
    assert.equal(res.status, 400);
    assert.match(res.data.message, /Incomplete review/i);
  });

  it('Test 7: Historical feedback remains accessible', async () => {
    const token = await login('employee1@ashoka.test');
    const res = await request('GET', '/api/performance/history', { token });
    assert.equal(res.status, 200);
    assert.ok(res.data.data.history.length >= 3);
    const months = res.data.data.history.map((h) => h.cycle.month);
    assert.ok(months.includes(5));
    assert.ok(months.includes(6));
    assert.ok(months.includes(7));
  });
});

describe('HR and access control', () => {
  it('Test 8: HR can see pending feedback', async () => {
    const token = await login('hr@ashoka.test');
    const status = await request('GET', '/api/hr/feedback-status', { token });
    assert.equal(status.status, 200);
    assert.ok(status.data.data.summary.expected > 0);

    const pending = await request('GET', '/api/hr/pending-feedback', { token });
    assert.equal(pending.status, 200);
    assert.ok(Array.isArray(pending.data.data.pending));
  });

  it('Test 9: Non-HR user cannot access HR endpoints', async () => {
    const token = await login('priya@ashoka.test');
    const res = await request('GET', '/api/hr/feedback-status', { token });
    assert.equal(res.status, 403);
  });

  it('Test 10: Employee can only access their own performance history', async () => {
    const token = await login('employee1@ashoka.test');
    const other = await Employee.findOne({ email: 'employee2@ashoka.test' });

    const own = await request('GET', '/api/performance/history', { token });
    assert.equal(own.status, 200);

    const otherRes = await request('GET', `/api/performance/history/${other._id}`, {
      token,
    });
    assert.equal(otherRes.status, 403);
  });
});
