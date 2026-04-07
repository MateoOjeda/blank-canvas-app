import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Dumbbell, User, ArrowLeft, Mail, Lock, UserPlus, LogIn, Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TRAINER_CODE = "12345678910a";

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  
  // Login/Register state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"trainer" | "student">("student");
  const [trainerCode, setTrainerCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleAuthError = (err: any, context: string) => {
    console.error(`Error in ${context}:`, err);
    let title = "Error";
    let description = err.message || "Ocurrió un error inesperado";

    if (err.code === 'auth/unauthorized-domain') {
      title = "Dominio no autorizado";
      description = "Google Sign-In requiere que el dominio actual esté autorizado en la consola de Firebase. En localhost, asegúrate de añadirlo en Firebase Console > Auth > Settings.";
    } else if (err.code === 'auth/operation-not-allowed') {
      title = "Proveedor deshabilitado";
      description = "Debes habilitar el proveedor (Email o Google) en la consola de Firebase.";
    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      title = "Credenciales inválidas";
      description = "El correo o la contraseña son incorrectos.";
    } else if (err.code === 'auth/email-already-in-use') {
      title = "Email en uso";
      description = "Este correo ya está registrado. Intenta iniciar sesión.";
    }

    toast({ title, description, variant: "destructive" });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        if (password.length < 6) {
          toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (role === "trainer" && trainerCode !== TRAINER_CODE) {
          toast({ title: "Código inválido", description: "El código de entrenador no es correcto.", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name, role);
        if (error) throw error;
        toast({ title: "¡Cuenta creada!", description: "Bienvenido a CipriFitness" });
      }
    } catch (err) {
      handleAuthError(err, isLogin ? "Login" : "Register");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle(role);
      if (error) throw error;
    } catch (err) {
      handleAuthError(err, "Google Auth");
    } finally {
      setLoading(true); // Keep loading while redirecting
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) throw error;
      setResetSent(true);
      toast({ title: "Correo enviado", description: "Revisa tu bandeja de entrada." });
    } catch (err) {
      handleAuthError(err, "Reset Password");
    } finally {
      setLoading(false);
    }
  };

  if (showReset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-in fade-in duration-500">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/20 neon-glow border-2 border-primary/40">
              <span className="text-xl font-bold text-primary" style={{ fontFamily: 'Orbitron' }}>CF</span>
            </div>
            <h1 className="font-display text-2xl font-black tracking-wider uppercase italic" style={{ fontFamily: 'Orbitron' }}>FITPRO</h1>
          </div>
          <Card className="card-premium border-border/40 bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Recuperar Acceso</CardTitle>
              <CardDescription className="text-xs font-medium">Ingresa tu correo para recibir las instrucciones de recuperación.</CardDescription>
            </CardHeader>
            <CardContent>
              {resetSent ? (
                <div className="text-center space-y-6 py-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                    <Mail className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium px-4">
                    Instrucciones enviadas a <strong>{resetEmail}</strong>. Por favor, revisa tu correo.
                  </p>
                  <Button variant="outline" onClick={() => {setShowReset(false); setResetSent(false);}} className="w-full h-12 rounded-2xl gap-2 font-bold uppercase tracking-widest text-[10px]">
                    <ArrowLeft className="h-4 w-4" /> Volver al Inicio
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-widest ml-1">Correo electrónico</Label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input id="reset-email" type="email" placeholder="email@ejemplo.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required className="pl-11 h-12 rounded-2xl bg-secondary/30 border-border/40 focus:border-primary/50" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar Enlace"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full gap-2 text-xs font-bold" onClick={() => setShowReset(false)}>
                    <ArrowLeft className="h-4 w-4" /> Cancelar
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-accent/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10 transition-all duration-500">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-primary/10 border-2 border-primary/30 shadow-2xl shadow-primary/10 group transition-all duration-500 hover:rotate-12">
            <span className="text-2xl font-black text-primary tracking-tighter" style={{ fontFamily: 'Orbitron' }}>CF</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-black tracking-tighter uppercase italic leading-none" style={{ fontFamily: 'Orbitron' }}>
              Cipri<span className="text-primary italic-none tracking-normal">Fitness</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">Professional Training System</p>
          </div>
        </div>

        <Card className="card-premium border-border/40 bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden">
          <CardHeader className="text-center pb-2 pt-10">
            <CardTitle className="text-2xl font-black uppercase tracking-tight italic leading-none">
              {isLogin ? "Bienvenido de nuevo" : "Únete al equipo"}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1.5 px-4 leading-relaxed">
              {isLogin ? "Accede a tus rutinas y planes personalizados" : "Comienza tu transformación física hoy mismo"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 pt-6">
            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="reg-name" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground/80">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-name" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className="input-premium pl-11 h-12 rounded-2xl bg-secondary/30" />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground/80">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-premium pl-11 h-12 rounded-2xl bg-secondary/30" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Contraseña</Label>
                  {isLogin && (
                    <button type="button" onClick={() => setShowReset(true)} className="text-[9px] font-black uppercase tracking-wider text-primary hover:text-primary/70 transition-colors">¿Olvidaste tu contraseña?</button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-premium pl-11 h-12 rounded-2xl bg-secondary/30" />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-4 py-2 animate-in slide-in-from-top-2 duration-400">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground/80">Soy un...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setRole("student")} className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all duration-300 group ${role === "student" ? "bg-primary/20 border-primary shadow-xl shadow-primary/10" : "bg-white/5 border-border/40 hover:bg-white/10"}`}>
                      <User className={`h-6 w-6 mb-2 transition-colors ${role === "student" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${role === "student" ? "text-primary" : "text-muted-foreground"}`}>Alumno</span>
                    </button>
                    <button type="button" onClick={() => setRole("trainer")} className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all duration-300 group ${role === "trainer" ? "bg-accent/20 border-accent shadow-xl shadow-accent/10" : "bg-white/5 border-border/40 hover:bg-white/10"}`}>
                      <Dumbbell className={`h-6 w-6 mb-2 transition-colors ${role === "trainer" ? "text-accent" : "text-muted-foreground"}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${role === "trainer" ? "text-accent" : "text-muted-foreground"}`}>Trainer</span>
                    </button>
                  </div>
                  {role === "trainer" && (
                    <div className="space-y-2 animate-in zoom-in-95 duration-300">
                       <Label htmlFor="trainer-code" className="text-[10px] font-black uppercase tracking-widest ml-1 text-accent">Código de Acceso Pro</Label>
                       <Input id="trainer-code" type="password" placeholder="Código maestro" value={trainerCode} onChange={(e) => setTrainerCode(e.target.value)} required className="h-12 rounded-2xl bg-accent/5 border-accent/20 text-accent font-bold text-center spacing-8" />
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full h-14 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 mt-2 flex items-center justify-center gap-3 transition-transform active:scale-[0.98]" disabled={loading}>
                {loading ? (
                   <Zap className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                    {isLogin ? "Iniciar Sesión" : "Crear Mi Cuenta"}
                  </>
                )}
              </Button>

              <div className="relative my-6 px-10">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-[9px] uppercase font-black tracking-widest">
                  <span className="bg-card px-3 text-muted-foreground opacity-60">O elige otra vía</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full h-12 rounded-2xl border-border/40 bg-white/5 hover:bg-white/10 font-bold uppercase tracking-widest text-[9px] gap-3 shadow-lg" onClick={handleGoogleLogin} disabled={loading}>
                <Chrome className="h-4 w-4" />
                Continuar con Google
              </Button>
              
              <p className="text-center text-[11px] font-medium text-muted-foreground mt-6">
                {isLogin ? "¿No tienes cuenta aún?" : "¿Ya eres parte del equipo?"}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="ml-2 font-black text-primary uppercase tracking-wider hover:underline decoration-2 underline-offset-4">
                  {isLogin ? "Registrarme" : "Iniciar Sesión"}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}