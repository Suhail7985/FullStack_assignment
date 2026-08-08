require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const PerformanceParameter = require('../models/PerformanceParameter');
const FeedbackCycle = require('../models/FeedbackCycle');
const Feedback = require('../models/Feedback');
const FeedbackAssignment = require('../models/FeedbackAssignment');
const { createAssignmentsForCycle } = require('../utils/feedbackHelpers');

const DEMO_PASSWORD = 'Password123!';

const PARAMETERS = [
  {
    name: 'Ownership',
    description: 'Takes responsibility and drives work to completion',
    order: 1,
  },
  {
    name: 'Communication',
    description: 'Communicates clearly with peers and stakeholders',
    order: 2,
  },
  {
    name: 'Quality of Work',
    description: 'Delivers accurate, high-quality output',
    order: 3,
  },
  {
    name: 'Problem Solving',
    description: 'Identifies issues and proposes effective solutions',
    order: 4,
  },
  {
    name: 'Teamwork',
    description: 'Collaborates effectively and supports teammates',
    order: 5,
  },
];

const MONTHS = [
  { month: 5, year: 2026, status: 'closed' },
  { month: 6, year: 2026, status: 'closed' },
  { month: 7, year: 2026, status: 'closed' },
  { month: 8, year: 2026, status: 'open' },
];

function scoreFor(month, base) {
  const bump = month - 5;
  return Math.min(5, Math.max(1, base + bump));
}

async function createEmployee(data, passwordHash) {
  return Employee.create({ ...data, passwordHash });
}

async function submitCompleteReview({
  companyId,
  cycleId,
  reviewerId,
  employeeId,
  parameters,
  scores,
  reasons,
}) {
  const now = new Date();
  const docs = parameters.map((param, idx) => ({
    companyId,
    cycleId,
    reviewerId,
    employeeId,
    parameterId: param._id,
    score: scores[idx],
    reason: reasons[idx],
    submittedAt: now,
  }));
  await Feedback.insertMany(docs);
  await FeedbackAssignment.findOneAndUpdate(
    { companyId, cycleId, reviewerId, employeeId },
    { status: 'completed' }
  );
}

async function seedAshoka(parameters, passwordHash) {
  const company = await Company.create({
    name: 'Ashoka Textiles',
    slug: 'ashoka-textiles',
  });

  const coo = await createEmployee(
    {
      companyId: company._id,
      name: 'COO',
      email: 'coo@ashoka.test',
      role: 'coo',
      managerId: null,
    },
    passwordHash
  );

  const rohan = await createEmployee(
    {
      companyId: company._id,
      name: 'Rohan',
      email: 'rohan@ashoka.test',
      role: 'manager',
      managerId: coo._id,
    },
    passwordHash
  );

  const priya = await createEmployee(
    {
      companyId: company._id,
      name: 'Priya',
      email: 'priya@ashoka.test',
      role: 'manager',
      managerId: rohan._id,
    },
    passwordHash
  );

  const team = [];
  for (let i = 1; i <= 6; i += 1) {
    team.push(
      await createEmployee(
        {
          companyId: company._id,
          name: `Employee ${i}`,
          email: `employee${i}@ashoka.test`,
          role: 'employee',
          managerId: priya._id,
        },
        passwordHash
      )
    );
  }

  const hr = await createEmployee(
    {
      companyId: company._id,
      name: 'Kavita',
      email: 'hr@ashoka.test',
      role: 'hr',
      managerId: null,
    },
    passwordHash
  );

  const cycles = {};
  for (const m of MONTHS) {
    const cycle = await FeedbackCycle.create({
      companyId: company._id,
      month: m.month,
      year: m.year,
      status: m.status,
    });
    await createAssignmentsForCycle(company._id, cycle._id);
    cycles[`${m.year}-${m.month}`] = cycle;
  }

  // Historical + current feedback
  // Rohan -> Priya for all months (complete)
  for (const m of MONTHS) {
    const cycle = cycles[`${m.year}-${m.month}`];
    await submitCompleteReview({
      companyId: company._id,
      cycleId: cycle._id,
      reviewerId: rohan._id,
      employeeId: priya._id,
      parameters,
      scores: [
        scoreFor(m.month, 3),
        scoreFor(m.month, 4),
        scoreFor(m.month, 3),
        scoreFor(m.month, 3),
        scoreFor(m.month, 4),
      ],
      reasons: [
        `Ownership notes for Priya — ${m.month}/${m.year}`,
        `Communication notes for Priya — ${m.month}/${m.year}`,
        `Quality notes for Priya — ${m.month}/${m.year}`,
        `Problem solving notes for Priya — ${m.month}/${m.year}`,
        `Teamwork notes for Priya — ${m.month}/${m.year}`,
      ],
    });
  }

  // Priya -> Employees 1-5 complete for all months; Employee 6 pending for August
  for (const m of MONTHS) {
    const cycle = cycles[`${m.year}-${m.month}`];
    const completeThrough = m.month === 8 ? 5 : 6;

    for (let i = 0; i < completeThrough; i += 1) {
      const emp = team[i];
      const base = 2 + (i % 3);
      await submitCompleteReview({
        companyId: company._id,
        cycleId: cycle._id,
        reviewerId: priya._id,
        employeeId: emp._id,
        parameters,
        scores: [
          scoreFor(m.month, base),
          scoreFor(m.month, base + 1),
          scoreFor(m.month, base),
          scoreFor(m.month, base),
          scoreFor(m.month, base + 1),
        ],
        reasons: [
          `Ownership feedback for ${emp.name} — ${m.month}/${m.year}`,
          `Communication feedback for ${emp.name} — ${m.month}/${m.year}`,
          `Quality feedback for ${emp.name} — ${m.month}/${m.year}`,
          `Problem solving feedback for ${emp.name} — ${m.month}/${m.year}`,
          `Teamwork feedback for ${emp.name} — ${m.month}/${m.year}`,
        ],
      });
    }
  }

  // COO -> Rohan for all months (complete) so August pending highlights Priya -> Employee 6
  for (const m of MONTHS) {
    const cycle = cycles[`${m.year}-${m.month}`];
    await submitCompleteReview({
      companyId: company._id,
      cycleId: cycle._id,
      reviewerId: coo._id,
      employeeId: rohan._id,
      parameters,
      scores: [4, 4, 5, 4, 4],
      reasons: [
        'Strong ownership as a manager',
        'Clear communication with leadership',
        'Consistently high quality delivery',
        'Handles escalations well',
        'Builds collaborative teams',
      ],
    });
  }

  return { company, coo, rohan, priya, team, hr, cycles };
}

