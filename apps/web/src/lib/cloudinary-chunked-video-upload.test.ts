import assert from 'node:assert/strict';
import test from 'node:test';
import { DIRECT_VIDEO_MAX_BYTES, uploadVideoDirectlyToCloudinary } from './cloudinary-chunked-video-upload';

const MB = 1024 * 1024;
const authorization = {
  cloudName: 'test', uploadUrl: 'https://api.cloudinary.com/v1_1/test/video/upload', apiKey: 'key', timestamp: 123,
  signature: 'signature', folder: 'conecta-eleitor/campaign-1/posts/videos', publicId: 'post-video-id',
  maxBytes: DIRECT_VIDEO_MAX_BYTES, chunkSize: 10 * MB,
};

function fakeFile(size: number): File {
  return { name: 'paula.mp4', type: 'video/mp4', size, slice: () => new Blob(['chunk']) } as unknown as File;
}

function requestFactory(totalRequests: number, calls: Array<{ range: string; uploadId: string }>) {
  let count = 0;
  return () => {
    const headers = new Map<string, string>();
    const request = {
      status: 200, responseText: '', upload: {} as XMLHttpRequestUpload,
      open: () => undefined,
      setRequestHeader: (key: string, value: string) => headers.set(key, value),
      send: () => {
        count += 1;
        calls.push({ range: headers.get('Content-Range') || '', uploadId: headers.get('X-Unique-Upload-Id') || '' });
        request.responseText = count === totalRequests
          ? JSON.stringify({ done: true, secure_url: 'https://res.cloudinary.com/test/video.mp4', public_id: 'folder/post-video-id', resource_type: 'video' })
          : JSON.stringify({ done: false });
        request.onload?.({} as ProgressEvent);
      },
      onload: null as ((event: ProgressEvent) => void) | null,
      onerror: null as ((event: ProgressEvent) => void) | null,
    };
    return request as unknown as XMLHttpRequest;
  };
}

for (const sizeMb of [20, 90, 150, 300]) {
  test(`envia vídeo equivalente a ${sizeMb} MB diretamente em chunks`, async () => {
    const expectedChunks = Math.ceil(sizeMb / 10);
    const calls: Array<{ range: string; uploadId: string }> = [];
    const result = await uploadVideoDirectlyToCloudinary(fakeFile(sizeMb * MB), async () => authorization, () => undefined, {
      createRequest: requestFactory(expectedChunks, calls), createUploadId: () => 'upload-id',
    });
    assert.equal(calls.length, expectedChunks);
    assert.equal(calls.every((call) => call.uploadId === 'upload-id'), true);
    assert.equal(calls[0].range, `bytes 0-${10 * MB - 1}/${sizeMb * MB}`);
    assert.equal(result.secureUrl, 'https://res.cloudinary.com/test/video.mp4');
  });
}

test('rejeita acima de 500 MB antes de pedir autorização ou abrir request', async () => {
  let authorized = false;
  let requested = false;
  await assert.rejects(() => uploadVideoDirectlyToCloudinary(
    fakeFile(DIRECT_VIDEO_MAX_BYTES + 1), async () => { authorized = true; return authorization; }, () => undefined,
    { createRequest: () => { requested = true; return {} as XMLHttpRequest; } },
  ), /500 MB/);
  assert.equal(authorized, false);
  assert.equal(requested, false);
});

test('falha direta de rede ou CORS preserva código diagnóstico sanitizado', async () => {
  const request = {
    upload: {} as XMLHttpRequestUpload, open: () => undefined, setRequestHeader: () => undefined,
    send: () => request.onerror?.({} as ProgressEvent),
    onload: null as ((event: ProgressEvent) => void) | null,
    onerror: null as ((event: ProgressEvent) => void) | null,
  };
  await assert.rejects(
    () => uploadVideoDirectlyToCloudinary(fakeFile(20 * MB), async () => authorization, () => undefined, {
      createRequest: () => request as unknown as XMLHttpRequest, createUploadId: () => 'upload-id',
    }),
    (error: Error & { code?: string }) => error.code === 'CLOUDINARY_NETWORK_ERROR' && !error.message.includes('signature'),
  );
});
