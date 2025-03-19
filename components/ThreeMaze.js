"use client"
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeMaze = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const clockRef = useRef(null);
  const raycasterRef = useRef(null);
  const playerRef = useRef({
    height: 1.8,
    speed: 5.0,
    velocity: new THREE.Vector3(),
    onFloor: true
  });
  const moveStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false
  });
  const rotationRef = useRef({
    horizontal: 0,
    vertical: 0
  });
  const wallsRef = useRef([]);
  const pointerRef = useRef({
    isLocked: false,
    prevX: 0,
    prevY: 0
  });

  useEffect(() => {
    // Initialize scene
    const init = () => {
      // Create scene, camera, renderer
      sceneRef.current = new THREE.Scene();
      sceneRef.current.background = new THREE.Color(0x87CEEB); // Blue sky
      
      cameraRef.current = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      cameraRef.current.position.set(1, playerRef.current.height, 1);
      
      rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      rendererRef.current.shadowMap.enabled = true;
      containerRef.current.appendChild(rendererRef.current.domElement);
      
      // Raycaster for collision detection
      raycasterRef.current = new THREE.Raycaster();
      
      // Create lights
      const ambientLight = new THREE.AmbientLight(0x404040, 2);
      sceneRef.current.add(ambientLight);
      
      const spotlight = new THREE.SpotLight(0xffffff, 1);
      spotlight.position.set(5, 5, 5);
      spotlight.castShadow = true;
      spotlight.shadow.mapSize.width = 1024;
      spotlight.shadow.mapSize.height = 1024;
      sceneRef.current.add(spotlight);
      
      // Create floor with procedural texture
      createTexturedFloor();
      
      // Create maze walls
      createMaze();
      
      // Load models
      createLamp();
      
      // Setup clock for animations
      clockRef.current = new THREE.Clock();
      
      // Handle window resize
      window.addEventListener('resize', onWindowResize);
      
      // Add event listeners for controls
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('click', onMouseClick);
    };
    
    // Create procedural texture for floor
    const createTexturedFloor = () => {
      // Create procedural texture using canvas
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d');
      
      // Fill with base color
      context.fillStyle = '#8B4513'; // Brown base
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add grain/texture
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const brightness = Math.random() * 20 - 10;
        
        context.fillStyle = brightness > 0 
          ? `rgba(255, 255, 255, ${brightness / 100})` 
          : `rgba(0, 0, 0, ${-brightness / 100})`;
        
        context.fillRect(x, y, 2, 2);
      }
      
      // Add some wood-like patterns
      for (let i = 0; i < 20; i++) {
        const y = Math.random() * canvas.width;
        context.strokeStyle = `rgba(0, 0, 0, 0.1)`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
      }
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(10, 10);
      
      // Create floor with texture
      const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.8
      });
      
      const floorGeometry = new THREE.PlaneGeometry(50, 50);
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      sceneRef.current.add(floor);
    };
    
    // Custom pointer lock implementation
    const onMouseClick = () => {
      if (!pointerRef.current.isLocked) {
        const canvas = rendererRef.current.domElement;
        canvas.requestPointerLock = canvas.requestPointerLock || 
                                    canvas.mozRequestPointerLock || 
                                    canvas.webkitRequestPointerLock;
        
        canvas.requestPointerLock();
        
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mozpointerlockchange', onPointerLockChange);
        document.addEventListener('webkitpointerlockchange', onPointerLockChange);
      }
    };
    
    const onPointerLockChange = () => {
      if (document.pointerLockElement === rendererRef.current.domElement || 
          document.mozPointerLockElement === rendererRef.current.domElement ||
          document.webkitPointerLockElement === rendererRef.current.domElement) {
        pointerRef.current.isLocked = true;
        // Hide instructions
        const instructions = document.getElementById('instructions');
        if (instructions) {
          instructions.style.display = 'none';
        }
      } else {
        pointerRef.current.isLocked = false;
        // Show instructions
        const instructions = document.getElementById('instructions');
        if (instructions) {
          instructions.style.display = 'flex';
        }
      }
    };
    
    const onMouseMove = (event) => {
      if (pointerRef.current.isLocked) {
        // Calculate mouse movement sensitivity
        const sensitivity = 0.002;
        
        // Get movement since last frame
        const movementX = event.movementX || 
                           event.mozMovementX || 
                           event.webkitMovementX || 0;
        const movementY = event.movementY || 
                           event.mozMovementY || 
                           event.webkitMovementY || 0;
        
        // Update rotation
        rotationRef.current.horizontal -= movementX * sensitivity;
        rotationRef.current.vertical -= movementY * sensitivity;
        
        // Limit vertical rotation to avoid flipping
        rotationRef.current.vertical = Math.max(
          -Math.PI / 2, 
          Math.min(Math.PI / 2, rotationRef.current.vertical)
        );
        
        // Apply rotation to camera
        cameraRef.current.rotation.y = rotationRef.current.horizontal;
        cameraRef.current.rotation.x = rotationRef.current.vertical;
      }
    };
    
    // Create maze walls with procedural textures
    const createMaze = () => {
      // Create procedural texture using canvas
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d');
      
      // Create brick pattern
      context.fillStyle = '#8B8B8B'; // Base gray
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw brick pattern
      context.fillStyle = '#707070';
      const brickWidth = 30;
      const brickHeight = 15;
      
      for (let y = 0; y < canvas.height; y += brickHeight) {
        const offset = (Math.floor(y / brickHeight) % 2) * (brickWidth / 2);
        for (let x = -brickWidth/2; x < canvas.width; x += brickWidth) {
          context.fillRect(x + offset, y, brickWidth - 1, brickHeight - 1);
        }
      }
      
      // Add some noise for texture
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const alpha = Math.random() * 0.1;
        
        context.fillStyle = Math.random() > 0.5 
          ? `rgba(255, 255, 255, ${alpha})` 
          : `rgba(0, 0, 0, ${alpha})`;
        
        context.fillRect(x, y, 1, 1);
      }
      
      // Create texture from canvas
      const wallTexture = new THREE.CanvasTexture(canvas);
      wallTexture.wrapS = THREE.RepeatWrapping;
      wallTexture.wrapT = THREE.RepeatWrapping;
      wallTexture.repeat.set(2, 1);
      
      const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        roughness: 0.7
      });
      
      const wallGeometry = new THREE.BoxGeometry(10, 3, 0.5);
      
      // Wall positions (simple maze layout)
      const wallPositions = [
        { position: [0, 1.5, -5], rotation: [0, 0, 0] },
        { position: [5, 1.5, 0], rotation: [0, Math.PI / 2, 0] },
        { position: [-5, 1.5, 0], rotation: [0, Math.PI / 2, 0] },
        { position: [0, 1.5, 5], rotation: [0, 0, 0] },
        { position: [5, 1.5, 10], rotation: [0, Math.PI / 2, 0] },
        { position: [10, 1.5, 5], rotation: [0, 0, 0] }
      ];
      
      wallPositions.forEach(({ position, rotation }) => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(...position);
        wall.rotation.set(...rotation);
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        // Create bounding box for collision detection
        wall.userData.bbox = new THREE.Box3().setFromObject(wall);
        
        wallsRef.current.push(wall);
        sceneRef.current.add(wall);
      });
    };
    
    // Create custom lamp (instead of loading OBJ)
    const createLamp = () => {
      const lampBase = new THREE.CylinderGeometry(0.2, 0.5, 0.5, 16);
      const lampPole = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
      const lampHead = new THREE.SphereGeometry(0.3, 16, 8);
      
      const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.8,
        roughness: 0.2
      });
      
      const glowMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff99,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
      });
      
      const lampBaseMesh = new THREE.Mesh(lampBase, metalMaterial);
      const lampPoleMesh = new THREE.Mesh(lampPole, metalMaterial);
      lampPoleMesh.position.y = 1.25;
      const lampHeadMesh = new THREE.Mesh(lampHead, glowMaterial);
      lampHeadMesh.position.y = 2.4;
      
      const lamp = new THREE.Group();
      lamp.add(lampBaseMesh);
      lamp.add(lampPoleMesh);
      lamp.add(lampHeadMesh);
      
      lamp.position.set(3, 0, 3);
      lamp.castShadow = true;
      
      // Add point light to lamp
      const lampLight = new THREE.PointLight(0xffff99, 1, 10);
      lampLight.position.set(0, 2.4, 0);
      lampLight.castShadow = true;
      lamp.add(lampLight);
      
      sceneRef.current.add(lamp);
    };
    
    // Handle window resize
    const onWindowResize = () => {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    
    // Input handlers
    const onKeyDown = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveStateRef.current.forward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveStateRef.current.left = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveStateRef.current.backward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveStateRef.current.right = true;
          break;
      }
    };
    
    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveStateRef.current.forward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveStateRef.current.left = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveStateRef.current.backward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveStateRef.current.right = false;
          break;
      }
    };
    
    // Check for collision with walls
    const checkWallCollisions = (position) => {
      const playerBBox = new THREE.Box3(
        new THREE.Vector3(
          position.x - 0.3,
          position.y - playerRef.current.height,
          position.z - 0.3
        ),
        new THREE.Vector3(
          position.x + 0.3,
          position.y,
          position.z + 0.3
        )
      );
      
      for (const wall of wallsRef.current) {
        if (playerBBox.intersectsBox(wall.userData.bbox)) {
          return true;
        }
      }
      
      return false;
    };
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = clockRef.current.getDelta();
      
      if (pointerRef.current.isLocked) {
        // Calculate movement direction based on camera orientation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(cameraRef.current.quaternion);
        direction.y = 0;
        direction.normalize();

        // Right vector
        const rightVector = new THREE.Vector3(1, 0, 0);
        rightVector.applyQuaternion(cameraRef.current.quaternion);
        rightVector.normalize();
        
        // Reset velocity
        playerRef.current.velocity.set(0, 0, 0);
        
        // Apply movement based on keys pressed
        const speed = playerRef.current.speed * delta;
        
        if (moveStateRef.current.forward) {
          playerRef.current.velocity.add(direction.clone().multiplyScalar(speed));
        }
        if (moveStateRef.current.backward) {
          playerRef.current.velocity.add(direction.clone().multiplyScalar(-speed));
        }
        if (moveStateRef.current.right) {
          playerRef.current.velocity.add(rightVector.clone().multiplyScalar(speed));
        }
        if (moveStateRef.current.left) {
          playerRef.current.velocity.add(rightVector.clone().multiplyScalar(-speed));
        }
        
        // Calculate new position with collision detection
        const newPosition = cameraRef.current.position.clone().add(playerRef.current.velocity);
        
        // Check if the new position would cause a collision
        if (!checkWallCollisions(newPosition)) {
          cameraRef.current.position.copy(newPosition);
        }
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    // Run initialization
    init();
    animate();
    
    // Cleanup function
    return () => {
      if (containerRef.current && rendererRef.current && rendererRef.current.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('click', onMouseClick);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mozpointerlockchange', onPointerLockChange);
      document.removeEventListener('webkitpointerlockchange', onPointerLockChange);
    };
  }, []);
  
  return (
    <div className="w-full h-screen relative">
      <div 
        ref={containerRef} 
        className="w-full h-full"
      ></div>
      <div id="instructions" className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black bg-opacity-50 text-white p-4 rounded max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">3D Maze</h2>
          <p className="mb-4">Click anywhere to start. Use WASD or arrow keys to move.</p>
          <div className="text-sm">
            <p>W/Up Arrow: Move forward</p>
            <p>S/Down Arrow: Move backward</p>
            <p>A/Left Arrow: Move left</p>
            <p>D/Right Arrow: Move right</p>
            <p>Mouse: Look around</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeMaze;