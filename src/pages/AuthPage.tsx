import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Dumbbell, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TRAINER_CODE = "12345678910";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"trainer" | "student">("student");
  const [trainerCode, setTrainerCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) {
      toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (regRole === "trainer" && trainerCode !== TRAINER_CODE) {
      toast({ title: "Código inválido", description: "El código de entrenador no es correcto.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(regEmail, regPassword, regName, regRole);
    setLoading(false);
    if (error) {
      toast({ title: "Error al registrarse", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "¡Cuenta creada!", description: "Iniciando sesión..." });
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setResetSent(true);
      toast({ title: "Correo enviado", description: "Revisa tu bandeja de entrada para restablecer tu contraseña." });
    }
  };

  if (showReset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary neon-glow">
              <span className="text-lg font-bold text-primary-foreground" style={{ fontFamily: 'Orbitron' }}>CF</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-wider neon-text" style={{ fontFamily: 'Orbitron' }}>
              FITPRO
            </h1>
          </div>
          <Card className="card-glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Recuperar Contraseña</CardTitle>
              <CardDescription>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</CardDescription>
            </CardHeader>
            <CardContent>
              {resetSent ?
              <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Hemos enviado un enlace a <strong>{resetEmail}</strong>. Revisa tu correo (incluyendo spam).
                  </p>
                  <Button variant="outline" onClick={() => {setShowReset(false);setResetSent(false);}} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Volver al inicio
                  </Button>
                </div> :

              <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Correo electrónico</Label>
                    <Input
                    id="reset-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required />
                  
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar enlace"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => setShowReset(false)}>
                    <ArrowLeft className="h-4 w-4" /> Volver
                  </Button>
                </form>
              }
            </CardContent>
          </Card>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary neon-glow">
            <span className="text-lg font-bold text-primary-foreground" style={{ fontFamily: 'Orbitron' }}>CF</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-wider neon-text" style={{ fontFamily: 'Orbitron' }}>
            CipriFitness
          </h1>
          <p className="text-sm text-muted-foreground">Gestión de entrenamiento físico</p>
        </div>

        <Card className="card-glass border-border/50">
          <Tabs defaultValue="login">
            <CardHeader className="pb-3">
              <TabsList className="w-full grid grid-cols-2 bg-secondary/50">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Correo electrónico</Label>
                    <Input id="login-email" type="email" placeholder="tu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Cargando..." : "Iniciar Sesión"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="w-full text-center text-sm text-primary hover:underline">
                    
                    ¿Olvidaste tu contraseña?
                  </button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="space-y-4 mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Nombre completo</Label>
                    <Input id="reg-name" placeholder="Tu nombre" value={regName} onChange={(e) => setRegName(e.target.value)} required maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Correo electrónico</Label>
                    <Input id="reg-email" type="email" placeholder="tu@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Contraseña</Label>
                    <Input id="reg-password" type="password" placeholder="Mínimo 6 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de cuenta</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setRegRole("trainer")} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${regRole === "trainer" ? "border-primary bg-primary/10 neon-border" : "border-border hover:border-muted-foreground"}`}>
                        <Dumbbell className={`h-6 w-6 ${regRole === "trainer" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${regRole === "trainer" ? "text-primary" : "text-muted-foreground"}`}>Entrenador</span>
                      </button>
                      <button type="button" onClick={() => setRegRole("student")} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${regRole === "student" ? "border-primary bg-primary/10 neon-border" : "border-border hover:border-muted-foreground"}`}>
                        <User className={`h-6 w-6 ${regRole === "student" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${regRole === "student" ? "text-primary" : "text-muted-foreground"}`}>Alumno</span>
                      </button>
                    </div>
                  </div>
                  {regRole === "trainer" &&
                  <div className="space-y-2">
                      <Label htmlFor="trainer-code">Código de entrenador</Label>
                      <Input id="trainer-code" type="password" placeholder="Ingresa el código de validación" value={trainerCode} onChange={(e) => setTrainerCode(e.target.value)} required className="bg-secondary/30 border-primary/30" />
                      <p className="text-[11px] text-muted-foreground">Necesitas un código especial para registrarte como entrenador.</p>
                    </div>
                  }
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Cargando..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>);

}