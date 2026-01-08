import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get all event types
router.get('/types', async (req: AuthRequest, res) => {
  try {
    const eventTypes = await prisma.eventType.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: eventTypes
    });
  } catch (error) {
    console.error('Get event types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get event types'
    });
  }
});

// Get all events
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, typeId, workAreaId, search, limit = '50' } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate as string);
      }
    }
    
    if (typeId) {
      where.eventTypeId = typeId;
    }
    
    if (workAreaId) {
      where.workAreaId = workAreaId;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        eventType: true,
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        participants: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            actions: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get events'
    });
  }
});

// Get single event
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        eventType: true,
        participants: {
          include: {
            employee: true
          }
        },
        actions: {
          include: {
            employee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get event'
    });
  }
});

// Create event
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      eventTypeId,
      title,
      description,
      rawNotes,
      startTime,
      endTime,
      participantIds,
      workAreaId,
      needsAction
    } = req.body;

    if (!eventTypeId || !title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Event type, title, start time, and end time are required'
      });
    }

    const event = await prisma.event.create({
      data: {
        userId: req.userId!,
        eventTypeId,
        title,
        description,
        rawNotes,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        workAreaId,
        needsAction: needsAction !== false,
        participants: participantIds?.length ? {
          create: participantIds.map((id: string) => ({
            employeeId: id,
            role: 'REQUIRED'
          }))
        } : undefined
      },
      include: {
        eventType: true,
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        participants: {
          include: {
            employee: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

// Update event
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const { participantIds, ...data } = req.body;

    // Handle date conversions
    if (data.startTime) data.startTime = new Date(data.startTime);
    if (data.endTime) data.endTime = new Date(data.endTime);

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data,
      include: {
        eventType: true,
        participants: {
          include: {
            employee: true
          }
        }
      }
    });

    // Update participants if provided
    if (participantIds !== undefined) {
      await prisma.eventParticipant.deleteMany({
        where: { eventId: req.params.id }
      });

      if (participantIds.length > 0) {
        await prisma.eventParticipant.createMany({
          data: participantIds.map((id: string) => ({
            eventId: req.params.id,
            employeeId: id,
            role: 'REQUIRED'
          }))
        });
      }
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
});

// Delete event
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await prisma.event.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Event deleted'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// Add participant to event
router.post('/:id/participants', async (req: AuthRequest, res) => {
  try {
    const { employeeId, role = 'REQUIRED' } = req.body;

    const event = await prisma.event.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const participant = await prisma.eventParticipant.create({
      data: {
        eventId: req.params.id,
        employeeId,
        role
      },
      include: {
        employee: true
      }
    });

    res.status(201).json({
      success: true,
      data: participant
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add participant'
    });
  }
});

export default router;

