// Prevent browser zooming on scroll (with ctrl) or touch gestures
window.addEventListener('wheel', function(event) {
  if (event.ctrlKey) {
      event.preventDefault(); // Disable zoom when using ctrl + scroll
  }
}, { passive: false }); // Ensure the event listener is not passive for prevention

window.addEventListener('gesturestart', function(event) {
  event.preventDefault(); // Disable zoom gestures on touch devices
});

// THREE.js Loading Manager to manage assets loading
const loadingManager = new THREE.LoadingManager();

// Inject custom font style into the page
const style = document.createElement('style');
style.innerHTML = `
@font-face {
  font-family: 'AlongSans';
  src: url('fonts/along_sans/AlongSanss2-Bold.otf') format('opentype');
}

.loading-text {
  font-family: 'AlongSans', sans-serif; /* Use the custom font */
  font-size: 2em; /* Adjust font size if necessary */
  color: white; /* Text color */
}
`;
document.head.appendChild(style); // Append custom font styles to the document

// Optional loading screen setup
const loadingScreen = document.createElement('div');
loadingScreen.style.position = 'fixed'; // Fullscreen, fixed position
loadingScreen.style.top = '0';
loadingScreen.style.left = '0';
loadingScreen.style.width = '100%';
loadingScreen.style.height = '100%';
loadingScreen.style.backgroundColor = 'black'; // Black background
loadingScreen.style.display = 'flex'; // Center content
loadingScreen.style.flexDirection = 'column';
loadingScreen.style.alignItems = 'center';
loadingScreen.style.justifyContent = 'center';

// Display loading text using the custom font
loadingScreen.innerHTML = '<div class="loading-text">L O A D I N G...</div>';

// Create and style a loading bar below the text
const loadingBar = document.createElement('div');
loadingBar.style.width = '80%';
loadingBar.style.height = '20px';
loadingBar.style.backgroundColor = 'grey';
loadingBar.style.borderRadius = '10px'; // Rounded edges for the bar
loadingBar.style.overflow = 'hidden';
loadingBar.style.position = 'relative'; // Relative positioning for inner bar
loadingScreen.appendChild(loadingBar);

const loadingProgress = document.createElement('div');
loadingProgress.style.height = '100%'; // Full height of the parent (loadingBar)
loadingProgress.style.width = '0%'; // Start with 0% width
loadingProgress.style.backgroundColor = 'green'; // Progress bar color
loadingProgress.style.transition = 'width 0.5s'; // Smooth width transition
loadingBar.appendChild(loadingProgress); // Append progress bar to loading bar

document.body.appendChild(loadingScreen); // Attach loading screen to document body

// Loading manager events
loadingManager.onStart = function(url, itemsLoaded, itemsTotal) {
  console.log(`Started loading: ${url}. Loaded ${itemsLoaded} of ${itemsTotal} items.`);
};

loadingManager.onLoad = function() {
  console.log('Loading complete!');

  // Delay hiding the loading screen after assets load
  setTimeout(() => {
      // Slide loading screen up before removing
      loadingScreen.style.transition = 'transform 1s ease';
      loadingScreen.style.transform = 'translateY(-100%)';

      setTimeout(() => {
          document.body.removeChild(loadingScreen); // Remove loading screen
      }, 1000); // Match the transition time
  }, 1000); // 1 second delay
};

loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  console.log(`Loading: ${url}. Loaded ${itemsLoaded} of ${itemsTotal} items.`);
  const progress = (itemsLoaded / itemsTotal) * 100; // Calculate progress percentage
  loadingProgress.style.width = progress + '%'; // Update loading bar width
};

loadingManager.onError = function(url) {
  console.error(`Error loading: ${url}`);
};

// Scene, camera, and renderer setup for the 3D environment
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Standard perspective camera
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing for smoother edges
renderer.setSize(window.innerWidth, window.innerHeight); // Fullscreen canvas size
document.body.appendChild(renderer.domElement); // Append renderer's canvas to document

// Set initial camera position
const initialCameraPosition = new THREE.Vector3(0, 0, 3); // Camera starts along z-axis
camera.position.copy(initialCameraPosition);

// Function to create stars in the scene
function createStars() {
  const starGeometry = new THREE.BufferGeometry();
  const starVertices = new Float32Array(10000); // Generate 10,000 stars

  // Randomly place stars within a large cubic space
  for (let i = 0; i < starVertices.length; i++) {
      starVertices[i] = (Math.random() - 0.5) * 600;
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starVertices, 3));

  // Load star texture
  const textureLoader = new THREE.TextureLoader(loadingManager);
  const starTexture = textureLoader.load('textures/circle.png'); // Ensure correct path

  // Material for stars with transparency
  const starMaterial = new THREE.PointsMaterial({
      size: 0.2,
      map: starTexture,
      transparent: true, // Transparent background for stars
      color: 0xffffff // Star color (white)
  });

  // Add star points to the scene
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

createStars(); // Call function to add stars to the scene

// Ambient light for basic illumination
const ambientLight = new THREE.AmbientLight(0x404040, 6); // Brighten the scene
scene.add(ambientLight);

