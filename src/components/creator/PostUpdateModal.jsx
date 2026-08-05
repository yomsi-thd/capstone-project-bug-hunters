export default function PostUpdateModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-xl w-full max-w-[500px] p-6 relative shadow-2xl overflow-y-auto max-h-full">
        <button onClick={onClose} className="absolute top-4 right-4 bg-transparent border-none text-xl text-gray-400 hover:text-gray-600 cursor-pointer">×</button>
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Post Project Update</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[12px] text-blue-700 mb-4 leading-relaxed">
          ℹ Updates are emailed directly to your backers and posted publicly on your project page.
        </div>
        <div className="mb-3">
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">UPDATE TITLE</label>
          <input placeholder="e.g., Prototype Phase 1 Completed!" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
        </div>
        <div className="mb-3">
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">UPDATE CONTENT</label>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex gap-2">
              {["B", "I", "≡", "⊞", "🔗"].map(t => (
                <button key={t} className="bg-transparent border-none text-[13px] font-bold text-gray-500 px-1.5 py-0.5 hover:bg-gray-200 rounded cursor-pointer">{t}</button>
              ))}
            </div>
            <textarea placeholder="Share the details of your progress..." className="w-full border-none outline-none px-3 py-2.5 text-[13px] min-h-[80px] resize-y" />
          </div>
        </div>
        <div className="mb-5">
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">MEDIA ATTACHMENTS</label>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-7 text-center cursor-pointer hover:border-brand transition-colors">
            <div className="text-2xl text-gray-300 mb-1.5">☁</div>
            <div className="text-[13px] font-semibold text-gray-600">Click to upload or drag and drop</div>
            <div className="text-[11px] text-gray-300 mt-1">SVG, PNG, JPG or GIF (max. 800×400px)</div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50">CANCEL</button>
          <button className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-5 py-2 text-[13px] font-bold cursor-pointer transition-colors">POST UPDATE</button>
        </div>
      </div>
    </div>
  );
}