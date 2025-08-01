// firebase-config.js debe estar correctamente importado
import { db } from './firebase-config.js';
import {
  doc, setDoc, updateDoc, getDoc, onSnapshot, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Maquinas
const maquinas = [
  "LLENADORA", "SEAMER", "FLEETWOOD", "WARMER",
  "OCME", "DEPALETIZADORA", "PALETIZADORA", "TRANSPORTES"
];

const container = document.getElementById('maquinas-container');
const modal = document.getElementById('modal-om');
const modalContenido = document.getElementById('modal-contenido');
const repuestosLista = document.getElementById('repuestos-lista');

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
    <button class="btn-om">Agregar OM</button>
    <button class="btn-falla">Falla Crítica</button>
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

      // 💡 Estado de la máquina (rojo, amarillo, verde)
      if (tieneFalla) {
        box.className = 'maquina estado-rojo';
      } else if (omList.length === 0 || omList.every(om => om.realizada)) {
        box.className = 'maquina estado-verde';
      } else {
        box.className = 'maquina estado-amarillo';
      }

      // 💡 Calculo para aro de progreso
      const total = omList.length;
      const completadas = omList.filter(om => om.realizada).length;

      renderAroProgreso(maquina, omList, tieneFalla);


      // 💡 Generación de HTML para las OM
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

        return `
  <div style="border:1px dashed #000; margin:5px; padding:5px; position:relative">
    <div style="position:absolute; top:5px; right:5px; display:flex; gap:5px;">

      ${om.realizada
        ? `<button disabled style="padding:2px 5px; font-size:12px; background-color:#4CAF50; color:white; border:none; border-radius:3px;">
            ✅ Realizada
          </button>`
        : `<button onclick="marcarRealizada('${maquina}', ${index})" style="padding:2px 5px; font-size:12px; background-color:#ccc; border:none; border-radius:3px; cursor:pointer;">
            Realizada ✅
          </button>`
      }

      <button onclick="editarOM('${maquina}', ${index})"
        style="padding:2px 5px; font-size:12px; background-color:#ccc; border:none; border-radius:3px; cursor:pointer;">
        ✏️
      </button>

      <button onclick="eliminarOM('${maquina}', ${index})"
        style="padding:2px 7px; font-size:12px; background-color:#d00; color:#fff; border:none; border-radius:3px; cursor:pointer;">
        X
      </button>
    </div>

    <p><strong>OM:</strong> ${om.om}</p>
    <p><strong>${om.titulo}</strong></p>
    <p><em><strong>Responsables:</strong> ${om.responsables || "No asignado"}</em></p>
    <p>${om.descripcion.replace(/\n/g, "<br>")}</p>
    ${repuestosHtml}
  </div>`;
      }).join('');

      // 💡 Falla crítica (si hay)
      contenido.innerHTML = `
        ${tieneFalla ? `
          <div style="border:2px solid red; padding:10px; margin-top:10px; position:relative; background:white;">
            <button onclick="eliminarFalla('${maquina}')" style="position:absolute; top:5px; right:5px;
                  padding:2px 6px; font-size:12px; background-color:white; color:red;
                  border:1px solid red; border-radius:3px; cursor:pointer;">X</button>
            <p><strong>FALLA:</strong> ${data.fallaTitulo}</p>
            <p>${data.fallaDescripcion}</p>
          </div>` : ""
        }
        ${omHtml}
      `;
    } else {
      box.className = 'maquina estado-verde';
      contenido.innerHTML = '';
      renderAroProgreso(maquina, 0, 0, false);
    }
  });
});

// --- FUNCIONES DE OM ---

