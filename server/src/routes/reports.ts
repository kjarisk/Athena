/**
 * Reports Routes
 * Handles weekly reports, employee reports, and export functionality
 */
import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { AIService } from '../services/ai/index.js';
import { 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  startOfQuarter, 
  endOfQuarter,
  startOfYear,
  endOfYear,
  subQuarters,
  subYears,
  differenceInDays
} from 'date-fns';

const router = Router();

router.use(authenticateToken);

// ============================================
// Helper Functions
// ============================================

/**
 * Transform report data for frontend consumption
 * Converts Records to arrays with proper structure
 */
function transformReportForClient(report: any) {
  if (!report) return report;
  
  // Transform breakdownByArea from Record to Array
  const breakdownByArea = report.breakdownByArea 
    ? Object.entries(report.breakdownByArea as Record<string, any>).map(([id, data]) => {
        const totalHours = Object.values(report.breakdownByArea as Record<string, any>)
          .reduce((sum: number, item: any) => sum + (item.hoursSpent || 0), 0);
        return {
          areaId: id,
          areaName: data.name,
          hours: data.hoursSpent || 0,
          percentage: totalHours > 0 ? Math.round((data.hoursSpent || 0) / totalHours * 100) : 0,
          actionsCompleted: data.actionsCompleted || 0
        };
      })
    : [];
  
  // Transform breakdownByTeam from Record to Array
  const breakdownByTeam = report.breakdownByTeam
    ? Object.entries(report.breakdownByTeam as Record<string, any>).map(([id, data]) => {
        const totalHours = Object.values(report.breakdownByTeam as Record<string, any>)
          .reduce((sum: number, item: any) => sum + (item.hoursSpent || 0), 0);
        return {
          teamId: id,
          teamName: data.name,
          hours: data.hoursSpent || 0,
          percentage: totalHours > 0 ? Math.round((data.hoursSpent || 0) / totalHours * 100) : 0,
          actionsCompleted: data.actionsCompleted || 0,
          meetingsHeld: data.meetingsHeld || 0
        };
      })
    : [];
  
  return {
    ...report,
    breakdownByArea,
    breakdownByTeam
  };
}

// ============================================
// Weekly Reports
// ============================================

/**
 * Get weekly report for a specific week
 * GET /reports/weekly?weekOffset=0
 */
router.get('/weekly', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const weekOffset = parseInt(req.query.weekOffset as string) || 0;
    
    const now = new Date();
    const targetDate = subWeeks(now, weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    
    // Check if report exists
    let report = await prisma.weeklyReport.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart
        }
      }
    });
    
    if (!report) {
      // Generate report
      report = await generateWeeklyReport(userId, weekStart, weekEnd);
    }
    
    res.json(transformReportForClient(report));
  } catch (error) {
    console.error('Error fetching weekly report:', error);
    res.status(500).json({ error: 'Failed to fetch weekly report' });
  }
});

/**
 * Regenerate weekly report with AI summary
 * POST /reports/weekly/regenerate
 */
router.post('/weekly/regenerate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { weekOffset = 0 } = req.body;
    
    const now = new Date();
    const targetDate = subWeeks(now, weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    
    // Delete existing report if any
    await prisma.weeklyReport.deleteMany({
      where: {
        userId,
        weekStart
      }
    });
    
    // Generate new report with AI summary
    const report = await generateWeeklyReport(userId, weekStart, weekEnd, true);
    
    res.json(transformReportForClient(report));
  } catch (error) {
    console.error('Error regenerating weekly report:', error);
    res.status(500).json({ error: 'Failed to regenerate weekly report' });
  }
});

/**
 * Get weekly report history
 * GET /reports/weekly/history?limit=12
 */
