/**
 * Mechanics Playground — rigid-body simulation.
 *
 * This is the only module that talks to Planck. It does not draw.
 * snapshot() is plain JSON: positions, joints, forces, energy. A draw
 * layer may read that object and must not reach back into this world.
 *
 * Timekeeping: a frame adds dt × speed into an accumulator. Every 1/60 s
 * the accumulator spends one fixed step, and that step is split into
 * SUBSTEPS so springs and contacts stay stable on a school laptop.
 * Bodies may sleep. Builds stop growing at MAX_BODIES.
 *
 * Springs are explicit Hooke's-law forces (F = −kx − cv), not soft
 * constraints, so the period stays close to 2π√(m/k). Ropes, rods,
 * pulleys, hinges, welds, sliders, and wheels are Planck joints.
 */
"use strict";

import {
  BUILD_VERSION, FIXED_DT, SUBSTEPS, MAX_FRAME_STEPS, MAX_BODIES, MAX_JOINTS, MAX_UNDO, GRID,
  VELOCITY_ITERATIONS, POSITION_ITERATIONS, MATERIALS,
  createTimeAccumulator, cloneBuild, parseBuild, normalizePart, normalizeJoint,
  nextId, snapValue, surfaceFriction,   springForce, springEnergy, kineticEnergy, gravitationalEnergy, magnetForce
} from "./mechanics-physics.js";