function abrirModalOM() {
  document.getElementById('om-numero').value = '';
  document.getElementById('om-titulo').value = '';
  document.getElementById('om-responsables').value = '';
  document.getElementById('om-descripcion').value = '';
  repuestosLista.innerHTML = '';
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

cont.innerHTML = `
  <input placeholder="Descripción" class="rep-desc" style="display:block; width:100%; margin-bottom:5px;" />
  <div style="display:flex; gap:5px; align-items:center;">
    <input type="number" class="rep-cod sin-flechas" placeholder="Código" style="flex:1;" />
    <input type="number" placeholder="Cantidad" class="rep-cant" style="width:140px;" />
    <button onclick="this.closest('div.repuesto-item').remove()" style="background:white; color:white; border:none; border-radius:5px; padding:4px 8px;">❌</button>
  </div>
`;

cont.classList.add("repuesto-item");
document.getElementById("repuestos-lista").appendChild(cont);

});


document.getElementById('guardar-om').addEventListener('click', async () => {
  const om = document.getElementById('om-numero').value.trim();
  const titulo = document.getElementById('om-titulo').value.trim();
  const responsables = document.getElementById('om-responsables').value.trim();
  const descripcion = document.getElementById('om-descripcion').value.trim();

  const repuestos = Array.from(repuestosLista.children).map(div => ({
    codigo: div.querySelector('.rep-cod').value.trim(),
    descripcion: div.querySelector('.rep-desc').value.trim(),
    cantidad: parseInt(div.querySelector('.rep-cant').value.trim()) || 0
  }));

  const nuevaOM = { om, titulo, responsables, descripcion, repuestos };

  const ref = doc(db, "maquinas", maquinaActual);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      omList: arrayUnion(nuevaOM)
    });
  } else {
    await setDoc(ref, {
      omList: [nuevaOM]
    });
  }

  modal.style.display = 'none';
});

async function eliminarOM(maquina, index) {
  const confirmacion = confirm("¿Estás seguro de eliminar esta orden?");
  if (!confirmacion) return;

  const docRef = doc(db, "maquinas", maquina);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const omList = Array.isArray(data.omList) ? [...data.omList] : [];

    omList.splice(index, 1); // quita la OM por índice

    await updateDoc(docRef, { omList });
    console.log(`OM eliminada en ${maquina}, index ${index}`);
  } else {
    console.error(`No se encontró el documento de ${maquina}`);
  }
}



// --- FALLA CRÍTICA ---
function fallaCritica(maquina) {
  const titulo = prompt(`⚠️ Título de la falla crítica para ${maquina}:`);
  if (!titulo) return;

  const descripcion = prompt(`📄 Descripción detallada de la falla:`);
  if (!descripcion) return;

  const ref = doc(db, "maquinas", maquina);
  setDoc(ref, {
    fallaTitulo: titulo,
    fallaDescripcion: descripcion
  }, { merge: true })
  .then(() => {
    console.log(`✅ Falla crítica registrada para ${maquina}`);
  })
  .catch((error) => {
    console.error("❌ Error al guardar la falla crítica:", error);
    alert("Error al guardar la falla crítica.");
  });
}



function eliminarFalla(maquina) {
  const confirmar = confirm("¿Estás seguro de que querés eliminar la Falla Crítica?");
  if (!confirmar) return;

  const ref = doc(db, "maquinas", maquina);
  updateDoc(ref, {
    fallaTitulo: "",
    fallaDescripcion: ""
  });
  
}


