/**
 * Meeting Templates Routes
 * CRUD operations for meeting templates
 */
import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

/**
 * Get all templates for the user
 * GET /templates
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    const templates = await prisma.meetingTemplate.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get templates by category
 * GET /templates/category/:category
 */
router.get('/category/:category', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { category } = req.params;
    
    const templates = await prisma.meetingTemplate.findMany({
      where: { 
        userId,
        category: category.toUpperCase() as any
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get a single template
 * GET /templates/:id
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    
    const template = await prisma.meetingTemplate.findFirst({
      where: { id, userId }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Create a new template
 * POST /templates
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { 
      name, 
      description, 
      category, 
      agenda, 
      checkpoints, 
      defaultDuration,
      isDefault 
    } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }
    
    // If setting as default, unset other defaults in same category
    if (isDefault) {
      await prisma.meetingTemplate.updateMany({
        where: { 
          userId, 
          category: category.toUpperCase() as any,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }
    
    const template = await prisma.meetingTemplate.create({
      data: {
        userId,
        name,
        description,
        category: category.toUpperCase() as any,
        agenda: agenda || [],
        checkpoints: checkpoints || [],
        defaultDuration: defaultDuration || 60,
        isDefault: isDefault || false
      }
    });
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Update a template
 * PUT /templates/:id
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { 
      name, 
      description, 
      category, 
      agenda, 
      checkpoints, 
      defaultDuration,
      isDefault 
    } = req.body;
    
    // Verify ownership
    const existing = await prisma.meetingTemplate.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // If setting as default, unset other defaults in same category
    if (isDefault && !existing.isDefault) {
      await prisma.meetingTemplate.updateMany({
        where: { 
          userId, 
          category: (category || existing.category).toUpperCase() as any,
          isDefault: true,
          NOT: { id }
        },
        data: { isDefault: false }
      });
    }
    
    const template = await prisma.meetingTemplate.update({
      where: { id },
      data: {
        name,
        description,
        category: category ? category.toUpperCase() as any : undefined,
        agenda,
        checkpoints,
        defaultDuration,
        isDefault
      }
    });
    
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * Delete a template
 * DELETE /templates/:id
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    
    // Verify ownership
    const existing = await prisma.meetingTemplate.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    await prisma.meetingTemplate.delete({ where: { id } });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * Duplicate a template
 * POST /templates/:id/duplicate
 */
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    
    const existing = await prisma.meetingTemplate.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const template = await prisma.meetingTemplate.create({
      data: {
        userId,
        name: `${existing.name} (Copy)`,
        description: existing.description,
        category: existing.category,
        agenda: existing.agenda as any,
        checkpoints: existing.checkpoints,
        defaultDuration: existing.defaultDuration,
        isDefault: false
      }
    });
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

export default router;
