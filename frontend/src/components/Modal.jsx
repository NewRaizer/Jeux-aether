export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border-2 border-ink bg-surface shadow-hard rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-4 py-2.5">
          <h3 className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-paper">
            {title}
          </h3>
          <button
            className="flex h-6 w-6 items-center justify-center text-paper transition hover:text-accent"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
