import { useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function ComingSoonPage() {
  const { pathname } = useLocation();
  const name = pathname.replace('/', '').replace(/-/g, ' ');
  useDocumentTitle(name.charAt(0).toUpperCase() + name.slice(1));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-bold mb-4 capitalize">{name}</h1>
      <p className="text-gray-400">This feature is coming soon.</p>
    </div>
  );
}