router.get('/weekly/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 12;
    
    const reports = await prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      take: limit
    });
    
    res.json(reports.map(transformReportForClient));
  } catch (error) {
    console.error('Error fetching report history:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

// ============================================
// Employee Reports
// ============================================

/**
 * Generate employee report (quarterly/yearly)
 * POST /reports/employee/:employeeId
 */
router.post('/employee/:employeeId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { employeeId } = req.params;
    const { reportType = 'quarterly', periodOffset = 0 } = req.body;
    
    // Verify employee belongs to user
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, userId }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const now = new Date();
    let periodStart: Date, periodEnd: Date;
    
    if (reportType === 'quarterly') {
      const targetDate = subQuarters(now, periodOffset);
      periodStart = startOfQuarter(targetDate);
      periodEnd = endOfQuarter(targetDate);
    } else {
      const targetDate = subYears(now, periodOffset);
      periodStart = startOfYear(targetDate);
      periodEnd = endOfYear(targetDate);
    }
    
    const report = await generateEmployeeReport(employeeId, reportType, periodStart, periodEnd);
    
    res.json(report);
  } catch (error) {
    console.error('Error generating employee report:', error);
    res.status(500).json({ error: 'Failed to generate employee report' });
  }
});

/**
 * Get employee report history
 * GET /reports/employee/:employeeId/history
 */
