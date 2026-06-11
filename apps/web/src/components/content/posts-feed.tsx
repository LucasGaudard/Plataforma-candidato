'use client';

import { useEffect, useState } from 'react';
import type { PostPublic } from '@platform/types';
import { CardSkeleton, EmptyState } from '@platform/ui';
import { api } from '@/lib/api';
import { PostCard } from './post-card';

interface PostsFeedProps {
  limit?: number;
  title?: string;
}

export function PostsFeed({ limit = 6, title = 'Últimas novidades' }: PostsFeedProps) {
  const [posts, setPosts] = useState<PostPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getPosts({ limit })
      .then((res) => setPosts(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div>
        {title && <h2 className="mb-6 text-2xl font-bold text-brand-900">{title}</h2>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon="📢"
        title="Nenhum conteúdo ainda"
        description="Em breve teremos novidades da campanha por aqui."
      />
    );
  }

  return (
    <div>
      {title && <h2 className="mb-6 text-2xl font-bold text-brand-900">{title}</h2>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} compact />
        ))}
      </div>
    </div>
  );
}
