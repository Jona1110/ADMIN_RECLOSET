// ====== REEMPLAZA ESTA URL CON LA QUE OBTUVISTE DE APPS SCRIPT ======
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyk69k1Azy_ni1FGiJiMQYOtZ7LrkjqrBedmA1tqWgh_DRddHW2Pd0f1HTZYrZ-eBNi/exec'; 

const tableBody = document.getElementById('adminTableBody');
const statusIndicator = document.getElementById('statusIndicator');
const toggleDropBtn = document.getElementById('toggleDropBtn');
const refreshAdminBtn = document.getElementById('refreshAdminBtn');
const modal = document.getElementById('adminModal');
const form = document.getElementById('adminForm');
let currentDropStatus = 'CERRADO';

// Elementos de Carga de Imagen
const fileInput = document.getElementById('itemImagenFile');
const imagePreview = document.getElementById('imagePreview');
const hiddenBase64 = document.getElementById('itemImagenBase64');

// Función principal de carga de datos
async function loadAdminData() {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin" style="color:var(--accent-sage); font-size:1.5rem;"></i></td></tr>`;
    try {
        const response = await fetch(WEB_APP_URL + '?view=admin');
        const data = await response.json();
        
        currentDropStatus = data.estadoDrop.toUpperCase();
        updateStatusUI(currentDropStatus);
        renderTable(data.items);
    } catch (error) {
        showCustomAlert("Error de conexión al cargar el inventario.", "error");
    }
}

function updateStatusUI(status) {
    if (status === 'ACTIVO') {
        statusIndicator.textContent = 'ACTIVO';
        statusIndicator.className = 'status-indicator status-activo';
        toggleDropBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Cerrar Colección';
    } else {
        statusIndicator.textContent = 'PREPARACIÓN';
        statusIndicator.className = 'status-indicator status-cerrado';
        toggleDropBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Lanzar Colección';
    }
}

function renderTable(items) {
    tableBody.innerHTML = '';
    items.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 0.05}s`;
        tr.innerHTML = `
            <td>#${item.ID}</td>
            <td><img src="${item.Imagen_URL}" alt="img" loading="lazy"></td>
            <td><strong>${item.Prenda}</strong><br><small style="color:var(--text-muted)">${item.Marca} | ${item.Talla}</small></td>
            <td><span style="background: ${item.Tipo === 'Subasta' ? 'var(--accent-rose)' : 'var(--accent-sage)'}; color:white; padding: 4px 8px; border-radius:10px; font-size:0.7rem;">${item.Tipo}</span></td>
            <td><strong>$${item.Precio}</strong></td>
            <td><span style="color: ${item.Estado === 'Disponible' ? 'var(--accent-sage)' : 'var(--accent-rose)'}; font-weight: 600;">${item.Estado}</span></td>
            <td>${item.Mejor_Postor ? `<strong>${item.Mejor_Postor}</strong><br><small>${item.Telefono}</small>` : '<span style="color:#ccc">-</span>'}</td>
            <td class="action-btns">
                <button class="btn-edit" onclick='openEditModal(${JSON.stringify(item).replace(/'/g, "&#39;")})'><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteItem(${item.rowIndex})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Botón Activar / Cerrar Drop
toggleDropBtn.addEventListener('click', async () => {
    const nuevoEstado = currentDropStatus === 'ACTIVO' ? 'CERRADO' : 'ACTIVO';
    if (!confirm(`¿Cambiar estado a ${nuevoEstado}?`)) return;
    
    toggleDropBtn.disabled = true;
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'toggle_drop', nuevoEstado: nuevoEstado })
        });
        const res = await response.json();
        showCustomAlert(res.message, "success");
        loadAdminData();
    } catch(e) {
        showCustomAlert("Error al cambiar estado.", "error");
    } finally {
        toggleDropBtn.disabled = false;
    }
});

