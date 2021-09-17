<?php

/**
 * Example php script with web UI
 * To run: `php sandbox/web-mode-examples/index.php` in vterm
 */

if (php_sapi_name() === 'cli') {
    $pid = pcntl_fork();

    if ($pid === -1) {
        die('could not fork');
    } else if ($pid === 0) {
        // we are the child, start the webserver
        $path = __FILE__;
        `php -S localhost:3000 {$path} 2>&1`;
    } else {
        // we are the parent, check the webserver status every 200ms
        while (!@fsockopen("localhost", 3000)) {
            usleep(200);
        }

        // once the webserver is online, send the web mode escape sequence
        $url = base64_encode("http://localhost:3000");
        echo "\e_WEB;{$url}\x07";
        pcntl_wait($status); //Protect against Zombie children
        die();
    }
}
?>
<html>
<body style="margin: 0;"></body>
</html>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r73/three.min.js"></script>
<script>
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 50, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x005E99 } );
// var material = new THREE.MeshPhongMaterial( { map:                 THREE.ImageUtils.loadTexture('https://www.gravatar.com/avatar/af8c21275e3a73b3349c0de336186106?s=256&d=identicon') } );

var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

var render = function () {
requestAnimationFrame( render );

cube.rotation.x += 0.1;
cube.rotation.y += 0.1;

renderer.render(scene, camera);
};

render();
</script>
