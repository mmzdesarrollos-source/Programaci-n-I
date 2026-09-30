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

if (!localStorage.getItem('bloqueos')) {
    localStorage.setItem('bloqueos', JSON.stringify([]));
}

if (!localStorage.getItem('tramites')) {
    localStorage.setItem('tramites', JSON.stringify([{ id: 'licencia', nombre: 'Licencia de Conducir' }]));
}

function getUsuarios() { return JSON.parse(localStorage.getItem('usuarios')) || []; }
function saveUsuarios(usuarios) { localStorage.setItem('usuarios', JSON.stringify(usuarios)); }
function getTurnos() { return JSON.parse(localStorage.getItem('turnos')) || []; }
function saveTurnos(turnos) { localStorage.setItem('turnos', JSON.stringify(turnos)); }
function getBloqueos() { return JSON.parse(localStorage.getItem('bloqueos')) || []; }
function saveBloqueos(bloqueos) { localStorage.setItem('bloqueos', JSON.stringify(bloqueos)); }
function getTramites() { return JSON.parse(localStorage.getItem('tramites')) || []; }
function saveTramites(tramites) { localStorage.setItem('tramites', JSON.stringify(tramites)); }
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

function renderCalendar(elementId, onDateSelect, mode = 'vecino') {
    const container = document.getElementById(elementId);
    if(!container) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Lun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    let html = `
        <div class="calendar-header">
            <button type="button" id="btn-prev-month-${elementId}">&lt;</button>
            <span>${monthNames[month]} ${year}</span>
            <button type="button" id="btn-next-month-${elementId}">&gt;</button>
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

    const bloqueosDelMes = getBloqueos();
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const isPast = dateStr < todayStr;
        
        // Fines de semana por defecto bloqueados, a menos que tengan 'desbloqueado'
        const dayOfWeek = new Date(year, month, i).getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const explicitlyUnblocked = bloqueosDelMes.some(b => b.fecha === dateStr && b.hora === 'desbloqueado');
        
        let diaCompletamenteBloqueado = false;
        if (bloqueosDelMes.some(b => b.fecha === dateStr && b.hora === 'todas')) {
            diaCompletamenteBloqueado = true;
        } else if (isWeekend && !explicitlyUnblocked) {
            diaCompletamenteBloqueado = true;
        }

        const turnosDelDia = getTurnos().filter(t => (t.fechaAsignada || t.fecha) === dateStr).length;
        const bloqueosIndiv = bloqueosDelMes.filter(b => b.fecha === dateStr && b.hora !== 'todas' && b.hora !== 'desbloqueado').length;
        const diaLleno = (turnosDelDia + bloqueosIndiv >= HORARIOS.length);

        let statusClass = '';
        let isClickable = true;

        if (isPast) {
            statusClass = 'disabled';
            isClickable = false;
        } else if (diaCompletamenteBloqueado || diaLleno) {
            statusClass = 'day-full'; // Rojo
            // Solo los empleados pueden hacer clic en días rojos (para ver turnos o desbloquearlos)
            if (mode === 'vecino') {
                statusClass += ' disabled';
                isClickable = false;
            }
        } else {
            statusClass = 'day-available'; // Verde
        }

        const isSelectedClass = (selectedDateString === dateStr) ? 'selected' : '';

        if (!isClickable) {
            html += `<div class="calendar-day ${statusClass}" title="${isPast ? 'Día pasado' : 'Sin disponibilidad'}">${i}</div>`;
        } else {
            html += `<div class="calendar-day ${statusClass} ${isSelectedClass}" data-date="${dateStr}">${i}</div>`;
        }
    }

    html += `</div>`;
    container.innerHTML = html;

    // Listeners para cambiar de mes
    document.getElementById(`btn-prev-month-${elementId}`).addEventListener('click', (e) => {
        e.preventDefault();
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(elementId, onDateSelect, mode);
    });
    
    document.getElementById(`btn-next-month-${elementId}`).addEventListener('click', (e) => {
        e.preventDefault();
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(elementId, onDateSelect, mode);
    });

    // Listeners para seleccionar días
    const days = container.querySelectorAll('.calendar-day:not(.disabled)');
    days.forEach(day => {
        day.addEventListener('click', () => {
            selectedDateString = day.getAttribute('data-date');
            selectedHora = null; // Reseteamos hora al cambiar de día
            renderCalendar(elementId, onDateSelect, mode);
            if(onDateSelect) onDateSelect(selectedDateString);
        });
    });
}

function renderSlots(elementId, dateStr, mode = 'vecino', onSlotSelect = null) {
    const container = document.getElementById(elementId);
    if(!container) return;

    if(!dateStr) {
        container.innerHTML = '<p>Selecciona un día en el calendario.</p>';
        return;
    }

    const turnos = getTurnos();
    // Turnos ocupados para este día
    const turnosDelDia = turnos.filter(t => (t.fechaAsignada || t.fecha) === dateStr);

    const bloqueos = getBloqueos();
    const bloqueosDelDia = bloqueos.filter(b => b.fecha === dateStr);
    
    // Check fines de semana
    const [y, m, d] = dateStr.split('-');
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const explicitlyUnblocked = bloqueosDelDia.some(b => b.hora === 'desbloqueado');
    
    let diaCompletoBloqueado = false;
    if (bloqueosDelDia.some(b => b.hora === 'todas')) {
        diaCompletoBloqueado = true;
    } else if (isWeekend && !explicitlyUnblocked) {
        diaCompletoBloqueado = true;
    }

    let btnHoraText = "Bloquear Horario";
    if (selectedHora) {
        const isSelBloqueado = bloqueosDelDia.find(b => b.hora === selectedHora);
        btnHoraText = isSelBloqueado ? "Desbloquear Horario" : "Bloquear Horario";
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
                    <h4 style="margin:0;">Horarios para ${dateStr}</h4>
                    ${mode === 'config' ? `
                    <div style="display: flex; gap: 10px; width: 100%;">
                        <button id="btn-toggle-hora-${elementId}" class="btn-sm" style="background:var(--regio-secondary); flex: 1; padding: 8px;">${btnHoraText}</button>
                        <button id="btn-toggle-dia-${elementId}" class="btn-sm" style="background:${diaCompletoBloqueado ? '#718096' : '#dd6b20'}; flex: 1; padding: 8px;">${diaCompletoBloqueado ? 'Desbloquear Día' : 'Bloquear Día'}</button>
                    </div>
                    ` : ''}
                </div>
                ${mode === 'config' ? '<small style="color:#666; display:block; margin-bottom:10px;">1. Haz clic en un horario para seleccionarlo. 2. Toca "Bloquear Horario".</small>' : ''}
                <div class="slots-grid">`;

    HORARIOS.forEach(hora => {
        const turnoOcupado = turnosDelDia.find(t => (t.horaAsignada || t.hora) === hora);
        const isBloqueado = diaCompletoBloqueado || bloqueosDelDia.find(b => b.hora === hora && b.hora !== 'desbloqueado');
        
        if (turnoOcupado) {
            // Rojo = Ocupado
            html += `<div class="slot ocupado" data-hora="${hora}" data-id="${turnoOcupado.id}">${hora}</div>`;
        } else if (isBloqueado) {
            // Gris = Bloqueado
            const selectedClass = (selectedHora === hora) ? 'seleccionado' : '';
            html += `<div class="slot bloqueado ${selectedClass}" data-hora="${hora}">${hora}</div>`;
        } else {
            // Verde = Disponible
            const selectedClass = (selectedHora === hora) ? 'seleccionado' : '';
            html += `<div class="slot disponible ${selectedClass}" data-hora="${hora}">${hora}</div>`;
        }
    });

    html += `</div>`;
    
    if (mode === 'atencion') {
        html += `<div id="info-turno-${elementId}" class="info-turno-detalle"></div>`;
    }

    container.innerHTML = html;

    // Listener para bloquear todo el día
    if (mode === 'config') {
        const btnDia = document.getElementById(`btn-toggle-dia-${elementId}`);
        if (btnDia) {
            btnDia.addEventListener('click', () => {
                let bl = getBloqueos();
                if (diaCompletoBloqueado) {
                    // Desbloquear
                    bl = bl.filter(b => !(b.fecha === dateStr && b.hora === 'todas'));
                    if (isWeekend) bl.push({ fecha: dateStr, hora: 'desbloqueado' });
                } else {
                    // Bloquear
                    bl.push({ fecha: dateStr, hora: 'todas' });
                    bl = bl.filter(b => !(b.fecha === dateStr && b.hora === 'desbloqueado'));
                }
                saveBloqueos(bl);
                selectedHora = null; // Reset selection
                renderSlots(elementId, dateStr, mode, onSlotSelect);
                
                // Forzamos actualización visual del calendario que lo llamó
                renderCalendar(elementId.replace('-slots', '-calendar'), (d) => renderSlots(elementId, d, mode, onSlotSelect), mode);
            });
        }

        const btnHora = document.getElementById(`btn-toggle-hora-${elementId}`);
        if (btnHora) {
            btnHora.addEventListener('click', () => {
                if (diaCompletoBloqueado) {
                    alert("El día completo ya está bloqueado. Desbloquealo primero para ajustar horarios individuales.");
                    return;
                }
                if (!selectedHora) {
                    alert("Por favor, primero hacé clic en el horario que querés bloquear o desbloquear.");
                    return;
                }

                let bl = getBloqueos();
                const yaBloqueado = bl.find(b => b.fecha === dateStr && b.hora === selectedHora);
                if (yaBloqueado) {
                    bl = bl.filter(b => !(b.fecha === dateStr && b.hora === selectedHora));
                } else {
                    bl.push({fecha: dateStr, hora: selectedHora});
                }
                saveBloqueos(bl);
                renderSlots(elementId, dateStr, mode, onSlotSelect);
            });
        }
    }

    // Listeners de los slots
    const slots = container.querySelectorAll('.slot');
    slots.forEach(slot => {
        slot.addEventListener('click', () => {
            const isOcupado = slot.classList.contains('ocupado');
            const isBloqueadoClass = slot.classList.contains('bloqueado');
            const hora = slot.getAttribute('data-hora');
            
            if (mode === 'atencion') {
                if(isOcupado) {
                    const id = slot.getAttribute('data-id');
                    const turno = turnos.find(t => t.id == id);
                    const infoBox = document.getElementById(`info-turno-${elementId}`);
                    if(infoBox) {
                        infoBox.style.display = 'block';
                        infoBox.innerHTML = `<strong>Turno Reservado</strong><br>
                                             Trámite: ${turno.tramite.toUpperCase()}<br>
                                             Vecino: ${turno.nombre} (DNI: ${turno.dni})<br>
                                             Estado: <span class="badge ${turno.estado === 'pendiente' ? 'pendiente' : 'atendido'}">${turno.estado}</span><br>
                                             ${turno.estado === 'pendiente' ? `<button onclick="atenderTurno(${turno.id})" style="margin-top:15px; width:100%;" class="btn-sm">Marcar como Atendido</button>` : ''}`;
                    }
                } else {
                    const infoBox = document.getElementById(`info-turno-${elementId}`);
                    if(infoBox) infoBox.style.display = 'none';
                }
            } else if (mode === 'config') {
                if(isOcupado) {
                    alert("Este horario ya está reservado por un vecino, no podés bloquearlo.");
                } else {
                    // Seleccionar el horario para poder usar el botón
                    selectedHora = hora;
                    renderSlots(elementId, dateStr, mode, onSlotSelect);
                }
            } else {
                // Vecino
                if(!isOcupado && !isBloqueadoClass) {
                    selectedHora = hora;
                    renderSlots(elementId, dateStr, mode, onSlotSelect);
                    if(onSlotSelect) onSlotSelect(hora);
                }
            }
        });
    });
}
