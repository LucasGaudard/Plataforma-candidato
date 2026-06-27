import type { User } from '@prisma/client';
import type { Role, UserPublic } from '@platform/types';

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    cpf: user.cpf,
    phone: user.phone,
    address: user.address,
    city: user.city,
    state: user.state,
    neighborhood: user.neighborhood,
    role: user.role as Role,
    leaderSlug: user.leaderSlug,
    leaderId: user.leaderId,
    coordinatorId: user.coordinatorId,
    createdAt: user.createdAt.toISOString(),
  };
}
