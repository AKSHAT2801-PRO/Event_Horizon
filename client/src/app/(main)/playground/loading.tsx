export default function Loading() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <p className="text-xl font-semibold mb-4">Loading simulation...</p>

        <div className="w-64 h-2 bg-gray-700 rounded">
          <div className="h-full bg-blue-500 animate-pulse rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
