import type { FastifyInstance } from 'fastify';
import { Role } from '@platform/types';
import {
  POST_VIDEO_MAX_BYTES,
  PostMediaTooLargeError,
  type PostMediaKind,
  validatePostMediaMetadata,
} from '../lib/post-media';
import { uploadPostMediaToCloudinary, type PostMediaUploadResult } from '../services/cloudinary.service';

type UploadMedia = (stream: NodeJS.ReadableStream & { truncated?: boolean }, options: {
  kind: PostMediaKind;
  campaignId: string;
}) => Promise<PostMediaUploadResult>;

export async function postUploadRoutes(
  fastify: FastifyInstance,
  options: { uploadMedia?: UploadMedia } = {},
) {
  const uploadMedia = options.uploadMedia ?? uploadPostMediaToCloudinary as UploadMedia;

  fastify.post<{ Params: { kind: PostMediaKind } }>(
    '/:kind',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const kind = request.params.kind;
      if (kind !== 'image' && kind !== 'video') {
        return reply.status(404).send({ message: 'Tipo de mídia não encontrado.' });
      }

      let part;
      try {
        part = await request.file({ limits: { files: 1, parts: 1, fileSize: POST_VIDEO_MAX_BYTES + 1 } });
      } catch (error) {
        request.log.warn({ code: (error as { code?: string }).code }, 'Upload multipart rejeitado');
        return reply.status(413).send({ message: 'Arquivo acima do limite permitido.' });
      }
      if (!part) return reply.status(400).send({ message: 'Envie um arquivo no campo file.' });

      const metadataError = validatePostMediaMetadata(kind, part.filename, part.mimetype);
      if (metadataError) {
        part.file.resume();
        return reply.status(415).send({ message: metadataError });
      }

      try {
        const uploaded = await uploadMedia(part.file, { kind, campaignId: request.user.campaignId });
        return reply.status(201).send(uploaded);
      } catch (error) {
        if (!part.file.destroyed) part.file.resume();
        if (error instanceof PostMediaTooLargeError || (error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply.status(413).send({ message: 'Arquivo acima do limite permitido.' });
        }
        const missingConfig = error instanceof Error && error.message === 'Cloudinary não configurado na API.';
        request.log.error({ kind, campaignId: request.user.campaignId }, 'Falha sanitizada no upload de mídia');
        return reply.status(missingConfig ? 503 : 502).send({
          message: missingConfig ? error.message : 'Não foi possível enviar a mídia. Tente novamente.',
        });
      }
    },
  );
}
