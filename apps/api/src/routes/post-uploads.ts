import type { FastifyInstance } from 'fastify';
import { Role } from '@platform/types';
import {
  POST_VIDEO_MAX_BYTES,
  PostMediaTooLargeError,
  type PostMediaKind,
  validatePostMediaMetadata,
  validateDirectVideoUpload,
} from '../lib/post-media';
import { cloudinaryConfigurationStatus, createDirectVideoUploadAuthorization, uploadPostMediaToCloudinary, type DirectVideoUploadAuthorization, type PostMediaUploadResult } from '../services/cloudinary.service';

type UploadMedia = (stream: NodeJS.ReadableStream & { truncated?: boolean }, options: {
  kind: PostMediaKind;
  campaignId: string;
}) => Promise<PostMediaUploadResult>;

export async function postUploadRoutes(
  fastify: FastifyInstance,
  options: { uploadMedia?: UploadMedia; authorizeVideo?: (campaignId: string) => DirectVideoUploadAuthorization } = {},
) {
  const uploadMedia = options.uploadMedia ?? uploadPostMediaToCloudinary as UploadMedia;
  const authorizeVideo = options.authorizeVideo ?? createDirectVideoUploadAuthorization;

  fastify.post<{ Body: { filename?: string; mimetype?: string; size?: number } }>(
    '/video/authorize',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const validationError = validateDirectVideoUpload(
        request.body?.filename || '',
        request.body?.mimetype || '',
        request.body?.size ?? Number.NaN,
      );
      if (validationError) return reply.status(validationError.includes('500 MB') ? 413 : 400).send({
        message: validationError,
        code: validationError.includes('500 MB') ? 'UPLOAD_TOO_LARGE' : 'UPLOAD_VALIDATION_FAILED',
      });
      try {
        return reply.send(authorizeVideo(request.user.campaignId));
      } catch (error) {
        const missingConfig = error instanceof Error && error.message === 'Cloudinary não configurado na API.';
        request.log.error({
          campaignId: request.user.campaignId,
          stage: 'CLOUDINARY_AUTHORIZATION',
          code: (error as { code?: string }).code,
          ...cloudinaryConfigurationStatus(),
        }, 'Falha sanitizada ao autorizar upload de vídeo');
        return reply.status(missingConfig ? 503 : 500).send({
          message: missingConfig ? error.message : 'Não foi possível autorizar o upload do vídeo.',
          code: missingConfig ? 'CLOUDINARY_NOT_CONFIGURED' : 'CLOUDINARY_AUTHORIZATION_FAILED',
        });
      }
    },
  );

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
        return reply.status(413).send({ message: 'Arquivo acima do limite permitido.', code: 'UPLOAD_TOO_LARGE' });
      }
      if (!part) return reply.status(400).send({ message: 'Envie um arquivo no campo file.', code: 'UPLOAD_FILE_MISSING' });

      const metadataError = validatePostMediaMetadata(kind, part.filename, part.mimetype);
      if (metadataError) {
        part.file.resume();
        return reply.status(415).send({ message: metadataError, code: 'UPLOAD_MEDIA_TYPE_INVALID' });
      }

      try {
        const uploaded = await uploadMedia(part.file, { kind, campaignId: request.user.campaignId });
        return reply.status(201).send(uploaded);
      } catch (error) {
        if (!part.file.destroyed) part.file.resume();
        if (error instanceof PostMediaTooLargeError || (error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply.status(413).send({ message: 'Arquivo acima do limite permitido.', code: 'UPLOAD_TOO_LARGE' });
        }
        const missingConfig = error instanceof Error && error.message === 'Cloudinary não configurado na API.';
        const cloudinaryError = error as { code?: string; http_code?: number; name?: string };
        request.log.error({
          kind,
          campaignId: request.user.campaignId,
          stage: 'CLOUDINARY_UPLOAD',
          errorName: cloudinaryError.name,
          cloudinaryCode: cloudinaryError.code,
          cloudinaryHttpCode: cloudinaryError.http_code,
          ...cloudinaryConfigurationStatus(),
        }, 'Falha sanitizada no upload de mídia');
        return reply.status(missingConfig ? 503 : 502).send({
          message: missingConfig ? error.message : 'Não foi possível enviar a mídia. Tente novamente.',
          code: missingConfig ? 'CLOUDINARY_NOT_CONFIGURED' : 'CLOUDINARY_UPLOAD_FAILED',
        });
      }
    },
  );
}
