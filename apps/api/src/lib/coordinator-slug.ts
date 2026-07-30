import { generateSlug } from '@platform/utils';
import { prisma } from './prisma';

export async function generateUniqueCoordinatorSlug(firstName: string, lastName: string): Promise<string> {
  const base = generateSlug(firstName, lastName) || 'coordenador';
  let slug = base;
  let attempt = 1;
  while (await prisma.user.findUnique({ where: { coordinatorSlug: slug }, select: { id: true } })) {
    slug = `${base}-${attempt}`;
    attempt += 1;
  }
  return slug;
}
