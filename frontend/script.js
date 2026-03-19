/**
 * Smart Parking Dashboard Logic
 * Connects to Flask backend at http://localhost:5001/api
 */

// Detect if we are running on localhost or cloud
const isLocal = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '' ||
    window.location.hostname.startsWith('192.168.');

const API_BASE_URL = isLocal
    ? 'http://localhost:5001/api'
    : 'https://your-backend-url.onrender.com/api'; // REPLACE THIS AFTER BACKEND DEPLOYMENT

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchSlots();
    // Auto refresh slots every 5 seconds
    setInterval(fetchSlots, 5000);
});

/**
 * Fetch and display parking slots
 */
async function fetchSlots() {
    try {
        const response = await fetch(`${API_BASE_URL}/slots`);
        const data = await response.json();

        if (data.status === 'success') {
            renderSlots(data.data);
            updateStats(data);
        }
    } catch (error) {
        console.error('Error fetching slots:', error);
        document.getElementById('slots-container').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 2rem;">
                <i class="ri-error-warning-line" style="font-size: 2rem;"></i>
                <p>Failed to connect to backend</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">Is the server running on port 5001?</p>
            </div>
        `;
    }
}

/**
 * Render slot grid
 */
function renderSlots(slots) {
    const container = document.getElementById('slots-container');
    container.innerHTML = '';

    slots.forEach(slot => {
        const el = document.createElement('div');
        el.className = `slot ${slot.is_occupied ? 'occupied' : 'free'}`;

        // Slot Content
        const icon = slot.is_occupied ? 'ri-car-fill' : 'ri-parking-box-line';
        const statusText = slot.is_occupied ? 'Occupied' : 'Available';
        const vehicleInfo = slot.is_occupied ?
            `<div style="font-size: 0.8rem; margin-top: 0.25rem;">${slot.current_vehicle_number}</div>` : '';

        el.innerHTML = `
            <i class="${icon} slot-icon"></i>
            <div class="slot-number">${slot.slot_number}</div>
            <div class="slot-status">${statusText}</div>
            ${vehicleInfo}
        `;

        // Add tooltip or click handler if needed
        el.title = `Slot ${slot.slot_number} (${slot.slot_type})`;

        container.appendChild(el);
    });
}

/**
 * Update stats counters
 */
function updateStats(data) {
    document.getElementById('stat-total').textContent = data.total_slots;
    document.getElementById('stat-available').textContent = data.available;
    document.getElementById('stat-occupied').textContent = data.occupied;
}

/**
 * Check wallet balance
 */
async function checkWallet() {
    const vehicleInput = document.getElementById('wallet-vehicle-input');
    const vehicleNumber = vehicleInput.value.trim().toUpperCase();
    const resultDiv = document.getElementById('wallet-result');
    const errorDiv = document.getElementById('wallet-error');

    if (!vehicleNumber) {
        alert('Please enter a vehicle number');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/wallet/${vehicleNumber}`);

        if (response.status === 404) {
            resultDiv.classList.add('hidden');
            errorDiv.classList.remove('hidden');
            return;
        }

        const data = await response.json();

        if (data.status === 'success') {
            document.getElementById('balance-amount').textContent = `Rs.${data.data.wallet_balance.toFixed(2)}`;
            document.getElementById('owner-name').textContent = `Owner: ${data.data.owner_name}`;

            resultDiv.classList.remove('hidden');
            errorDiv.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error fetching wallet:', error);
        alert('Failed to check wallet. See console for details.');
    }
}

/**
 * Fetch parking history
 */
async function fetchHistory() {
    const vehicleInput = document.getElementById('history-vehicle-input');
    const vehicleNumber = vehicleInput.value.trim().toUpperCase();
    const tbody = document.getElementById('history-table-body');

    if (!vehicleNumber) {
        alert('Please enter a vehicle number');
        return;
    }

    // Show loading state
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;"><div class="loader"></div></td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/history/${vehicleNumber}`);
        const data = await response.json();

        if (data.status === 'success') {
            const history = data.data;

            if (history.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No history found for this vehicle</td></tr>`;
                return;
            }

            tbody.innerHTML = history.map(log => {
                const isActive = log.status === 'active';
                const statusBadge = isActive ?
                    `<span class="badge badge-active">Active</span>` :
                    `<span class="badge badge-completed">Completed</span>`;

                const entryTime = new Date(log.entry_time).toLocaleString();
                const duration = log.duration_minutes ? `${log.duration_minutes} mins` : '-';
                const fee = log.parking_fee ? `Rs.${log.parking_fee}` : '-';

                return `
                    <tr>
                        <td>${statusBadge}</td>
                        <td><strong>${log.vehicle_number}</strong></td>
                        <td>${log.slot_number}</td>
                        <td>${entryTime}</td>
                        <td>${duration}</td>
                        <td>${fee}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error fetching history:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 2rem;">Error loading history</td></tr>`;
    }
}

/**
 * Demo helper: Simulate adding a random vehicle entry
 */
async function simulateEntry() {
    const vehicle = `DEMO${Math.floor(Math.random() * 9000) + 1000}`;
    const owner = "Demo User";

    if (confirm(`Simulate entry for vehicle ${vehicle}?`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/vehicle/entry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicle_number: vehicle, owner_name: owner })
            });
            const data = await response.json();

            if (data.status === 'success') {
                alert(`Vehicle ${vehicle} entered at Slot ${data.data.slot_number}`);
                fetchSlots(); // Refresh grid
            } else {
                alert(`Entry failed: ${data.message}`);
            }
        } catch (error) {
            console.error(error);
        }
    }
}
