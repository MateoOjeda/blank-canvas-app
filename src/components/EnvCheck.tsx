export function EnvCheck({ children }: { children: React.ReactNode }) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error de Configuración</h1>
          <p className="text-muted-foreground">
            Las variables de entorno <code className="text-sm bg-muted px-1 rounded">VITE_SUPABASE_URL</code> y{" "}
            <code className="text-sm bg-muted px-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code> no están configuradas.
          </p>
          <p className="text-sm text-muted-foreground">
            Configúralas en tu panel de Netlify en <strong>Site settings → Environment variables</strong>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
