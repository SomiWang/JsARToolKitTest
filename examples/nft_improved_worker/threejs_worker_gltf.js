var model;
var clock = new THREE.Clock();
var mixers = [];
var dogLayer;

function isMobile() {
    return /Android|mobile|iPad|iPhone/i.test(navigator.userAgent);
}

var interpolationFactor = 24;

var trackedMatrix = {
    // for interpolation
    delta: [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ],
    interpolated: [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ]
}

var markers = {
    Postcard: {
        width: 877,
        height: 612,
        dpi: 215,
        url: "../examples/DataNFT/Postcard"
    }
};

var setMatrix = function (matrix, value) {
    var array = [];
    for (var key in value) {
        array[key] = value[key];
    }
    if (typeof matrix.elements.set === "function") {
        matrix.elements.set(array);
    } else {
        matrix.elements = [].slice.call(array);
    }
};

const fileLoader = new THREE.FileLoader;

const GIFLoader = (function (url, complete) {


    fileLoader.responseType = 'arraybuffer';
    fileLoader.load(url, async function (data) {

        const gif = new GIF(data);

        /* Container, frames can be from any source, their structure is:

        Either patch or image, if a arraybuffer is provided it will be converted to an Image
        - patch (uncompressed Uint8Array)
        - image (Image element)

        - dims (left, top, width, height)
        - disposalType (number 0-3)
        - delay (number ms)

        */


        const container = {
            downscale: false,	// Canvas needs to be power of 2, by default size is upscaled (false)
            width: gif.raw.lsd.width,
            height: gif.raw.lsd.height,
            frames: gif.decompressFrames(true)
        };

        complete(container);

    });


});

function start(container, marker, video, input_width, input_height, canvas_draw, render_update, track_update) {
    var vw, vh;
    var sw, sh;
    var pscale, sscale;
    var w, h;
    var pw, ph;
    var ox, oy;
    var worker;
    var camera_para = "./../examples/Data/camera_para-iPhone 5 rear 640x480 1.0m.dat";

    var canvas_process = document.createElement("canvas");
    var context_process = canvas_process.getContext("2d");

    // var context_draw = canvas_draw.getContext('2d');
    var renderer = new THREE.WebGLRenderer({
        canvas: canvas_draw,
        alpha: true,
        antialias: true,
        logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);

    var scene = new THREE.Scene();

    var camera = new THREE.Camera();
    camera.matrixAutoUpdate = false;
    // var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    // camera.position.z = 400;

    scene.add(camera);

    var light = new THREE.AmbientLight(0xffffff);
    scene.add(light);

    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshNormalMaterial()
    );

    var root = new THREE.Group();
    scene.add(root);

    var pivotRoot = new THREE.Object3D();

    //Video

    /*
    dogLayer = document.getElementById('dogLayer');
    dogLayer.load(); // must call after setting/changing source
    dogLayer.play();

    videoTexture = new THREE.VideoTexture(dogLayer);

    videoTexture.format = THREE.RGBAFormat;
    */

    GIFLoader('../Data/Layers/AllLayers.gif', async function (container) {

        const ratio = container.width / container.height;
        var gifTex = new THREE.ComposedTexture(container);

        let material1 = new THREE.MeshBasicMaterial({
            map: gifTex,
            transparent: true,
            side: THREE.DoubleSide,
        });

        let geometry1 = new THREE.PlaneGeometry(155, 110);
        let mesh1 = new THREE.Mesh(geometry1, material1);
        mesh1.position.set(77, 0, -55);
        //mesh1.rotation.z = Math.PI / 2;
        pivotRoot.add(mesh1);
        //markerRoot1.add(mesh1);
    });

    //// the invisibility cloak (box with a hole)
    //let geometry0 = new THREE.BoxGeometry(16, 10, 14);
    //geometry0.faces.splice(4, 2); // make hole by removing top two triangles

    //let material0 = new THREE.MeshBasicMaterial({
    //    //colorWrite: false
    //});

    //let mesh0 = new THREE.Mesh(geometry0, material0);
    //mesh0.scale.set(8, 8, 8);
    //mesh0.position.set(77, -50, -55);
    //pivotRoot.add(mesh0);
    //root.matrixAutoUpdate = false;
    //root.add(pivotRoot);

    /* Load Model */
    //var threeGLTFLoader = new THREE.GLTFLoader();

    //threeGLTFLoader.load("../Data/models/Flamingo.glb", function (gltf) {
    //        model = gltf.scene.children[0];
    //        model.position.z = 0;
    //        model.position.x = 100;
    //        model.position.y = 100;

    //        var animation = gltf.animations[0];
    //        var mixer = new THREE.AnimationMixer(model);
    //        mixers.push(mixer);
    //        var action = mixer.clipAction(animation);
    //        action.play();

    //        root.matrixAutoUpdate = false;
    //        root.add(model);
    //    }
    //);

    var load = function () {
        vw = input_width;
        vh = input_height;

        pscale = 320 / Math.max(vw, (vh / 3) * 4);
        sscale = isMobile() ? window.outerWidth / input_width : 1;

        sw = vw * sscale;
        sh = vh * sscale;
        video.style.width = sw + "px";
        video.style.height = sh + "px";
        container.style.width = sw + "px";
        container.style.height = sh + "px";
        canvas_draw.style.clientWidth = sw + "px";
        canvas_draw.style.clientHeight = sh + "px";
        canvas_draw.width = sw;
        canvas_draw.height = sh;
        w = vw * pscale;
        h = vh * pscale;
        pw = Math.max(w, (h / 3) * 4);
        ph = Math.max(h, (w / 4) * 3);
        ox = (pw - w) / 2;
        oy = (ph - h) / 2;
        canvas_process.style.clientWidth = pw + "px";
        canvas_process.style.clientHeight = ph + "px";
        canvas_process.width = pw;
        canvas_process.height = ph;

        renderer.setSize(sw, sh);

        worker = new Worker("../../js/artoolkit.worker.js");

        worker.postMessage({
            type: "load",
            pw: pw,
            ph: ph,
            camera_para: camera_para,
            marker: marker.url
        });

        worker.onmessage = function (ev) {
            var msg = ev.data;
            switch (msg.type) {
                case "loaded": {
                    var proj = JSON.parse(msg.proj);
                    var ratioW = pw / w;
                    var ratioH = ph / h;
                    proj[0] *= ratioW;
                    proj[4] *= ratioW;
                    proj[8] *= ratioW;
                    proj[12] *= ratioW;
                    proj[1] *= ratioH;
                    proj[5] *= ratioH;
                    proj[9] *= ratioH;
                    proj[13] *= ratioH;
                    setMatrix(camera.projectionMatrix, proj);
                    break;
                }

                case "endLoading": {
                    if (msg.end == true) {
                        // removing loader page if present
                        var loader = document.getElementById('loading');
                        if (loader) {
                            loader.querySelector('.loading-text').innerText = 'Start the tracking!';
                            setTimeout(function () {
                                loader.parentElement.removeChild(loader);
                            }, 2000);
                        }
                    }
                    break;
                }

                case "found": {
                    found(msg);
                    break;
                }
                case "not found": {
                    found(null);
                    break;
                }
            }
            track_update();
            process();
        };
    };

    var world;

    var found = function (msg) {
        if (!msg) {
            world = null;
        } else {
            world = JSON.parse(msg.matrixGL_RH);
        }
    };

    var lasttime = Date.now();
    var time = 0;

    function process() {
        context_process.fillStyle = "black";
        context_process.fillRect(0, 0, pw, ph);
        context_process.drawImage(video, 0, 0, vw, vh, ox, oy, w, h);

        var imageData = context_process.getImageData(0, 0, pw, ph);
        worker.postMessage({ type: "process", imagedata: imageData }, [
            imageData.data.buffer
        ]);
    }

    var tick = function () {

        THREE.ComposedTexture.update(clock.getDelta());
        draw();
        requestAnimationFrame(tick);

        //if (mixers.length > 0) {
        //    for (var i = 0; i < mixers.length; i++) {
        //        mixers[i].update(clock.getDelta());
        //    }
        //}
    };

    var draw = function () {
        render_update();
        var now = Date.now();
        var dt = now - lasttime;
        time += dt;
        lasttime = now;

        if (!world /*|| dogLayer.readyState !== dogLayer.HAVE_ENOUGH_DATA*/) {
            root.visible = false;
        } else {
            root.visible = true;

            // interpolate matrix
            for (var i = 0; i < 16; i++) {
                trackedMatrix.delta[i] = world[i] - trackedMatrix.interpolated[i];
                trackedMatrix.interpolated[i] =
                    trackedMatrix.interpolated[i] +
                    trackedMatrix.delta[i] / interpolationFactor;
            }

            // set matrix of 'root' by detected 'world' matrix
            setMatrix(root.matrix, trackedMatrix.interpolated);
        }

        renderer.render(scene, camera);
    };

    load();
    tick();
    process();
}
