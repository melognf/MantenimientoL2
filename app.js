import { db } from './firebase-config.js';
import {
  doc, setDoc, updateDoc, getDoc, onSnapshot, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ══════════════════════════════════════════
// MODO DE ACCESO
// ══════════════════════════════════════════
const PASS_ADMIN = 'L3L7';
let modoAdmin = false;

// Inyectar pantalla de selección de modo
const pantallaAccesoHTML = `
<div id="pantalla-acceso" style="
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: #222;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  gap: 20px;
">
  <h2 style="color: white; font-size: 1.4rem; letter-spacing: 2px; margin-bottom: 10px;">
    MANTENIMIENTO LÍNEA 2
  </h2>
  <p style="color: #aaa; font-size: 0.95rem; margin-bottom: 20px;">Seleccioná tu modo de acceso</p>

  <button id="btn-modo-lectura" style="
    padding: 14px 40px;
    font-size: 1rem;
    font-weight: bold;
    background-color: #444;
    color: white;
    border: 2px solid #666;
    border-radius: 8px;
    cursor: pointer;
    width: 240px;
    transition: background 0.2s;
  ">👁️ Modo Lectura</button>

  <button id="btn-modo-admin" style="
    padding: 14px 40px;
    font-size: 1rem;
    font-weight: bold;
    background-color: #FE001A;
    color: white;
    border: 2px solid #cc0015;
    border-radius: 8px;
    cursor: pointer;
    width: 240px;
    transition: background 0.2s;
  ">🔐 Modo Administrador</button>

  <div id="acceso-pass-container" style="display:none; flex-direction:column; align-items:center; gap:10px; margin-top:10px;">
    <input id="acceso-pass-input" type="password" placeholder="Contraseña" style="
      padding: 10px 16px;
      font-size: 1rem;
      border-radius: 6px;
      border: 2px solid #555;
      background: #333;
      color: white;
      width: 240px;
      text-align: center;
    " />
    <p id="acceso-error" style="color:#ff6666; font-size:0.85rem; display:none;">Contraseña incorrecta</p>
    <button id="btn-confirmar-admin" style="
      padding: 10px 30px;
      font-size: 0.95rem;
      font-weight: bold;
      background-color: #FE001A;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      width: 240px;
    ">Ingresar</button>
  </div>
</div>
`;
document.body.insertAdjacentHTML('afterbegin', pantallaAccesoHTML);

function cerrarPantallaAcceso() {
  const pantalla = document.getElementById('pantalla-acceso');
  pantalla.style.opacity = '0';
  pantalla.style.transition = 'opacity 0.4s ease';
  setTimeout(() => pantalla.remove(), 400);
  aplicarModo();
}

function aplicarModo() {
  // Indicador visual en el header
  const indicador = document.getElementById('indicador-modo');
  if (indicador) {
    indicador.textContent = modoAdmin ? '🔐 Admin' : '👁️ Lectura';
    indicador.style.color = modoAdmin ? '#FE001A' : '#aaa';
  }

  // Actualizar botones de máquina que ya existen en el DOM
  actualizarBotonesAdmin();
}

function actualizarBotonesAdmin() {
  const display = modoAdmin ? 'inline-block' : 'none';
  document.querySelectorAll('.btn-om, .btn-falla, .btn-accion-admin').forEach(btn => {
    btn.style.display = display;
  });
}

document.getElementById('btn-modo-lectura').addEventListener('click', () => {
  modoAdmin = false;
  cerrarPantallaAcceso();
});

document.getElementById('btn-modo-admin').addEventListener('click', () => {
  const cont = document.getElementById('acceso-pass-container');
  cont.style.display = 'flex';
  document.getElementById('acceso-pass-input').focus();
});

function intentarIngresoAdmin() {
  const entrada = (document.getElementById('acceso-pass-input').value ?? '')
    .normalize('NFKC').trim();
  const error = document.getElementById('acceso-error');

  if (entrada === PASS_ADMIN) {
    modoAdmin = true;
    error.style.display = 'none';
    cerrarPantallaAcceso();
  } else {
    error.style.display = 'block';
    document.getElementById('acceso-pass-input').value = '';
    document.getElementById('acceso-pass-input').focus();
  }
}

document.getElementById('btn-confirmar-admin').addEventListener('click', intentarIngresoAdmin);

document.getElementById('acceso-pass-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') intentarIngresoAdmin();
});