export function createSimulation(planck, initial) {
  if (!planck || typeof planck.World !== "function") {
    throw new Error("Planck is not loaded.");
  }

  let doc = emptyDoc();
  let built = cloneBuild(doc);
  let world = null;
  let bodies = new Map();
  let joints = new Map();
  let mouseGround = null;
  let mouse = null;
  let dragArmed = false;
  let time = 0;
  let thermal = 0;
  let selectedId = null;
  let undo = [];
  let redo = [];
  let trails = new Map();
  let trailTick = 0;
  let impulseSum = new Map();
  let appliedForces = new Map();
  let lastSubDt = FIXED_DT / SUBSTEPS;
  const accumulator = createTimeAccumulator(FIXED_DT, MAX_FRAME_STEPS);

  function emptyDoc() {
    return {
      version: BUILD_VERSION,
      mode: "sandbox",
      settings: {
        gravity: 9.80665, timeScale: 1, airDrag: false, dragCoeff: 0.35,
        defriction: false, showVectors: true, showFbd: true, showTrails: false,
        snap: false, paused: true
      },
      parts: [],
      joints: [],
      ruler: null,
      stopwatch: { running: false, elapsed: 0 }
    };
  }

  function bindContact(current) {
    current.on("post-solve", (contact, impulse) => {
      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      if (!fixtureA || !fixtureB) return;
      const bodyA = fixtureA.getBody();
      const bodyB = fixtureB.getBody();
      const idA = idOf(bodyA);
      const idB = idOf(bodyB);
      const manifold = contact.getWorldManifold(null);
      if (!manifold || !manifold.pointCount) return;
      const nx = manifold.normal.x;
      const ny = manifold.normal.y;
      const tx = ny;
      const ty = -nx;
      const normals = impulse.normalImpulses || [];
      const tangents = impulse.tangentImpulses || [];
      for (let i = 0; i < manifold.pointCount; i++) {
        const point = manifold.points[i];
        if (!point) continue;
        const nImp = normals[i] || 0;
        const tImp = tangents[i] || 0;
        addImpulse(idB, nx * nImp, ny * nImp, tx * tImp, ty * tImp, point.x, point.y);
        addImpulse(idA, -nx * nImp, -ny * nImp, -tx * tImp, -ty * tImp, point.x, point.y);
        const va = bodyA.getLinearVelocityFromWorldPoint(point);
        const vb = bodyB.getLinearVelocityFromWorldPoint(point);
        const slip = (vb.x - va.x) * tx + (vb.y - va.y) * ty;
        thermal += Math.abs(tImp * slip);
      }
    });
  }

  function idOf(body) {
    const data = body && body.getUserData && body.getUserData();
    return data && data.id;
  }

  function addImpulse(id, nx, ny, tx, ty, px, py) {
    if (!id) return;
    const row = impulseSum.get(id) || { nx: 0, ny: 0, tx: 0, ty: 0, px: 0, py: 0, n: 0 };
    row.nx += nx;
    row.ny += ny;
    row.tx += tx;
    row.ty += ty;
    row.px += px;
    row.py += py;
    row.n += 1;
    impulseSum.set(id, row);
  }

  function addApplied(id, x, y) {
    if (!id) return;
    const row = appliedForces.get(id) || { x: 0, y: 0 };
    row.x += x;
    row.y += y;
    appliedForces.set(id, row);
  }

  function rebuild() {
    mouse = null;
    dragArmed = false;
    world = new planck.World({
      gravity: { x: 0, y: -doc.settings.gravity },
      allowSleep: true
    });
    bindContact(world);
    bodies = new Map();
    joints = new Map();
    for (const part of doc.parts) {
      const body = world.createBody({
        type: part.static ? "static" : "dynamic",
        position: { x: part.x, y: part.y },
        angle: part.angle,
        linearVelocity: { x: part.vx || 0, y: part.vy || 0 },
        angularVelocity: part.omega || 0,
        allowSleep: true,
        awake: !part.static
      });
      body.setUserData({ id: part.id });
      body.createFixture({
        shape: shapeFor(part),
        density: part.static ? 0 : 1,
        friction: surfaceFriction(part, doc.settings.defriction),
        restitution: part.restitution
      });
      if (!part.static) applyMass(body, part);
      bodies.set(part.id, body);
    }
    mouseGround = world.createBody({ type: "static", position: { x: 0, y: 0 } });
    for (const joint of doc.joints) {
      const created = createJoint(joint);
      joints.set(joint.id, created);
    }
  }

  function shapeFor(part) {
    if (part.type === "ball" || part.type === "pulley-wheel") return new planck.Circle(part.radius);
    if (part.type === "wedge") {
      return new planck.Polygon([
        { x: 0, y: 0 },
        { x: part.run, y: 0 },
        { x: part.run, y: part.rise }
      ]);
    }
    return new planck.Box(part.width / 2, part.height / 2);
  }

  function applyMass(body, part) {
    const mass = part.mass;
    let inertia;
    if (part.type === "ball" || part.type === "pulley-wheel") {
      inertia = 0.5 * mass * part.radius * part.radius;
    } else if (part.type === "wedge") {
      inertia = mass * (part.run * part.run + part.rise * part.rise) / 18;
    } else {
      const hx = part.width / 2;
      const hy = part.height / 2;
      inertia = mass * (hx * hx + hy * hy) / 3;
    }
    body.setMassData({ mass, center: { x: 0, y: 0 }, I: Math.max(inertia, 1e-6) });
  }

  function createJoint(spec) {
    const bodyA = bodies.get(spec.bodyA);
    const bodyB = bodies.get(spec.bodyB);
    if (!bodyA || !bodyB) return null;
    if (spec.type === "spring") return null;
    if (spec.type === "distance") {
      return world.createJoint(new planck.DistanceJoint({
        collideConnected: false,
        frequencyHz: 0,
        dampingRatio: 0,
        localAnchorA: spec.anchorA,
        localAnchorB: spec.anchorB,
        length: spec.length
      }, bodyA, bodyB));
    }
    if (spec.type === "rope") {
      return world.createJoint(new planck.RopeJoint({
        collideConnected: false,
        localAnchorA: spec.anchorA,
        localAnchorB: spec.anchorB,
        maxLength: spec.maxLength
      }, bodyA, bodyB));
    }
    if (spec.type === "revolute" || spec.type === "weld") {
      const anchor = bodyA.getWorldPoint(spec.anchorA);
      const options = {
        collideConnected: false,
        enableMotor: spec.type === "revolute" && spec.motor,
        motorSpeed: spec.motorSpeed,
        maxMotorTorque: spec.maxMotorTorque
      };
      const Ctor = spec.type === "weld" ? planck.WeldJoint : planck.RevoluteJoint;
      return world.createJoint(new Ctor(options, bodyA, bodyB, anchor));
    }
    if (spec.type === "prismatic") {
      return world.createJoint(new planck.PrismaticJoint({
        collideConnected: false,
        localAnchorA: spec.anchorA,
        localAnchorB: spec.anchorB,
        localAxisA: unitAxis(spec.axis, { x: 1, y: 0 }),
        enableMotor: spec.motor,
        motorSpeed: spec.motorSpeed,
        maxMotorForce: spec.maxMotorTorque
      }, bodyA, bodyB));
    }
    if (spec.type === "wheel") {
      return world.createJoint(new planck.WheelJoint({
        collideConnected: false,
        localAnchorA: spec.anchorA,
        localAnchorB: spec.anchorB,
        localAxisA: unitAxis(spec.axis, { x: 0, y: 1 }),
        enableMotor: spec.motor,
        motorSpeed: spec.motorSpeed,
        maxMotorTorque: spec.maxMotorTorque,
        frequencyHz: spec.frequencyHz,
        dampingRatio: spec.dampingRatio
      }, bodyA, bodyB));
    }
    if (spec.type === "pulley") {
      const gA = spec.groundAnchorA || { x: bodyA.getPosition().x, y: bodyA.getPosition().y + 2 };
      const gB = spec.groundAnchorB || { x: bodyB.getPosition().x, y: bodyB.getPosition().y + 2 };
      const wA = bodyA.getWorldPoint(spec.anchorA);
      const wB = bodyB.getWorldPoint(spec.anchorB);
      return world.createJoint(new planck.PulleyJoint({
        collideConnected: false,
        lengthA: Math.max(0.05, Math.hypot(wA.x - gA.x, wA.y - gA.y)),
        lengthB: Math.max(0.05, Math.hypot(wB.x - gB.x, wB.y - gB.y))
      }, bodyA, bodyB, gA, gB, wA, wB, spec.ratio || 1));
    }
    return null;
  }

  function unitAxis(axis, fallback) {
    const x = axis && Number.isFinite(axis.x) ? axis.x : fallback.x;
    const y = axis && Number.isFinite(axis.y) ? axis.y : fallback.y;
    const length = Math.hypot(x, y);
    if (length < 1e-6) return fallback;
    return { x: x / length, y: y / length };
  }

  function syncDocFromWorld() {
    if (!world) return;
    for (const part of doc.parts) {
      const body = bodies.get(part.id);
      if (!body) continue;
      const position = body.getPosition();
      const velocity = body.getLinearVelocity();
      part.x = position.x;
      part.y = position.y;
      part.angle = body.getAngle();
      part.vx = velocity.x;
      part.vy = velocity.y;
      part.omega = body.getAngularVelocity();
    }
  }

  function zeroVelocities(target) {
    for (const part of target.parts) {
      part.vx = 0;
      part.vy = 0;
      part.omega = 0;
    }
  }

  function remember() {
    undo.push(JSON.stringify({
      parts: built.parts,
      joints: built.joints,
      ruler: built.ruler || null
    }));
    if (undo.length > MAX_UNDO) undo.shift();
    redo.length = 0;
  }

  function commitEdit() {
    syncDocFromWorld();
    built = cloneBuild(doc);
    zeroVelocities(built);
  }

  function applyHistory(raw) {
    const snap = JSON.parse(raw);
    doc.parts = snap.parts;
    doc.joints = snap.joints;
    doc.ruler = snap.ruler || null;
    built = cloneBuild(doc);
    zeroVelocities(built);
    time = 0;
    thermal = 0;
    trails.clear();
    accumulator.reset();
    rebuild();
  }

  function refreshMaterials() {
    for (const part of doc.parts) {
      const body = bodies.get(part.id);
      if (!body) continue;
      for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
        fixture.setFriction(surfaceFriction(part, doc.settings.defriction));
        fixture.setRestitution(part.restitution);
      }
    }
  }

  function wakeDynamic() {
    for (const part of doc.parts) {
      if (part.static) continue;
      const body = bodies.get(part.id);
      if (body) body.setAwake(true);
    }
  }

  function applyCustomForces() {
    appliedForces = new Map();
    for (const part of doc.parts) {
      if (part.static) continue;
      const body = bodies.get(part.id);
      if (!body) continue;
      if (part.thrustOn && part.thrust > 0) {
        const angle = body.getAngle();
        const fx = Math.cos(angle) * part.thrust;
        const fy = Math.sin(angle) * part.thrust;
        body.applyForceToCenter({ x: fx, y: fy }, true);
        addApplied(part.id, fx, fy);
      }
      if (doc.settings.airDrag) {
        const velocity = body.getLinearVelocity();
        const mass = body.getMass();
        const c = doc.settings.dragCoeff;
        body.applyForceToCenter({ x: -c * mass * velocity.x, y: -c * mass * velocity.y }, false);
      }
    }
    const magnets = doc.parts.filter((part) => part.magnet);
    for (let i = 0; i < magnets.length; i++) {
      for (let j = i + 1; j < magnets.length; j++) {
        const left = magnets[i];
        const right = magnets[j];
        const bodyL = bodies.get(left.id);
        const bodyR = bodies.get(right.id);
        if (!bodyL || !bodyR) continue;
        const pL = bodyL.getPosition();
        const pR = bodyR.getPosition();
        const dx = pL.x - pR.x;
        const dy = pL.y - pR.y;
        const force = magnetForce(left.magnet, right.magnet, dx, dy);
        const fx = force.x;
        const fy = force.y;
        if (!left.static) {
          bodyL.applyForceToCenter({ x: fx, y: fy }, true);
          addApplied(left.id, fx, fy);
        }
        if (!right.static) {
          bodyR.applyForceToCenter({ x: -fx, y: -fy }, true);
          addApplied(right.id, -fx, -fy);
        }
      }
    }
    for (const spec of doc.joints) {
      if (spec.type !== "spring") continue;
      const bodyA = bodies.get(spec.bodyA);
      const bodyB = bodies.get(spec.bodyB);
      if (!bodyA || !bodyB) continue;
      const a = bodyA.getWorldPoint(spec.anchorA);
      const b = bodyB.getWorldPoint(spec.anchorB);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-6) continue;
      const ux = dx / length;
      const uy = dy / length;
      const va = bodyA.getLinearVelocityFromWorldPoint(a);
      const vb = bodyB.getLinearVelocityFromWorldPoint(b);
      const separation = (vb.x - va.x) * ux + (vb.y - va.y) * uy;
      const force = springForce(spec.stiffness, spec.damping, length - spec.restLength, separation);
      const partA = findPart(spec.bodyA);
      const partB = findPart(spec.bodyB);
      if (partA && !partA.static) bodyA.applyForce({ x: force * ux, y: force * uy }, a, true);
      if (partB && !partB.static) bodyB.applyForce({ x: -force * ux, y: -force * uy }, b, true);
      if (spec.damping > 0) thermal += spec.damping * separation * separation * lastSubDt;
    }
  }

  function fixedStep() {
    const h = FIXED_DT / SUBSTEPS;
    lastSubDt = h;
    impulseSum = new Map();
    for (let i = 0; i < SUBSTEPS; i++) {
      applyCustomForces();
      world.step(h, VELOCITY_ITERATIONS, POSITION_ITERATIONS);
    }
    time += FIXED_DT;
    if (doc.stopwatch.running) doc.stopwatch.elapsed += FIXED_DT;
    recordTrails();
  }

  function recordTrails() {
    if (!doc.settings.showTrails) {
      trails.clear();
      return;
    }
    trailTick += 1;
    if (trailTick % 3 !== 0) return;
    for (const part of doc.parts) {
      if (part.static) continue;
      const body = bodies.get(part.id);
      if (!body) continue;
      const position = body.getPosition();
      const list = trails.get(part.id) || [];
      list.push({ x: position.x, y: position.y });
      if (list.length > 40) list.shift();
      trails.set(part.id, list);
    }
  }

  function worldAnchor(spec, which) {
    const body = bodies.get(which === "A" ? spec.bodyA : spec.bodyB);
    const local = which === "A" ? spec.anchorA : spec.anchorB;
    if (!body) return { x: 0, y: 0 };
    const point = body.getWorldPoint(local);
    return { x: point.x, y: point.y };
  }

  function axialTension(spec, planckJoint) {
    if (spec.type === "spring") {
      const a = worldAnchor(spec, "A");
      const b = worldAnchor(spec, "B");
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      const ux = length > 1e-6 ? dx / length : 0;
      const uy = length > 1e-6 ? dy / length : 1;
      const bodyA = bodies.get(spec.bodyA);
      const bodyB = bodies.get(spec.bodyB);
      let separation = 0;
      if (bodyA && bodyB && length > 1e-6) {
        const va = bodyA.getLinearVelocityFromWorldPoint(a);
        const vb = bodyB.getLinearVelocityFromWorldPoint(b);
        separation = (vb.x - va.x) * ux + (vb.y - va.y) * uy;
      }
      const extension = length - spec.restLength;
      return {
        length,
        extension,
        tension: springForce(spec.stiffness, spec.damping, extension, separation),
        ax: a.x, ay: a.y, bx: b.x, by: b.y
      };
    }
    const a = planckJoint ? planckJoint.getAnchorA() : worldAnchor(spec, "A");
    const b = planckJoint ? planckJoint.getAnchorB() : worldAnchor(spec, "B");
    const ax = a.x;
    const ay = a.y;
    const bx = b.x;
    const by = b.y;
    const dx = ax - bx;
    const dy = ay - by;
    const length = Math.hypot(dx, dy);
    let tension = 0;
    const force = reactionForce(planckJoint);
    if (force && length > 1e-6) {
      tension = (force.x * dx + force.y * dy) / length;
      if (spec.type === "rope" && tension < 0) tension = 0;
      if (spec.type === "pulley") tension = Math.hypot(force.x, force.y);
    }
    return { length, extension: length - (spec.restLength || spec.maxLength || spec.length || length), tension, ax, ay, bx, by };
  }

  function snapshot() {
    const bodySnaps = doc.parts.map((part) => bodySnapshot(part));
    const jointSnaps = doc.joints.map((spec) => jointSnapshot(spec));
    const vectors = [];
    const settings = doc.settings;
    for (const body of bodySnaps) {
      const selected = body.id === selectedId;
      if (!body.isStatic && settings.showVectors) {
        vectors.push({
          bodyId: body.id, kind: "velocity",
          x: body.x, y: body.y, fx: body.vx, fy: body.vy
        });
      }
      const showForces = settings.showFbd && selected;
      if (!showForces || body.isStatic) continue;
      vectors.push({
        bodyId: body.id, kind: "gravity",
        x: body.x, y: body.y, fx: 0, fy: -body.mass * settings.gravity
      });
      const contact = impulseSum.get(body.id);
      if (contact && contact.n > 0) {
        const scale = 1 / FIXED_DT;
        const originX = contact.px / contact.n;
        const originY = contact.py / contact.n;
        vectors.push({
          bodyId: body.id, kind: "normal",
          x: originX, y: originY, fx: contact.nx * scale, fy: contact.ny * scale
        });
        vectors.push({
          bodyId: body.id, kind: "friction",
          x: originX, y: originY, fx: contact.tx * scale, fy: contact.ty * scale
        });
      }
      const applied = appliedForces.get(body.id);
      if (applied && (applied.x || applied.y)) {
        vectors.push({
          bodyId: body.id, kind: "applied",
          x: body.x, y: body.y, fx: applied.x, fy: applied.y
        });
      }
      for (const joint of jointSnaps) {
        if (joint.bodyA !== body.id && joint.bodyB !== body.id) continue;
        if (!joint.tension) continue;
        const onA = joint.bodyA === body.id;
        const originX = onA ? joint.ax : joint.bx;
        const originY = onA ? joint.ay : joint.by;
        let dx;
        let dy;
        if (joint.type === "pulley" && joint.groundA && joint.groundB) {
          const ground = onA ? joint.groundA : joint.groundB;
          dx = ground.x - originX;
          dy = ground.y - originY;
        } else {
          dx = onA ? joint.bx - joint.ax : joint.ax - joint.bx;
          dy = onA ? joint.by - joint.ay : joint.ay - joint.by;
        }
        const length = Math.hypot(dx, dy) || 1;
        const pull = joint.tension > 0 ? 1 : -1;
        vectors.push({
          bodyId: body.id, kind: "tension",
          x: originX, y: originY,
          fx: pull * Math.abs(joint.tension) * dx / length,
          fy: pull * Math.abs(joint.tension) * dy / length
        });
      }
    }
    let kinetic = 0;
    let gravitational = 0;
    let spring = 0;
    for (const body of bodySnaps) {
      if (body.isStatic) continue;
      kinetic += kineticEnergy(body.mass, Math.hypot(body.vx, body.vy), body.inertia, body.omega);
      gravitational += gravitationalEnergy(body.mass, settings.gravity, body.y);
    }
    for (const joint of jointSnaps) {
      if (joint.type === "spring") spring += springEnergy(joint.stiffness, joint.extension);
    }
    const ruler = doc.ruler
      ? {
        x1: doc.ruler.x1, y1: doc.ruler.y1, x2: doc.ruler.x2, y2: doc.ruler.y2,
        distance: Math.hypot(doc.ruler.x2 - doc.ruler.x1, doc.ruler.y2 - doc.ruler.y1)
      }
      : null;
    return {
      version: BUILD_VERSION,
      time,
      paused: !!doc.settings.paused,
      mode: doc.mode,
      gravity: settings.gravity,
      speed: settings.timeScale,
      selectedId,
      energy: {
        kinetic,
        gravitational,
        spring,
        thermal
      },
      bodies: bodySnaps,
      joints: jointSnaps,
      vectors,
      trails: trailSnapshot(),
      ruler,
      stopwatch: { running: !!doc.stopwatch.running, elapsed: doc.stopwatch.elapsed },
      meta: {
        sleeping: world ? world.getAllowSleeping() : true,
        substeps: SUBSTEPS,
        fixedDt: FIXED_DT,
        bodyCap: MAX_BODIES,
        jointCap: MAX_JOINTS,
        bodyCount: doc.parts.length,
        jointCount: doc.joints.length
      }
    };
  }

  function bodySnapshot(part) {
    const body = bodies.get(part.id);
    const position = body ? body.getPosition() : { x: part.x, y: part.y };
    const velocity = body ? body.getLinearVelocity() : { x: part.vx || 0, y: part.vy || 0 };
    const angle = body ? body.getAngle() : part.angle;
    const hx = part.width ? part.width / 2 : 0;
    const hy = part.height ? part.height / 2 : 0;
    let shape = "box";
    let localVertices = null;
    let vertices = null;
    if (part.type === "ball" || part.type === "pulley-wheel") shape = "circle";
    if (part.type === "wedge") {
      shape = "polygon";
      localVertices = [
        { x: 0, y: 0 },
        { x: part.run, y: 0 },
        { x: part.run, y: part.rise }
      ];
    } else if (shape === "box") {
      localVertices = [
        { x: -hx, y: -hy },
        { x: hx, y: -hy },
        { x: hx, y: hy },
        { x: -hx, y: hy }
      ];
    }
    if (localVertices && body) {
      vertices = localVertices.map((vertex) => {
        const worldPoint = body.getWorldPoint(vertex);
        return { x: worldPoint.x, y: worldPoint.y };
      });
    }
    return {
      id: part.id,
      type: part.type,
      shape,
      x: position.x,
      y: position.y,
      angle,
      hx,
      hy,
      radius: part.radius || 0,
      width: part.width || 0,
      height: part.height || 0,
      run: part.run || 0,
      rise: part.rise || 0,
      vertices,
      localVertices,
      material: part.material,
      friction: surfaceFriction(part, doc.settings.defriction),
      restitution: part.restitution,
      mass: body && !part.static ? body.getMass() : part.mass,
      inertia: body && !part.static ? body.getInertia() : 0,
      isStatic: !!part.static,
      vx: velocity.x,
      vy: velocity.y,
      omega: body ? body.getAngularVelocity() : 0,
      thrust: part.thrust,
      thrustOn: !!part.thrustOn && !part.static,
      magnet: part.magnet || 0,
      awake: body ? body.isAwake() : false,
      selected: part.id === selectedId
    };
  }

  function jointSnapshot(spec) {
    const live = joints.get(spec.id);
    const axial = axialTension(spec, live);
    const groundA = spec.groundAnchorA || (live && live.getGroundAnchorA ? pointOf(live.getGroundAnchorA()) : null);
    const groundB = spec.groundAnchorB || (live && live.getGroundAnchorB ? pointOf(live.getGroundAnchorB()) : null);
    return {
      id: spec.id,
      type: spec.type,
      bodyA: spec.bodyA,
      bodyB: spec.bodyB,
      ax: axial.ax,
      ay: axial.ay,
      bx: axial.bx,
      by: axial.by,
      groundA,
      groundB,
      length: axial.length,
      restLength: spec.type === "rope" ? spec.maxLength : spec.restLength,
      extension: spec.type === "spring" ? axial.extension : axial.length - (spec.length || axial.length),
      tension: axial.tension,
      stiffness: spec.stiffness,
      damping: spec.damping,
      motor: !!spec.motor,
      motorSpeed: spec.motorSpeed,
      selected: spec.id === selectedId
    };
  }

  function reactionForce(joint) {
    if (!joint || typeof joint.getReactionForce !== "function") return null;
    try {
      const force = joint.getReactionForce(1 / lastSubDt);
      if (!force || !Number.isFinite(force.x) || !Number.isFinite(force.y)) return null;
      return force;
    } catch (e) {
      return null;
    }
  }

  function pointOf(value) {
    if (!value) return null;
    return { x: value.x, y: value.y };
  }

  function trailSnapshot() {
    if (!doc.settings.showTrails) return [];
    const out = [];
    for (const [bodyId, points] of trails) {
      out.push({ bodyId, points: points.map((point) => ({ x: point.x, y: point.y })) });
    }
    return out;
  }

  function mutate(change) {
    syncDocFromWorld();
    remember();
    const result = change();
    if (result && result.ok === false) {
      undo.pop();
      return result;
    }
    rebuild();
    commitEdit();
    return result || { ok: true };
  }

  function findPart(id) {
    return doc.parts.find((part) => part.id === id) || null;
  }

  function load(input, opts) {
    const parsed = parseBuild(input);
    if (!parsed) return { ok: false, error: "Could not load that build." };
    doc = parsed;
    built = cloneBuild(parsed);
    if (parsed.built) {
      built.parts = cloneBuild(parsed.built.parts);
      built.joints = cloneBuild(parsed.built.joints);
    }
    zeroVelocities(built);
    time = 0;
    thermal = 0;
    trails.clear();
    accumulator.reset();
    selectedId = null;
    mouse = null;
    if (!opts || !opts.keepHistory) {
      undo = [];
      redo = [];
    }
    rebuild();
    return { ok: true };
  }

  const api = {
    load,
    snapshot,
    document() {
      syncDocFromWorld();
      const out = cloneBuild(doc);
      out.built = { parts: cloneBuild(built.parts), joints: cloneBuild(built.joints) };
      return out;
    },
    advance(frameDt) {
      if (doc.settings.paused) return 0;
      const scaled = Math.max(0, frameDt) * doc.settings.timeScale;
      return accumulator.consume(scaled, () => { fixedStep(); });
    },
    run(seconds, sample) {
      const steps = Math.max(0, Math.round(seconds / FIXED_DT));
      const frames = [];
      for (let i = 0; i < steps; i++) {
        fixedStep();
        if (sample) frames.push(sample(snapshot(), i));
      }
      return frames;
    },
    stepOnce() {
      fixedStep();
      return snapshot();
    },
    reset() {
      const settings = cloneBuild(doc.settings);
      const mode = doc.mode;
      doc = cloneBuild(built);
      doc.settings = settings;
      doc.mode = mode;
      doc.stopwatch = { running: false, elapsed: 0 };
      time = 0;
      thermal = 0;
      trails.clear();
      accumulator.reset();
      rebuild();
    },
    setPaused(paused) {
      doc.settings.paused = !!paused;
    },
    setTimeScale(scale) {
      const allowed = scale === 0.25 || scale === 0.5 || scale === 1 ? scale : 1;
      doc.settings.timeScale = allowed;
    },
    setGravity(g) {
      doc.settings.gravity = Math.max(0, Math.min(30, Number(g) || 0));
      if (world) world.setGravity({ x: 0, y: -doc.settings.gravity });
      wakeDynamic();
    },
    setAirDrag(on) {
      doc.settings.airDrag = !!on;
      wakeDynamic();
    },
    setDefriction(on) {
      doc.settings.defriction = !!on;
      refreshMaterials();
      wakeDynamic();
    },
    setOverlay(flags) {
      const src = flags || {};
      if ("showVectors" in src) doc.settings.showVectors = !!src.showVectors;
      if ("showFbd" in src) doc.settings.showFbd = !!src.showFbd;
      if ("showTrails" in src) {
        doc.settings.showTrails = !!src.showTrails;
        if (!doc.settings.showTrails) trails.clear();
      }
      if ("snap" in src) doc.settings.snap = !!src.snap;
    },
    select(id) {
      selectedId = id || null;
    },
    selectedId() {
      return selectedId;
    },
    addPart(input) {
      if (doc.parts.length >= MAX_BODIES) {
        return { ok: false, error: "The build is full (" + MAX_BODIES + " parts)." };
      }
      let created = null;
      const result = mutate(() => {
        created = normalizePart({ ...input, id: input.id || nextId("p", doc.parts) }, doc.parts.length);
        if (doc.settings.snap) {
          created.x = snapValue(created.x, GRID);
          created.y = snapValue(created.y, GRID);
        }
        doc.parts.push(created);
        return { ok: true, id: created.id };
      });
      if (result.ok) selectedId = created.id;
      return result;
    },
    updatePart(id, patch) {
      const current = findPart(id);
      if (!current) return { ok: false, error: "That part is gone." };
      const next = { ...patch };
      if (next.material && MATERIALS[next.material] && next.material !== "custom" && next.friction == null) {
        next.friction = MATERIALS[next.material].friction;
        next.restitution = MATERIALS[next.material].restitution;
      }
      return mutate(() => {
        const part = findPart(id);
        Object.assign(part, next);
        const normalized = normalizePart({ ...part, id: part.id }, 0);
        Object.assign(part, normalized, { id: part.id });
        return { ok: true, id };
      });
    },
    removePart(id) {
      if (!findPart(id)) return { ok: false, error: "That part is gone." };
      return mutate(() => {
        doc.parts = doc.parts.filter((part) => part.id !== id);
        doc.joints = doc.joints.filter((joint) => joint.bodyA !== id && joint.bodyB !== id);
        if (selectedId === id) selectedId = null;
        return { ok: true };
      });
    },
    duplicatePart(id) {
      const current = findPart(id);
      if (!current) return { ok: false, error: "That part is gone." };
      if (doc.parts.length >= MAX_BODIES) return { ok: false, error: "The build is full (" + MAX_BODIES + " parts)." };
      return mutate(() => {
        const copy = normalizePart({
          ...current,
          id: nextId("p", doc.parts),
          x: current.x + 0.4,
          y: current.y + 0.4,
          static: current.static
        }, doc.parts.length);
        doc.parts.push(copy);
        selectedId = copy.id;
        return { ok: true, id: copy.id };
      });
    },
    addJoint(input) {
      if (doc.joints.length >= MAX_JOINTS) return { ok: false, error: "The build is full (" + MAX_JOINTS + " joints)." };
      const spec = normalizeJoint({ ...input, id: input.id || nextId("j", doc.joints) }, doc.joints.length);
      if (!findPart(spec.bodyA) || !findPart(spec.bodyB)) return { ok: false, error: "Pick two parts." };
      if (spec.bodyA === spec.bodyB) return { ok: false, error: "A joint needs two different parts." };
      return mutate(() => {
        const bodyA = bodies.get(spec.bodyA);
        const bodyB = bodies.get(spec.bodyB);
        if (bodyA && bodyB && (spec.type === "rope" || spec.type === "spring" || spec.type === "distance")) {
          const a = bodyA.getWorldPoint(spec.anchorA);
          const b = bodyB.getWorldPoint(spec.anchorB);
          const length = Math.max(0.05, Math.hypot(b.x - a.x, b.y - a.y));
          if (spec.type === "rope") spec.maxLength = length;
          if (spec.type === "distance") spec.length = length;
          if (spec.type === "spring" && !(input && input.restLength)) spec.restLength = length;
        }
        if (spec.type === "pulley" && bodyA && bodyB && !spec.groundAnchorA) {
          const a = bodyA.getWorldPoint(spec.anchorA);
          const b = bodyB.getWorldPoint(spec.anchorB);
          spec.groundAnchorA = { x: a.x, y: a.y + 2.5 };
          spec.groundAnchorB = { x: b.x, y: b.y + 2.5 };
        }
        doc.joints.push(spec);
        selectedId = spec.id;
        return { ok: true, id: spec.id };
      });
    },
    updateJoint(id, patch) {
      const current = doc.joints.find((joint) => joint.id === id);
      if (!current) return { ok: false, error: "That joint is gone." };
      return mutate(() => {
        Object.assign(current, patch);
        const normalized = normalizeJoint({ ...current, id: current.id }, 0);
        Object.assign(current, normalized, { id: current.id, bodyA: current.bodyA, bodyB: current.bodyB });
        return { ok: true, id };
      });
    },
    removeJoint(id) {
      if (!doc.joints.some((joint) => joint.id === id)) return { ok: false, error: "That joint is gone." };
      return mutate(() => {
        doc.joints = doc.joints.filter((joint) => joint.id !== id);
        if (selectedId === id) selectedId = null;
        return { ok: true };
      });
    },
    beginDrag(id, x, y) {
      const part = findPart(id);
      const body = bodies.get(id);
      if (!part || !body || part.static) return { ok: false };
      if (!dragArmed) {
        remember();
        dragArmed = true;
      }
      if (mouse) world.destroyJoint(mouse);
      const mass = body.getMass() || part.mass || 1;
      mouse = world.createJoint(new planck.MouseJoint({
        maxForce: Math.max(40, mass * 60),
        frequencyHz: 8,
        dampingRatio: 0.6
      }, mouseGround, body, { x, y }));
      body.setAwake(true);
      selectedId = id;
      return { ok: true };
    },
    drag(x, y) {
      if (!mouse) return;
      const target = doc.settings.snap
        ? { x: snapValue(x, GRID), y: snapValue(y, GRID) }
        : { x, y };
      mouse.setTarget(target);
    },
    endDrag() {
      if (mouse) {
        world.destroyJoint(mouse);
        mouse = null;
      }
      if (!dragArmed) return;
      const id = selectedId;
      const body = id && bodies.get(id);
      if (body && doc.settings.snap) {
        const position = body.getPosition();
        body.setPosition({ x: snapValue(position.x, GRID), y: snapValue(position.y, GRID) });
      }
      dragArmed = false;
      commitEdit();
    },
    setPose(id, x, y, angle) {
      const part = findPart(id);
      const body = bodies.get(id);
      if (!part || !body || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(angle)) {
        return { ok: false };
      }
      if (mouse) {
        world.destroyJoint(mouse);
        mouse = null;
      }
      if (!dragArmed) {
        remember();
        dragArmed = true;
      }
      body.setTransform({ x, y }, angle);
      part.x = x;
      part.y = y;
      part.angle = angle;
      if (doc.settings.paused) {
        body.setLinearVelocity({ x: 0, y: 0 });
        body.setAngularVelocity(0);
        part.vx = 0;
        part.vy = 0;
        part.omega = 0;
      }
      body.setAwake(true);
      selectedId = id;
      return { ok: true };
    },
    rotateBy(id, delta) {
      const body = bodies.get(id);
      if (!body || !Number.isFinite(delta)) return { ok: false };
      const position = body.getPosition();
      return api.setPose(id, position.x, position.y, body.getAngle() + delta);
    },
    stretchJoint(id, commit) {
      const spec = doc.joints.find((joint) => joint.id === id);
      if (!spec || (spec.type !== "spring" && spec.type !== "rope" && spec.type !== "distance")) {
        return { ok: false };
      }
      const bodyA = bodies.get(spec.bodyA);
      const bodyB = bodies.get(spec.bodyB);
      if (!bodyA || !bodyB) return { ok: false };
      const a = bodyA.getWorldPoint(spec.anchorA);
      const b = bodyB.getWorldPoint(spec.anchorB);
      const length = Math.max(0.05, Math.hypot(b.x - a.x, b.y - a.y));
      if (spec.type === "rope") {
        spec.maxLength = length;
        const live = joints.get(spec.id);
        if (live && typeof live.setMaxLength === "function") live.setMaxLength(length);
      } else if (spec.type === "distance") {
        spec.length = length;
        const live = joints.get(spec.id);
        if (live && typeof live.setLength === "function") live.setLength(length);
      } else if (commit) {
        spec.restLength = length;
      }
      return { ok: true, length };
    },
    setRuler(x1, y1, x2, y2) {
      doc.ruler = { x1, y1, x2, y2 };
    },
    clearRuler() {
      doc.ruler = null;
    },
    setStopwatch(running) {
      doc.stopwatch.running = !!running;
    },
    resetStopwatch() {
      doc.stopwatch = { running: false, elapsed: 0 };
    },
    undo() {
      if (!undo.length) return false;
      redo.push(JSON.stringify({ parts: built.parts, joints: built.joints, ruler: built.ruler || null }));
      applyHistory(undo.pop());
      return true;
    },
    redo() {
      if (!redo.length) return false;
      undo.push(JSON.stringify({ parts: built.parts, joints: built.joints, ruler: built.ruler || null }));
      applyHistory(redo.pop());
      return true;
    },
    canUndo() {
      return undo.length > 0;
    },
    canRedo() {
      return redo.length > 0;
    }
  };

  if (initial) load(initial);
  return api;
}