// ==== LÓGICA DE COMPRESIÓN A BASE64 ====
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // COMPRESIÓN HTML5 CANVAS (Para no saturar Google Sheets)
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500; // Ancho máximo
            const scaleSize = MAX_WIDTH / img.width;
            
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Convertir a JPEG calidad 70% (Base64 ligero)
            const base64Str = canvas.toDataURL('image/jpeg', 0.7);
            
            hiddenBase64.value = base64Str;
            imagePreview.innerHTML = `<img src="${base64Str}" alt="Preview">`;
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

// Abrir Modal para Nuevo
document.getElementById('openAddModalBtn').onclick = () => {
    document.getElementById('adminModalTitle').textContent = 'Nueva Prenda';
    document.getElementById('adminAction').value = 'add_item';
    form.reset();
    
    // Resetear preview de foto
    hiddenBase64.value = '';
    imagePreview.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><span>Toca para elegir foto</span>`;
    
    document.getElementById('itemEstado').value = 'Disponible';
    document.getElementById('itemEstado').parentElement.style.display = 'none'; 
    modal.classList.add('active');
};

document.getElementById('closeAdminModal').onclick = () => modal.classList.remove('active');

// Abrir Modal para Editar
window.openEditModal = function(item) {
    document.getElementById('adminModalTitle').textContent = 'Editar Prenda';
    document.getElementById('adminAction').value = 'edit_item';
    document.getElementById('editRowIndex').value = item.rowIndex;
    
    document.getElementById('itemTipo').value = item.Tipo;
    document.getElementById('itemEstado').value = item.Estado;
    document.getElementById('itemPrenda').value = item.Prenda;
    document.getElementById('itemTalla').value = item.Talla;
    document.getElementById('itemMarca').value = item.Marca;
    document.getElementById('itemPrecio').value = item.Precio;
    document.getElementById('itemDetalles').value = item.Detalles;
    
    // Cargar imagen existente (sea url normal o base64)
    hiddenBase64.value = item.Imagen_URL;
    imagePreview.innerHTML = `<img src="${item.Imagen_URL}" alt="Preview">`;
    
    document.getElementById('itemEstado').parentElement.style.display = 'block';
    modal.classList.add('active');
}

// Guardar Datos
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('adminSubmitBtn');
    
    // Validar que haya foto
    if (!hiddenBase64.value) {
        showCustomAlert("Por favor, selecciona una foto de la prenda.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'GUARDANDO...';

    const payload = {
        action: document.getElementById('adminAction').value,
        rowIndex: document.getElementById('editRowIndex').value,
        tipo: document.getElementById('itemTipo').value,
        estado: document.getElementById('itemEstado').value,
        prenda: document.getElementById('itemPrenda').value,
        talla: document.getElementById('itemTalla').value,
        marca: document.getElementById('itemMarca').value,
        precio: document.getElementById('itemPrecio').value,
        imagen: hiddenBase64.value, // Envía el texto Base64
        detalles: document.getElementById('itemDetalles').value,
    };

    try {
        const response = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();
        showCustomAlert(res.message, "success");
        modal.classList.remove('active');
        loadAdminData();
    } catch(err) {
        showCustomAlert("Error al guardar. Intenta de nuevo.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'GUARDAR PRENDA';
    }
});

// Eliminar Datos
window.deleteItem = async function(rowIndex) {
    if(!confirm("¿Eliminar esta prenda permanentemente?")) return;
    try {
        const response = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'delete_item', rowIndex: rowIndex }) });
        const res = await response.json();
        showCustomAlert(res.message, "success");
        loadAdminData();
    } catch(e) {
        showCustomAlert("Error al eliminar.", "error");
    }
}

// ==== NUEVO SISTEMA DE ALERTAS ANIMADAS ====
function showCustomAlert(msg, type = 'success') {
    // Busca o crea el contenedor de notificaciones
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Crea la alerta individual
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    const icon = type === 'success' ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${msg}</div>
        <div class="toast-progress"></div>
    `;
    
    // Agrega al DOM
    container.appendChild(toast);
    
    // Activa la animación después de un microsegundo
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Lo destruye después de 3.5s (duración de la barra de progreso)
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Espera a que termine la animación de salida
    }, 3500);
}

// Event Listeners base
refreshAdminBtn.onclick = loadAdminData;
document.addEventListener('DOMContentLoaded', loadAdminData);