function marcarRealizada(maquina, index) {
  const ref = doc(db, "maquinas", maquina);

  getDoc(ref).then(docSnap => {
    if (!docSnap.exists()) {
      console.error("❌ No se encontró la máquina:", maquina);
      return;
    }

    const data = docSnap.data();
    const omList = Array.isArray(data.omList) ? data.omList : [];

    if (index < 0 || index >= omList.length) {
      console.error("❌ Índice inválido:", index);
      return;
    }

    // Marcar como realizada
    omList[index] = {
      ...omList[index],
      realizada: true
    };

    updateDoc(ref, { omList })
      .then(() => {
        console.log(`✅ OM marcada como realizada: ${omList[index].numero}`);

        // 🔁 Feedback visual en el botón
        const boton = document.querySelector(`#btn-realizada-${maquina}-${index}`);
        if (boton) {
          boton.textContent = "✅ Realizada";
          boton.disabled = true;
          boton.style.backgroundColor = "#4CAF50";
          boton.style.color = "white";
          boton.style.border = "none";
        }
      })
      .catch(error => {
        console.error("❌ Error al actualizar Firebase:", error);
      });
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

// --- EXPORTACIONES NECESARIAS ---
window.eliminarOM = eliminarOM;
window.editarOM = function () { alert("Función editarOM no implementada aún."); };
window.eliminarFalla = eliminarFalla;

function editarOM(maquina, index) {
  const ref = doc(db, "maquinas", maquina);
  getDoc(ref).then(docSnap => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const om = data.omList?.[index];
      if (!om) return;

      // Cargamos los datos al modal
      document.getElementById("om-numero").value = om.om || "";
      document.getElementById("om-titulo").value = om.titulo || "";
      document.getElementById("om-responsables").value = om.responsables || "";
      document.getElementById("om-descripcion").value = om.descripcion || "";

      // Repuestos
      const lista = document.getElementById("repuestos-lista");
      lista.innerHTML = "";
      (om.repuestos || []).forEach(rep => {
        const div = document.createElement("div");
        div.innerHTML = `
          <input placeholder="Código" value="${rep.codigo || ""}" />
          <input placeholder="Descripción" value="${rep.descripcion || ""}" />
          <input type="number" placeholder="Cantidad" value="${rep.cantidad || 1}" />
        `;
        lista.appendChild(div);
      });

      // Mostramos modal
      document.getElementById("modal-om").style.display = "flex";

      // Evento guardar modificado para que actualice en lugar de agregar
      const btnGuardar = document.getElementById("guardar-om");
      btnGuardar.onclick = () => {
        const nuevoOM = {
          om: document.getElementById("om-numero").value,
          titulo: document.getElementById("om-titulo").value,
          responsables: document.getElementById("om-responsables").value,
          descripcion: document.getElementById("om-descripcion").value,
          repuestos: Array.from(lista.children).map(div => {
            const inputs = div.querySelectorAll("input");
            return {
              codigo: inputs[0].value,
              descripcion: inputs[1].value,
              cantidad: parseInt(inputs[2].value) || 1
            };
          })
        };

        const omList = data.omList || [];
        omList[index] = nuevoOM;

        updateDoc(ref, { omList }).then(() => {
          document.getElementById("modal-om").style.display = "none";
        });
      };
    }
  });
}

function renderAroProgreso(maquina, omList = [], hayFallaCritica = false) {
  const container = document.getElementById(`progreso-${maquina}`);
  if (!container) return;

  container.innerHTML = ""; // limpio antes

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
    // 🔴 Aro rojo completo si hay falla crítica
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center);
    circle.setAttribute("cy", center);
    circle.setAttribute("r", radius);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#FE001A");
    circle.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(circle);
  } else if (totalOM === 1 && !omList[0].realizada) {
    // 🟡 Caso especial: una sola OM no realizada → aro amarillo completo
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center);
    circle.setAttribute("cy", center);
    circle.setAttribute("r", radius);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#FFD700");
    circle.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(circle);
  } else {
    // 🟢🟡 Dividir aro en tramos por cada OM
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

      const om = omList[i];
      if (om && om.realizada) {
        path.setAttribute("stroke", "#4CAF50"); // verde
      } else {
        path.setAttribute("stroke", "#FFD700"); // amarillo
      }

      svg.appendChild(path);
    }
  }

  container.appendChild(svg);
}




// --- EXPORTACIONES NECESARIAS ---
window.editarOM = editarOM;
window.eliminarFalla = eliminarFalla;
window.eliminarOM = eliminarOM;
window.marcarRealizada = marcarRealizada;
window.fallaCritica = fallaCritica;




// Mostrar pantalla inicial
// Mostrar pantalla inicial (después de que Firebase termine de cargar)
setTimeout(() => {
  mostrarMaquina("INICIO");
}, 500); // medio segundo suele alcanzar

