import { UserRepository } from '../repositories/user.repository';
import type { User } from '../types';

export class UserService {
  static async getById(id: string): Promise<User | null> {
    return UserRepository.findById(id);
  }

  static async getByEmail(email: string): Promise<User | null> {
    return UserRepository.findByEmail(email);
  }

  static async updateName(id: string, name: string): Promise<void> {
    await UserRepository.updateName(id, name.trim());
  }

  static async delete(id: string): Promise<boolean> {
    return UserRepository.delete(id);
  }

  static async isAdmin(id: string): Promise<boolean> {
    return UserRepository.isAdmin(id);
  }

  static async ensureAdmin(email: string): Promise<void> {
    await UserRepository.ensureAdmin(email);
  }
}
