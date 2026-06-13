import { useEffect, useState } from 'react'
import './App.css'

interface DigestItem {
  id: string;
  date: string;
  title: string;
  html: string;
  source: string;
  sourceUrl: string;
  createdAt: string;
}

function App() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<DigestItem[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:3000";

  useEffect(() => {
    fetch(`${API_BASE}/digest`)
      .then(res => res.json())
      .then(data => setDates(data))
      .catch(err => console.error("Error fetching dates:", err));
  }, []);

  const fetchItems = async (date: string) => {
    setLoading(true);
    setSelectedDate(date);
    try {
      const res = await fetch(`${API_BASE}/digest/${date}`);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <header className="mb-8 mt-8">
          <h1 className="text-4xl font-bold tracking-tight">Daily Digest</h1>
          <p className="text-gray-500">Your curated daily overview</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <aside className="md:sticky md:top-8 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Dates</h2>
            <nav className="flex flex-col gap-2">
              {dates.map(date => (
                <button
                  key={date}
                  onClick={() => fetchItems(date)}
                  className={`text-left px-4 py_2 rounded-lg transition-all ${
                    selectedDate === date 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {date}
                </button>
              ))}
            </nav>
          </aside>

          <main className="md:col-span-3">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : items.length > 0 ? (
              <article className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="space-y-12">
                  {items.map(item => (
                    <section key={item.id} className="space-y-4">
                      <h3 className="text-2xl font-bold leading-tight">{item.title}</h3>
                      <div 
                        className="prose dark:prose-invert max-w-none" 
                        dangerouslySetInnerHTML={{ __html: item.html }} 
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        for more details, <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">click on this link</a>
                      </p>
                    </section>
                  ))}
                </div>
              </article>
            ) : (
              <div className="text-center py-24 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                Select a date to view items
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default App