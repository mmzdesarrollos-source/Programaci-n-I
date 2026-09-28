/* Base de datos simulada con LocalStorage */

let usuariosConfig = JSON.parse(localStorage.getItem('usuarios')) || [];
const adminUser = { username: 'admin', password: '123', role: 'admin', nombre: 'Administrador' };
const demoEmpleado = { username: '31861718', password: '123456', role: 'empleado', nombre: 'Marcos Zanini' };

if (!usuariosConfig.find(u => u.username === 'admin')) usuariosConfig.push(adminUser);

let emp = usuariosConfig.find(u => u.username === '31861718');
if (!emp) {
    usuariosConfig.push(demoEmpleado);
} else {
    emp.nombre = 'Marcos Zanini'; // Actualizar si ya existía sin nombre
}

localStorage.setItem('usuarios', JSON.stringify(usuariosConfig));

// Actualizar también al usuario actual si es el empleado, para que se refleje de inmediato
let curr = JSON.parse(localStorage.getItem('currentUser'));
if (curr && curr.username === '31861718') {
    curr.nombre = 'Marcos Zanini';
    localStorage.setItem('currentUser', JSON.stringify(curr));
}

if (!localStorage.getItem('turnos')) {
    localStorage.setItem('turnos', JSON.stringify([]));
}

function getUsuarios() { return JSON.parse(localStorage.getItem('usuarios')) || []; }
function saveUsuarios(usuarios) { localStorage.setItem('usuarios', JSON.stringify(usuarios)); }
function getTurnos() { return JSON.parse(localStorage.getItem('turnos')) || []; }
function saveTurnos(turnos) { localStorage.setItem('turnos', JSON.stringify(turnos)); }
function getCurrentUser() { return JSON.parse(localStorage.getItem('currentUser')); }
function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); }

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function checkAuth(requiredRole) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    if (requiredRole && user.role !== requiredRole) {
        alert('No tienes permisos para ver esta página');
        window.location.href = 'index.html';
    }
    
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.textContent = `Hola, ${user.nombre || user.username}`;
    }
}

/* LÓGICA DE CALENDARIO VISUAL COMPARTIDA */

// Horarios de ejemplo: 08:00 a 13:30 cada 30 minutos
const HORARIOS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"
];

let currentDate = new Date(); // Fecha actual para mostrar el mes
let selectedDateString = null; // Ej: "2026-10-15"
let selectedHora = null; // Ej: "09:00"

function renderCalendar(elementId, onDateSelect, isEmpleado = false) {
    const container = document.getElementById(elementId);
    if(!container) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Lun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    let html = `
        <div class="calendar-header">
            <button type="button" id="btn-prev-month">&lt;</button>
            <span>${monthNames[month]} ${year}</span>
            <button type="button" id="btn-next-month">&gt;</button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-name">Dom</div>
            <div class="calendar-day-name">Lun</div>
            <div class="calendar-day-name">Mar</div>
            <div class="calendar-day-name">Mié</div>
            <div class="calendar-day-name">Jue</div>
            <div class="calendar-day-name">Vie</div>
            <div class="calendar-day-name">Sáb</div>
    `;

    // Espacios vacíos al principio
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day disabled"></div>`;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i <= daysInMonth; i++) {
        // Formato YYYY-MM-DD
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const isPast = dateStr < todayStr;
        
        // Si es vecino, no dejar elegir días pasados
        if(isPast && !isEmpleado) {
            html += `<div class="calendar-day disabled">${i}</div>`;
        } else {
            const isSelectedClass = (selectedDateString === dateStr) ? 'selected' : '';
            html += `<div class="calendar-day ${isSelectedClass}" data-date="${dateStr}">${i}</div>`;
        }
    }

    html += `</div>`;
    container.innerHTML = html;

    // Listeners para cambiar de mes
    document.getElementById('btn-prev-month').addEventListener('click', (e) => {
        e.preventDefault();
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(elementId, onDateSelect, isEmpleado);
    });
    
    document.getElementById('btn-next-month').addEventListener('click', (e) => {
        e.preventDefault();
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(elementId, onDateSelect, isEmpleado);
    });

    // Listeners para seleccionar días
    const days = container.querySelectorAll('.calendar-day:not(.disabled)');
    days.forEach(day => {
        day.addEventListener('click', () => {
            selectedDateString = day.getAttribute('data-date');
            selectedHora = null; // Reseteamos hora al cambiar de día
            renderCalendar(elementId, onDateSelect, isEmpleado);
            if(onDateSelect) onDateSelect(selectedDateString);
        });
    });
}

function renderSlots(elementId, dateStr, isEmpleado = false, onSlotSelect = null) {
    const container = document.getElementById(elementId);
    if(!container) return;

    if(!dateStr) {
        container.innerHTML = '<p>Selecciona un día en el calendario.</p>';
        return;
    }

    const turnos = getTurnos();
    // Turnos ocupados para este día
    const turnosDelDia = turnos.filter(t => (t.fechaAsignada || t.fecha) === dateStr);

    let html = `<h4>Horarios para ${dateStr}</h4><div class="slots-grid">`;

    HORARIOS.forEach(hora => {
        const turnoOcupado = turnosDelDia.find(t => (t.horaAsignada || t.hora) === hora);
        
        if (turnoOcupado) {
            // Rojo = Ocupado
            html += `<div class="slot ocupado" data-hora="${hora}" data-id="${turnoOcupado.id}">${hora}</div>`;
        } else {
            // Verde = Disponible
            const selectedClass = (selectedHora === hora) ? 'seleccionado' : '';
            html += `<div class="slot disponible ${selectedClass}" data-hora="${hora}">${hora}</div>`;
        }
    });

    html += `</div>`;
    
    if (isEmpleado) {
        html += `<div id="info-turno" class="info-turno-detalle"></div>`;
    }

    container.innerHTML = html;

    // Listeners de los slots
    const slots = container.querySelectorAll('.slot');
    slots.forEach(slot => {
        slot.addEventListener('click', () => {
            const isOcupado = slot.classList.contains('ocupado');
            const hora = slot.getAttribute('data-hora');
            
            if (isEmpleado) {
                // Empleado puede clickear ocupados para ver info, o disponibles para asignar a alguien
                if(isOcupado) {
                    const id = slot.getAttribute('data-id');
                    const turno = turnos.find(t => t.id == id);
                    const infoBox = document.getElementById('info-turno');
                    infoBox.style.display = 'block';
                    infoBox.innerHTML = `<strong>Turno Reservado</strong><br>
                                         Trámite: ${turno.tramite.toUpperCase()}<br>
                                         Vecino: ${turno.nombre} (DNI: ${turno.dni})<br>
                                         Estado: <span class="badge ${turno.estado === 'pendiente' ? 'pendiente' : 'atendido'}">${turno.estado}</span><br>
                                         ${turno.estado === 'pendiente' ? `<button onclick="atenderTurno(${turno.id})" style="margin-top:15px; width:100%;" class="btn-sm">Marcar como Atendido</button>` : ''}`;
                } else {
                    document.getElementById('info-turno').style.display = 'none';
                }
            } else {
                // Vecino solo puede elegir disponibles
                if(!isOcupado) {
                    selectedHora = hora;
                    renderSlots(elementId, dateStr, isEmpleado, onSlotSelect); // re-render to apply selection styling
                    if(onSlotSelect) onSlotSelect(hora);
                }
            }
        });
    });
}
