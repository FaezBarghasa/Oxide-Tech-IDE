export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-ide-bg">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ide-text"></div>
    </div>
  );
}
