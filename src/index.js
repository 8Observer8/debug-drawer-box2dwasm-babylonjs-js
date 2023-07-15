// https://unpkg.com/browse/@babylonjs/core@6.11.1/
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Color4 } from "@babylonjs/core/Maths/math.color.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator.js";
import { ShadowGeneratorSceneComponent } from "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { Quaternion } from "@babylonjs/core/Maths/math.vector.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { box2d, initBox2D } from "./init-box2d.js";

async function init() {

    await initBox2D();

    const {
        b2_dynamicBody,
        b2BodyDef,
        b2CircleShape,
        b2PolygonShape,
        b2Vec2,
        b2World,
        getPointer,
    } = box2d;

    const world = new b2World();
    const gravity = new b2Vec2(0, -9.8);
    world.SetGravity(gravity);
    const unitsPerMeter = 3;

    const canvas = document.getElementById("renderCanvas");
    const engine = new Engine(canvas, true);

    // This creates a basic Babylon Scene object (non-mesh)
    const scene = new Scene(engine);

    // This creates and positions a free camera (non-mesh)
    const camera = new ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2.5, 15, new Vector3(0, 0, 0), scene);
    camera.setTarget(Vector3.Zero()); // This targets the camera to scene origin
    camera.attachControl(canvas, true); // This attaches the camera to the canvas

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    const light = new DirectionalLight("Light", new Vector3(0, -8, 2), scene);
    light.intensity = 0.7; // Default intensity is 1. Let's dim the light a small amount

    const shadowGen = new ShadowGenerator(1024, light);

    // Our built-in 'sphere' shape.
    const sphere = MeshBuilder.CreateSphere("Sphere", { diameter: 2, segments: 32 }, scene);
    shadowGen.addShadowCaster(sphere);

    // Our built-in 'ground' shape.
    const ground = MeshBuilder.CreateBox("Ground", { width: 6, height: 0.1, depth: 6 }, scene);
    ground.addRotation(0, 0, 0.1);
    ground.receiveShadows = true;

    const groundMesh = scene.getMeshByName("Ground");
    const groundSizes = groundMesh.getBoundingInfo().maximum;
    const groundBodyDef = new b2BodyDef();
    groundBodyDef.position = new b2Vec2(0, 0);
    groundBodyDef.angle = ground.rotation.z;
    const groundRigidBody = world.CreateBody(groundBodyDef);
    const groundShape = new b2PolygonShape();
    groundShape.SetAsBox((groundSizes.x + 0.01) / unitsPerMeter, (groundSizes.y + 0.01) / unitsPerMeter);
    const groundFixture = groundRigidBody.CreateFixture(groundShape, 0);
    groundFixture.SetRestitution(0.8);

    // Sphere:
    const sphereMesh = scene.getMeshByName("Sphere");
    const sphereBounding = sphereMesh.getBoundingInfo().maximum;

    const sphereBodyDef = new b2BodyDef();
    sphereBodyDef.type = b2_dynamicBody;
    sphereBodyDef.position = new b2Vec2(2.5 / unitsPerMeter, 5 / unitsPerMeter);
    const sphereRigidBody = world.CreateBody(sphereBodyDef);
    const sphereShape = new b2CircleShape();
    sphereShape.m_radius = sphereBounding.y / unitsPerMeter;
    const sphereFixture = sphereRigidBody.CreateFixture(sphereShape, 1);
    sphereFixture.SetRestitution(0.8);

    class DebugDrawer {
        constructor(unitsPerMeter) {
            this.unitsPerMeter = unitsPerMeter;
            this.sizeOfB2Vec2 = Float32Array.BYTES_PER_ELEMENT * 2;

            const {
                b2Color,
                b2Draw: { e_shapeBit },
                b2Vec2,
                JSDraw,
                wrapPointer
            } = box2d;

            const reifyArray = (array_p, numElements, sizeOfElement, ctor) =>
                Array(numElements)
                .fill(undefined)
                .map((_, index) =>
                    wrapPointer(array_p + index * sizeOfElement, ctor)
                );

            const self = this;
            const debugDrawer = Object.assign(new JSDraw(), {
                DrawSegment(vert1_p, vert2_p, color_p) {},
                DrawPolygon(vertices_p, vertexCount, color_p) {},
                DrawSolidPolygon(vertices_p, vertexCount, color_p) {
                    const color = wrapPointer(color_p, b2Color);
                    const vertices = reifyArray(vertices_p, vertexCount,
                        self.sizeOfB2Vec2, b2Vec2);
                    self.drawLine(vertices[0], vertices[1], color);
                    self.drawLine(vertices[1], vertices[2], color);
                    self.drawLine(vertices[2], vertices[3], color);
                    self.drawLine(vertices[3], vertices[0], color);
                },
                DrawCircle(center_p, radius, color_p) {},
                DrawSolidCircle(center_p, radius, axis_p, color_p) {
                    const center = wrapPointer(center_p, b2Vec2);
                    const color = wrapPointer(color_p, b2Color);
                    self.drawCircle(center.x * self.unitsPerMeter, center.y * self.unitsPerMeter,
                        radius * self.unitsPerMeter, color);
                },
                DrawTransform(transform_p) {},
                DrawPoint(vertex_p, sizeMetres, color_p) {}
            });
            debugDrawer.SetFlags(e_shapeBit);
            this.instance = debugDrawer;

            this.fromX = 0;
            this.fromY = 0;
            this.toX = 0;
            this.toY = 0;

            this.debugColors = [];
            this.debugLines = [];
        }

        begin() {
            this.debugColors = [];
            this.debugLines = [];
        }

        drawLine(from, to, color) {
            this.fromX = from.x * this.unitsPerMeter;
            this.fromY = from.y * this.unitsPerMeter;

            this.toX = to.x * this.unitsPerMeter;
            this.toY = to.y * this.unitsPerMeter;

            this.debugLines.push(new Vector3(this.fromX, this.fromY, 0));
            this.debugLines.push(new Vector3(this.toX, this.toY, 0));

            this.debugColors.push(new Color4(color.r, color.g, color.b, 1));
            this.debugColors.push(new Color4(color.r, color.g, color.b, 1));
        }

        drawCircle(x, y, radius, color) {
            const r = radius * 1.01;
            let angle = 0;
            const angleStep = 20;
            const n = 360 / angleStep + 1;
            for (let i = 0; i < n; i++) {
                let x0 = r * Math.cos(angle * Math.PI / 180);
                let y0 = r * Math.sin(angle * Math.PI / 180);
                this.debugLines.push(new Vector3(x0 + x, y0 + y, 0));
                this.debugColors.push(new Color4(color.r, color.g, color.b, 1));
                angle += angleStep;
            }
        }

        end() {
            if (!this.linesystem) {
                this.linesystem = MeshBuilder.CreateLineSystem("linesystem", { lines: [this.debugLines], colors: [this.debugColors], updatable: true }, scene);
            } else {
                MeshBuilder.CreateLineSystem("line", { lines: [this.debugLines], instance: this.linesystem });
            }
        }
    }

    const debugDrawer = new DebugDrawer(unitsPerMeter);
    world.SetDebugDraw(debugDrawer.instance);

    let currentTime, dt;
    let lastTime = Date.now();;

    // Update physics engine animation on Before Render
    let frame = 0;
    scene.onBeforeRenderObservable.add(() => {

        const spherePos = sphereRigidBody.GetPosition();
        sphereMesh.setAbsolutePosition(new Vector3(
            spherePos.x * unitsPerMeter, spherePos.y * unitsPerMeter, 0
        ));

        sphere.rotation.z = sphereRigidBody.GetAngle();

        currentTime = Date.now();
        dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        world.Step(dt, 3, 2);

        debugDrawer.begin();
        world.DebugDraw();
        debugDrawer.end();

        // Reset the sphere every 350 frames
        if (frame >= 250) {
            sphereRigidBody.SetTransform(new b2Vec2(2.5 / unitsPerMeter, 5 / unitsPerMeter), 0);
            sphereRigidBody.SetLinearVelocity(new b2Vec2(0, 0));
            sphereRigidBody.SetAngularVelocity(0);
            return frame = 0
        }

        frame++
    });

    window.onresize = () => {
        engine.resize();
    }

    engine.runRenderLoop(() => {
        scene.render();
    });
}

init();
