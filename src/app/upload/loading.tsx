export default function UploadLoading() {
  return (
    <div className="bg-background flex h-[calc(100vh-3.75rem)] items-center justify-center overflow-y-auto">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
