import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import heroBg from '../assets/hero-pilates.png';
import { Eye, EyeOff } from "lucide-react";
import styles from './Login.module.css'

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
  <div className={styles.contenedorLogin}>

    {/* HERO IZQUIERDO */}
    <div
      className={styles.heroLogin}
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className={styles.capaHero}>
        <h2 className={styles.tituloHero}>Aqui y ahora Pilates Reformer</h2>
        <p className={styles.textoHero}>
          Gestiona tus clases de Pilates de forma simple y rápida.
        </p>
      </div>
    </div>

      {/* Lado Derecho: Formulario */}
      <div className={styles.ladoFormulario}>
        <div className={styles.envolturaFormulario}>
          <h1 className={styles.tituloFormulario}>Bienvenid@</h1>
          <p className={styles.subtitulo}>Por favor, ingresa tus credenciales</p>

          {/* form */}
          <form onSubmit={manejarEnvio}>
            <div className={styles.grupoEntrada}>
              <label className={styles.etiquetaCampo}>Email</label>
              <input
                type="email"
                className={styles.entradaTexto}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@correo.com"
              />

              {errores.correo && (
                <span className={styles.errorCampo}>
                  {errores.correo}
                </span>
              )}
            </div>

            <div className={styles.grupoEntrada}>
              <label className={styles.etiquetaCampo}>Contraseña</label>

              <div className={styles.contenedorPassword}>
                <input
                  type={mostrarContrasena ? "text" : "password"}
                  className={styles.entradaTexto}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  className={styles.botonOjo}
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
                <span className={styles.errorCampo}>
                  {errores.contrasena}
                </span>
              )}
            </div>

            {errores.general && (
              <p className={styles.mensajeError}>
                {errores.general}
              </p>
            )}

            <button
              type="submit"
              className={styles.botonEnviar}
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