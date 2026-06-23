import crypto from 'crypto';
import { AgentRepository } from '../repositories/agent.repository';
import { UserRepository } from '../repositories/user.repository';
import { decodeBase64Html, injectDisclaimer } from '../utils/html';
import { isValidUuid } from '../utils/validation';
import type { AgentRequest, AgentRequestWithUser, AgentFile, AgentStatus } from '../types';

export class AgentService {
  static async getById(id: string): Promise<AgentRequest | null> {
    return AgentRepository.findById(id);
  }

  static async getBySlug(slug: string): Promise<AgentRequest | null> {
    return AgentRepository.findBySlug(slug);
  }

  static async getBySlugWithUser(slug: string): Promise<AgentRequestWithUser | null> {
    return AgentRepository.findBySlugWithUser(slug);
  }

  static async getByUser(userId: string): Promise<AgentRequestWithUser[]> {
    return AgentRepository.findByUser(userId);
  }

  static async getSharedWithUser(userId: string): Promise<AgentRequestWithUser[]> {
    return AgentRepository.findSharedWithUser(userId);
  }

  static async getShowcased(limit: number = 12): Promise<AgentRequest[]> {
    return AgentRepository.findShowcased(limit);
  }

  static async create(data: { name: string; description: string; user_id: string }): Promise<AgentRequest> {
    return AgentRepository.create({
      user_id: data.user_id,
      name: data.name.trim(),
      description: data.description.trim(),
    });
  }

  static async createByAdmin(data: {
    name: string;
    description: string;
    userId?: string;
  }): Promise<AgentRequest> {
    const slug = crypto.randomUUID();

    let userId = data.userId;
    if (!userId) {
      const admin = await UserRepository.getAdminUser();
      if (!admin) throw new Error('No admin user found');
      userId = admin.id;
    }

    const agent = await AgentRepository.createWithSlug({
      user_id: userId,
      name: data.name,
      description: data.description,
      status: 'in_development',
      slug,
    });

    return agent;
  }

  static async update(id: string, data: { name?: string; description?: string }): Promise<void> {
    const updates: { name?: string; description?: string } = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.description !== undefined) updates.description = data.description.trim();
    await AgentRepository.update(id, updates);
  }

  static async delete(id: string): Promise<boolean> {
    return AgentRepository.delete(id);
  }

  static async deleteByUser(id: string, userId: string): Promise<boolean> {
    return AgentRepository.deleteByUser(id, userId);
  }

  static async updateStatus(id: string, status: AgentStatus, extra?: Record<string, unknown>): Promise<void> {
    await AgentRepository.updateStatus(id, status, extra);
  }

  static async approve(id: string, reviewNotes?: string): Promise<void> {
    const slug = crypto.randomUUID();
    const logEntry = {
      action: 'approved',
      notes: reviewNotes || null,
      timestamp: new Date().toISOString(),
    };

    await AgentRepository.updateStatus(id, 'in_development', {
      unique_slug: slug,
      review_notes: reviewNotes || null,
    });
    await AgentRepository.appendReviewLog(id, logEntry);
  }

  static async reject(id: string, reason?: string): Promise<void> {
    await AgentRepository.updateStatus(id, 'rejected', {
      rejection_reason: reason || 'No reason provided',
    });
    await AgentRepository.appendReviewLog(id, {
      action: 'rejected',
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString(),
    });
  }

  static async approveDev(id: string): Promise<boolean> {
    const agent = await AgentRepository.findById(id);
    if (!agent || agent.status !== 'dev_review') return false;

    await AgentRepository.updateStatus(id, 'completed');
    await AgentRepository.appendReviewLog(id, {
      action: 'approved_dev',
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  static async rejectDev(id: string, comments?: string): Promise<void> {
    await AgentRepository.updateStatus(id, 'in_development', {
      review_comments: comments || null,
    });
    await AgentRepository.appendReviewLog(id, {
      action: 'rejected_dev',
      comments: comments || null,
      timestamp: new Date().toISOString(),
    });
  }

  static async togglePublic(id: string): Promise<boolean> {
    const agent = await AgentRepository.findById(id);
    if (!agent) return false;
    await AgentRepository.togglePublic(id);
    return true;
  }

  static async toggleShowcase(id: string): Promise<{ success: boolean; error?: string }> {
    const agent = await AgentRepository.findById(id);
    if (!agent) return { success: false, error: 'Agent not found' };
    if (!agent.is_public) return { success: false, error: '私密页面无法推荐到首页' };

    await AgentRepository.toggleShowcase(id);
    return { success: true };
  }

  static async getFiles(agentId: string): Promise<AgentFile[]> {
    return AgentRepository.findFiles(agentId);
  }

  static async getLatestFile(agentId: string): Promise<AgentFile | null> {
    return AgentRepository.findLatestFile(agentId);
  }

  static async uploadFile(agentId: string, content: string): Promise<void> {
    const b64content = Buffer.from(content, 'utf-8').toString('base64');
    await AgentRepository.replaceFile(agentId, b64content);
  }

  static async getShare(agentId: string): Promise<{ partner_email: string; partner_user_id: string | null } | null> {
    return AgentRepository.findShare(agentId);
  }

  static async share(agentId: string, partnerEmail: string, partnerUserId?: string): Promise<void> {
    await AgentRepository.createShare(agentId, partnerEmail, partnerUserId);
  }

  static async unshare(agentId: string): Promise<void> {
    await AgentRepository.deleteShare(agentId);
  }

  static async isOwner(agentId: string, userId: string): Promise<boolean> {
    return AgentRepository.isOwner(agentId, userId);
  }

  static async hasAccess(agentId: string, userId: string): Promise<boolean> {
    return AgentRepository.hasAccess(agentId, userId);
  }

  static async getBySlugForPublic(slug: string): Promise<AgentRequestWithUser | null> {
    if (!isValidUuid(slug)) return null;
    return AgentRepository.findPublicBySlug(slug);
  }

  static decodeHtml(content: string): string {
    return decodeBase64Html(content);
  }

  static injectDisclaimer(html: string): string {
    return injectDisclaimer(html);
  }
}