router.get('/employee/:employeeId/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { employeeId } = req.params;
    
    // Verify employee belongs to user
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, userId }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const reports = await prisma.employeeReport.findMany({
      where: { employeeId },
      orderBy: { periodStart: 'desc' }
    });
    
    res.json(reports);
  } catch (error) {
    console.error('Error fetching employee report history:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

// ============================================
// Helper Functions
// ============================================

async function generateWeeklyReport(
  userId: string, 
  weekStart: Date, 
  weekEnd: Date,
  includeAISummary: boolean = false
) {
  // Get actions for the week
  const actions = await prisma.action.findMany({
    where: {
      userId,
      OR: [
        { completedAt: { gte: weekStart, lte: weekEnd } },
        { createdAt: { gte: weekStart, lte: weekEnd } }
      ]
    },
    include: {
      workArea: true,
      team: true
    }
  });
  
  // Get events for the week
  const events = await prisma.event.findMany({
    where: {
      userId,
      startTime: { gte: weekStart, lte: weekEnd }
    },
    include: {
      workArea: true,
      team: true
    }
  });
  
  // Get decisions (actions with type DECISION)
  const decisions = await prisma.action.findMany({
    where: {
      userId,
      type: 'DECISION',
      createdAt: { gte: weekStart, lte: weekEnd }
    }
  });
  
  // Calculate metrics
  const actionsCompleted = actions.filter(a => a.status === 'COMPLETED').length;
  const actionsCreated = actions.filter(a => 
    new Date(a.createdAt) >= weekStart && new Date(a.createdAt) <= weekEnd
  ).length;
  
  const meetingHours = events.reduce((total, event) => {
    const duration = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
    return total + duration;
  }, 0);
  
  const focusHours = Math.max(0, 40 - meetingHours);
  
  // Breakdown by area
  const breakdownByArea: Record<string, { name: string; actionsCompleted: number; hoursSpent: number }> = {};
  actions.forEach(action => {
    if (action.workAreaId && action.workArea) {
      if (!breakdownByArea[action.workAreaId]) {
        breakdownByArea[action.workAreaId] = { 
          name: action.workArea.name, 
          actionsCompleted: 0, 
          hoursSpent: 0 
        };
      }
      if (action.status === 'COMPLETED') {
        breakdownByArea[action.workAreaId].actionsCompleted++;
      }
    }
  });
  
  // Add event hours to area breakdown
  events.forEach(event => {
    if (event.workAreaId && event.workArea) {
      if (!breakdownByArea[event.workAreaId]) {
        breakdownByArea[event.workAreaId] = { 
          name: event.workArea.name, 
          actionsCompleted: 0, 
          hoursSpent: 0 
        };
      }
      const hours = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
      breakdownByArea[event.workAreaId].hoursSpent += hours;
    }
  });
  
  // Breakdown by team
  const breakdownByTeam: Record<string, { name: string; actionsCompleted: number; hoursSpent: number; meetingsHeld: number }> = {};
  actions.forEach(action => {
    if (action.teamId && action.team) {
      if (!breakdownByTeam[action.teamId]) {
        breakdownByTeam[action.teamId] = { 
          name: action.team.name, 
          actionsCompleted: 0, 
          hoursSpent: 0,
          meetingsHeld: 0
        };
      }
      if (action.status === 'COMPLETED') {
        breakdownByTeam[action.teamId].actionsCompleted++;
      }
    }
  });
  
  events.forEach(event => {
    if (event.teamId && event.team) {
      if (!breakdownByTeam[event.teamId]) {
        breakdownByTeam[event.teamId] = { 
          name: event.team.name, 
          actionsCompleted: 0, 
          hoursSpent: 0,
          meetingsHeld: 0
        };
      }
      const hours = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
      breakdownByTeam[event.teamId].hoursSpent += hours;
      breakdownByTeam[event.teamId].meetingsHeld++;
    }
  });
  
  // Top accomplishments
  const topAccomplishments = actions
    .filter(a => a.status === 'COMPLETED')
    .slice(0, 5)
    .map(a => ({
      title: a.title,
      completedAt: a.completedAt!,
      xpEarned: a.xpValue
    }));
  
  // Decisions logged
  const decisionsLogged = decisions.map(d => ({
    title: d.title,
    description: d.description,
    madeAt: d.createdAt,
    context: ''
  }));
  
  // Generate AI summary if requested
  let summary: string | undefined;
  let highlights: string[] = [];
  let challenges: string[] = [];
  let recommendations: string[] = [];
  
  if (includeAISummary && (actionsCompleted > 0 || events.length > 0)) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { aiContextRules: true }
      });
      
      const aiService = new AIService(
        (user?.settings as any)?.aiProvider || 'openai'
      );
      
      const summaryData = `
Week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}
Actions completed: ${actionsCompleted}
Actions created: ${actionsCreated}
Meeting hours: ${meetingHours.toFixed(1)}
Focus hours: ${focusHours.toFixed(1)}
Decisions made: ${decisions.length}

Top accomplishments:
${topAccomplishments.map(a => `- ${a.title}`).join('\n')}

Areas worked on:
${Object.values(breakdownByArea).map(a => `- ${a.name}: ${a.actionsCompleted} actions, ${a.hoursSpent.toFixed(1)}h`).join('\n')}
`;
      
      const aiSummary = await aiService.summarize(summaryData, 'paragraph');
      summary = aiSummary;
      
      // Extract highlights from completed actions
      highlights = topAccomplishments.slice(0, 3).map(a => a.title);
      
      // Recommendations based on data
      if (meetingHours > 30) {
        recommendations.push('Consider blocking focus time - meeting load is high');
      }
      if (actionsCompleted < actionsCreated) {
        recommendations.push('Action completion rate is below creation rate - consider prioritizing existing tasks');
      }
    } catch (error) {
      console.error('AI summary generation failed:', error);
    }
  }
  
  // Create or update the report
  const report = await prisma.weeklyReport.upsert({
    where: {
      userId_weekStart: { userId, weekStart }
    },
    update: {
      weekEnd,
      actionsCompleted,
      actionsCreated,
      meetingHours,
      focusHours,
      decisionsCount: decisions.length,
      breakdownByArea,
      breakdownByTeam,
      summary,
      highlights,
      challenges,
      recommendations,
      topAccomplishments,
      decisionsLogged
    },
    create: {
      userId,
      weekStart,
      weekEnd,
      actionsCompleted,
      actionsCreated,
      meetingHours,
      focusHours,
      decisionsCount: decisions.length,
      breakdownByArea,
      breakdownByTeam,
      summary,
      highlights,
      challenges,
      recommendations,
      topAccomplishments,
      decisionsLogged
    }
  });
  
  return report;
}

