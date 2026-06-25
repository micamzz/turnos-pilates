import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import heroBg from '../assets/hero-pilates.png';
import './Login.css';
import { Eye, EyeOff } from "lucide-react";

function Login() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false)
  const navegar = useNavigate()

  async function manejarEnvio(e) {
    e.preventDefault();

    const nuevosErrores = {};

    if (!correo.trim()) {
      nuevosErrores.correo = "El email es obligatorio";
    }

    if (!contrasena.trim()) {
      nuevosErrores.contrasena = "La contraseña es obligatoria";
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setErrores({});
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    setCargando(false);

    if (error) {
      setErrores({
        general: "Email o contraseña incorrectos",
      });
      return;
    }

    navegar("/home");
  }


  return (
    <div className="contenedor-login">
      {/* Lado Izquierdo: Imagen de fondo Hero */}
      <div
        className="hero-login"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="capa-hero">
          <h2>Aqui y ahora Pilates Reformer</h2>
          <p>Gestiona tus clases de Pilates de forma simple y rápida.</p>
        </div>
      </div>

      {/* Lado Derecho: Formulario */}
      <div className="lado-formulario">
        <div className="envoltura-formulario">
          <h1>Bienvenid@</h1>
          <p className="subtitulo">Por favor, ingresa tus credenciales</p>

          {/* form */}
          <form onSubmit={manejarEnvio}>
            <div className="grupo-entrada">
              <label>Email</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@correo.com"
              />

              {errores.correo && (
                <span className="error-campo">
                  {errores.correo}
                </span>
              )}
            </div>

            <div className="grupo-entrada">
              <label>Contraseña</label>

              <div className="contenedor-password">
                <input
                  type={mostrarContrasena ? "text" : "password"}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  className="boton-ojo"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  aria-label={
                    mostrarContrasena
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarContrasena ? (
                    <EyeOff size={18} strokeWidth={2} />
                  ) : (
                    <Eye size={18} strokeWidth={2} />
                  )}
                </button>
              </div>

              {errores.contrasena && (
                <span className="error-campo">
                  {errores.contrasena}
                </span>
              )}
            </div>

            {errores.general && (
              <p className="mensaje-error">
                {errores.general}
              </p>
            )}

            <button
              type="submit"
              className="boton-enviar"
              disabled={cargando}
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

        </div>
      </div>
    </div>
  )


}

export default Login