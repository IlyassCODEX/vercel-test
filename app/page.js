"use client";
import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 text-gray-800">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-4">🚀 Vercel Test App</h1>
        <p className="mb-6">If you see this page, Next.js + React is working on Vercel!</p>

        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
        >
          Click me
        </button>

        <p className="mt-4">Count: {count}</p>
      </div>
    </main>
  );
}