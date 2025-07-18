"use client";
import { useState, useEffect } from "react";

interface LinkPreviewData {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName?: string;
}

interface LinkPreviewProps {
  url: string;
}

// Cache pour éviter de refaire les mêmes requêtes
const previewCache = new Map<string, LinkPreviewData>();

export default function LinkPreview({ url }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Vérifier le cache d'abord
        if (previewCache.has(url)) {
          setPreview(previewCache.get(url)!);
          setLoading(false);
          return;
        }
        
        // Appel à l'API backend pour récupérer les métadonnées OpenGraph
        const response = await fetch(`http://localhost:4000/link-preview?url=${encodeURIComponent(url)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Mettre en cache
          previewCache.set(url, data);
          setPreview(data);
        } else {
          console.error('Erreur API:', response.status, response.statusText);
          setError(true);
        }
      } catch (err) {
        console.error('Erreur lors de la récupération de la preview:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchPreview();
    }
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 p-3 bg-[#40444b] rounded-lg border border-[#23272a]">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-[#2f3136] rounded animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-[#2f3136] rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-[#2f3136] rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="mt-2 p-3 bg-[#40444b] rounded-lg border border-[#23272a] hover:bg-[#4f545c] transition-colors">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#5865f2] hover:underline break-all flex items-center gap-2"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {url}
        </a>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-[#40444b] rounded-lg border border-[#23272a] hover:bg-[#4f545c] transition-colors">
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block"
      >
        <div className="flex gap-3">
          {preview.image && (
            <img 
              src={preview.image} 
              alt={preview.title}
              className="w-16 h-16 object-cover rounded flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm mb-1 truncate">
              {preview.title}
            </h4>
            {preview.description && (
              <p className="text-gray-300 text-xs mb-1 line-clamp-2">
                {preview.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              {preview.siteName && (
                <span className="font-medium">{preview.siteName}</span>
              )}
              <span className="truncate">{url}</span>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
} 