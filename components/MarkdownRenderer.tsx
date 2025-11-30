
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  isChat?: boolean;
}

const components = (isChat: boolean) => ({
  a: ({ node, ...props }: any) => {
    const { href, children } = props;
    if (!href) return <span {...props}>{children}</span>;
    
    // Improved Regex to capture video ID from various YouTube URL formats
    // Matches: youtube.com/watch?v=ID, youtube.com/embed/ID, youtu.be/ID
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const youtubeMatch = href.match(youtubeRegex);

    if (youtubeMatch && youtubeMatch[1] && !isChat) {
      const videoId = youtubeMatch[1];
      return (
        <div className="my-6 rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-black aspect-video relative z-0">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full"
          />
        </div>
      );
    }
    
    return (
      <a 
        {...props} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-indigo-600 font-medium hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 transition-colors"
      >
        {children}
      </a>
    );
  },
  img: ({node, ...props}: any) => (
      <img 
        {...props} 
        className="rounded-lg shadow-md max-h-[400px] border border-gray-200 mx-auto my-4" 
        loading="lazy"
        alt={props.alt || "Image"}
      />
  ),
  h1: ({node, ...props}: any) => isChat 
    ? <strong {...props} className="block text-lg font-bold text-gray-900 mb-2" />
    : <h1 {...props} className="text-3xl font-bold text-slate-800 mb-4 mt-2 pb-2 border-b border-gray-200" />,
  h2: ({node, ...props}: any) => isChat
    ? <strong {...props} className="block text-md font-bold text-gray-800 mb-1" />
    : <h2 {...props} className="text-2xl font-bold text-slate-800 mb-3 mt-8" />,
  h3: ({node, ...props}: any) => <h3 {...props} className={`font-bold text-slate-700 mb-2 ${isChat ? 'text-sm' : 'text-xl mt-6'}`} />,
  p: ({node, ...props}: any) => <p {...props} className="mb-3 text-slate-700 leading-relaxed" />,
  ul: ({node, ...props}: any) => <ul {...props} className="list-disc pl-5 mb-3 text-slate-700 space-y-1" />,
  ol: ({node, ...props}: any) => <ol {...props} className="list-decimal pl-5 mb-3 text-slate-700 space-y-1" />,
  blockquote: ({node, ...props}: any) => (
    <blockquote {...props} className="border-l-4 border-indigo-500 bg-indigo-50/50 pl-3 py-1 my-3 italic text-slate-600 rounded-r" />
  ),
  code: ({node, inline, ...props}: any) => (
    inline 
      ? <code {...props} className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-xs font-mono border border-slate-200" />
      : <code {...props} className="block bg-slate-800 text-slate-200 p-3 rounded-lg overflow-x-auto text-xs font-mono my-3" />
  ),
});

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isChat = false }) => {
  return (
    <div className={`w-full bg-transparent ${isChat ? 'text-sm' : 'min-h-[200px]'}`}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          components={components(isChat)}
        >
          {content}
        </ReactMarkdown>
    </div>
  );
};
