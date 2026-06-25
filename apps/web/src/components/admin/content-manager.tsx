'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { WhatsappModal } from '@/components/communication/whatsapp-modal';

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
  const [items, setItems] = useState<(PostPublic | EventPublic | LivePublic)[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [postForm, setPostForm] = useState<CreatePostRequest>(emptyPost);
  const [eventForm, setEventForm] = useState<CreateEventRequest>(emptyEvent);
  const [liveForm, setLiveForm] = useState<CreateLiveRequest>(emptyLive);

  const [whatsappContent, setWhatsappContent] = useState<{
    type: 'POST' | 'EVENTO' | 'LIVE';
    title: string;
    description: string;
  } | null>(null);

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
      setPostForm({
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl || '',
        videoUrl: p.videoUrl || '',
        category: p.category,
        published: p.published,
        publishedAt: p.publishedAt,
      });
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

  function openWhatsappModal(item: PostPublic | EventPublic | LivePublic) {
    const contentType = type === 'posts' ? 'POST' : type === 'events' ? 'EVENTO' : 'LIVE';
    setWhatsappContent({
      type: contentType,
      title: item.title,
      description: item.description,
    });
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
                <Input label="URL do vídeo" value={postForm.videoUrl} error={errors.videoUrl}
                  onChange={(e) => setPostForm({ ...postForm, videoUrl: e.target.value })} />
                <Select label="Categoria" options={categoryOptions} value={postForm.category}
                  onChange={(e) => setPostForm({ ...postForm, category: e.target.value as PostCategory })} />
                <Input label="Data de publicação" type="datetime-local"
                  value={postForm.publishedAt ? postForm.publishedAt.slice(0, 16) : ''}
                  onChange={(e) => setPostForm({ ...postForm, publishedAt: new Date(e.target.value).toISOString() })} />
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
              <Button type="submit" loading={saving}>{editingId ? 'Salvar' : 'Criar'}</Button>
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
                  <Button size="sm" onClick={() => openWhatsappModal(item)}>Enviar WhatsApp</Button>
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

      <WhatsappModal
        isOpen={!!whatsappContent}
        onClose={() => setWhatsappContent(null)}
        content={whatsappContent}
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
