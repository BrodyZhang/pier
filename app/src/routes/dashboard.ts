import { Router, Request, Response } from 'express';
import { AgentService } from '../services/agent.service';

const router = Router();

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const agents = await AgentService.getByUser(req.session.userId!);
    const sharedAgents = await AgentService.getSharedWithUser(req.session.userId!);

    res.render('dashboard', {
      title: 'Dashboard',
      agents,
      sharedAgents,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