async function seedBrightPath(parameters, passwordHash) {
  const company = await Company.create({
    name: 'Bright Path Consulting',
    slug: 'bright-path-consulting',
  });

  const founder = await createEmployee(
    {
      companyId: company._id,
      name: 'Founder',
      email: 'founder@brightpath.test',
      role: 'founder',
      managerId: null,
    },
    passwordHash
  );

  const team = [];
  for (let i = 1; i <= 8; i += 1) {
    team.push(
      await createEmployee(
        {
          companyId: company._id,
          name: `BP Employee ${i}`,
          email: i === 1 ? 'bp.employee1@brightpath.test' : `bp.employee${i}@brightpath.test`,
          role: 'employee',
          managerId: founder._id,
        },
        passwordHash
      )
    );
  }

  const hr = await createEmployee(
    {
      companyId: company._id,
      name: 'Bright Path HR',
      email: 'hr@brightpath.test',
      role: 'hr',
      managerId: null,
    },
    passwordHash
  );

  const cycles = {};
  for (const m of MONTHS) {
    const cycle = await FeedbackCycle.create({
      companyId: company._id,
      month: m.month,
      year: m.year,
      status: m.status,
    });
    await createAssignmentsForCycle(company._id, cycle._id);
    cycles[`${m.year}-${m.month}`] = cycle;
  }

  for (const m of MONTHS) {
    const cycle = cycles[`${m.year}-${m.month}`];
    // Leave employees 7 and 8 pending in August
    const completeThrough = m.month === 8 ? 6 : 8;

    for (let i = 0; i < completeThrough; i += 1) {
      const emp = team[i];
      const base = 2 + (i % 3);
      await submitCompleteReview({
        companyId: company._id,
        cycleId: cycle._id,
        reviewerId: founder._id,
        employeeId: emp._id,
        parameters,
        scores: [
          scoreFor(m.month, base),
          scoreFor(m.month, base),
          scoreFor(m.month, base + 1),
          scoreFor(m.month, base),
          scoreFor(m.month, base + 1),
        ],
        reasons: [
          `Ownership feedback for ${emp.name} — ${m.month}/${m.year}`,
          `Communication feedback for ${emp.name} — ${m.month}/${m.year}`,
          `Quality feedback for ${emp.name} — ${m.month}/${m.year}`,
          `Problem solving feedback for ${emp.name} — ${m.month}/${m.year}`,
          `Teamwork feedback for ${emp.name} — ${m.month}/${m.year}`,
        ],
      });
    }
  }

  return { company, founder, team, hr, cycles };
}

async function seed({ disconnect = true } = {}) {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    Feedback.deleteMany({}),
    FeedbackAssignment.deleteMany({}),
    FeedbackCycle.deleteMany({}),
    Employee.deleteMany({}),
    Company.deleteMany({}),
    PerformanceParameter.deleteMany({}),
  ]);

  console.log('Seeding performance parameters...');
  const parameters = await PerformanceParameter.insertMany(PARAMETERS);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('Seeding Ashoka Textiles...');
  const ashoka = await seedAshoka(parameters, passwordHash);

  console.log('Seeding Bright Path Consulting...');
  const bright = await seedBrightPath(parameters, passwordHash);

  console.log('\nSeed complete.\n');
  console.log('Demo password for all accounts:', DEMO_PASSWORD);
  console.log('\nAshoka Textiles:');
  console.log('  HR:        hr@ashoka.test');
  console.log('  Rohan:     rohan@ashoka.test');
  console.log('  Priya:     priya@ashoka.test');
  console.log('  Employee:  employee1@ashoka.test');
  console.log('  COO:       coo@ashoka.test');
  console.log('\nBright Path Consulting:');
  console.log('  Founder:   founder@brightpath.test');
  console.log('  HR:        hr@brightpath.test');
  console.log('  Employee:  bp.employee1@brightpath.test');
  console.log('\nPending demos:');
  console.log('  Ashoka Aug 2026: Priya -> Employee 6');
  console.log('  Bright Path Aug 2026: Founder -> BP Employee 7 & 8');

  if (disconnect) {
    await mongoose.disconnect();
  }

  return { ashoka, bright, parameters };
}

if (require.main === module) {
  seed({ disconnect: true }).catch(async (err) => {
    console.error('Seed failed:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = { seed, DEMO_PASSWORD };
