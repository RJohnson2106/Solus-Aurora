let auroraHeatmap = [];  // Array to store aurora data points
let heatmapSphere;  // 3D mesh that holds the heatmap texture
let heatmapInstance;  // Heatmap.js instance to manage the heatmap visualization

// Convert latitude and longitude into Cartesian coordinates (3D vector)
function latLongToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);  // Convert latitude to polar angle
    const theta = (lon + 180) * (Math.PI / 180);  // Convert longitude to azimuthal angle

    // Calculate the x, y, z coordinates for the 3D position on the sphere
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);  // Return as a THREE.js Vector3 object
}

// Add aurora data points to the heatmap.js instance for visualization
function addAuroraDataToHeatmap(data) {
    const heatmapData = [];  // Array to store the transformed aurora data

    data.forEach((aurora) => {
        const lat = parseFloat(aurora['Geographic latitude (deg)']);
        const lon = parseFloat(aurora['Geographic longitude (deg)']);

        // Validate lat/lon values and skip invalid data
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            console.warn(`Invalid coordinates for aurora: lat=${lat}, lon=${lon}`);
            return;  // Skip invalid entries
        }

        // Convert geographic coordinates into heatmap canvas pixel positions
        const x = Math.round((lon + 180) * (1024 / 360));  // Convert longitude to x-coordinate
        const y = Math.round((90 - lat) * (512 / 180));  // Convert latitude to y-coordinate
        const intensity = aurora['Intensity'] || 50;  // Default intensity to 50 if missing

        // Push the data point into heatmapData array
        heatmapData.push({ x, y, value: intensity });
    });

    // Set the heatmap data with max intensity of 100
    heatmapInstance.setData({
        max: 100,
        data: heatmapData
    });
}

// Apply the heatmap as a texture to the globe (THREE.js sphere)
function applyHeatmapTexture() {
    // Create a texture from the heatmap canvas
    const heatmapTexture = new THREE.CanvasTexture(heatmapInstance._renderer.canvas);
    heatmapTexture.needsUpdate = true;  // Ensure the texture updates when the heatmap changes

    // Create a material with the heatmap texture, allowing some transparency
    const heatmapMaterial = new THREE.MeshBasicMaterial({
        map: heatmapTexture,
        transparent: true,
        opacity: 0.5  // Adjust opacity to make the heatmap partially transparent
    });

    // Create a slightly larger sphere for the heatmap, so it renders over other objects (like clouds)
    heatmapSphere = new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 64), heatmapMaterial);
    heatmapSphere.renderOrder = 1;  // Ensure heatmap renders after other layers
    scene.add(heatmapSphere);  // Add the heatmap sphere to the scene
}

// Toggle the visibility of the aurora heatmap
function toggleAuroraHeatmap() {
    if (heatmapSphere) {
        heatmapSphere.visible = !heatmapSphere.visible;  // Toggle visibility
    }
}

// Function to initialize the aurora heatmap using heatmap.js
function createAuroraHeatmap(data) {
    // Initialize heatmap.js instance with custom settings
    heatmapInstance = h337.create({
        container: document.getElementById('heatmapContainer'),  // HTML container for the heatmap
        radius: 17,  
        maxOpacity: 0.6, 
        minOpacity: 0,  
        blur: 0.75,  // Blur level for smooth transitions
        gradient: {
            0.2: "blue",  // Low intensity color
            0.5: "green",  // Medium intensity color
            0.8: "yellow",  // High intensity color
            1.0: "red"  // Maximum intensity color
        }
    });

    // Add aurora data points to the heatmap
    addAuroraDataToHeatmap(data);

    // Apply the heatmap as a texture to the 3D globe
    applyHeatmapTexture();
}
