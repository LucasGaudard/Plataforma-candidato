'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CreateEventRequest,
  CreateLiveRequest,
  CreatePostRequest,
  EventPublic,
  LivePublic,
  PostCategory,
  PostPublic,
} from '@platform/types';
import { PostCategory as PostCategoryEnum } from '@platform/types';
import { Badge, Button, Card, ConfirmModal, EmptyState, Input, Select } from '@platform/ui';
import { api } from '@/lib/api';
import { formatCategory, formatDate } from '@/lib/format';
import { useToast } from '@/contexts/toast-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Role } from '@platform/types';
import { saveContentCommunicationDraft } from '@/lib/content-communication-draft';
import { datetimeLocalValueToIso, isoToDatetimeLocalValue, postToForm } from '@/lib/post-form';
import { applyUploadedMediaUrl, type PostMediaKind, validatePostMediaFile } from '@/lib/post-media-upload';

type ContentType = 'posts' | 'events' | 'lives';

interface ContentManagerProps {
  type: ContentType;
  title: string;
}

const categoryOptions = Object.values(PostCategoryEnum).map((c) => ({
  value: c,
  label: formatCategory(c),
}));

const emptyPost: CreatePostRequest = {
  title: '',
  description: '',
  imageUrl: '',
  videoUrl: '',
  category: PostCategoryEnum.GERAL,
  published: true,
};

const emptyEvent: CreateEventRequest = {
  title: '',
  description: '',
  location: '',
  date: '',
  time: '',
  published: true,
};

const emptyLive: CreateLiveRequest = {
  title: '',
  description: '',
  thumbnailUrl: '',
  youtubeUrl: '',
  published: true,
};

