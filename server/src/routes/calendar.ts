import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * Manual Event Management Routes
 * No calendar sync - events are created manually only
 */

// Get all events for the authenticated user
router.get('/events', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const events = await prisma.event.findMany({
      where: { userId },
      include: {
        team: true,
        eventType: true,
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ events });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get a single event by ID
router.get('/events/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = await prisma.event.findFirst({
      where: { 
        id,
        userId 
      },
      include: {
        team: true,
        eventType: true,
        actions: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create a new event manually
router.post('/events', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      teamId,
      eventTypeId,
      rawNotes,
    } = req.body;

    if (!title || !startTime || !eventTypeId) {
      return res.status(400).json({ error: 'Title, start time, and event type are required' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : new Date(startTime),
        userId,
        teamId,
        eventTypeId,
        rawNotes,
      },
      include: {
        team: true,
        eventType: true,
      },
    });

    res.status(201).json({ event });
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update an event
router.put('/events/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify ownership
    const existingEvent = await prisma.event.findFirst({
      where: { id, userId },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      teamId,
      eventTypeId,
      rawNotes,
      extractedData,
      needsAction,
    } = req.body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(teamId !== undefined && { teamId }),
        ...(eventTypeId !== undefined && { eventTypeId }),
        ...(rawNotes !== undefined && { rawNotes }),
        ...(extractedData !== undefined && { extractedData }),
        ...(needsAction !== undefined && { needsAction }),
      },
      include: {
        team: true,
        eventType: true,
        actions: true,
      },
    });

    res.json({ event });
  } catch (error: any) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete an event
router.delete('/events/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify ownership
    const existingEvent = await prisma.event.findFirst({
      where: { id, userId },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await prisma.event.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Event deleted' });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
