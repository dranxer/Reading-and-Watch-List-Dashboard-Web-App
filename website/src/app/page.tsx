import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Track Your Intellectual Journey
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Automatically log and share what you read and watch, powered by local AI
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
              <Link
                href="/extension"
                className="bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Download Extension
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Automatic Tracking</h3>
              <p className="text-gray-600">
                Browser extension automatically logs your reading and watching history
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">AI Summaries</h3>
              <p className="text-gray-600">
                Local LLM generates smart summaries of your content
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Share & Discover</h3>
              <p className="text-gray-600">
                Follow others and discover interesting content
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
