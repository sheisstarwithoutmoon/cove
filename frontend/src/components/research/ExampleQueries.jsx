import React from 'react';

const EXAMPLES = [
  "Impact of AI on healthcare in 2024",
  "Latest breakthroughs in quantum computing",
  "How does CRISPR gene editing work?",
];

export default function ExampleQueries({ setQuery }) {
  return (
    <div className="examples">
      {EXAMPLES.map((q) => (
        <button key={q} className="ex-btn" onClick={() => setQuery(q)}>
          {q}
        </button>
      ))}
    </div>
  );
}
