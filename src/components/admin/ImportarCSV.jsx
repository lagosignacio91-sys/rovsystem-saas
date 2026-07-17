import { useState, useRef } from 'react'
import { validarRut, validarEmail } from '../../lib/validaciones'

// Columnas del CSV real de GL Robótica: Área, Centro, Proveedor, Nombre, Rut, Correo, Teléfono
const COLUMNAS_CSV = ['area', 'centro', 'proveedor', 'nombre', 'rut', 'correoCorporativo', 'telefono']

function parsearCSV(texto) {
  const lineas = texto.trim().split('\n').filter(l => l.trim())
  // Saltar la primera línea si es encabezado (contiene texto no-email en la 4ta columna)
  const inicio = lineas[0]?.toLowerCase().includes('nombre') ? 1 : 0
  return lineas.slice(inicio).map(linea => {
    // Manejar punto y coma como separador alternativo (Excel en español)
    const sep  = linea.includes(';') ? ';' : ','
    const cols = linea.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
    const obj  = {}
    COLUMNAS_CSV.forEach((key, i) => { obj[key] = cols[i] ?? '' })
    // Sin team preasignado por centro: la asignación real la hace el admin
    // a mano en la vista previa (rota según turnos/licencias, no es fija).
    obj.teamId = ''
    return obj
  }).filter(op => op.nombre)
}

