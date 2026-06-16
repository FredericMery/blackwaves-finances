export default function BlockToolbar({ addBlock }: any) {
  
  const blocks = ["text", "gallery"];

  return (
    <div>
      <h2 className="font-bold mb-4">Ajouter un bloc</h2>
      <div className="space-y-2">
        {blocks.map(type => (
          <button
            key={type}
            onClick={() => addBlock(type)}
            className="w-full border rounded-lg p-2 text-left hover:bg-gray-100"
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}