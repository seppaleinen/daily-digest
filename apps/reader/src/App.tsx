import { useEffect, useState, useCallback } from 'react'
import './App.css'

interface DigestItem {
  id: number;
  date: string;
  title: string;
  html: string;
  source: string;
  sourceUrl: string;
  summary: string | null;
  summarize: boolean;
  createdAt: string;
}

function App() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<DigestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [summarizing, setSummarizing] = useState<Set<number>>(new Set());
  const [prompts, setPrompts] = useState<Record<number, string>>({});

  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

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

  const handleSummarize = useCallback(async (item: DigestItem) => {
    setSummarizing(prev => new Set(prev).add(item.id));
    try {
      const prompt = prompts[item.id] || undefined;
      const res = await fetch(`${API_BASE}/digest/${item.date}/items/${item.id}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Summarization failed");
      const data = await res.json();
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, summary: data.summary, summarize: true } : i));
      setPrompts(prev => { const next = { ...prev }; delete next[item.id]; return next; });
    } catch (err) {
      console.error("Summarization error:", err);
    } finally {
      setSummarizing(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }, [API_BASE, prompts]);

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
                  className={`text-left px-4 py-2 rounded-lg transition-all ${
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
                  {items.map(item => {
                    const isOpen = expanded.has(item.id);
                    return (
                      <section key={item.id} className="space-y-4">
                        <button
                          onClick={() => setExpanded(prev => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          })}
                          className="w-full text-left flex items-center gap-3 group"
                        >
                          <span className={`text-sm font-mono transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          <h3 className="text-2xl font-bold leading-tight group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h3>
                        </button>
                        {isOpen && (
                          <div className="pl-7 space-y-4">
                            {item.summary && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">Summary</h4>
                                <div
                                  className="prose dark:prose-invert max-w-none text-sm"
                                  dangerouslySetInnerHTML={{ __html: item.summary }}
                                />
                              </div>
                            )}
                            <div
                              className="prose dark:prose-invert max-w-none"
                              dangerouslySetInnerHTML={{ __html: item.html }}
                            />
                            <div className="flex items-center gap-3 text-sm">
                              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                View original
                              </a>
                              {!summarizing.has(item.id) && !item.summary && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSummarize(item); }}
                                  className="text-gray-500 hover:text-blue-600 underline"
                                >
                                  Summarize
                                </button>
                              )}
                            </div>
                            {!item.summary && (
                              <textarea
                                placeholder="Custom prompt (optional)"
                                value={prompts[item.id] || ""}
                                onChange={(e) => setPrompts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                rows={2}
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            )}
                            {summarizing.has(item.id) && (
                              <p className="text-sm text-gray-500">Generating summary...</p>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
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