async function generateEmployeeReport(
  employeeId: string,
  reportType: string,
  periodStart: Date,
  periodEnd: Date
) {
  // Get employee with all related data
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      oneOnOnes: {
        where: {
          date: { gte: periodStart, lte: periodEnd }
        }
      },
      actions: {
        where: {
          createdAt: { gte: periodStart, lte: periodEnd }
        }
      },
      notes: {
        where: {
          createdAt: { gte: periodStart, lte: periodEnd }
        }
      },
      competencies: true,
      skills: {
        include: { skill: true }
      }
    }
  });
  
  if (!employee) {
    throw new Error('Employee not found');
  }
  
  // Calculate metrics
  const actionsCompleted = employee.actions.filter(a => a.status === 'COMPLETED').length;
  const oneOnOnesCount = employee.oneOnOnes.length;
  
  // Average mood from 1:1s
  const moodsWithValue = employee.oneOnOnes.filter(o => o.mood !== null);
  const avgMood = moodsWithValue.length > 0
    ? moodsWithValue.reduce((sum, o) => sum + (o.mood || 0), 0) / moodsWithValue.length
    : undefined;
  
  // Feedback from notes
  const feedbackNotes = employee.notes.filter(n => n.type === 'FEEDBACK');
  const feedbackSummary = feedbackNotes.length > 0
    ? feedbackNotes.map(n => n.content).join('\n\n')
    : undefined;
  
  // Skills gained (skills with level > 0)
  const skillsGained = employee.skills
    .filter(s => s.level > 0)
    .map(s => s.skill.name);
  
  // Generate AI narrative
  let narrative: string | undefined;
  let recommendations: string[] = [];
  
  try {
    const user = await prisma.user.findFirst({
      where: { employees: { some: { id: employeeId } } },
      include: { aiContextRules: true }
    });
    
    const aiService = new AIService(
      (user?.settings as any)?.aiProvider || 'openai'
    );
    
    const reportData = `
Employee: ${employee.name}
Role: ${employee.role}
Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}
Report Type: ${reportType}

Actions Completed: ${actionsCompleted}
1:1 Meetings: ${oneOnOnesCount}
Average Mood: ${avgMood?.toFixed(1) || 'N/A'}

Strengths: ${employee.strengths.join(', ') || 'Not specified'}
Growth Areas: ${employee.growthAreas.join(', ') || 'Not specified'}

Feedback received:
${feedbackSummary || 'No feedback recorded'}

Recent 1:1 topics:
${employee.oneOnOnes.flatMap(o => o.topics).slice(0, 10).join(', ')}
`;
    
    narrative = await aiService.summarize(reportData, 'paragraph');
    
    // Generate recommendations
    if (avgMood && avgMood < 3) {
      recommendations.push('Mood trend is below average - consider addressing potential concerns');
    }
    if (oneOnOnesCount < 3 && reportType === 'quarterly') {
      recommendations.push('1:1 frequency is low for this quarter - aim for at least bi-weekly meetings');
    }
    if (employee.growthAreas.length > 0) {
      recommendations.push(`Focus on development in: ${employee.growthAreas.slice(0, 2).join(', ')}`);
    }
  } catch (error) {
    console.error('AI narrative generation failed:', error);
  }
  
  // Create the report
  const report = await prisma.employeeReport.create({
    data: {
      employeeId,
      reportType: reportType === 'quarterly' ? 'QUARTERLY' : 'YEARLY',
      periodStart,
      periodEnd,
      actionsCompleted,
      oneOnOnesCount,
      avgMood,
      competencyChanges: {},
      skillsGained,
      feedbackSummary,
      strengths: employee.strengths,
      growthAreas: employee.growthAreas,
      narrative,
      recommendations
    }
  });
  
  return report;
}

export default router;
