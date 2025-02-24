let markers = [];  // Array to store both visible and invisible markers (invisible markers are basically a hitbox for detecting if the user has hovered over them)

// Function to convert latitude and longitude into Cartesian coordinates
// This is essential for plotting locations on a 3D sphere
function latLongToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);  // Convert latitude to polar angle
    const theta = (lon + 180) * (Math.PI / 180);  // Convert longitude to azimuthal angle

    // Calculate the x, y, z coordinates based on the spherical coordinate system
    const x = -((radius) * Math.sin(phi) * Math.cos(theta));
    const y = (radius) * Math.cos(phi);
    const z = (radius) * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);  
}

// Function to create markers at specific latitude and longitude locations
function createDisruptionMarkers(data) {
    const markerGeometry = new THREE.SphereGeometry(0.004, 8, 8);  // Small sphere for visible marker
    const invisibleMarkerGeometry = new THREE.SphereGeometry(0.02, 8, 8);  // Larger invisible marker for interaction 

    data.forEach((disruption) => {
        const lat = parseFloat(disruption['Geographic latitude (deg)']);
        const lon = parseFloat(disruption['Geographic longitude (deg)']);
        const utcTime = disruption['Date time (UTC)'];
        const description = disruption['Disruption description'];

        // Check if lat/lon values are valid; skip if invalid
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            console.warn(`Invalid coordinates for disruption: lat=${lat}, lon=${lon}`);
            return;  // Skip the invalid entry
        }

        // Create the visible marker with a red color
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        const position = latLongToVector3(lat, lon, 1);  // Convert lat/lon to Cartesian coordinates
        marker.position.copy(position);  // Set marker position on the sphere
        marker.renderOrder = 2;  // Render markers on top of other objects
        scene.add(marker);  // Add the visible marker to the scene

        // Create an invisible marker for interaction
        const invisibleMarkerMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            opacity: 0,  
            transparent: true  
        });
        const invisibleMarker = new THREE.Mesh(invisibleMarkerGeometry, invisibleMarkerMaterial);
        invisibleMarker.position.copy(position);  // Same position as visible marker
        invisibleMarker.renderOrder = 2;  // Ensure invisible marker is on top of all 3D objects so interaction works
        scene.add(invisibleMarker);  // Add the invisible marker to the scene

        // Store additional information (description and UTC time) in the marker's userData
        invisibleMarker.userData = { description: `${utcTime} - ${description}` };

        // Save both the visible and invisible markers in the markers array for later use
        markers.push(marker);  // Push visible marker
        markers.push(invisibleMarker);  // Push invisible marker
    });
}

// Function to toggle the visibility of all markers on and off
function toggleMarkers() {
    markers.forEach(marker => {
        marker.visible = !marker.visible;  // Toggle visibility for each marker
    });
}

// Raycaster setup for detecting mouse hover over markers
const raycaster = new THREE.Raycaster();  // Raycaster for 3D object intersection
const mouse = new THREE.Vector2();  // Mouse vector for raycaster

// Tooltip creation for showing information about disruptions
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.padding = '5px';
tooltip.style.background = '#fff';
tooltip.style.border = '1px solid #000';
tooltip.style.display = 'none';  // Initially hidden
tooltip.style.fontFamily = 'Futuristic';  // Custom font for tooltip
tooltip.style.fontSize = '15px';
document.body.appendChild(tooltip);  // Add tooltip to the DOM

// Function to handle mouse movement and check for marker intersections
function onMouseMove(event) {
    // Update mouse position relative to the canvas for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);  // Set raycaster based on mouse position
    const intersects = raycaster.intersectObjects(markers, true);  // Check for intersections with markers

    if (intersects.length > 0) {
        const object = intersects[0].object;  // Get the first intersected marker

        // Only show tooltip if the marker is visible and has a description
        if (object.visible && object.userData.description) {
            tooltip.innerHTML = object.userData.description;  // Show disruption description
            tooltip.style.left = `${event.clientX + 10}px`;  // Position tooltip near the mouse
            tooltip.style.top = `${event.clientY + 10}px`;
            tooltip.style.display = 'block';  // Make tooltip visible
        } else {
            tooltip.style.display = 'none';  // Hide the tooltip if no valid marker is hovered
        }
    } else {
        tooltip.style.display = 'none';  // Hide the tooltip when no marker is hovered
    }
}

// Add an event listener to track mouse movement and trigger raycasting
window.addEventListener('mousemove', onMouseMove);
