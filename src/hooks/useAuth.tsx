interface AuthContextType {
  // Actualizamos la firma de signUp para recibir el código opcional
  signUp: (email: string, password: string, name: string, role: AppRole, trainerCode?: string) => Promise<{ error: Error | null }>;
}

//(dentro de AuthProvider)
  const signUp = async (email: string, password: string, name: string, role: AppRole, trainerCode?: string) => {
    
    // 1. VALIDACIÓN DEL CÓDIGO ESPECIAL
    if (role === "trainer") {
      if (trainerCode !== "12345678910") {
        return { error: new Error("Código de autorización profesional inválido. Acceso denegado.") };
      }
    }

    // 2. REGISTRO EN SUPABASE
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Guardamos el rol en los metadatos para que tus Triggers de base de datos
        // puedan leerlo y crear el perfil automáticamente
        data: { 
          display_name: name, 
          role: role 
        },
      },
    });

    if (error) return { error: error as Error | null };

    return { error: null };
  };

// ... (el resto del archivo se mantiene igual)
