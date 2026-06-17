"use client";

import { useEffect, useState } from "react";

interface Lesson {
  id: string;
  title: string;
  description: string;
  level: "principiante" | "intermedio" | "avanzado";
  duration: string;
  content?: string;
}

interface GlossaryTerm {
  term: string;
  definition: string;
}

function levelColor(level: string) {
  if (level === "principiante") return { bg: "rgba(0,212,170,0.12)", color: "var(--green)" };
  if (level === "intermedio") return { bg: "rgba(61,124,255,0.12)", color: "var(--blue)" };
  return { bg: "rgba(255,71,87,0.12)", color: "var(--red)" };
}

export default function LearnPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<string>("");
  const [lessonLoading, setLessonLoading] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [glossarySearch, setGlossarySearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("completed_lessons");
    if (saved) setCompleted(JSON.parse(saved));
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(false);
    try {
      const [lRes, gRes] = await Promise.all([
        fetch("http://localhost:8000/api/education/lessons"),
        fetch("http://localhost:8000/api/education/glossary"),
      ]);
      const [lData, gData] = await Promise.all([lRes.json(), gRes.json()]);
      setLessons(lData);
      setGlossary(gData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function openLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setLessonLoading(true);
    setLessonContent("");
    try {
      const res = await fetch(`http://localhost:8000/api/education/lessons/${lesson.id}`);
      const data = await res.json();
      setLessonContent(data.content ?? "");
    } catch {
      setLessonContent("No se pudo cargar el contenido.");
    } finally {
      setLessonLoading(false);
    }
  }

  function markComplete(id: string) {
    const next = completed.includes(id) ? completed.filter((x) => x !== id) : [...completed, id];
    setCompleted(next);
    localStorage.setItem("completed_lessons", JSON.stringify(next));
  }

  const filteredGlossary = glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      g.definition.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          🎓 Academia de Trading
        </h1>
        <p className="mt-1" style={{ color: "var(--text-muted)" }}>
          Aprende desde cero con lecciones simples y un glosario completo.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center justify-between"
          style={{ background: "rgba(255,71,87,0.1)", border: "1px solid var(--red)" }}
        >
          <span style={{ color: "var(--red)" }}>No se pudieron cargar los datos</span>
          <button
            onClick={fetchData}
            className="px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Lessons */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Lecciones
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl h-32"
                  style={{ background: "var(--bg-card)" }}
                />
              ))
            : lessons.map((lesson) => {
                const lc = levelColor(lesson.level);
                const done = completed.includes(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => openLesson(lesson)}
                    className="rounded-xl p-5 text-left relative cursor-pointer transition-all hover:opacity-80"
                    style={{
                      background: "var(--bg-card)",
                      border: `1px solid ${done ? "var(--green)" : "var(--border)"}`,
                    }}
                  >
                    {done && (
                      <span
                        className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(0,212,170,0.15)", color: "var(--green)" }}
                      >
                        ✓ Completado
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ background: lc.bg, color: lc.color }}
                      >
                        {lesson.level}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {lesson.duration}
                      </span>
                    </div>
                    <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      {lesson.title}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {lesson.description}
                    </p>
                  </button>
                );
              })}
        </div>
      </section>

      {/* Glossary */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Glosario
          </h2>
          <input
            type="text"
            placeholder="Buscar término..."
            value={glossarySearch}
            onChange={(e) => setGlossarySearch(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none w-56"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl h-20"
                  style={{ background: "var(--bg-card)" }}
                />
              ))
            : filteredGlossary.map((g) => (
                <div
                  key={g.term}
                  className="rounded-xl p-4"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <p className="font-bold mb-1" style={{ color: "var(--blue)" }}>
                    {g.term}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {g.definition}
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* Lesson Modal */}
      {selectedLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelectedLesson(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {selectedLesson.title}
              </h3>
              <button
                onClick={() => setSelectedLesson(null)}
                className="cursor-pointer text-xl leading-none ml-4"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>
            {lessonLoading ? (
              <div className="animate-pulse h-40 rounded-xl" style={{ background: "var(--bg-card)" }} />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-muted)" }}>
                {lessonContent}
              </p>
            )}
            <button
              onClick={() => {
                markComplete(selectedLesson.id);
                setSelectedLesson(null);
              }}
              className="mt-6 px-5 py-2 rounded-lg font-semibold text-sm cursor-pointer"
              style={{ background: "var(--green)", color: "#0a0f1e" }}
            >
              {completed.includes(selectedLesson.id) ? "Marcar como pendiente" : "Marcar como completado ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
