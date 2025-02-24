let particlesVisible = true; // Track particle system visibility state
let particleSystem; // Declare particleSystem globally for access across functions

// Load and parse OMNI data from 'data/OMNIData.txt'
async function loadOMNIData() {
    const response = await fetch('data/OMNIData.txt'); // Fetch data file
    const text = await response.text(); // Extract text from response
    return parseOMNIData(text); // Parse the text and return data
}

// Parse OMNI data into a usable format
function parseOMNIData(data) {
    const lines = data.split('\n'); // Split file into lines
    return lines.map(line => {
        const values = line.trim().split(/\s+/); // Split line into columns by whitespace
        return {
            dayOfYear: parseInt(values[1]),        // Day of the year
            hour: parseInt(values[2]),             // Hour of the day
            Bx: parseFloat(values[3]),             // Bx component of magnetic field
            By: parseFloat(values[4]),             // By component of magnetic field
            Bz: parseFloat(values[5]),             // Bz component of magnetic field (used for color)
            plasmaDensity: parseFloat(values[6]),  // Plasma density
            flowSpeed: parseFloat(values[8]),      // Solar wind flow speed (km/s)
            solarWindSpeed: parseFloat(values[9]), // Solar wind speed (used for particle speed)
        };
    }).filter(entry => entry.dayOfYear >= 131 && entry.dayOfYear <= 133); // Filter for May 10-12, 2024
}

// Create the solar wind particle system with a trailing effect
function createSolarWindAnimation(scene, earth, solarWindData) {
    const particleCount = 1000; 
    const trailLength = 10; // Number of points in each particle's trail
    const particles = new THREE.BufferGeometry(); // Create particle geometry

    // Allocate space for particle positions, velocities, and colors
    const positions = new Float32Array(particleCount * 3 * trailLength); // 3D positions (x, y, z)
    const velocities = new Float32Array(particleCount * 3); // Velocity for each particle
    const colors = new Float32Array(particleCount * 3 * trailLength); // RGB colors for each particle

    // Create glow texture for particles
    const glowTexture = createGlowTexture(); // Use glow texture function

    // Material for particle system with glow and transparency
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.2, 
        transparent: true, 
        map: glowTexture, // Use glow texture
        depthWrite: false, // Glow should appear over other objects
        blending: THREE.AdditiveBlending, // Additive blending for light effect
        vertexColors: true, // Enable per-vertex color
    });

    // Initialize particle positions, velocities, and colors
    for (let i = 0; i < particleCount; i++) {
        resetParticle(i, positions, velocities, colors, trailLength); // Set initial positions and velocities
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3)); // Add positions to geometry
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3)); // Add colors to geometry

    // Create the particle system and add it to the scene
    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // Start the animation loop to update particle positions
    let dayIndex = 0; // Track index in solar wind data
    function animateSolarWind() {
        const data = solarWindData[dayIndex]; // Get data for the current day/hour
        const pos = particles.attributes.position.array; // Access position array
        const col = particles.attributes.color.array; // Access color array

        for (let i = 0; i < particleCount; i++) {
            // Shift particle positions and colors to create a trail effect
            for (let j = trailLength - 1; j > 0; j--) {
                // Move previous trail positions down one slot
                pos[(i * trailLength + j) * 3] = pos[(i * trailLength + (j - 1)) * 3];
                pos[(i * trailLength + j) * 3 + 1] = pos[(i * trailLength + (j - 1)) * 3 + 1];
                pos[(i * trailLength + j) * 3 + 2] = pos[(i * trailLength + (j - 1)) * 3 + 2];

                // Fade the color as it trails off
                const alpha = 1 - (j / trailLength); // Calculate alpha based on trail position
                col[(i * trailLength + j) * 3] = col[(i * trailLength + (j - 1)) * 3]; // R
                col[(i * trailLength + j) * 3 + 1] = col[(i * trailLength + (j - 1)) * 3 + 1]; // G
                col[(i * trailLength + j) * 3 + 2] = col[(i * trailLength + (j - 1)) * 3 + 2] * alpha; // B (fades out)
            }

            // Update the head of the particle trail based on solar wind speed
            pos[i * trailLength * 3] += velocities[i * 3] * (data.solarWindSpeed / 200);
            pos[i * trailLength * 3 + 1] += velocities[i * 3 + 1];
            pos[i * trailLength * 3 + 2] += velocities[i * 3 + 2];

            // Check if the particle is too far from Earth, reset if necessary
            const distance = Math.sqrt(pos[i * trailLength * 3] ** 2 + pos[i * trailLength * 3 + 1] ** 2 + pos[i * trailLength * 3 + 2] ** 2);
            if (distance > 50) {
                resetParticle(i, pos, velocities, colors, trailLength);
            }

            // Bounce the particle back if it comes too close to Earth
            if (distance < 4) {
                velocities[i * 3] = -velocities[i * 3];  // Reverse direction
                velocities[i * 3 + 1] += Math.random() * 0.05 - 0.025; // Random y variation
                velocities[i * 3 + 2] += Math.random() * 0.05 - 0.025; // Random z variation
            }

            // Set the current color based on Bz (magnetic field strength)
            setParticleColor(col, i, trailLength, data.Bz);
        }

        particles.attributes.position.needsUpdate = true; // Mark positions as needing update
        particles.attributes.color.needsUpdate = true; // Mark colors as needing update

        dayIndex = (dayIndex + 1) % solarWindData.length; // Move to next time step
    }

    // Render loop for animation
    function render() {
        requestAnimationFrame(render); // Loop render function
        animateSolarWind(); // Update particle positions
    }

    render(); // Start rendering
}

