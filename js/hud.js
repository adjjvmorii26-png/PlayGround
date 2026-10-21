import { THREE, TAU, clamp, formatDist } from "./utils.js";

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

export class HUD {
  constructor(dom, state) {
    this.dom = dom;
    this.state = state;
    this.hudClock = 0;
    this.markerClock = 0;
    this.toastTimer = 0;
    this.logTimer = 0;
    this.accent = "#7df9ff";
    this.accent2 = "#ff7ad9";
    this.projected = new THREE.Vector3();
    this.cameraDir = new THREE.Vector3();
    this.temp = new THREE.Vector3();
  }

  setPalette(palette) {
    this.accent = palette.accent;
    this.accent2 = palette.accent2;
    document.documentElement.style.setProperty("--accent", palette.accent);
    document.documentElement.style.setProperty("--accent-2", palette.accent2);
    document.documentElement.style.setProperty("--accent-rgb", this.hexToRgb(palette.accent));
  }

  hexToRgb(hex) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
    const n = parseInt(full, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  }

  setMuted(muted) {
    document.body.classList.toggle("muted", muted);
  }

  setPointerLocked(locked) {
    document.body.classList.toggle("pointer-locked", locked);
    document.body.classList.toggle("pointer-free", !locked);
  }

  toast(message, duration = 2600) {
    const el = this.dom.toast;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove("show"), duration);
  }

  log(html, duration = 9000) {
    const el = this.dom.log;
    el.innerHTML = html;
    el.classList.add("show");
    clearTimeout(this.logTimer);
    this.logTimer = setTimeout(() => el.classList.remove("show"), duration);
  }

  setStartReadout(lumaCount, sector) {
    if (this.dom.lumaCount) this.dom.lumaCount.textContent = String(lumaCount).padStart(2, "0");
    if (this.dom.sectorReadout) this.dom.sectorReadout.textContent = sector;
  }

  update(dt, camera, ctx) {
    const { shipPosition, flight, speed, throttle, warp, nearest, started, photo, chords, motes, canAttune } = ctx;
    this.hudClock += dt;
    this.markerClock += dt;

    if (started && !photo) {
      this.updateMarker(camera, nearest, shipPosition);
    } else {
      this.dom.marker.classList.remove("show");
    }

    if (this.hudClock < 0.09) return;
    this.hudClock = 0;

    const absSpeed = Math.abs(speed);
    this.dom.speedVal.textContent = String(Math.round(absSpeed)).padStart(3, "0");
    this.dom.thrustBar.style.width = `${clamp(Math.max(0, throttle), 0, 1) * 100}%`;
    this.dom.warpBar.style.width = `${warp * 100}%`;
    this.dom.coordLine.textContent = `X ${(shipPosition.x / 1000).toFixed(1)} · Y ${(shipPosition.y / 1000).toFixed(1)} · Z ${(shipPosition.z / 1000).toFixed(1)} km`;

    let mode = "DRIFT";
    if (warp > 0.3 && absSpeed > 240) mode = "WARP";
    else if (speed < -4) mode = "RETRO";
    else if (absSpeed > 4) mode = "CRUISE";
    this.dom.flightMode.textContent = mode;

    this.dom.signalState.textContent = canAttune ? "RESONANT" : mode === "WARP" ? "WARP" : "STABLE";
    this.dom.chordCount.textContent = `${Math.min(chords, 6)} / 6`;
    const pips = this.dom.chordPips.children;
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle("on", i < Math.min(chords, 6));
    this.dom.nearestDist.textContent = nearest ? formatDist(nearest.dist) : "FREE";
    this.dom.moteCount.textContent = String(motes).padStart(3, "0");

    const showPrompt = started && !photo && canAttune;
    this.dom.attunePrompt.classList.toggle("show", showPrompt);
    document.body.classList.toggle("attuned", showPrompt);

    this.drawCompass(flight, nearest, shipPosition);
    this.drawMinimap(camera, ctx);
  }

  updateMarker(camera, nearest, shipPosition) {
    if (!nearest) {
      this.dom.marker.classList.remove("show");
      return;
    }
    const pos = nearest.echo.worldPos;
    camera.getWorldDirection(this.cameraDir);
    this.temp.copy(pos).sub(camera.position);
    if (this.temp.dot(this.cameraDir) <= 0) {
      this.dom.marker.classList.remove("show");
      return;
    }
    this.projected.copy(pos).project(camera);
    if (this.projected.z > 1) {
      this.dom.marker.classList.remove("show");
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    let x = (this.projected.x * 0.5 + 0.5) * w;
    let y = (-this.projected.y * 0.5 + 0.5) * h;
    x = clamp(x, 42, w - 42);
    y = clamp(y, 96, h - 126);
    this.dom.marker.style.left = `${x}px`;
    this.dom.marker.style.top = `${y}px`;
    this.dom.markerDist.textContent = formatDist(pos.distanceTo(shipPosition));
    this.dom.marker.classList.add("show");
  }

  drawCompass(flight, nearest, shipPosition) {
    const ctx = this.dom.compassCtx;
    const canvas = this.dom.compass;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const center = w / 2;
    const span = 65;
    const half = w * 0.47;
    const heading = normalizeDegrees((flight.yaw * 180) / Math.PI);
    const accent = this.accent;

    ctx.lineWidth = 1;
    const start = Math.floor((heading - span) / 5) * 5;
    for (let deg = start; deg <= heading + span; deg += 5) {
      const delta = deg - heading;
      const x = center + (delta / span) * half;
      const edgeFade = 1 - Math.pow(Math.abs(delta) / span, 2) * 0.7;
      const major = deg % 15 === 0;
      const cardinal = deg % 90 === 0;
      ctx.strokeStyle = this.rgba(accent, (major ? 0.55 : 0.24) * edgeFade);
      ctx.beginPath();
      ctx.moveTo(x, h / 2 - (major ? 12 : 5));
      ctx.lineTo(x, h / 2 + (major ? 7 : 3));
      ctx.stroke();
      if (cardinal) {
        const label = { 0: "N", 90: "E", 180: "S", 270: "W" }[normalizeDegrees(deg)] || "";
        if (label) {
          ctx.fillStyle = this.rgba(accent, 0.8 * edgeFade);
          ctx.font = "500 17px 'IBM Plex Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(label, x, h / 2 - 19);
        }
      }
    }
    ctx.strokeStyle = this.rgba(accent, 0.9);
    ctx.beginPath();
    ctx.moveTo(center, h / 2 - 16);
    ctx.lineTo(center, h / 2 + 13);
    ctx.stroke();
    ctx.fillStyle = this.rgba(accent, 0.95);
    ctx.beginPath();
    ctx.moveTo(center, h / 2 - 21);
    ctx.lineTo(center - 4, h / 2 - 27);
    ctx.lineTo(center + 4, h / 2 - 27);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = this.rgba(accent, 0.55);
    ctx.font = "400 12px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${String(Math.round(heading)).padStart(3, "0")}°`, center, h - 2);

    if (nearest) {
      const to = this.temp.copy(nearest.echo.worldPos).sub(shipPosition);
      const bearing = normalizeDegrees((Math.atan2(to.x, to.z) * 180) / Math.PI);
      let delta = bearing - heading;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      if (Math.abs(delta) <= span) {
        const x = center + (delta / span) * half;
        ctx.save();
        ctx.translate(x, h / 2 + 17);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = this.accent2;
        ctx.fillRect(-3.5, -3.5, 7, 7);
        ctx.restore();
      }
    }
  }

  drawMinimap(camera, ctx) {
    const ctx2 = this.dom.minimapCtx;
    const size = this.dom.minimap.width;
    const center = size / 2;
    const radius = size * 0.47;
    ctx2.clearRect(0, 0, size, size);
    ctx2.save();
    ctx2.beginPath();
    ctx2.arc(center, center, radius, 0, TAU);
    ctx2.clip();

    const bg = ctx2.createRadialGradient(center, center, 0, center, center, radius);
    bg.addColorStop(0, "rgba(12, 30, 47, 0.55)");
    bg.addColorStop(1, "rgba(3, 8, 14, 0.65)");
    ctx2.fillStyle = bg;
    ctx2.fillRect(0, 0, size, size);

    ctx2.strokeStyle = this.rgba(this.accent, 0.13);
    ctx2.lineWidth = 1;
    for (let r = 0.32; r <= 1; r += 0.34) {
      ctx2.beginPath();
      ctx2.arc(center, center, radius * r, 0, TAU);
      ctx2.stroke();
    }
    ctx2.beginPath();
    ctx2.moveTo(center, center - radius);
    ctx2.lineTo(center, center + radius);
    ctx2.moveTo(center - radius, center);
    ctx2.lineTo(center + radius, center);
    ctx2.stroke();

    const yaw = ctx.flight.yaw;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const scale = (radius * 0.92) / 1750;
    const ship = ctx.shipPosition;

    const project = (wx, wz) => {
      const dx = wx - ship.x;
      const dz = wz - ship.z;
      return {
        x: center + (cos * dx - sin * dz) * scale,
        y: center - (sin * dx + cos * dz) * scale,
      };
    };

    for (const chunk of ctx.world.chunks.values()) {
      for (const poi of chunk.pois) {
        const p = project(chunk.group.position.x + poi.x, chunk.group.position.z + poi.z);
        const dx = p.x - center;
        const dy = p.y - center;
        if (dx * dx + dy * dy > radius * radius) continue;
        ctx2.fillStyle = poi.crystal ? this.rgba(this.accent, 0.4) : "rgba(130, 165, 185, 0.28)";
        const dot = poi.crystal ? 2.6 : 1.2;
        ctx2.fillRect(p.x - dot / 2, p.y - dot / 2, dot, dot);
      }
    }

    for (const echo of ctx.world.echoes) {
      const p = project(echo.worldPos.x, echo.worldPos.z);
      const dx = p.x - center;
      const dy = p.y - center;
      if (dx * dx + dy * dy > radius * radius) continue;
      ctx2.strokeStyle = echo.active ? "rgba(255, 210, 122, 0.45)" : this.accent;
      ctx2.lineWidth = echo === (ctx.nearest && ctx.nearest.echo) ? 2 : 1.2;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, echo === (ctx.nearest && ctx.nearest.echo) ? 5.5 : 3.5, 0, TAU);
      ctx2.stroke();
    }

    for (const chunk of ctx.world.chunks.values()) {
      if (!chunk.motes) continue;
      chunk.motes.local.forEach((pos, index) => {
        if (!chunk.motes.alive[index]) return;
        const p = project(chunk.group.position.x + pos.x, chunk.group.position.z + pos.z);
        const dx = p.x - center;
        const dy = p.y - center;
        if (dx * dx + dy * dy > radius * radius) return;
        ctx2.fillStyle = "rgba(255, 210, 122, 0.9)";
        ctx2.fillRect(p.x - 1, p.y - 1, 2, 2);
      });
    }

    for (const luma of ctx.world.life.lumas) {
      const p = project(luma.group.position.x, luma.group.position.z);
      const dx = p.x - center;
      const dy = p.y - center;
      if (dx * dx + dy * dy > radius * radius) continue;
      ctx2.fillStyle = this.rgba(this.accent2, 0.75);
      ctx2.fillRect(p.x - 0.9, p.y - 0.9, 1.8, 1.8);
    }

    const chorus = ctx.world.life.chorus;
    const cp = project(chorus.group.position.x, chorus.group.position.z);
    const cdx = cp.x - center;
    const cdy = cp.y - center;
    if (cdx * cdx + cdy * cdy < radius * radius) {
      ctx2.strokeStyle = this.rgba(this.accent2, 0.65);
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.arc(cp.x, cp.y, 6, 0, TAU);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(cp.x - 9, cp.y);
      ctx2.lineTo(cp.x + 9, cp.y);
      ctx2.moveTo(cp.x, cp.y - 9);
      ctx2.lineTo(cp.x, cp.y + 9);
      ctx2.stroke();
    }

    ctx2.fillStyle = this.accent;
    ctx2.beginPath();
    ctx2.moveTo(center, center - 10);
    ctx2.lineTo(center - 5.5, center + 7);
    ctx2.lineTo(center, center + 3);
    ctx2.lineTo(center + 5.5, center + 7);
    ctx2.closePath();
    ctx2.fill();

    ctx2.restore();
    ctx2.strokeStyle = this.rgba(this.accent, 0.22);
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.arc(center, center, radius, 0, TAU);
    ctx2.stroke();
  }

  rgba(hex, alpha) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
}
