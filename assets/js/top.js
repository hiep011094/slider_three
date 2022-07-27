const displacementSlider = function (opts) {
  let vertex = `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
      `;

  let fragment = `
          
          varying vec2 vUv;
  
          uniform sampler2D currentImage;
          uniform sampler2D nextImage;
          uniform sampler2D disp;
  
          uniform float dispFactor;
          uniform float intensity;
  
            uniform vec2 size;
            uniform vec2 res;  
  
          void main() {
  
              vec2 uv = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
              vec4 _currentImage;
              vec4 _nextImage;
  
              vec4 disp = texture2D(disp, uv);
              vec2 dispVec = vec2(disp.x, disp.y);

              vec4 orig1 = texture2D(currentImage, uv);
              vec4 orig2 = texture2D(nextImage, uv);

              _currentImage = texture2D(currentImage, (uv + (dispVec * intensity * dispFactor)));
  
              _nextImage = texture2D(nextImage, (uv + (dispVec * -(intensity * (1.0 - dispFactor)))));
  
              vec4 finalTexture = mix(_currentImage, _nextImage, dispFactor);
  
              gl_FragColor = finalTexture;
  
          }
      `;

  let images = opts.images,
    image,
    sliderImages = [];
  let canvasWidth = images[0].clientWidth;
  let canvasHeight = images[0].clientHeight;
  let parent = opts.parent;
  let renderWidth = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth || 0
  );
  let renderHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
  );

  let renderW, renderH;

  if (renderWidth > canvasWidth) {
    renderW = renderWidth;
  } else {
    renderW = canvasWidth;
  }

  renderH = canvasHeight;

  let renderer = new THREE.WebGLRenderer({
    antialias: false,
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x23272a, 1.0);
  renderer.setSize(renderW, renderH);
  parent.appendChild(renderer.domElement);

  let loader = new THREE.TextureLoader();
  loader.crossOrigin = "anonymous";

  images.forEach((img) => {
    image = loader.load(img.getAttribute("src") + "?v=" + Date.now());
    image.magFilter = image.minFilter = THREE.LinearFilter;
    image.anisotropy = renderer.capabilities.getMaxAnisotropy();
    sliderImages.push(image);
  });

  let scene = new THREE.Scene();
  scene.background = new THREE.Color(0x23272a);
  let camera = new THREE.OrthographicCamera(
    renderWidth / -2,
    renderWidth / 2,
    renderHeight / 2,
    renderHeight / -2,
    1,
    1000
  );
  disp = loader.load(
    "https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/rock-_disp.png",
    renderer.render(scene, camera)
  );
  camera.position.z = 1;

  let mat = new THREE.ShaderMaterial({
    uniforms: {
      dispFactor: { type: "f", value: 0.0 },
      intensity: { type: "f", value: 0.5 },
      res: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      size: { value: new THREE.Vector2(1, 1) },
      currentImage: { type: "t", value: sliderImages[0] },
      nextImage: { type: "t", value: sliderImages[1] },
      disp: {
        type: "t",
        value: disp,
      },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    opacity: 1.0,
  });

  let geometry = new THREE.PlaneBufferGeometry(
    parent.offsetWidth,
    parent.offsetHeight,
    1
  );
  let object = new THREE.Mesh(geometry, mat);
  object.position.set(0, 0, 0);
  scene.add(object);

  let addEvents = function () {
    let pagButtons = Array.from(
      document.getElementById("pagination").querySelectorAll("button")
    );
    let isAnimating = false;

    pagButtons.forEach((el) => {
      el.addEventListener("click", function () {
        if (!isAnimating) {
          isAnimating = true;

          document
            .getElementById("pagination")
            .querySelectorAll(".active")[0].className = "";
          this.className = "active";

          let slideId = parseInt(this.dataset.slide, 10);

          mat.uniforms.nextImage.value = sliderImages[slideId];
          mat.uniforms.nextImage.needsUpdate = true;

          TweenLite.to(mat.uniforms.dispFactor, 2.5, {
            value: 1,
            ease: "Expo.easeInOut",
            onComplete: function () {
              mat.uniforms.currentImage.value = sliderImages[slideId];
              mat.uniforms.currentImage.needsUpdate = true;
              mat.uniforms.dispFactor.value = 0.0;
              isAnimating = false;
            },
          });
        }
      });
    });
  };

  addEvents();

  window.addEventListener("resize", function (e) {
    renderer.setSize(renderW, renderH);
  });

  let animate = function () {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
  };
  animate();
};

imagesLoaded(document.querySelectorAll("img"), () => {
  document.body.classList.remove("loading");

  const el = document.getElementById("slider");
  const imgs = Array.from(el.querySelectorAll("img"));
  new displacementSlider({
    parent: el,
    images: imgs,
  });
});
window.setInterval(function () {
  const buttons = document.getElementById("pagination");
  let current = parseInt(buttons.querySelectorAll(".active")[0].dataset.slide);
  if (current === 3) current = -1;

  let next = buttons.querySelectorAll(
    "[data-slide='" + (current + 1).toString() + "']"
  )[0];
  next.click();
}, 5000);