// Load and create Earth with texture and normal map
let earth; // Declare the earth mesh
const textureLoader = new THREE.TextureLoader(loadingManager);
const earthTexture = textureLoader.load('textures/8k_earth_daymap.jpg', function(texture) {
  const normalMap = textureLoader.load('textures/8k_earth_normal_map.tif'); // Load Earth's normal map

  // Material for Earth (less shiny with roughness/metalness values)
  const earthMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      normalMap: normalMap,
      roughness: 0.7, // Reduce reflectivity
      metalness: 0.1 // Minimal metal-like shine
  });

  const earthGeometry = new THREE.SphereGeometry(1, 256, 256); // High-resolution sphere geometry for Earth
  earth = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(earth); // Add Earth to the scene

  // Add moon orbiting around Earth
  const moonTexture = textureLoader.load('textures/8k_moon.jpg', function(texture) {
      const moonMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.7, // Less reflective moon surface
          metalness: 0.1
      });

      const moonGeometry = new THREE.SphereGeometry(0.27, 64, 64); // Smaller moon size
      const moon = new THREE.Mesh(moonGeometry, moonMaterial);

      moon.position.set(10, 0, 0); // Position moon farther from Earth
      scene.add(moon);

      renderer.render(scene, camera); // Render the scene after adding the moon
  });

  // Initialize the solar wind effect
  initializeSolarWind(scene, earth);

  // Add clouds to Earth's surface
  const cloudTexture = textureLoader.load('textures/8k_earth_clouds.png', function() {
      const clouds = new THREE.Mesh(
          new THREE.SphereGeometry(1.005, 512, 512), // Slightly larger sphere for clouds
          new THREE.MeshPhongMaterial({
              map: cloudTexture,
              transparent: true, // Clouds should be semi-transparent
              opacity: 1, // Full opacity
              roughness: 1, // No reflectivity
              metalness: 0.0, // No shininess
              depthWrite: false // Ensure correct depth rendering for transparency
          })
      );
      scene.add(clouds); // Add clouds to the scene
  });

  // Create Earth's atmospheric glow using custom shaders
  const atmosphereShader = {
      uniforms: {
          'c': { type: 'f', value: 0.7 },
          'p': { type: 'f', value: 4.5 },
          glowColor: { type: 'c', value: new THREE.Color(0x3399ff) }, // Blue glow color
          viewVector: { value: new THREE.Vector3() } // Camera view vector
      },
      vertexShader: `
          uniform vec3 viewVector;
          varying float intensity;

          void main() {
              // Vertex normal in world space
              vec3 vNormal = normalize(normalMatrix * normal);

              // Calculate direction from vertex to camera
              vec3 vNormView = normalize(viewVector - (modelViewMatrix * vec4(position, 1.0)).xyz);

              // Glow intensity based on angle between normal and view direction
              intensity = pow(0.7 - dot(vNormal, vNormView), 4.5);

              // Standard vertex transformation
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
      `,
      fragmentShader: `
          uniform vec3 glowColor;
          varying float intensity;

          void main() {
              gl_FragColor = vec4(glowColor * intensity, 1.0); // Apply glow with intensity
          }
      `,
      side: THREE.BackSide, // Glow should only be visible from outside
      blending: THREE.AdditiveBlending, // Additive blending for glow effect
      transparent: true // Allow transparency
  };

  // Create atmospheric glow as a slightly larger sphere
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 64), new THREE.ShaderMaterial(atmosphereShader));
  scene.add(atmosphere); // Add atmospheric glow to the scene

  camera.lookAt(earth.position); // Ensure camera is always looking at Earth
});

// Create a skybox using a spherical texture of the Milky Way
const spaceTexture = textureLoader.load('textures/8k_stars_milky_way.jpg', function() {
  const skyboxMaterial = new THREE.MeshBasicMaterial({
      map: spaceTexture,
      side: THREE.BackSide // Render the inside of the sphere to act as a skybox
  });

  const skybox = new THREE.Mesh(new THREE.SphereGeometry(300, 64, 64), skyboxMaterial); // Large sphere for skybox
  scene.add(skybox); // Add skybox to the scene
});

// Setup OrbitControls for user interaction (zooming, rotating)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = true; // Allow zooming
controls.minDistance = 1.2; // Limit how close the camera can zoom
controls.maxDistance = 10; // Limit how far the camera can zoom out
controls.enableRotate = true; // Allow rotating the globe
controls.enableDamping = true; // Smooth transitions between movements
controls.dampingFactor = 0.05; // Adjust smoothness of damping

// Customize mouse and touch controls
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE, // Rotate with left mouse button
  MIDDLE: THREE.MOUSE.NONE, // Disable middle mouse button actions
  RIGHT: THREE.MOUSE.DOLLY // Zoom with right mouse button
};

controls.touches = {
  ONE: THREE.TOUCH.ROTATE, // Rotate with one finger
  TWO: THREE.TOUCH.NONE // Disable panning with two fingers
};

// Animation loop for rendering and controls
function animate() {
  requestAnimationFrame(animate); // Call animate recursively
  controls.update(); // Update controls (e.g., with damping)
  TWEEN.update(); // Update any tweens
  renderer.render(scene, camera); // Render the scene
}

animate(); // Start the animation loop

// Double-click event for resetting camera to initial position
window.addEventListener('dblclick', function() {
  // Smoothly tween camera back to initial position
  new TWEEN.Tween(camera.position)
      .to({ x: initialCameraPosition.x, y: initialCameraPosition.y, z: initialCameraPosition.z }, 2000) // 2-second transition
      .easing(TWEEN.Easing.Quadratic.InOut) // Smooth easing function
      .onUpdate(function() {
          camera.lookAt(earth.position); // Keep looking at Earth during transition
      })
      .start();

  // Optionally reset OrbitControls after tween finishes
  setTimeout(function() {
      controls.update(); // Ensure controls are updated after camera reposition
  }, 2000); // Match the tween duration
});

// Update camera and renderer size when window is resized
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
  camera.updateProjectionMatrix(); // Update camera projection
  renderer.setSize(window.innerWidth, window.innerHeight); // Resize the renderer
});