// ══════════════════════════════════════════
// MÁQUINAS
// ══════════════════════════════════════════
const maquinas = [
  "LLENADORA", "SEAMER", "FLEETWOOD", "WARMER",
  "OCME", "DEPALETIZADORA", "PALETIZADORA", "TRANSPORTES"
];

const container = document.getElementById('maquinas-container');
const modal = document.getElementById('modal-om');
const repuestosLista = document.getElementById('repuestos-lista');

// Inyectar indicador de modo en el header
const header = document.querySelector('header');
if (header) {
  const ind = document.createElement('span');
  ind.id = 'indicador-modo';
  ind.style.cssText = 'font-size:0.8rem; font-weight:bold; margin-left:8px;';
  header.appendChild(ind);
}

// --- MODAL FALLA CRÍTICA ---
const modalFallaHTML = `
<div id="modal-falla" style="
  display: none;
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.5);
  justify-content: center;
  align-items: center;
  z-index: 1001;
">
  <div style="
    background: white;
    padding: 20px;
    border-radius: 10px;
    max-width: 500px;
    width: 90%;
    border-top: 4px solid red;
  ">
    <h3 style="color:red;">⚠️ Registrar Falla Crítica</h3>
    <input id="falla-titulo" placeholder="Título de la falla" style="width:100%; margin-bottom:10px;" /><br/>
    <textarea id="falla-descripcion" placeholder="Descripción detallada" style="width:100%; min-height:80px; resize:vertical;"></textarea><br/>
    <div style="margin-top:10px; display:flex; justify-content:space-between;">
      <button id="guardar-falla" style="background-color:red; color:white; border:none; padding:8px 16px; border-radius:5px; cursor:pointer;">Guardar Falla</button>
      <button id="cerrar-modal-falla" style="padding:8px 16px; border-radius:5px; cursor:pointer;">Cancelar</button>
    </div>
  </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalFallaHTML);

const modalFalla = document.getElementById('modal-falla');
let maquinaFallaActual = null;

document.getElementById('cerrar-modal-falla').addEventListener('click', () => {
  modalFalla.style.display = 'none';
});

document.getElementById('guardar-falla').addEventListener('click', () => {
  const titulo = document.getElementById('falla-titulo').value.trim();
  const descripcion = document.getElementById('falla-descripcion').value.trim();

  if (!titulo || !descripcion) {
    alert('Por favor completá el título y la descripción.');
    return;
  }

  const ref = doc(db, "maquinas", maquinaFallaActual);
  setDoc(ref, { fallaTitulo: titulo, fallaDescripcion: descripcion }, { merge: true })
    .then(() => { modalFalla.style.display = 'none'; })
    .catch(error => {
      console.error("❌ Error al guardar la falla crítica:", error);
      alert("Error al guardar la falla crítica.");
    });
});

// --- ESTADO MÁQUINA ACTUAL ---
let maquinaActual = null;

maquinas.forEach(maquina => {
  const div = document.createElement('div');
  div.className = 'maquina estado-verde';
  div.id = `box-${maquina}`;
  div.style.display = "none";
  div.innerHTML = `
    <h2>${maquina}</h2>
    <div id="progreso-${maquina}" style="margin:10px;"></div>
    <div id="om-container-${maquina}"></div>
    <button class="btn-om" style="display:none;">Agregar OM</button>
    <button class="btn-falla" style="display:none;">Falla Crítica</button>
    <div id="contenido-${maquina}"></div>
  `;
  container.appendChild(div);

  div.querySelector('.btn-om').addEventListener('click', () => {
    maquinaActual = maquina;
    abrirModalOM();
  });

  div.querySelector('.btn-falla').addEventListener('click', () => fallaCritica(maquina));

  const ref = doc(db, "maquinas", maquina);
  onSnapshot(ref, (docSnap) => {
    const box = document.getElementById(`box-${maquina}`);
    const contenido = document.getElementById(`contenido-${maquina}`);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const tieneFalla = !!(data.fallaTitulo && data.fallaDescripcion);
      const omList = Array.isArray(data.omList) ? data.omList : [];

      if (tieneFalla) {
        box.className = 'maquina estado-rojo';
      } else if (omList.length === 0 || omList.every(om => om.realizada)) {
        box.className = 'maquina estado-verde';
      } else {
        box.className = 'maquina estado-amarillo';
      }

      renderAroProgreso(maquina, omList, tieneFalla);

      let omHtml = omList.map((om, index) => {
        const repuestosHtml = Array.isArray(om.repuestos) && om.repuestos.length > 0
          ? `<div style="text-align:left; margin-top:5px;">
              <strong>Repuestos:</strong>
              <ul style="padding-left:15px;">
                ${om.repuestos.map(rep => `
                  <li><strong>${rep.codigo}</strong> - ${rep.descripcion} (x${rep.cantidad})</li>
                `).join('')}
              </ul>
            </div>` : "";

        // Botones de acción: siempre se generan, visibilidad la maneja actualizarBotonesAdmin()
        const botonesAccion = `
          <button onclick="editarOM('${maquina}', ${index})" class="boton-om btn-accion-admin">
            ✏️ <span class="boton-texto">Editar</span>
          </button>
          <button onclick="eliminarOM('${maquina}', ${index})" class="boton-om btn-accion-admin" style="background-color:#fff; color:white;">
            ❌
          </button>
          ${om.realizada
            ? `<button disabled style="padding:2px 5px; font-size:12px; background-color:#4CAF50; color:white; border:none; border-radius:3px; min-width:85px;">✅ Realizada</button>`
            : `<button onclick="marcarRealizada('${maquina}', ${index})" class="btn-accion-admin" style="padding:2px 5px; font-size:12px; background-color:#ccc; border:none; border-radius:3px; cursor:pointer; min-width:85px;">Realizada ✅</button>`
          }
        `;

        return `
        <div style="border:1px dashed #000; margin:5px; padding:5px;">
          <p><strong>OM:</strong> ${om.om}</p>
          <p><strong>${om.titulo}</strong></p>
          <p><em><strong>Responsables:</strong> ${om.responsables || "No asignado"}</em></p>
          <p>${om.descripcion.replace(/\n/g, "<br>")}</p>
          ${repuestosHtml}
          <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end;">
            ${botonesAccion}
          </div>
        </div>`;
      }).join('');

      // Botón X de falla: siempre se genera, visibilidad la maneja actualizarBotonesAdmin()
      const botonEliminarFalla = `<button onclick="eliminarFalla('${maquina}')" class="btn-accion-admin" style="position:absolute; top:5px; right:5px;
            padding:2px 6px; font-size:12px; background-color:white; color:red;
            border:1px solid red; border-radius:3px; cursor:pointer;">X</button>`;

      contenido.innerHTML = `
        ${tieneFalla ? `
          <div style="border:2px solid red; padding:10px; margin-top:10px; position:relative; background:white;">
            ${botonEliminarFalla}
            <p><strong>FALLA:</strong> ${data.fallaTitulo}</p>
            <p>${data.fallaDescripcion}</p>
          </div>` : ""
        }
        ${omHtml}
      `;
    } else {
      box.className = 'maquina estado-verde';
      contenido.innerHTML = '';
      renderAroProgreso(maquina, [], false);
    }

    // Sincronizar visibilidad de botones con el modo actual
    actualizarBotonesAdmin();
  });
});

// --- FUNCIONES DE OM ---

function abrirModalOM() {
  document.getElementById('om-numero').value = '';
  document.getElementById('om-titulo').value = '';
  document.getElementById('om-responsables').value = '';
  document.getElementById('om-descripcion').value = '';
  repuestosLista.innerHTML = '';

  const btnGuardar = document.getElementById('guardar-om');
  btnGuardar.onclick = guardarNuevaOM;

  modal.style.display = 'flex';
}

document.getElementById('cerrar-modal').addEventListener('click', () => {
  modal.style.display = 'none';
});

document.getElementById('agregar-repuesto').addEventListener('click', () => {
  const cont = document.createElement("div");
  cont.style.marginBottom = "10px";
  cont.style.borderBottom = "1px solid #ccc";
  cont.style.paddingBottom = "10px";
  cont.classList.add("repuesto-item");
  cont.innerHTML = `
    <input placeholder="Descripción" class="rep-desc" style="display:block; width:100%; margin-bottom:5px;" />
    <div style="display:flex; gap:5px; align-items:center;">
      <input type="number" class="rep-cod sin-flechas" placeholder="SAP" style="flex:1;" />
      <input type="number" placeholder="Cantidad" class="rep-cant" style="width:140px;" />
      <button onclick="this.closest('.repuesto-item').remove()" style="background:white; color:white; border:none; border-radius:5px; padding:4px 8px;">❌</button>
    </div>
  `;
  document.getElementById("repuestos-lista").appendChild(cont);
});