export default function ImportarCSV({ onImportar, onCerrar }) {
  const [filas, setFilas]           = useState([])
  const [password, setPassword]     = useState('')
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso]     = useState({ actual: 0, total: 0 })
  const [resultados, setResultados] = useState(null)
  const [errorArchivo, setErrorArchivo] = useState('')
  const [aviso, setAviso]           = useState('')
  const fileRef = useRef()

  const handleArchivo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setErrorArchivo('')
    if (file.size > 500 * 1024) {
      setErrorArchivo('El archivo no debe superar 500 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parsearCSV(ev.target.result)
        if (parsed.length === 0) {
          setErrorArchivo('No se encontraron operadores en el archivo. Verifica el formato.')
          return
        }
        if (parsed.length > 200) {
          setErrorArchivo('El archivo contiene más de 200 operadores. Divídelo en partes.')
          return
        }
        const invalidos = parsed.filter(op =>
          !validarEmail(op.correoCorporativo) ||
          (op.rut && !validarRut(op.rut))
        )
        if (invalidos.length > 0) {
          setErrorArchivo(
            `${invalidos.length} fila(s) con correo o RUT inválido: ${invalidos.slice(0, 3).map(o => o.nombre || o.correoCorporativo).join(', ')}${invalidos.length > 3 ? '…' : ''}`
          )
          return
        }
        setFilas(parsed.map(op => ({ ...op, esRelevo: false, estado: 'pendiente', password: '', incluir: true })))
      } catch {
        setErrorArchivo('Error al leer el archivo. Asegúrate de exportar como CSV.')
      }
    }
    reader.readAsText(file, 'ISO-8859-1')
  }

  const setFila = (i, key, val) => {
    setFilas(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f))
  }

  const handleImportar = async () => {
    const seleccionadas = filas.filter(f => f.incluir !== false)
    if (seleccionadas.length === 0) {
      setAviso('Marca al menos un operador para importar')
      return
    }
    if (!password.trim() && seleccionadas.some(f => !f.password.trim())) {
      setAviso('Ingresa una contraseña por defecto o individual para cada fila')
      return
    }
    setAviso('')
    setImportando(true)
    setProgreso({ actual: 0, total: seleccionadas.length })
    const res = await onImportar(seleccionadas, password, (actual, total) => setProgreso({ actual, total }))
    setResultados(res)
    setImportando(false)
  }

  // Vista de resultados post-importación
  if (resultados) {
    const ok    = resultados.filter(r => !r.error)
    const error = resultados.filter(r => r.error)
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.modal, maxWidth: '520px' }}>
          <h3 style={styles.titulo}>Importación completada</h3>
          <p style={styles.resumenOk}>✅ {ok.length} operadores creados correctamente</p>
          {error.length > 0 && (
            <>
              <p style={styles.resumenError}>❌ {error.length} fallaron:</p>
              <div style={styles.errorLista}>
                {error.map((r, i) => (
                  <div key={i} style={styles.errorFila}>
                    <span style={styles.errorNombre}>{r.nombre} ({r.correoCorporativo})</span>
                    <span style={styles.errorMsg}>{r.error}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <p style={styles.hintFinal}>Ahora ve a Centros → "Sincronizar operadores" para asignarlos a sus centros.</p>
          <button onClick={onCerrar} style={styles.btnConfirmar}>Cerrar</button>
        </div>
      </div>
    )
  }

  // Vista de progreso durante importación
  if (importando) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.modal, textAlign: 'center', maxWidth: '360px' }}>
          <h3 style={styles.titulo}>Importando operadores...</h3>
          <p style={styles.progressText}>{progreso.actual} de {progreso.total}</p>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${(progreso.actual / progreso.total) * 100}%` }} />
          </div>
          <p style={styles.hint}>Creando cuentas Firebase Auth y perfiles...</p>
        </div>
      </div>
    )
  }

  const seleccionadas = filas.filter(f => f.incluir !== false).length

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: '800px' }}>
        <div style={styles.header}>
          <h3 style={styles.titulo}>Importar operadores desde CSV</h3>
          <button onClick={onCerrar} style={styles.btnX}>✕</button>
        </div>

        {filas.length === 0 ? (
          <div style={styles.uploadZone} onClick={() => fileRef.current.click()}>
            <span style={styles.uploadIcon}>📂</span>
            <p style={styles.uploadLabel}>Haz clic para seleccionar el archivo CSV</p>
            <p style={styles.uploadHint}>
              Formato: Área, Centro, Proveedor, Nombre, RUT, Correo, Teléfono
            </p>
            {errorArchivo && <p style={styles.errorArchivo}>{errorArchivo}</p>}
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleArchivo} style={{ display: 'none' }} />
          </div>
        ) : (
          <>
            <p style={styles.previewLabel}>{filas.length} operadores detectados — {seleccionadas} marcados. Desmarca los que no quieras importar todavía, y asigná el team de cada uno si corresponde:</p>

            {/* Contraseña global */}
            <div style={styles.passwordGlobal}>
              <label style={styles.label}>Contraseña por defecto para todos</label>
              <input
                style={{ ...styles.input, maxWidth: '300px' }}
                type="password"
                placeholder="Dejar en blanco para usar la de cada fila"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <span style={styles.hint}>Recomendado: la misma de su correo corporativo</span>
            </div>

            {/* Tabla preview */}
            <div style={styles.tablaWrap}>
              <table style={styles.tabla}>
                <thead>
                  <tr>
                    <th style={styles.th}>Incluir</th>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Centro</th>
                    <th style={styles.th}>Correo Corp.</th>
                    <th style={styles.th}>Team</th>
                    <th style={styles.th}>¿Relevo?</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Contraseña</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={i} style={{ ...(i % 2 === 0 ? styles.trPar : styles.trImpar), opacity: f.incluir === false ? 0.4 : 1 }}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={f.incluir !== false}
                          onChange={e => setFila(i, 'incluir', e.target.checked)}
                          style={{ accentColor: '#3b82f6' }}
                        />
                      </td>
                      <td style={styles.td}><span style={styles.tdNombre}>{f.nombre}</span></td>
                      <td style={styles.td}><span style={styles.tdCorreo}>{f.centro}</span></td>
                      <td style={styles.td}><span style={styles.tdCorreo}>{f.correoCorporativo}</span></td>
                      <td style={styles.td}>
                        <input
                          style={styles.inputSmall}
                          value={f.teamId}
                          placeholder="team01..."
                          onChange={e => setFila(i, 'teamId', e.target.value)}
                        />
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={f.esRelevo}
                          onChange={e => setFila(i, 'esRelevo', e.target.checked)}
                          style={{ accentColor: '#3b82f6' }}
                        />
                      </td>
                      <td style={styles.td}>
                        <select style={styles.selectSmall} value={f.estado} onChange={e => setFila(i, 'estado', e.target.value)}>
                          <option value="activo">Activo</option>
                          <option value="descanso">Descanso</option>
                          <option value="pendiente">Pendiente</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        <input
                          style={styles.inputSmall}
                          type="password"
                          placeholder="(usa global)"
                          value={f.password}
                          onChange={e => setFila(i, 'password', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {aviso && <p style={styles.aviso}>{aviso}</p>}

            <div style={styles.btns}>
              <button onClick={() => { setFilas([]); setAviso('') }} style={styles.btnCancelar}>Cambiar archivo</button>
              <button onClick={handleImportar} style={styles.btnConfirmar}>
                Importar {seleccionadas} operadores
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' },
  modal:         { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', width: '100%', maxHeight: '90vh', overflowY: 'auto' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  titulo:        { color: '#f1f5f9', fontSize: '16px', fontWeight: '700' },
  btnX:          { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' },
  uploadZone:    { border: '2px dashed #334155', borderRadius: '12px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: '#0f172a' },
  uploadIcon:    { fontSize: '40px', display: 'block', marginBottom: '12px' },
  uploadLabel:   { color: '#f1f5f9', fontSize: '14px', fontWeight: '600', marginBottom: '8px' },
  uploadHint:    { color: '#64748b', fontSize: '12px' },
  errorArchivo:  { color: '#ef4444', fontSize: '12px', marginTop: '12px' },
  previewLabel:  { color: '#94a3b8', fontSize: '13px', marginBottom: '12px' },
  passwordGlobal:{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '12px', marginBottom: '16px' },
  label:         { color: '#94a3b8', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' },
  hint:          { color: '#475569', fontSize: '10px', display: 'block', marginTop: '4px' },
  hintFinal:     { color: '#94a3b8', fontSize: '12px', margin: '4px 0 16px', lineHeight: 1.5 },
  aviso:         { color: '#eab308', fontSize: '12px', marginBottom: '12px', textAlign: 'right' },
  input:         { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  tablaWrap:     { overflowX: 'auto', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px' },
  tabla:         { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th:            { padding: '8px 10px', background: '#0f172a', color: '#64748b', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #334155' },
  td:            { padding: '6px 8px', verticalAlign: 'middle' },
  trPar:         { background: '#1e293b' },
  trImpar:       { background: '#162032' },
  tdNombre:      { color: '#f1f5f9', fontWeight: '600', whiteSpace: 'nowrap' },
  tdCorreo:      { color: '#64748b', whiteSpace: 'nowrap', fontSize: '11px' },
  inputSmall:    { background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '11px', padding: '4px 8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  selectSmall:   { background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '11px', padding: '4px 8px', outline: 'none', width: '100%' },
  btns:          { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  btnCancelar:   { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '8px 20px', cursor: 'pointer', fontSize: '13px' },
  btnConfirmar:  { background: '#2563eb', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px 24px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  progressText:  { color: '#f1f5f9', fontSize: '24px', fontWeight: '700', margin: '16px 0 8px' },
  progressBar:   { background: '#0f172a', borderRadius: '999px', height: '8px', overflow: 'hidden', margin: '8px 0 16px' },
  progressFill:  { background: '#3b82f6', height: '100%', borderRadius: '999px', transition: 'width 0.3s' },
  resumenOk:     { color: '#22c55e', fontSize: '16px', fontWeight: '600', marginBottom: '8px' },
  resumenError:  { color: '#ef4444', fontSize: '14px', fontWeight: '600', margin: '12px 0 8px' },
  errorLista:    { background: '#0f172a', borderRadius: '8px', padding: '8px', maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' },
  errorFila:     { padding: '6px 0', borderBottom: '1px solid #1e293b' },
  errorNombre:   { display: 'block', color: '#f1f5f9', fontSize: '12px', fontWeight: '600' },
  errorMsg:      { display: 'block', color: '#ef4444', fontSize: '11px' },
}
