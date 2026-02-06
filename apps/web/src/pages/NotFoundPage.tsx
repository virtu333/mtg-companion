import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-gray-400 mb-6">Page not found.</p>
      <Link
        to="/mulligan"
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-block"
      >
        Go to Mulligan Simulator
      </Link>
    </div>
  );
}
