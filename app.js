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
div.style.display = "none"; // 🚨 ESTA ES LA LÍNEA NUEVA
div.innerHTML = `
  <h2>${maquina}</h2>
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

      if (data.fallaTitulo && data.fallaDescripcion) {
        box.className = 'maquina estado-rojo';
      } else if (Array.isArray(data.omList) && data.omList.length > 0) {
        box.className = 'maquina estado-amarillo';
      } else {
        box.className = 'maquina estado-verde';
      }

      let omHtml = data.omList?.map((om, index) => {
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
          </div>
        `;
      }).join('') || "";

      contenido.innerHTML = `
  ${data.fallaTitulo || data.fallaDescripcion ? `
    <div style="border:2px solid red; padding:10px; margin-top:10px; position:relative; background:white;">
      <button onclick="eliminarFalla('${maquina}')"
        style="position:absolute; top:5px; right:5px;
              padding:2px 6px; font-size:12px;
              background-color:white; color:red;
              border:1px solid red; border-radius:3px;
              cursor:pointer;">
        X
      </button>
      <p><strong>FALLA:</strong> ${data.fallaTitulo}</p>
      <p>${data.fallaDescripcion}</p>
    </div>` : ""
  }
  ${omHtml}
`;

    } else {
      box.className = 'maquina estado-verde';
      contenido.innerHTML = '';
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

function eliminarOM(maquina, index) {
  const confirmar = confirm("¿Estás seguro de que querés eliminar esta OM?");
  if (!confirmar) return;

  const ref = doc(db, "maquinas", maquina);
  getDoc(ref).then(docSnap => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const omList = data.omList || [];
      omList.splice(index, 1); // elimina la OM en esa posición
      updateDoc(ref, { omList });
    }
  });
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

const descripcionInput = document.getElementById('om-descripcion');
descripcionInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});


window.editarOM = editarOM;
window.eliminarFalla = eliminarFalla;
window.agregarOM = agregarOM;
window.eliminarOM = eliminarOM;
window.fallaCritica = fallaCritica;



// Mostrar pantalla inicial
// Mostrar pantalla inicial (después de que Firebase termine de cargar)
setTimeout(() => {
  mostrarMaquina("INICIO");
}, 500); // medio segundo suele alcanzar

