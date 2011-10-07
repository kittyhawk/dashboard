/**
 * Bluegene data model & visualization
 * @author ericvh / http://goo.gl/GADA
 *
 */

var BGPviz = function(x, y, z) {
    this.max_x = x;
    this.max_y = y;
    this.max_z = z;
    this.group = new THREE.Object3D;
    this.rotate = 0;
    this.stats = new Stats();
    this.sphere = [];
    this.sphereMaterial = [];
    this.scene = new THREE.Scene();
    //this.camera = new THREE.Camera(75, width/height, 1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.spin = 1;
    this.rotate = 0;
}

var BGP = function(nodename, x, y, z) {
    this.nodename = nodename;
    this.nodes = x*y*z;
    this.viz = new BGPviz(x, y, z);
};

BGPviz.prototype.init = function(container_id, width, height) {
    var geometry, material, mesh;

    container = document.getElementById(container_id);

    this.camera = new THREE.Camera(75, width / height, 1, 10000);
    this.camera.target.position.set(0, 0, 0);
    this.camera.position.set(0, 5, 200);

    // set up the sphere vars
    var radius = 5,
        segments = 10,
        rings = 10;

    var spacing = 15;
    var centerit_x = (this.max_x / 2) * spacing;
    var centerit_y = (this.max_y / 2) * spacing;
    var centerit_z = (this.max_z / 2) * spacing;

    for (x = 0; x < this.max_x; x++) {
        for (y = 0; y < this.max_y; y++) {
            for (z = 0; z < this.max_z; z++) {
                var count = x + (y * this.max_y) + (z * this.max_z * this.max_y);
                this.sphereMaterial[count] = new THREE.MeshLambertMaterial({
                    color: 0xFFFFFF,
                    wireframe: 1
                });
                this.sphere[count] = new THREE.Mesh(
                new THREE.SphereGeometry(radius, segments, rings), this.sphereMaterial[count]);
                this.sphere[count].position.x = (x * spacing) - centerit_x;
                this.sphere[count].position.y = (y * spacing) - centerit_y;
                this.sphere[count].position.z = (z * spacing) - centerit_z;
                this.group.addChild(this.sphere[count]);
            }
        }
    }

    // create a point light
    var pointLight = new THREE.PointLight(0xFFFFFF);

    // set its position
    pointLight.position.x = 10;
    pointLight.position.y = 50;
    pointLight.position.z = 130;

    // add to the scene
    this.scene.addLight(pointLight);

    this.scene.addObject(this.group);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height); // TODO: set based on container size?

    container.appendChild(this.renderer.domElement);

    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.top = '0px';

    bre = document.createElement('br');

    container.appendChild(this.stats.domElement);
    //container.onmousemove = onDocumentMouseMove
};

BGPviz.prototype.render = function() {
    this.renderer.render(this.scene, this.camera);
}

// Ooop - this won't work because of requestAnimationFrame
// I guess we have to wrap this in a global function or something
BGPviz.prototype.animate = function() {
    if(this.spin == 1) {
        this.spinit();
    }
    this.stats.update();
};

BGPviz.prototype.killNode = function()
{
    var which = Math.floor(Math.random() * 512);

    this.setMode(which, "dead");
    if(this.spin == 0)
        this.render();
}

BGPviz.prototype.spinit = function() {
    this.rotate = this.rotate + .02;
    if (this.rotate > 360)
	this.rotate = 0;

    this.group.rotation.y = this.rotate;
    this.group.rotation.x = this.rotate;
    this.render();
}

BGPviz.prototype.spinctl = function() {
    if(this.spin == 0)
	this.spin = 1;
    else
	this.spin = 0;
}

BGPviz.prototype.setMode = function(count,status) {
    if(status == "ok") {
	    this.sphereMaterial[count].color.setHSV(.25, 1, 1); // green
	    this.sphereMaterial[count].wireframe = 0;
    }
    if(status == "admin") {
	    this.sphereMaterial[count].color.setHSV(.55, 1, 1); // blue
	    this.sphereMaterial[count].wireframe = 0;
    }
    if(status == "dead") {
	this.sphereMaterial[count].color.setHSV(0, 1, 1); // red
	this.sphereMaterial[count].wireframe = 0;
    }
    if(status == "blank") {
	this.sphereMaterial[count].color.setHSV(1, 0, 1); // whiteish
	this.sphereMaterial[count].wireframe = 1;
    }
    if(status == "unreachable") {
	this.sphereMaterial[count].color.setHSV(.1, 1, 1); // reddish
	this.sphereMaterial[count].wireframe = 0;
    }
}

BGPviz.prototype.allocate = function() {
    var count;
    var maxnodes = this.max_x*this.max_y*this.max_z;

    for (count = 0; count < maxnodes; count++) {
	if((count == 0)||(count == 20)) {
	    this.setMode(count, "admin");
	} else {
	    this.setMode(count, "ok");
	}
    }
    this.render();
}

