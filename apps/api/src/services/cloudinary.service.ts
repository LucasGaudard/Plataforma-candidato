import type { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { pipePostMedia, POST_DIRECT_VIDEO_MAX_BYTES, type PostMediaKind } from '../lib/post-media';

export type PostMediaUploadResult = {
  secureUrl: string;
  publicId: string;
  resourceType: 'image' | 'video';
};

export type DirectVideoUploadAuthorization = {
  cloudName: string;
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  maxBytes: number;
  chunkSize: number;
};

export function readCloudinaryConfig(env: NodeJS.ProcessEnv = process.env) {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary não configurado na API.');
  }
  return { cloudName, apiKey, apiSecret };
}

export function cloudinaryConfigurationStatus(env: NodeJS.ProcessEnv = process.env) {
  return {
    cloudNameConfigured: Boolean(env.CLOUDINARY_CLOUD_NAME?.trim()),
    apiKeyConfigured: Boolean(env.CLOUDINARY_API_KEY?.trim()),
    apiSecretConfigured: Boolean(env.CLOUDINARY_API_SECRET?.trim()),
  };
}

export function createDirectVideoUploadAuthorization(campaignId: string): DirectVideoUploadAuthorization {
  const config = readCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `conecta-eleitor/${campaignId}/posts/videos`;
  const publicId = `post-video-${randomUUID()}`;
  const signature = cloudinary.utils.api_sign_request({ folder, public_id: publicId, timestamp }, config.apiSecret);
  return {
    cloudName: config.cloudName,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/video/upload`,
    apiKey: config.apiKey,
    timestamp,
    signature,
    folder,
    publicId,
    maxBytes: POST_DIRECT_VIDEO_MAX_BYTES,
    chunkSize: 10 * 1024 * 1024,
  };
}

export async function uploadPostMediaToCloudinary(
  input: Readable,
  options: { kind: PostMediaKind; campaignId: string },
): Promise<PostMediaUploadResult> {
  const config = readCloudinaryConfig();
  cloudinary.config({ cloud_name: config.cloudName, api_key: config.apiKey, api_secret: config.apiSecret, secure: true });

  let resolveUpload!: (result: UploadApiResponse) => void;
  let rejectUpload!: (error: Error) => void;
  const resultPromise = new Promise<UploadApiResponse>((resolve, reject) => {
    resolveUpload = resolve;
    rejectUpload = reject;
  });
  const upload = cloudinary.uploader.upload_stream({
    resource_type: options.kind,
    folder: `conecta-eleitor/${options.campaignId}/posts/${options.kind === 'image' ? 'images' : 'videos'}`,
    use_filename: false,
    unique_filename: true,
    overwrite: false,
  }, (error, result) => {
    if (error || !result) rejectUpload(new Error('Falha no upload para o Cloudinary.'));
    else resolveUpload(result);
  });

  try {
    await pipePostMedia(options.kind, input, upload);
    const result = await resultPromise;
    return { secureUrl: result.secure_url, publicId: result.public_id, resourceType: options.kind };
  } catch (error) {
    upload.destroy();
    void resultPromise.catch(() => undefined);
    throw error;
  }
}
