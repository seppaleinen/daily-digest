import { useEffect, useState } from 'react'
import './App.css'

interface DigestItem {
  id: string;
  date: string;
  title: string;
  html: string;
  source: string;
  createdAt: string;
}

function App() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<DigestItem[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:3000";

  useEffect(() => {
    fetch(`${API_BASE}/`)
      .then(res => res.json())
      .then(data => setDates(data))
      .catch(err => console.error("Error fetching dates:", err));
  }, []);

  const fetchItems = async (date: string) => {
    setLoading(true);
    setSelectedDate(date);
    try {
      const res = await fetch(`${API_BASE}/${date}`);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Daily Digest</h1>
          <p className="text-gray-500">Your curated daily overview</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <aside className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Dates</h2>
            <div className="flex flex-col gap-1">
              {dates.map(date => (
                <button
                  key={date}
                  onClick={() => fetchItems(date)}
                  className={`text-left px-4 py-2 rounded-md transition-colors ${
                    selectedDate === date 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>
          </aside>

          <main className="md:col-span-2">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : items.length > 0 ? (
              <div className="space-y-6">
                {items.map(item => (
                  <article key={item.id} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold">{item.title}</h3>
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 uppercase">
                        {item.source}
                      </span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: item.html }} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
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
