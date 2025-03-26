document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const vehiclesContainer = document.getElementById('vehicles-container');
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    const saveVehicleBtn = document.getElementById('save-vehicle-btn');
    const addVehicleModal = new bootstrap.Modal(document.getElementById('addVehicleModal'));
    
    // Base URL for API - Update this with your Render URL
    const API_BASE_URL = 'https://fleetmanagment.onrender.com/api';
    
    // Check if user is already logged in
    checkAuthStatus();
    
    // Event Listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    addVehicleBtn.addEventListener('click', () => addVehicleModal.show());
    saveVehicleBtn.addEventListener('click', handleAddVehicle);
    
    // Functions
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/status`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    showDashboard();
                    loadVehicles();
                } else {
                    showLogin();
                }
            } else {
                showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            showLogin();
        }
    }
    
    async function handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            
            if (response.ok) {
                showDashboard();
                loadVehicles();
            } else {
                alert('Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login.');
        }
    }
    
    async function handleLogout() {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            showLogin();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    async function loadVehicles() {
        try {
            const response = await fetch(`${API_BASE_URL}/vehicles`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const vehicles = await response.json();
                renderVehicles(vehicles);
            } else {
                console.error('Failed to load vehicles');
            }
        } catch (error) {
            console.error('Error loading vehicles:', error);
        }
    }
    
    function renderVehicles(vehicles) {
        vehiclesContainer.innerHTML = '';
        
        if (vehicles.length === 0) {
            vehiclesContainer.innerHTML = '<p>No vehicles found. Add your first vehicle.</p>';
            return;
        }
        
        vehicles.forEach(vehicle => {
            const tile = document.createElement('div');
            tile.className = `vehicle-tile status-${vehicle.status.replace(/\s+/g, '-')}`;
            
            // Calculate due status for oil and safety
            const today = new Date();
            const oilDueDate = new Date(vehicle.oilChangeDue);
            const safetyDueDate = new Date(vehicle.safetyDue);
            
            const oilDueClass = oilDueDate < today ? 'overdue' : 
                               (oilDueDate - today) / (1000 * 60 * 60 * 24) < 30 ? 'due-soon' : '';
                               
            const safetyDueClass = safetyDueDate < today ? 'overdue' : 
                                 (safetyDueDate - today) / (1000 * 60 * 60 * 24) < 30 ? 'due-soon' : '';
            
            tile.innerHTML = `
                <h3>${vehicle.name}</h3>
                <p><strong>Status:</strong> <span class="text-capitalize">${vehicle.status}</span></p>
                <p><strong>Kilometers:</strong> ${vehicle.kilometers.toLocaleString()} km</p>
                <p><strong>Oil Change Due:</strong> <span class="${oilDueClass}">${formatDate(vehicle.oilChangeDue)}</span></p>
                <p><strong>Safety Due:</strong> <span class="${safetyDueClass}">${formatDate(vehicle.safetyDue)}</span></p>
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-primary me-2 edit-btn" data-id="${vehicle._id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${vehicle._id}">Delete</button>
                </div>
            `;
            
            vehiclesContainer.appendChild(tile);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleEditVehicle(e.target.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleDeleteVehicle(e.target.dataset.id));
        });
    }
    
    async function handleAddVehicle() {
        const name = document.getElementById('vehicle-name').value;
        const km = parseInt(document.getElementById('vehicle-km').value);
        const oilChangeDue = document.getElementById('oil-change-due').value;
        const safetyDue = document.getElementById('safety-due').value;
        const status = document.getElementById('vehicle-status').value;
        
        try {
            const response = await fetch(`${API_BASE_URL}/vehicles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    kilometers: km,
                    oilChangeDue,
                    safetyDue,
                    status
                }),
                credentials: 'include'
            });
            
            if (response.ok) {
                addVehicleModal.hide();
                document.getElementById('add-vehicle-form').reset();
                loadVehicles();
            } else {
                alert('Failed to add vehicle');
            }
        } catch (error) {
            console.error('Error adding vehicle:', error);
            alert('An error occurred while adding the vehicle');
        }
    }
    
    async function handleEditVehicle(vehicleId) {
        // In a real app, you would implement this to edit vehicle details
        alert(`Edit vehicle with ID: ${vehicleId}\nThis would open an edit modal in a complete implementation.`);
    }
    
    async function handleDeleteVehicle(vehicleId) {
        if (confirm('Are you sure you want to delete this vehicle?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    loadVehicles();
                } else {
                    alert('Failed to delete vehicle');
                }
            } catch (error) {
                console.error('Error deleting vehicle:', error);
                alert('An error occurred while deleting the vehicle');
            }
        }
    }
    
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    function showLogin() {
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
    }
    
    function showDashboard() {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
    }
});
