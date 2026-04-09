import { useState, useEffect } from 'react';
import { Document } from '@/src/types';
import { documentService } from '@/src/services/documentService';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = documentService.subscribeToDocuments((docs) => {
      setDocuments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { documents, loading, error };
}