// Function to stop the solar wind animation (optional)
function stopSolarWindAnimation() {
    if (animationRequestId) {
        cancelAnimationFrame(animationRequestId); // Stop the animation loop
        animationRequestId = null;
    }
}

// Reset particle position, velocity, and initialize its trail colors
function resetParticle(i, positions, velocities, colors, trailLength) {
    const x = Math.random() * 10 - 5;  // Random x position
    const y = Math.random() * 2 - 1;   // Random y position
    const z = Math.random() * 2 - 1;   // Random z position

    // Set initial position for each trail point
    for (let j = 0; j < trailLength; j++) {
        positions[(i * trailLength + j) * 3] = x * 10;
        positions[(i * trailLength + j) * 3 + 1] = y * 10;
        positions[(i * trailLength + j) * 3 + 2] = z * 10;
    }

    // Set initial velocity toward Earth
    const speedFactor = Math.random() * 0.02 + 0.02; // Ensure minimum speed
    velocities[i * 3] = -speedFactor; // Negative velocity toward Earth
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02; // Random y velocity
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02; // Random z velocity

    // Initialize color for each trail point
    for (let j = 0; j < trailLength; j++) {
        colors[(i * trailLength + j) * 3] = 1.0; // R (Yellow for solar wind)
        colors[(i * trailLength + j) * 3 + 1] = 1.0; // G
        colors[(i * trailLength + j) * 3 + 2] = 0.0; // B
    }
}

// Set particle color based on Bz (magnetic field strength)
function setParticleColor(colors, i, trailLength, Bz) {
    const headIndex = i * trailLength * 3; // Index for head of the trail
    const baseColor = new THREE.Color(Bz > 0 ? 0x00ff00 : 0xff0000); // Green for positive Bz, red for negative

    // Set RGB color at the head of the trail
    colors[headIndex] = baseColor.r; // R
    colors[headIndex + 1] = baseColor.g; // G
    colors[headIndex + 2] = baseColor.b; // B
}

// Function to create a glow texture for particles
function createGlowTexture() {
    const canvas = document.createElement('canvas'); // Create canvas for texture
    const context = canvas.getContext('2d'); // Get drawing context
    const size = 512; // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Create a radial gradient for the glow effect
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 0, 1)'); // Inner glow color
    gradient.addColorStop(1, 'rgba(255, 255, 0, 0)'); // Outer glow transparency

    // Draw the gradient on the canvas
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    // Return the canvas as a texture
    return new THREE.CanvasTexture(canvas);
}

// Create a Sun object in the scene
function createSun(scene) {
    const radius = 5; // Sun radius
    const sunGeometry = new THREE.SphereGeometry(radius, 32, 32); // Create sphere geometry for the Sun
    const sunMaterial = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load('textures/8k_sun.jpg'), // Load Sun texture
        emissive: 0xffff00, // Glow color
        transparent: true,
        opacity: 1,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial); // Create Sun mesh

    // Position the Sun away from Earth
    sunMesh.position.set(150, 0, 0); // Set Sun position
    scene.add(sunMesh); // Add Sun to the scene

    // Add glow effect around the Sun using a sprite
    const glowTexture = createGlowTexture(); // Use the glow texture function
    const glowSpriteMaterial = new THREE.SpriteMaterial({ 
        map: glowTexture, 
        transparent: true, 
        depthWrite: false // Make sure the glow isn't overwritten by other objects
    });
    const glowSprite = new THREE.Sprite(glowSpriteMaterial); // Create a sprite for the glow
    
    glowSprite.scale.set(20, 20, 1); // Scale glow sprite
    glowSprite.position.copy(sunMesh.position); // Match position with the Sun
    scene.add(glowSprite); // Add the glow to the scene
}

// Function to toggle the visibility of the particle system
function toggleParticles() {
    if (particleSystem) { // Check if particle system exists
        particleSystem.visible = !particleSystem.visible; // Toggle visibility
    }
}

// Initialize the solar wind visualization after loading the 3D scene
async function initializeSolarWind(scene, earth) {
    const solarWindData = await loadOMNIData();  // Load OMNI data
    createSolarWindAnimation(scene, earth, solarWindData); // Create particle animation
    createSun(scene);  // Add the Sun object to the scene
}