function ContentManagerInner({ type, title }: ContentManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<(PostPublic | EventPublic | LivePublic)[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [postForm, setPostForm] = useState<CreatePostRequest>(emptyPost);
  const [eventForm, setEventForm] = useState<CreateEventRequest>(emptyEvent);
  const [liveForm, setLiveForm] = useState<CreateLiveRequest>(emptyLive);
  const [uploading, setUploading] = useState<PostMediaKind | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<PostMediaKind, string>>({ image: '', video: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (type === 'posts') {
        setItems(await api.getAdminPosts());
      } else if (type === 'events') {
        setItems(await api.getAdminEvents());
      } else {
        setItems(await api.getAdminLives());
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [type, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setErrors({});
    setPostForm(emptyPost);
    setEventForm(emptyEvent);
    setLiveForm(emptyLive);
    setUploadStatus({ image: '', video: '' });
  }

  async function handleMediaFile(kind: PostMediaKind, file: File | undefined) {
    if (!file) return;
    const validationError = validatePostMediaFile(kind, file);
    if (validationError) {
      setUploadStatus((current) => ({ ...current, [kind]: validationError }));
      return;
    }
    setUploading(kind);
    setUploadStatus((current) => ({ ...current, [kind]: `Enviando ${file.name}...` }));
    try {
      const result = await api.uploadPostMedia(kind, file);
      setPostForm((current) => applyUploadedMediaUrl(current, kind, result.secureUrl));
      setUploadStatus((current) => ({ ...current, [kind]: `Upload concluído: ${file.name}` }));
    } catch (error) {
      setUploadStatus((current) => ({ ...current, [kind]: (error as Error).message || 'Falha no upload.' }));
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (type === 'posts') {
        if (editingId) {
          await api.updatePost(editingId, postForm);
          toast('Post atualizado!', 'success');
        } else {
          await api.createPost(postForm);
          toast('Post criado!', 'success');
        }
      } else if (type === 'events') {
        if (editingId) {
          await api.updateEvent(editingId, eventForm);
          toast('Evento atualizado!', 'success');
        } else {
          await api.createEvent(eventForm);
          toast('Evento criado!', 'success');
        }
      } else {
        if (editingId) {
          await api.updateLive(editingId, liveForm);
          toast('Live atualizada!', 'success');
        } else {
          await api.createLive(liveForm);
          toast('Live criada!', 'success');
        }
      }
      resetForm();
      load();
    } catch (err) {
      const error = err as Error & { errors?: Record<string, string> };
      if (error.errors) setErrors(error.errors);
      toast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  function requestDelete(id: string) {
    setItemToDelete(id);
    setConfirmModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return;
    setLoading(true);
    try {
      if (type === 'posts') await api.deletePost(itemToDelete);
      else if (type === 'events') await api.deleteEvent(itemToDelete);
      else await api.deleteLive(itemToDelete);
      toast('Excluído com sucesso!', 'success');
      setConfirmModalOpen(false);
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
      setLoading(false);
    }
  }

  function startEdit(item: PostPublic | EventPublic | LivePublic) {
    setEditingId(item.id);
    if (type === 'posts') {
      const p = item as PostPublic;
      setPostForm(postToForm(p));
    } else if (type === 'events') {
      const ev = item as EventPublic;
      setEventForm({
        title: ev.title,
        description: ev.description,
        location: ev.location,
        date: ev.date.split('T')[0],
        time: ev.time,
        published: ev.published,
      });
    } else {
      const l = item as LivePublic;
      setLiveForm({
        title: l.title,
        description: l.description,
        thumbnailUrl: l.thumbnailUrl || '',
        youtubeUrl: l.youtubeUrl,
        scheduledAt: l.scheduledAt?.split('T')[0],
        published: l.published,
      });
    }
  }

  function createCommunication(item: PostPublic | EventPublic | LivePublic) {
    saveContentCommunicationDraft(sessionStorage, type, item);
    router.push('/dashboard/comunicacao/sessoes');
  }

  return (
    <DashboardLayout title={title} subtitle={editingId ? 'Editando' : 'Criar e gerenciar conteúdo'}>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-brand-900">
            {editingId ? 'Editar' : 'Novo'} {type === 'posts' ? 'post' : type === 'events' ? 'evento' : 'live'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === 'posts' && (
              <>
                <Input label="Título *" value={postForm.title} error={errors.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} />
                <Input label="Descrição *" value={postForm.description} error={errors.description}
                  onChange={(e) => setPostForm({ ...postForm, description: e.target.value })} />
                <Input label="URL da imagem" value={postForm.imageUrl} error={errors.imageUrl}
                  onChange={(e) => setPostForm({ ...postForm, imageUrl: e.target.value })} />
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label htmlFor="post-image-upload" className="block text-sm font-medium text-slate-700">Imagem</label>
                  <input id="post-image-upload" className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:font-medium file:text-brand-800" type="file" accept="image/*"
                    disabled={uploading !== null} onChange={(e) => void handleMediaFile('image', e.target.files?.[0])} />
                  <p className="mt-2 text-xs text-slate-500">JPG, PNG ou WebP, até 10 MB. O upload substitui a URL acima.</p>
                  {uploadStatus.image && <p className="mt-1 text-xs font-medium text-slate-700">{uploadStatus.image}</p>}
                  {postForm.imageUrl && <div role="img" aria-label="Prévia da imagem do post" className="mt-3 h-40 rounded-lg bg-contain bg-left bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(postForm.imageUrl)})` }} />}
                </div>
                <Input label="URL do vídeo" value={postForm.videoUrl} error={errors.videoUrl}
                  onChange={(e) => setPostForm({ ...postForm, videoUrl: e.target.value })} />
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label htmlFor="post-video-upload" className="block text-sm font-medium text-slate-700">Vídeo</label>
                  <input id="post-video-upload" className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:font-medium file:text-brand-800" type="file" accept="video/*"
                    disabled={uploading !== null} onChange={(e) => void handleMediaFile('video', e.target.files?.[0])} />
                  <p className="mt-2 text-xs text-slate-500">MP4 ou WebM, até 100 MB. O upload substitui a URL acima.</p>
                  {uploadStatus.video && <p className="mt-1 text-xs font-medium text-slate-700">{uploadStatus.video}</p>}
                </div>
                <Select label="Categoria" options={categoryOptions} value={postForm.category}
                  onChange={(e) => setPostForm({ ...postForm, category: e.target.value as PostCategory })} />
                <Input label="Data de publicação" type="datetime-local"
                  value={isoToDatetimeLocalValue(postForm.publishedAt)} error={errors.publishedAt}
                  onChange={(e) => setPostForm({ ...postForm, publishedAt: datetimeLocalValueToIso(e.target.value) })} />
              </>
            )}
            {type === 'events' && (
              <>
                <Input label="Título *" value={eventForm.title} error={errors.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
                <Input label="Descrição *" value={eventForm.description} error={errors.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
                <Input label="Local *" value={eventForm.location} error={errors.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
                <Input label="Data *" type="date" value={eventForm.date} error={errors.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
                <Input label="Horário *" value={eventForm.time} error={errors.time} placeholder="19:00"
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} />
              </>
            )}
            {type === 'lives' && (
              <>
                <Input label="Título *" value={liveForm.title} error={errors.title}
                  onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })} />
                <Input label="Descrição *" value={liveForm.description} error={errors.description}
                  onChange={(e) => setLiveForm({ ...liveForm, description: e.target.value })} />
                <Input label="Link YouTube *" value={liveForm.youtubeUrl} error={errors.youtubeUrl}
                  onChange={(e) => setLiveForm({ ...liveForm, youtubeUrl: e.target.value })} />
                <Input label="URL da thumbnail" value={liveForm.thumbnailUrl} error={errors.thumbnailUrl}
                  onChange={(e) => setLiveForm({ ...liveForm, thumbnailUrl: e.target.value })} />
                <Input label="Data agendada" type="datetime-local"
                  value={liveForm.scheduledAt ? liveForm.scheduledAt.slice(0, 16) : ''}
                  onChange={(e) => setLiveForm({ ...liveForm, scheduledAt: new Date(e.target.value).toISOString() })} />
              </>
            )}
            <div className="flex gap-3">
              <Button type="submit" loading={saving} disabled={uploading !== null}>{uploading ? 'Aguarde o upload' : editingId ? 'Salvar' : 'Criar'}</Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
            </div>
          </form>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Lista</h2>
          {loading && <p className="text-sm text-slate-400">Carregando...</p>}
          {!loading && items.length === 0 && (
            <EmptyState icon="📭" title="Nenhum item cadastrado" />
          )}
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} padding="sm" className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{item.title}</p>
                  {'category' in item && (
                    <Badge variant="info" className="mt-1">{formatCategory(item.category)}</Badge>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate('publishedAt' in item ? item.publishedAt : item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => requestDelete(item.id)}>Excluir</Button>
                  <Button size="sm" onClick={() => createCommunication(item)}>Criar comunicação</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModalOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModalOpen(false)}
        isLoading={loading}
      />

    </DashboardLayout>
  );
}

export function ContentManager(props: ContentManagerProps) {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <ContentManagerInner {...props} />
    </ProtectedRoute>
  );
}