async function guardarNuevaOM() {
  const om = document.getElementById('om-numero').value.trim();
  const titulo = document.getElementById('om-titulo').value.trim();
  const responsables = document.getElementById('om-responsables').value.trim();
  const descripcion = document.getElementById('om-descripcion').value.trim();

  const repuestos = Array.from(repuestosLista.children).map(div => ({
    codigo: div.querySelector('.rep-cod').value.trim(),
    descripcion: div.querySelector('.rep-desc').value.trim(),
    cantidad: parseInt(div.querySelector('.rep-cant').value.trim()) || 0
  }));

  const nuevaOM = { om, titulo, responsables, descripcion, repuestos, realizada: false };

  const ref = doc(db, "maquinas", maquinaActual);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, { omList: arrayUnion(nuevaOM) });
  } else {
    await setDoc(ref, { omList: [nuevaOM] });
  }

  modal.style.display = 'none';
}

document.getElementById('guardar-om').onclick = guardarNuevaOM;

async function eliminarOM(maquina, index) {
  if (!confirm("¿Estás seguro de eliminar esta OM?")) return;

  const ref = doc(db, "maquinas", maquina);
  const docSnap = await getDoc(ref);

  if (!docSnap.exists()) return;

  const data = docSnap.data();
  const omList = Array.isArray(data.omList) ? data.omList : [];
  omList.splice(index, 1);
  await updateDoc(ref, { omList });
}

function fallaCritica(maquina) {
  maquinaFallaActual = maquina;
  document.getElementById('falla-titulo').value = '';
  document.getElementById('falla-descripcion').value = '';
  modalFalla.style.display = 'flex';
}

function eliminarFalla(maquina) {
  if (!confirm("¿Estás seguro de que querés eliminar la Falla Crítica?")) return;
  const ref = doc(db, "maquinas", maquina);
  updateDoc(ref, { fallaTitulo: "", fallaDescripcion: "" });
}

function marcarRealizada(maquina, index) {
  const ref = doc(db, "maquinas", maquina);
  getDoc(ref).then(docSnap => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    const omList = Array.isArray(data.omList) ? data.omList : [];
    if (index < 0 || index >= omList.length) return;
    omList[index] = { ...omList[index], realizada: true };
    updateDoc(ref, { omList });
  });
}

function editarOM(maquina, index) {
  const ref = doc(db, "maquinas", maquina);
  getDoc(ref).then(docSnap => {
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const om = data.omList?.[index];
    if (!om) return;

    document.getElementById("om-numero").value = om.om || "";
    document.getElementById("om-titulo").value = om.titulo || "";
    document.getElementById("om-responsables").value = om.responsables || "";
    document.getElementById("om-descripcion").value = om.descripcion || "";

    const lista = document.getElementById("repuestos-lista");
    lista.innerHTML = "";
    (om.repuestos || []).forEach(rep => {
      const div = document.createElement("div");
      div.classList.add("repuesto-item");
      div.style.marginBottom = "10px";
      div.style.borderBottom = "1px solid #ccc";
      div.style.paddingBottom = "10px";
      div.innerHTML = `
        <input placeholder="Descripción" class="rep-desc" value="${rep.descripcion || ""}" style="display:block; width:100%; margin-bottom:5px;" />
        <div style="display:flex; gap:5px; align-items:center;">
          <input type="number" class="rep-cod sin-flechas" placeholder="SAP" value="${rep.codigo || ""}" style="flex:1;" />
          <input type="number" placeholder="Cantidad" class="rep-cant" value="${rep.cantidad || 1}" style="width:140px;" />
          <button onclick="this.closest('.repuesto-item').remove()" style="background:white; border:none; border-radius:5px; padding:4px 8px;">❌</button>
        </div>
      `;
      lista.appendChild(div);
    });

    document.getElementById("modal-om").style.display = "flex";

    const btnGuardar = document.getElementById("guardar-om");
    btnGuardar.onclick = () => {
      const nuevoOM = {
        om: document.getElementById("om-numero").value.trim(),
        titulo: document.getElementById("om-titulo").value.trim(),
        responsables: document.getElementById("om-responsables").value.trim(),
        descripcion: document.getElementById("om-descripcion").value.trim(),
        realizada: om.realizada ?? false,
        repuestos: Array.from(lista.querySelectorAll('.repuesto-item')).map(div => ({
          codigo: div.querySelector('.rep-cod').value.trim(),
          descripcion: div.querySelector('.rep-desc').value.trim(),
          cantidad: parseInt(div.querySelector('.rep-cant').value.trim()) || 1
        }))
      };

      const omList = data.omList ? [...data.omList] : [];
      omList[index] = nuevoOM;

      updateDoc(ref, { omList }).then(() => {
        document.getElementById("modal-om").style.display = "none";
        document.getElementById("guardar-om").onclick = guardarNuevaOM;
      });
    };
  });
}

