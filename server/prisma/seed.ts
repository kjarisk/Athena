import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default event types
  const eventTypes = [
    { name: '1:1 Meeting', category: 'ONE_ON_ONE', color: '#7BA087', icon: 'user' },
    { name: 'Workshop', category: 'WORKSHOP', color: '#D4A574', icon: 'users' },
    { name: 'Team Meeting', category: 'TEAM_MEETING', color: '#E8B86D', icon: 'users' },
    { name: 'Competence Forum', category: 'COMPETENCE_FORUM', color: '#8FBC8F', icon: 'book' },
    { name: 'Sprint Planning', category: 'PLANNING', color: '#DAA520', icon: 'calendar' },
    { name: 'Sprint Review', category: 'REVIEW', color: '#CD7F6E', icon: 'check-circle' },
    { name: 'Retrospective', category: 'REVIEW', color: '#9CA89D', icon: 'refresh' },
    { name: 'Other', category: 'OTHER', color: '#6B7B6C', icon: 'circle' }
  ];

  for (const et of eventTypes) {
    await prisma.eventType.upsert({
      where: { name: et.name },
      update: et,
      create: et
    });
  }
  console.log('Created event types');

  // Create responsibilities
  const responsibilities = [
    {
      roleType: 'TEAM_LEAD',
      name: 'Team Lead',
      areas: [
        // People & Individual Care
        { category: 'People & Individual Care', name: '1:1 Meetings', description: 'Regular bi-weekly or monthly 1:1s with direct reports', isMandatory: true },
        { category: 'People & Individual Care', name: 'Wellbeing & Motivation', description: 'Monitor team wellbeing and motivation levels', isMandatory: true },
        { category: 'People & Individual Care', name: 'Workload Management', description: 'Ensure balanced workload and manage stress', isMandatory: true },
        { category: 'People & Individual Care', name: 'Clear Expectations', description: 'Set clear expectations and define good performance', isMandatory: true },
        { category: 'People & Individual Care', name: 'Psychological Safety', description: 'Create environment where team feels safe to speak up', isMandatory: true },
        { category: 'People & Individual Care', name: 'Recognition', description: 'Regular recognition and appreciation', isMandatory: false },
        
        // Development
        { category: 'Development', name: 'Personal Development Plans', description: 'Create and maintain PDPs for each team member', isMandatory: true },
        { category: 'Development', name: 'Career Conversations', description: 'At least twice per year career discussions', isMandatory: true },
        { category: 'Development', name: 'Coaching', description: 'Coach team members, not just manage them', isMandatory: false },
        { category: 'Development', name: 'Learning Support', description: 'Support learning time and tool adoption', isMandatory: false },
        
        // Delivery & Execution
        { category: 'Delivery & Execution', name: 'Sprint Planning', description: 'Ensure sprint planning and backlog readiness', isMandatory: true },
        { category: 'Delivery & Execution', name: 'Remove Blockers', description: 'Identify and remove team blockers', isMandatory: true },
        { category: 'Delivery & Execution', name: 'Quality Balance', description: 'Balance speed vs quality, ensure tests and docs', isMandatory: true },
        { category: 'Delivery & Execution', name: 'Tech Debt', description: 'Track and address technical debt', isMandatory: false },
        
        // Team Health & Culture
        { category: 'Team Health & Culture', name: 'Team Rituals', description: 'Maintain standups, retros, demos', isMandatory: true },
        { category: 'Team Health & Culture', name: 'Retrospectives', description: 'Run effective retrospectives with real actions', isMandatory: true },
        { category: 'Team Health & Culture', name: 'Knowledge Sharing', description: 'Encourage knowledge sharing sessions', isMandatory: false },
        
        // Communication & Alignment
        { category: 'Communication & Alignment', name: 'Goal Translation', description: 'Translate business goals to team tasks', isMandatory: true },
        { category: 'Communication & Alignment', name: 'Stakeholder Updates', description: 'Keep stakeholders informed', isMandatory: true },
        { category: 'Communication & Alignment', name: 'Risk Escalation', description: 'Escalate risks early', isMandatory: true },
        
        // Performance & Accountability
        { category: 'Performance & Accountability', name: 'Continuous Feedback', description: 'Give continuous feedback, not only yearly', isMandatory: true },
        { category: 'Performance & Accountability', name: 'Performance Issues', description: 'Handle underperformance early', isMandatory: true },
        { category: 'Performance & Accountability', name: 'High Performer Support', description: 'Support high performers without burnout', isMandatory: false }
      ]
    },
    {
      roleType: 'COMPETENCE_LEADER',
      name: 'Competence Leader',
      areas: [
        // Competence Strategy
        { category: 'Competence Strategy', name: 'Vision Definition', description: 'Define competence vision for your area', isMandatory: true },
        { category: 'Competence Strategy', name: 'Skill Identification', description: 'Identify critical skills now and in 2-3 years', isMandatory: true },
        { category: 'Competence Strategy', name: 'Strategy Alignment', description: 'Align competence goals with company strategy', isMandatory: true },
        
        // Skill Development
        { category: 'Skill Development', name: 'Competence Maps', description: 'Maintain skill matrices and competence maps', isMandatory: true },
        { category: 'Skill Development', name: 'Learning Paths', description: 'Define learning paths junior to senior to lead', isMandatory: true },
        { category: 'Skill Development', name: 'Mentorship Programs', description: 'Establish mentorship and pairing programs', isMandatory: false },
        { category: 'Skill Development', name: 'AI Workflows', description: 'Encourage AI-first workflows', isMandatory: false },
        
        // Community & Knowledge Sharing
        { category: 'Community', name: 'Guild Meetings', description: 'Run competence forums and guild meetings', isMandatory: true },
        { category: 'Community', name: 'Internal Talks', description: 'Organize internal talks and demos', isMandatory: false },
        { category: 'Community', name: 'Best Practices', description: 'Document and share best practices', isMandatory: true },
        
        // Standards & Quality
        { category: 'Standards & Quality', name: 'Coding Standards', description: 'Define and maintain coding/design standards', isMandatory: true },
        { category: 'Standards & Quality', name: 'Tooling', description: 'Recommend and evaluate tools', isMandatory: false },
        { category: 'Standards & Quality', name: 'AI Guidelines', description: 'Define AI usage guidelines', isMandatory: false },
        
        // Talent Management
        { category: 'Talent Management', name: 'Key People', description: 'Identify key people and risks', isMandatory: true },
        { category: 'Talent Management', name: 'Skill Gaps', description: 'Identify and address skill gaps', isMandatory: true },
        { category: 'Talent Management', name: 'Hiring Input', description: 'Input to hiring needs', isMandatory: false }
      ]
    },
    {
      roleType: 'DEPARTMENT_MANAGER',
      name: 'Department Manager',
      areas: [
        // Strategy & Direction
        { category: 'Strategy & Direction', name: 'Department Vision', description: 'Define department vision', isMandatory: true },
        { category: 'Strategy & Direction', name: 'Strategy Translation', description: 'Translate company strategy to dev strategy', isMandatory: true },
        { category: 'Strategy & Direction', name: 'Build vs Buy', description: 'Make build vs buy decisions', isMandatory: true },
        { category: 'Strategy & Direction', name: 'AI Strategy', description: 'Define AI and automation strategy', isMandatory: false },
        
        // Organization & Structure
        { category: 'Organization', name: 'Team Topology', description: 'Design team structure and topology', isMandatory: true },
        { category: 'Organization', name: 'Hiring Strategy', description: 'Define and execute hiring strategy', isMandatory: true },
        { category: 'Organization', name: 'Budget', description: 'Manage department budget', isMandatory: true },
        { category: 'Organization', name: 'Resource Allocation', description: 'Allocate resources across teams', isMandatory: true },
        
        // Leadership
        { category: 'Leadership', name: 'Lead Leaders', description: 'Lead team leads and competence leaders', isMandatory: true },
        { category: 'Leadership', name: 'Coach Managers', description: 'Coach managers, dont do their job', isMandatory: true },
        { category: 'Leadership', name: 'Leadership Forums', description: 'Create and run leadership forums', isMandatory: false },
        
        // Delivery & Portfolio
        { category: 'Delivery & Portfolio', name: 'Portfolio Prioritization', description: 'Prioritize across portfolio', isMandatory: true },
        { category: 'Delivery & Portfolio', name: 'Capacity Planning', description: 'Plan capacity across teams', isMandatory: true },
        { category: 'Delivery & Portfolio', name: 'Risk Management', description: 'Manage department-level risks', isMandatory: true },
        
        // People & Culture at Scale
        { category: 'People & Culture', name: 'Performance Framework', description: 'Define performance frameworks', isMandatory: true },
        { category: 'People & Culture', name: 'Retention', description: 'Develop retention strategy', isMandatory: true },
        { category: 'People & Culture', name: 'Sustainable Pace', description: 'Ensure sustainable pace across teams', isMandatory: true },
        
        // Governance
        { category: 'Governance', name: 'Dev Lifecycle', description: 'Govern development lifecycle', isMandatory: true },
        { category: 'Governance', name: 'Security & Compliance', description: 'Ensure security and compliance', isMandatory: true },
        { category: 'Governance', name: 'Metrics', description: 'Track DORA, flow, quality metrics', isMandatory: false },
        
        // Stakeholder Management
        { category: 'Stakeholder Management', name: 'Cross-functional', description: 'Work with Product, Design, Ops', isMandatory: true },
        { category: 'Stakeholder Management', name: 'Upward Management', description: 'Manage expectations upwards', isMandatory: true },
        { category: 'Stakeholder Management', name: 'Trade-offs', description: 'Communicate trade-offs clearly', isMandatory: true }
      ]
    }
  ];

  for (const resp of responsibilities) {
    const created = await prisma.responsibility.upsert({
      where: { id: resp.roleType },
      update: { name: resp.name },
      create: {
        id: resp.roleType,
        roleType: resp.roleType as any,
        name: resp.name
      }
    });

    for (const area of resp.areas) {
      await prisma.responsibilityArea.upsert({
        where: {
          id: `${resp.roleType}-${area.name.replace(/\s+/g, '-').toLowerCase()}`
        },
        update: area,
        create: {
          id: `${resp.roleType}-${area.name.replace(/\s+/g, '-').toLowerCase()}`,
          responsibilityId: created.id,
          ...area
        }
      });
    }
  }
  console.log('Created responsibilities');

  // Create achievements
  const achievements = [
    { name: 'first-action', description: 'Complete your first action', icon: 'trophy', xpReward: 50, condition: { type: 'count', target: 1, metric: 'actions_completed' } },
    { name: 'action-starter', description: 'Complete 10 actions', icon: 'star', xpReward: 100, condition: { type: 'count', target: 10, metric: 'actions_completed' } },
    { name: 'action-master', description: 'Complete 50 actions', icon: 'medal', xpReward: 250, condition: { type: 'count', target: 50, metric: 'actions_completed' } },
    { name: 'action-legend', description: 'Complete 100 actions', icon: 'crown', xpReward: 500, condition: { type: 'count', target: 100, metric: 'actions_completed' } },
    { name: 'team-builder', description: 'Add 5 team members', icon: 'users', xpReward: 100, condition: { type: 'count', target: 5, metric: 'employees_added' } },
    { name: 'one-on-one-champion', description: 'Complete 20 one-on-one meetings', icon: 'message-circle', xpReward: 200, condition: { type: 'count', target: 20, metric: 'one_on_ones' } },
    { name: 'workshop-warrior', description: 'Host 10 workshops', icon: 'presentation', xpReward: 200, condition: { type: 'count', target: 10, metric: 'workshops' } },
    { name: 'streak-starter', description: 'Maintain a 7-day streak', icon: 'flame', xpReward: 150, condition: { type: 'streak', target: 7, metric: 'daily_activity' } },
    { name: 'streak-master', description: 'Maintain a 30-day streak', icon: 'fire', xpReward: 500, condition: { type: 'streak', target: 30, metric: 'daily_activity' } },
    { name: 'early-bird', description: 'Complete 10 actions before due date', icon: 'clock', xpReward: 150, condition: { type: 'count', target: 10, metric: 'early_completions' } }
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: achievement,
      create: achievement
    });
  }
  console.log('Created achievements');

  // Create leadership skill tree
  const leadershipTree = await prisma.skillTree.upsert({
    where: { id: 'leadership-tree' },
    update: {},
    create: {
      id: 'leadership-tree',
      name: 'Leadership Constellation',
      description: 'Your path to becoming an exceptional leader',
      type: 'LEADERSHIP'
    }
  });

  const leadershipSkills = [
    // Core skills (center)
    { name: 'Active Listening', category: 'Core', maxLevel: 5, xpRequired: 100, positionX: 0, positionY: 0, prerequisites: [], benefits: ['Better 1:1s', 'Improved trust'] },
    { name: 'Clear Communication', category: 'Core', maxLevel: 5, xpRequired: 100, positionX: 2, positionY: 0, prerequisites: [], benefits: ['Fewer misunderstandings', 'Better alignment'] },
    { name: 'Empathy', category: 'Core', maxLevel: 5, xpRequired: 100, positionX: 1, positionY: -1.5, prerequisites: [], benefits: ['Stronger relationships', 'Better team morale'] },
    
    // People branch
    { name: 'Feedback Mastery', category: 'People', maxLevel: 5, xpRequired: 150, positionX: -2, positionY: -2, prerequisites: ['Active Listening', 'Empathy'], benefits: ['Growth culture', 'Performance improvement'] },
    { name: 'Conflict Resolution', category: 'People', maxLevel: 5, xpRequired: 200, positionX: -3, positionY: -3, prerequisites: ['Feedback Mastery'], benefits: ['Team harmony', 'Faster resolution'] },
    { name: 'Coaching Excellence', category: 'People', maxLevel: 5, xpRequired: 200, positionX: -1, positionY: -3.5, prerequisites: ['Feedback Mastery', 'Empathy'], benefits: ['Team growth', 'Leadership pipeline'] },
    { name: 'Talent Development', category: 'People', maxLevel: 5, xpRequired: 250, positionX: -2, positionY: -5, prerequisites: ['Coaching Excellence'], benefits: ['Retention', 'Succession planning'] },
    
    // Delivery branch
    { name: 'Priority Setting', category: 'Delivery', maxLevel: 5, xpRequired: 150, positionX: 3, positionY: -2, prerequisites: ['Clear Communication'], benefits: ['Focus', 'Better ROI'] },
    { name: 'Delegation', category: 'Delivery', maxLevel: 5, xpRequired: 200, positionX: 4, positionY: -3, prerequisites: ['Priority Setting'], benefits: ['Team empowerment', 'Scalability'] },
    { name: 'Risk Management', category: 'Delivery', maxLevel: 5, xpRequired: 200, positionX: 2, positionY: -3.5, prerequisites: ['Priority Setting'], benefits: ['Fewer surprises', 'Better planning'] },
    { name: 'Strategic Planning', category: 'Delivery', maxLevel: 5, xpRequired: 250, positionX: 3, positionY: -5, prerequisites: ['Risk Management', 'Delegation'], benefits: ['Long-term success', 'Vision clarity'] },
    
    // Culture branch
    { name: 'Psychological Safety', category: 'Culture', maxLevel: 5, xpRequired: 150, positionX: 0, positionY: -2.5, prerequisites: ['Empathy', 'Active Listening'], benefits: ['Innovation', 'Open communication'] },
    { name: 'Recognition Mastery', category: 'Culture', maxLevel: 5, xpRequired: 150, positionX: 1, positionY: -4, prerequisites: ['Psychological Safety'], benefits: ['Motivation', 'Engagement'] },
    { name: 'Culture Building', category: 'Culture', maxLevel: 5, xpRequired: 250, positionX: 0, positionY: -6, prerequisites: ['Recognition Mastery', 'Talent Development', 'Strategic Planning'], benefits: ['Team identity', 'Sustainable excellence'] }
  ];

  for (const skill of leadershipSkills) {
    await prisma.skill.upsert({
      where: { id: `${leadershipTree.id}-${skill.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: skill,
      create: {
        id: `${leadershipTree.id}-${skill.name.replace(/\s+/g, '-').toLowerCase()}`,
        skillTreeId: leadershipTree.id,
        ...skill
      }
    });
  }
  console.log('Created leadership skill tree');

  // Create a demo user if in development
  if (process.env.NODE_ENV !== 'production') {
    const passwordHash = await bcrypt.hash('demo123', 12);
    
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        email: 'demo@example.com',
        passwordHash,
        name: 'Demo User',
        settings: {
          theme: 'light',
          aiProvider: 'openai',
          notificationsEnabled: true,
          calendarSyncEnabled: false
        },
        gamificationStats: {
          level: 1,
          currentXp: 0,
          totalXp: 0,
          streak: 0,
          longestStreak: 0,
          achievements: [],
          lastActivityDate: new Date().toISOString()
        }
      }
    });
    console.log('Created demo user (demo@example.com / demo123)');

    // Create default work areas for demo user
    const defaultAreas = [
      { name: 'Team Lead', color: '#7BA087', icon: 'users', description: 'Day-to-day team management and people care', sortOrder: 0 },
      { name: 'Competence Lead', color: '#D4A574', icon: 'target', description: 'Skill development and competence strategy', sortOrder: 1 },
      { name: 'Dept Manager', color: '#E8B86D', icon: 'briefcase', description: 'Department strategy and organizational leadership', sortOrder: 2 }
    ];

    for (const area of defaultAreas) {
      await prisma.workArea.upsert({
        where: { 
          id: `${demoUser.id}-${area.name.replace(/\s+/g, '-').toLowerCase()}`
        },
        update: area,
        create: {
          id: `${demoUser.id}-${area.name.replace(/\s+/g, '-').toLowerCase()}`,
          userId: demoUser.id,
          ...area
        }
      });
    }
    console.log('Created default work areas for demo user');
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

