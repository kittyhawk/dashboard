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
    this.maxtree = 0;
    this.admin = 2;
    this.allocated = 0;
    this.dead = 0;
    this.appdead = 0;
    this.status = [];
    this.node = [];
    this.viz = new BGPviz(x, y, z);
    var count;
    for(count = 0; count < this.nodes; count++) {
	if((count == 0)||(count==20)) {
		this.status[count] = "admin";
	} else {
		this.status[count] = "idle";
	}
    }
};

var BGPnode = function(child1, child2) {
	this.child1 = child1;
	this.child2 = child2;
}

BGP.prototype.noderank = function () {
	// need to organize nodes in a tree
	var parent_node = 0;
	var child_node = 1;
	var child1 = -1;
	var child2 = -1;
	while (child_node < this.nodes) {
		while((parent_node < this.nodes)&&(this.status[parent_node] != "ok")) {
			parent_node++;
		}
		while((child_node < this.nodes)&&(this.status[child_node] != "ok")) {
			child_node++;
		}
		child1 = child_node;
		child_node++;
		while((child_node < this.nodes)&&
			(this.status[child_node] != "ok")) {
			child_node++;
		}
		if(child_node < this.nodes) {
			child2 = child_node;
			child_node++;	
		}
		this.node[parent_node] = new BGPnode(child1,child2);
		parent_node++;
	}
	this.maxtree = parent_node-1;
}

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
	while((count > 0)&&(index < this.nodes)) {
		if(this.status[index]=="idle") {
			if(index < this.nodes) {
				this.viz.allocateNode(index);
				this.status[index]="ok";
				count = count - 1;
			}
		}
		index = index + 1;
	}
	this.allocated = this.allocated + num;
	this.viz.render();
	this.noderank();
	this.updateinfo();
}

BGP.prototype.kill = function( n, state ) {
	var node = n;
	if(this.status[node] == "ok") {
		if(state == 1) {
			this.viz.killNode( node );
			this.allocated--;
			this.dead++;
		} else {
			this.viz.killApp( node );
			this.appdead++;
		}
	}
	if((node < this.maxtree)&&(node != 0)&&(node != 20)) {
		if(this.node[node].child1 > 0)
			this.kill( this.node[node].child1, 0 );
		if(this.node[node].child2 > 0)
			this.kill( this.node[node].child2, 0 );
	}
	if(state == 1) {
		this.viz.render();
		this.updateinfo();
	}
}

BGP.prototype.killold = function( num ) {
	// TODO: modified appdead based on openmpi aggregation
	if(this.status[num] == "ok") {
		this.viz.killNode(num);
		this.allocated--;
		this.dead++;
		this.viz.render();
	}
	this.updateinfo();
}
BGP.prototype.killcore = function() {
	var which = Math.floor(Math.random() * 8);
	this.kill(which, 1);
}

BGP.prototype.killrand = function() {
	var which = Math.floor(Math.random() * this.nodes);
	this.kill(which, 1);
}
// BUG: doesn't differentiate admin dead from app dead
BGP.prototype.updateinfo = function () {
        var field = document.getElementById('info.nodes');
	var idlenodes = ((this.nodes - (this.allocated+this.admin+this.dead))/this.nodes)*100;
	var appidlenodes = ((this.nodes - (this.allocated+this.admin+this.dead+this.appdead))/this.nodes)*100;
	var allocated = (this.allocated/this.nodes)*100;
	var appallocated = ((this.allocated-this.appdead)/this.nodes)*100;
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
        var graphdebug = this.nodes + " = " + appidlenodes + "/" + admin + " / " + appallocated + " / " + appdead + "/" + dead;
	// update info pane
        field.innerText = contents;	
	//field = document.getElementById("graph.debug");
	//field.innerText = graphdebug;
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