// --- NAVEGACIÓN ---
const menuList = document.getElementById("menu-list");
menuList.innerHTML = "";
menuList.innerHTML += `<li><a href="#" data-maquina="INICIO">Inicio</a></li>`;
menuList.innerHTML += `<li><a href="#" data-maquina="TODAS">Todas</a></li>`;
maquinas.forEach(maquina => {
  menuList.innerHTML += `<li><a href="#" data-maquina="${maquina}">${maquina}</a></li>`;
});

function mostrarMaquina(maquina) {
  const inicio = document.getElementById("inicio");
  const maquinasDivs = document.querySelectorAll(".maquina");

  if (maquina === "INICIO") {
    inicio.style.display = "block";
    maquinasDivs.forEach(div => div.style.display = "none");
  } else if (maquina === "TODAS") {
    inicio.style.display = "none";
    maquinasDivs.forEach(div => div.style.display = "block");
  } else {
    inicio.style.display = "none";
    maquinasDivs.forEach(div => {
      div.style.display = (div.id === `box-${maquina}`) ? "block" : "none";
    });
  }
}

menuList.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    e.preventDefault();
    mostrarMaquina(e.target.dataset.maquina);
    document.getElementById("menu").classList.add("hidden");
  }
});

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("menu").classList.toggle("visible");
  document.getElementById("menu").classList.toggle("hidden");
});

// --- PROGRESO SVG ---
function renderAroProgreso(maquina, omList = [], hayFallaCritica = false) {
  const container = document.getElementById(`progreso-${maquina}`);
  if (!container) return;

  container.innerHTML = "";

  const totalOM = omList.length;
  if (totalOM === 0 && !hayFallaCritica) return;

  const size = 80;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  if (hayFallaCritica) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center);
    circle.setAttribute("cy", center);
    circle.setAttribute("r", radius);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#FE001A");
    circle.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(circle);
  } else if (totalOM === 1 && !omList[0].realizada) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center);
    circle.setAttribute("cy", center);
    circle.setAttribute("r", radius);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#FFD700");
    circle.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(circle);
  } else {
    for (let i = 0; i < totalOM; i++) {
      const startAngle = (i / totalOM) * 360;
      const endAngle = ((i + 1) / totalOM) * 360;
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;

      const x1 = center + radius * Math.cos((startAngle - 90) * Math.PI / 180);
      const y1 = center + radius * Math.sin((startAngle - 90) * Math.PI / 180);
      const x2 = center + radius * Math.cos((endAngle - 90) * Math.PI / 180);
      const y2 = center + radius * Math.sin((endAngle - 90) * Math.PI / 180);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-width", strokeWidth);
      path.setAttribute("stroke-linecap", "butt");
      path.setAttribute("stroke", omList[i]?.realizada ? "#4CAF50" : "#FFD700");
      svg.appendChild(path);
    }
  }

  container.appendChild(svg);
}

// --- AUTO RESIZE TEXTAREA ---
function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

const descripcionTextarea = document.getElementById("om-descripcion");
if (descripcionTextarea) {
  descripcionTextarea.addEventListener("input", () => autoResize(descripcionTextarea));
  autoResize(descripcionTextarea);
}

// --- EXPORTS GLOBALES ---
window.editarOM = editarOM;
window.eliminarFalla = eliminarFalla;
window.eliminarOM = eliminarOM;
window.marcarRealizada = marcarRealizada;
window.fallaCritica = fallaCritica;
window.autoResize = autoResize;

// Mostrar pantalla inicial
setTimeout(() => mostrarMaquina("INICIO"), 500);