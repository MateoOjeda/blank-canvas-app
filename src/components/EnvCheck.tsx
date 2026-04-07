export function EnvCheck({ children }: { children: React.ReactNode }) {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !appId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error de Configuración de Firebase</h1>
          <p className="text-muted-foreground">
            Las variables de entorno <code className="text-sm bg-muted px-1 rounded">VITE_FIREBASE_API_KEY</code> y{" "}
            <code className="text-sm bg-muted px-1 rounded">VITE_FIREBASE_APP_ID</code> no están configuradas.
          </p>
          <p className="text-sm text-muted-foreground">
            Configúralas en tu panel de control de Firebase o en tu archivo .env local.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
