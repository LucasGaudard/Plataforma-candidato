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

export type DirectVideoUploadResult = {
  secureUrl: string;
  publicId: string;
  resourceType: 'video';
};

export const DIRECT_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export class DirectVideoUploadError extends Error {
  constructor(message: string, readonly code: string, readonly stage: 'CLOUDINARY_DIRECT_UPLOAD') {
    super(message);
    this.name = 'DirectVideoUploadError';
  }
}

type UploadResponse = { done?: boolean; secure_url?: string; public_id?: string; resource_type?: string; error?: { message?: string } };

function uploadChunk(
  authorization: DirectVideoUploadAuthorization,
  file: File,
  start: number,
  end: number,
  uploadId: string,
  onProgress: (uploadedBytes: number) => void,
  createRequest: () => XMLHttpRequest,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const request = createRequest();
    request.open('POST', authorization.uploadUrl);
    request.setRequestHeader('X-Unique-Upload-Id', uploadId);
    request.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${file.size}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(file.size, start + event.loaded));
    };
    request.onerror = () => reject(new DirectVideoUploadError('Falha de rede durante o upload do vídeo.', 'CLOUDINARY_NETWORK_ERROR', 'CLOUDINARY_DIRECT_UPLOAD'));
    request.onload = () => {
      let response: UploadResponse;
      try { response = JSON.parse(request.responseText) as UploadResponse; }
      catch { return reject(new DirectVideoUploadError('Resposta inválida do serviço de vídeo.', 'CLOUDINARY_INVALID_RESPONSE', 'CLOUDINARY_DIRECT_UPLOAD')); }
      if (request.status < 200 || request.status >= 300 || response.error) {
        return reject(new DirectVideoUploadError('O Cloudinary recusou o vídeo. Verifique o limite de upload e a cota da conta.', 'CLOUDINARY_UPLOAD_REJECTED', 'CLOUDINARY_DIRECT_UPLOAD'));
      }
      resolve(response);
    };
    const body = new FormData();
    body.append('file', file.slice(start, end), file.name);
    body.append('api_key', authorization.apiKey);
    body.append('timestamp', String(authorization.timestamp));
    body.append('signature', authorization.signature);
    body.append('folder', authorization.folder);
    body.append('public_id', authorization.publicId);
    request.send(body);
  });
}

export async function uploadVideoDirectlyToCloudinary(
  file: File,
  authorize: () => Promise<DirectVideoUploadAuthorization>,
  onProgress: (percent: number) => void,
  options: { createRequest?: () => XMLHttpRequest; createUploadId?: () => string } = {},
): Promise<DirectVideoUploadResult> {
  if (file.size > DIRECT_VIDEO_MAX_BYTES) throw new Error('O vídeo deve ter no máximo 500 MB.');
  const authorization = await authorize();
  if (file.size > authorization.maxBytes) throw new Error('O vídeo deve ter no máximo 500 MB.');
  const createRequest = options.createRequest || (() => new XMLHttpRequest());
  const uploadId = (options.createUploadId || (() => crypto.randomUUID()))();
  let finalResponse: UploadResponse | undefined;
  for (let start = 0; start < file.size; start += authorization.chunkSize) {
    const end = Math.min(file.size, start + authorization.chunkSize);
    finalResponse = await uploadChunk(authorization, file, start, end, uploadId, (uploaded) => {
      onProgress(Math.round((uploaded / file.size) * 100));
    }, createRequest);
  }
  if (!finalResponse?.secure_url || !finalResponse.public_id || finalResponse.resource_type !== 'video') {
    throw new DirectVideoUploadError('O Cloudinary não confirmou a conclusão do upload do vídeo.', 'CLOUDINARY_UPLOAD_INCOMPLETE', 'CLOUDINARY_DIRECT_UPLOAD');
  }
  onProgress(100);
  return { secureUrl: finalResponse.secure_url, publicId: finalResponse.public_id, resourceType: 'video' };
}
