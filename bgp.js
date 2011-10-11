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
    this.spin = 0;
    this.rotate = 0;
}

var BGP = function(nodename, x, y, z) {
    this.nodename = nodename;
    this.nodes = x*y*z;
    this.admin = 2;
    this.allocated = 0;
    this.dead = 0;
    this.appdead = 0;
    this.viz = new BGPviz(x, y, z);
};

BGP.prototype.alloc = function( n ) {
	var num = parseInt(n);
	if ((this.allocated + this.admin + num) > this.nodes) {
		num = this.nodes - (this.allocated + this.admin);
	}

	var count = num;
	var index = this.allocated + 1;
        if(index > 20) {
        	index = index + 1;
        }
	while(count > 0) {
		if(index != 20) {
			if(index < this.nodes)
				this.viz.allocateNode(index);
			count = count - 1;
		}
		index = index + 1;
	}
	this.allocated = this.allocated + num;
	this.viz.render();
	this.updateinfo();
}

BGP.prototype.kill = function( num ) {
	var count=0;
	this.dead++;
	if((num == 0)||(num == 20)) {
		/* everybody dead */
	} else if(num <= 8) { /* aggregation nodes */
		/* everyone in subrank dead */
		for(count = 0; count < this.allocated; count++) {
			if((count % num) == 0) {
				this.appdead++;
				if(count<20) {
					this.viz.killApp(count)
				} else {
					this.viz.killApp(count+1);
				}
			}
		}
	}
	// TODO: modified appdead based on openmpi aggregation
	this.viz.killNode(num);
	this.viz.render();
	this.updateinfo();
}
BGP.prototype.killcore = function() {
	var which = Math.floor(Math.random() * 8);
	this.kill(which);
}

BGP.prototype.killrand = function() {
	var which = Math.floor(Math.random() * this.nodes);
	this.kill(which);
}
// BUG: doesn't differentiate admin dead from app dead
BGP.prototype.updateinfo = function () {
        var field = document.getElementById('info.nodes');
	var idlenodes = ((this.nodes - (this.allocated+this.admin+this.dead))/this.nodes)*100;
	var appidlenodes = ((this.nodes - (this.allocated+this.admin+this.dead+this.appdead))/this.nodes)*100;
	var allocated = ((this.allocated-(this.dead+this.admin))/this.nodes)*100;
	var appallocated = ((this.allocated-(this.dead+this.admin+this.appdead))/this.nodes)*100;
	if(allocated < 0)
		allocated = 0;
	if(appallocated < 0)
		appallocated = 0;
	if(idlenodes < 0)
		idlenodes = 0;
	if(appidlenodes < 0)
		appidlenodes = 0;
	var dead = (this.dead/this.nodes)*100;
	var appdead = (this.appdead/this.nodes)*100;
	var admin = (this.admin/this.nodes)*100;
        var contents = this.nodes + " / " + this.admin + " / " + this.allocated + " / " + this.dead + " / " + this.appdead;
        var graphdebug = this.nodes + " = " + idlenodes + "/" + admin + " / " + allocated + " / " + appdead + "/" + dead;
	// update info pane
        field.innerText = contents;	
	field = document.getElementById("graph.debug");
	field.innerText = graphdebug;
	// update chart
	var dataval = 't:'+idlenodes+','+allocated+','+admin+','+'0,'+ dead+'|' + appidlenodes+','+appallocated+','+admin+','+appdead+','+dead;
	var chartprefix="https://chart.googleapis.com/chart?cht=pc&chf=bg,s,65432100&chs=450x200&chd=";
	var chartsuffix="&chl=|||||idle|compute|admin|unreachable|dead&chco=777777,007700,000077,FFFF10,770000,EEEEEE,00EE00,0000EE,FFFF10,EE0000";

	var chartdom = document.getElementById('nodechartimg');
	chartdom.src = chartprefix+dataval+chartsuffix;
}

BGPviz.prototype.init = function(container_id, width, height) {
    var geometry, material, mesh;

    container = document.getElementById(container_id);

    this.camera = new THREE.Camera(75, width / height, 1, 10000);
    this.camera.target.position.set(0, 0, 0);
    this.camera.position.set(0, 5, 200);

    // set up the sphere vars
    var radius = 5,
        segments = 8,
        rings = 8;

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

    this.stats.domElement.style.position = 'relative';
    this.stats.domElement.style.top = '10px';

    var statc = document.getElementById("three_stats");
    statc.appendChild(this.stats.domElement);
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

BGPviz.prototype.killNode = function(which)
{
    this.setMode(which, "dead");
}

BGPviz.prototype.killApp = function(which)
{
    this.setMode(which, "unreachable");
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

BGPviz.prototype.setup = function() {
    this.setMode(0, "admin");
    this.setMode(20, "admin");
    this.render();
}

BGPviz.prototype.allocateNode = function(node) {
    this.setMode(node, "ok");
}

